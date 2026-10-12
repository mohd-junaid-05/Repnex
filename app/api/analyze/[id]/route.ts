import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseClient } from "@/lib/supabase";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createSupabaseClient();
    const { data: analysis, error } = await supabase
      .from("analyses")
      .select("id, status, stage, error_message")
      .eq("id", id)
      .maybeSingle();

    if (error || !analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(analysis);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch analysis status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
