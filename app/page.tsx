import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { AnalysesList } from "@/components/analyses-list";

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
    // Has orgs but none active — let the OrganizationSwitcher in the header handle it.
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
    .select("id, status, created_at, started_at, finished_at, projects(name, repo_url)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    // Log server-side; surface a safe message to the UI.
    console.error("[dashboard] analyses query failed:", error.message);
  }

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

        {/* Analyses list */}
        <section>
          <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-4">
            Analyses
          </h2>
          <AnalysesList analyses={analyses ?? []} />
        </section>
      </main>
    </div>
  );
}
