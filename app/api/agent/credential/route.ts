import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseClient } from "@/lib/supabase";
import { mintAnalysisCredential } from "@/lib/agent/credential";

export const dynamic = "force-dynamic";

/**
 * Mints a short-lived signed credential naming exactly one analysis and its owning organization.
 * Proves the caller owns the analysis via Clerk auth + Supabase RLS before minting.
 */
export async function POST(req: NextRequest) {
  const { userId, orgId, getToken } = await auth();

  if (!userId || !orgId) {
    return NextResponse.json(
      { error: "Authentication required to mint agent credentials." },
      { status: 401 }
    );
  }

  let body: { analysisId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Expected { analysisId: string }." },
      { status: 400 }
    );
  }

  const { analysisId } = body;
  if (!analysisId || typeof analysisId !== "string") {
    return NextResponse.json(
      { error: "analysisId is required." },
      { status: 400 }
    );
  }

  // Verify ownership via RLS policy
  const supabase = await createSupabaseClient();
  const { data: analysis, error } = await supabase
    .from("analyses")
    .select("id, org_id")
    .eq("id", analysisId)
    .maybeSingle();

  if (error || !analysis) {
    return NextResponse.json(
      { error: "Analysis not found or access denied." },
      { status: 404 }
    );
  }

  // Get scoped Clerk-Supabase session token
  const supabaseToken = (await getToken({ template: "supabase" })) || undefined;

  const EXPIRES_IN_SECONDS = 600; // 10 minutes
  const token = await mintAnalysisCredential({
    analysisId,
    orgId,
    supabaseToken,
    expiresInSeconds: EXPIRES_IN_SECONDS,
  });

  return NextResponse.json({
    token,
    expiresIn: EXPIRES_IN_SECONDS,
  });
}

