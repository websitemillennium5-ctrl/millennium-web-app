import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client: bypasses RLS and can create auth users. Only import this from Server Actions
 * after checking the caller is staff — never from a client component.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") throw new Error("createAdminClient must only run on the server");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
