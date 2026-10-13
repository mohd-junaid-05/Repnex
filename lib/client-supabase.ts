"use client";

import { useMemo } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@clerk/nextjs";

/**
 * Hook to get an authenticated browser Supabase client using Clerk JWT.
 */
export function useSupabase(): SupabaseClient {
  const { getToken } = useAuth();

  return useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        accessToken: async () => {
          return (await getToken({ template: "supabase" })) ?? null;
        },
      }
    );
  }, [getToken]);
}
