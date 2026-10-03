import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ThemeSwitcher } from "@/components/theme-switcher";

export default async function Home() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const client = await clerkClient();

  if (!orgId) {
    // If the user has no active organization, check if they are part of any
    const memberships = await client.users.getOrganizationMembershipList({ userId });
    
    if (memberships.data.length > 0) {
      // They have an org but it's not active, so we just redirect them to a page that forces org selection or we use client-side setting
      // But Clerk allows setting orgId via URL parameter or cookie. For now, just show the org switcher.
      // Wait, we can redirect to /?__clerk_ticket=... or just let them use the switcher.
      // Actually, if we just want them to be in one, we can return a client component that sets it.
    } else {
      // Create a default organization for them
      const user = await client.users.getUser(userId);
      const orgName = `${user.firstName || 'My'} Workspace`;
      await client.organizations.createOrganization({
        name: orgName,
        createdBy: userId,
      });
      // After creating, redirect to refresh the token/auth state
      redirect("/");
    }
  }

  // Fetch the organization details to render it server-side
  let orgName = "Personal Account";
  if (orgId) {
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    orgName = org.name;
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black p-8">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-start gap-8 bg-white dark:bg-black p-8 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm">
        <h1 className="text-3xl font-semibold text-black dark:text-white">
          Dashboard
        </h1>
        
        <div className="flex flex-col gap-2">
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Welcome to <span className="font-semibold text-black dark:text-white">{orgName}</span>
          </p>
          <p className="text-sm text-zinc-500">
            Current Organization ID (Server Rendered): {orgId || "None"}
          </p>
        </div>

        <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 w-full flex justify-between items-center">
          <ThemeSwitcher />
        </div>
      </main>
    </div>
  );
}
