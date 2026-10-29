import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAcademyAccount } from "@/lib/auth";

/**
 * Sign-in for the student mobile app with a roll number (or email) and password.
 * Mirrors the `signIn` Server Action: the roll number is looked up with the secret key (which the app never holds),
 * then the password is checked with a plain, cookie-less Supabase client and the session tokens are returned for
 * the app to adopt. Staff accounts and self-registered users are refused, exactly as on the web.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { identifier?: unknown; password?: unknown } | null;
  const identifier = typeof body?.identifier === "string" ? body.identifier.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!identifier || !password) return NextResponse.json({ error: "Enter your login details and password." }, { status: 400 });

  let email = identifier;
  if (!identifier.includes("@")) {
    const { data } = await createAdminClient()
      .from("profiles")
      .select("email")
      // escaped so "%" or "_" can't act as wildcards and match someone else's roll number
      .ilike("roll_no", identifier.replace(/[%_\\]/g, "\\$&"))
      .eq("role", "student")
      .maybeSingle();
    if (!data?.email) return NextResponse.json({ error: "Incorrect roll number or password." }, { status: 401 });
    email = data.email;
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) return NextResponse.json({ error: "Incorrect login details or password." }, { status: 401 });

  if (!isAcademyAccount(data.user.app_metadata)) {
    return NextResponse.json({ error: "This account wasn't created by the academy. Ask the front office for your login." }, { status: 403 });
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  if (profile?.role !== "student") {
    return NextResponse.json({ error: "This is a staff account. Please use the staff portal on the website." }, { status: 403 });
  }

  return NextResponse.json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
}
