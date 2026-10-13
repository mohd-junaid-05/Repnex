import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseClient } from "@/lib/supabase";
import {
  submitRepositoryForAnalysis,
  runAnalysisPipeline,
  type PipelineResult,
} from "@/lib/pipeline";

/**
 * Endpoint to submit a GitHub repository for analysis.
 * Follows "one analysis per repository" unless forceRerun is set.
 */
export async function POST(req: Request) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: "Unauthorized: Active organization required." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { repoUrl, forceRerun = false } = body;

    if (!repoUrl || typeof repoUrl !== "string") {
      return NextResponse.json(
        { error: "Repository URL is required." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    const submission: PipelineResult = await submitRepositoryForAnalysis({
      supabase,
      orgId,
      repoUrlInput: repoUrl,
      forceRerun: Boolean(forceRerun),
    });

    // If a new analysis was initialized (status is pending), launch the pipeline in background
    if (!submission.isExisting || submission.status === "pending") {
      // Run the pipeline asynchronously; internal errors write status: 'failed' to DB
      runAnalysisPipeline({
        analysisId: submission.analysisId,
        orgId,
        repoUrl,
        supabase,
      }).catch((err) => {
        console.error(`[pipeline] Unhandled background error:`, err);
      });
    }

    return NextResponse.json(submission);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process repository.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
