import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseClient } from "@/lib/supabase";
import { mintAnalysisCredential } from "@/lib/agent/credential";

export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequestPayload {
  analysisId?: string;
  messages?: ChatMessage[];
  selectedContext?: {
    file?: string;
    folder?: string;
  };
}

/**
 * Entry point for repository Q&A chat.
 * 1. Proves caller is authenticated and owns the requested analysis under RLS.
 * 2. Mints short-lived scoped signed credential.
 * 3. Connects to the local agent service and relays the SSE stream back to the browser.
 */
export async function POST(req: NextRequest) {
  const { userId, orgId, getToken } = await auth();

  if (!userId || !orgId) {
    return new Response(
      JSON.stringify({ error: "Authentication required to chat with the agent." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: ChatRequestPayload;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON request body." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { analysisId, messages, selectedContext } = body;

  if (!analysisId || typeof analysisId !== "string") {
    return new Response(
      JSON.stringify({ error: "analysisId is required." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "messages array is required." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Verify ownership via RLS policy
  const supabase = await createSupabaseClient();
  const { data: analysis, error: dbError } = await supabase
    .from("analyses")
    .select("id, org_id")
    .eq("id", analysisId)
    .maybeSingle();

  if (dbError || !analysis) {
    return new Response(
      JSON.stringify({ error: "Analysis not found or access denied." }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // Mint scoped short-lived credential
  const supabaseToken = await getToken({ template: "supabase" }).catch(() => null);
  const credential = await mintAnalysisCredential({
    analysisId,
    orgId: analysis.org_id || orgId,
    supabaseToken: supabaseToken || undefined,
  });

  const agentServiceUrl = (
    process.env.AGENT_SERVICE_URL || "https://repnex-agent.onrender.com"
  ).replace(/\/$/, "");

  const appOrigin =
    req.nextUrl.origin ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  // Stream-relay response
  try {
    const agentRes = await fetch(`${agentServiceUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        credential,
        apiUrl: appOrigin,
        selectedContext,
      }),
    });

    if (!agentRes.ok || !agentRes.body) {
      const errText = await agentRes.text().catch(() => "");
      return new Response(
        `event: error\ndata: ${JSON.stringify({
          message: `Agent service error (${agentRes.status}): ${errText || agentRes.statusText}`,
        })}\n\n`,
        {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        }
      );
    }

    return new Response(agentRes.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Connection failed";

    // Graceful failure when agent service is stopped/unreachable (Acceptance Check 5)
    return new Response(
      `event: error\ndata: ${JSON.stringify({
        message: `Agent service is currently unreachable (${errorMsg}).`,
      })}\n\n`,
      {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      }
    );
  }
}

