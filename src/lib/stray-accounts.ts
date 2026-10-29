import type { User } from "@supabase/supabase-js";
import { isAcademyAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** How recently a stray account must have been created for it to be deleted here (so nothing older is ever touched). */
const FRESH_MS = 10 * 60_000;

/**
 * "Continue with Google" by someone whose Gmail matches no student account makes Supabase create a brand-new auth
 * user (it can't know in advance that we'd refuse it). Such a user has no role in app_metadata, so it's useless;
 * delete it again so the next attempt starts clean and nothing piles up. Academy accounts are never touched.
 */
export async function deleteStrayAccount(user: Pick<User, "id" | "app_metadata" | "created_at">) {
  if (isAcademyAccount(user.app_metadata)) return;
  if (Date.now() - Date.parse(user.created_at) > FRESH_MS) return;
  await createAdminClient().auth.admin.deleteUser(user.id);
}

/** The message shown when a Google account doesn't belong to any student. */
export const noStudentAccount = (email: string | undefined) =>
  `No student account uses ${email ?? "that Google account"}. Sign in with your roll number, or ask the front office to put this email on your account.`;
