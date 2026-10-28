import "./env";
import { createClerkClient } from "@clerk/nextjs/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Creates an authenticated Supabase client for eval scripts running outside the web app.
 * Injects a Clerk JWT with template "supabase" so Postgres RLS policies allow reading rows
 * belonging to the user's organization.
 */
export async function getEvalSupabaseClient(): Promise<SupabaseClient> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const clerkSecret = process.env.CLERK_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  let bearerToken: string | null = null;

  if (clerkSecret) {
    try {
      const clerk = createClerkClient({ secretKey: clerkSecret });
      const users = await clerk.users.getUserList({ limit: 1 });
      if (users.data.length > 0) {
        const userId = users.data[0].id;
        const sessions = await clerk.sessions.getSessionList({ userId });
        const active = sessions.data.find((s) => s.status === "active") ?? sessions.data[0];
        if (active) {
          const tokenRes = await clerk.sessions.getToken(active.id, "supabase");
          bearerToken = tokenRes.jwt;
        }
      }
    } catch (err) {
      console.warn("[evals] Warning: Could not mint Clerk token for Supabase:", (err as Error).message);
    }
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    ...(bearerToken
      ? { global: { headers: { Authorization: `Bearer ${bearerToken}` } } }
      : {}),
  });
}
