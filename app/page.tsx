import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { AnalysesList } from "@/components/analyses-list";
import { AnalysisForm } from "@/components/analysis-form";

/** Ensure a signed-in user has a workspace and render the analysis form and recent analyses. */
export default async function Home() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const client = await clerkClient();

  if (!orgId) {
    const memberships = await client.users.getOrganizationMembershipList({ userId });

    if (memberships.data.length === 0) {
      // Create a default organization so the user always has a workspace.
      const user = await client.users.getUser(userId);
      const orgName = `${user.firstName || "My"} Workspace`;
      await client.organizations.createOrganization({
        name: orgName,
        createdBy: userId,
      });
      redirect("/");
    }
  }

  let orgName = "Personal Account";
  if (orgId) {
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    orgName = org.name;
  }

  // Fetch analyses for this org. RLS enforces tenancy; no WHERE clause needed.
  const supabase = await createSupabaseClient();
  const { data: analyses, error } = await supabase
    .from("analyses")
    .select("id, status, stage, created_at, started_at, finished_at, projects(name, repo_url)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[dashboard] analyses query failed:", error.message);
  }

  // Deduplicate by project so each repository only appears once (newest analysis)
  const seenProjects = new Set<string>();
  const uniqueAnalyses = (analyses ?? []).filter((analysis) => {
    const project = Array.isArray(analysis.projects)
      ? analysis.projects[0]
      : analysis.projects;
    const key = project?.repo_url || analysis.id;
    if (seenProjects.has(key)) return false;
    seenProjects.add(key);
    return true;
  });

  return (
    <div className="flex flex-col flex-1 bg-zinc-50 font-sans dark:bg-black overflow-y-auto">
      <main className="flex flex-1 flex-col w-full max-w-4xl mx-auto px-6 py-10 gap-8">
        {/* Header */}
        <div>
          <p className="text-xs font-mono text-zinc-500 dark:text-zinc-500 mb-1">
            {orgId ?? "no org"}
          </p>
          <h1 className="text-2xl font-semibold text-black dark:text-white tracking-tight">
            {orgName}
          </h1>
        </div>

        {/* Form to submit a new repository */}
        <section className="bg-white dark:bg-[#0c0d14] border border-zinc-200 dark:border-zinc-800 rounded-md p-4">
          <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-3">
            Analyse Repository
          </h2>
          <AnalysisForm />
        </section>

        {/* Analyses list */}
        <section>
          <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-4">
            Analyses
          </h2>
          <AnalysesList analyses={uniqueAnalyses} />
        </section>
      </main>
    </div>
  );
}
