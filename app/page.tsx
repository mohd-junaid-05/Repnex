import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { AnalysesList } from "@/components/analyses-list";
import { AnalysisForm } from "@/components/analysis-form";
import { LandingPage } from "@/components/landing-page";

interface HomePageProps {
  searchParams?: Promise<{
    repoUrl?: string;
    view?: string;
  }>;
}

/**
 * Root page handler:
 * - When signed out (or view=landing), render the landing marketing page.
 * - When signed in, render the workspace dashboard and auto-submit pending repo if present.
 */
export default async function Home({ searchParams }: HomePageProps) {
  const { userId, orgId } = await auth();
  const params = searchParams ? await searchParams : undefined;

  // Signed out strangers see the landing page
  if (!userId || params?.view === "landing") {
    return <LandingPage />;
  }

  const client = await clerkClient();

  if (!orgId) {
    try {
      const memberships = await client.users.getOrganizationMembershipList({ userId });

      if (memberships.data.length === 0) {
        // Create a default organization so the user always has a workspace.
        const user = await client.users.getUser(userId);
        const defaultOrgName = `${user.firstName || "My"} Workspace`;
        await client.organizations.createOrganization({
          name: defaultOrgName,
          createdBy: userId,
        });
        redirect(params?.repoUrl ? `/?repoUrl=${encodeURIComponent(params.repoUrl)}` : "/");
      }
    } catch (err) {
      console.warn("[dashboard] organization check failed:", err);
    }
  }

  let orgName = "Personal Account";
  if (orgId) {
    try {
      const org = await client.organizations.getOrganization({ organizationId: orgId });
      orgName = org.name;
    } catch (err) {
      console.warn("[dashboard] failed to fetch organization:", orgId, err);
      orgName = "Workspace";
    }
  }

  // Fetch analyses for this org. RLS enforces tenancy; no WHERE clause needed.
  const supabase = await createSupabaseClient();
  const { data: analyses, error } = await supabase
    .from("analyses")
    .select("id, status, stage, created_at, started_at, finished_at, projects(name, repo_url)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[dashboard] analyses query failed:", error.message, error.details ?? "");
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
    <div className="flex flex-col flex-1 bg-zinc-50 font-sans dark:bg-zinc-950 overflow-y-auto">
      <main className="flex flex-1 flex-col w-full max-w-4xl mx-auto px-6 py-10 gap-8">
        {/* Header with workspace breadcrumb */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
            <span>Workspace</span>
            <span className="text-zinc-400 dark:text-zinc-600">/</span>
            <span className="text-zinc-700 dark:text-zinc-300 font-medium">{orgName}</span>
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Repository Maps
          </h1>
        </div>

        {/* Form to submit a new repository */}
        <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 shadow-xs">
          <div className="mb-3">
            <h2 className="text-xs font-mono font-medium text-zinc-900 dark:text-zinc-200">
              New Repository Analysis
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Paste a public GitHub repository containing TypeScript or JavaScript files. Parsing runs via ts-morph AST without token scopes.
            </p>
          </div>
          <AnalysisForm
            initialRepoUrl={params?.repoUrl}
            autoSubmit={Boolean(params?.repoUrl)}
          />
        </section>

        {/* Analyses list */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Recent Analyses ({uniqueAnalyses.length})
            </h2>
          </div>
          <AnalysesList analyses={uniqueAnalyses} />
        </section>
      </main>
    </div>
  );
}
