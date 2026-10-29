import { NextResponse, type NextRequest } from "next/server";
import { isAcademyAccount } from "@/lib/auth";
import { deleteStrayAccount, noStudentAccount } from "@/lib/stray-accounts";
import { createClient } from "@/lib/supabase/server";

/** The public origin of this request: the forwarded host on Vercel, the request's own host in `next dev`. */
function requestOrigin(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host");
  return host ? `${request.headers.get("x-forwarded-proto") ?? "https"}://${host}` : request.nextUrl.origin;
}

/**
 * Where Google sends the browser back after "Continue with Google" (started by the signInWithGoogle action).
 * Swaps the one-time code for a session, then applies the student-portal rules: only accounts the academy created
 * may sign in, and only students (staff use their password on the staff portal). A Google account that matches no
 * student makes Supabase create a fresh user; that user is deleted again and the student is told what to do.
 */
export async function GET(request: NextRequest) {
  const origin = requestOrigin(request);
  const params = request.nextUrl.searchParams;
  const fail = (message: string) => NextResponse.redirect(new URL(`/student/login?error=${encodeURIComponent(message)}`, origin));

  const code = params.get("code");
  if (!code) return fail(params.get("error_description") ?? "Google sign-in was cancelled.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return fail("Google sign-in didn't complete. Try again, or use your roll number and password.");
  const { user } = data;

  if (!isAcademyAccount(user.app_metadata)) {
    await supabase.auth.signOut();
    await deleteStrayAccount(user);
    return fail(noStudentAccount(user.email));
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "student") {
    await supabase.auth.signOut();
    return fail("This is a staff account. Please use the staff portal.");
  }

  const next = params.get("next") ?? "";
  return NextResponse.redirect(new URL(next.startsWith("/student") && !next.startsWith("/student/login") ? next : "/student", origin));
}
