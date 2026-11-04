import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAnalysisCredential } from "@/lib/agent/credential";
import { loadAnalysisData } from "@/lib/analysis-loader";

export const dynamic = "force-dynamic";

/**
 * Read-only HTTP surface for agent tools.
 * Reads an analysis without a signed-in user of its own, authorized strictly
 * by a short-lived signed credential naming exactly one analysis and its organization.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or malformed Authorization header. Bearer credential required." },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7).trim();
  let payload;
  try {
    payload = await verifyAnalysisCredential(token);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid credential";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Supabase configuration missing on server." },
      { status: 500 }
    );
  }

  // Create client authorized with the credential's scoped Clerk-Supabase token.
  // This enforces Row Level Security at the database level.
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    ...(payload.supabaseToken
      ? { global: { headers: { Authorization: `Bearer ${payload.supabaseToken}` } } }
      : {}),
  });

  const analysisData = await loadAnalysisData(supabase, payload.analysisId);

  if (!analysisData) {
    return NextResponse.json(
      { error: "Analysis not found or access denied." },
      { status: 404 }
    );
  }

  return NextResponse.json(analysisData);
}

