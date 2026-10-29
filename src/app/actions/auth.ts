"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAcademyAccount, isStaffRole, type Role } from "@/lib/auth";
import { site } from "@/lib/site";

export type FormState = { error?: string; ok?: string } | undefined;

type Portal = "student" | "admin";

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const portal: Portal = formData.get("portal") === "admin" ? "admin" : "student";
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!identifier || !password) return { error: "Enter your login details and password." };

  // Students may sign in with their roll number instead of email
  let email = identifier;
  if (portal === "student" && !identifier.includes("@")) {
    const { data } = await createAdminClient()
      .from("profiles")
      .select("email")
      // escaped so "%" or "_" can't act as wildcards and match someone else's roll number
      .ilike("roll_no", identifier.replace(/[%_\\]/g, "\\$&"))
      .eq("role", "student")
      .maybeSingle();
    if (!data?.email) return { error: "Incorrect roll number or password." };
    email = data.email;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "Incorrect login details or password." };
  if (!isAcademyAccount(data.user.app_metadata)) {
    await supabase.auth.signOut();
    return { error: "This account wasn't created by the academy. Ask the front office for your login." };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  const role = profile?.role as Role | undefined;
  const allowed = portal === "admin" ? !!role && isStaffRole(role) : role === "student";
  if (!allowed) {
    await supabase.auth.signOut();
    return {
      error:
        portal === "admin"
          ? "This account doesn't have staff access. Students sign in at the student portal."
          : "This is a staff account. Please use the staff portal.",
    };
  }

  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith(`/${portal}`) && !next.startsWith(`/${portal}/login`) ? next : `/${portal}`);
}

/**
 * "Continue with Google" on the student login: sends the browser to Google, which comes back to /auth/callback
 * (src/app/auth/callback/route.ts) where the account is checked the same way as a password sign-in.
 * Only the student portal offers this; staff keep their passwords.
 */
export async function signInWithGoogle(formData: FormData) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const origin = h.get("origin") ?? (host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : site.url);
  const callback = new URL("/auth/callback", origin);
  const next = String(formData.get("next") ?? "");
  if (next.startsWith("/student") && !next.startsWith("/student/login")) callback.searchParams.set("next", next);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString(), queryParams: { prompt: "select_account" } },
  });
  if (error || !data.url) {
    redirect(`/student/login?error=${encodeURIComponent("Google sign-in isn't available right now. Use your roll number and password.")}`);
  }
  redirect(data.url);
}

export async function signOut(formData: FormData) {
  const portal: Portal = formData.get("portal") === "admin" ? "admin" : "student";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${portal}/login`);
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "Passwords don't match." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { ok: "Password updated." };
}
