import { NextResponse, type NextRequest } from "next/server";
import { deleteStrayAccount } from "@/lib/stray-accounts";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Called by the student app right after a "Continue with Google" that matched no student account: the app
 * can't delete the stray auth user Supabase just created (that needs the secret key), so it hands over the
 * session's access token and this route does it, with the same safeguards as the web callback.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { access_token?: unknown } | null;
  const token = typeof body?.access_token === "string" ? body.access_token : "";
  if (!token) return NextResponse.json({ error: "Missing token." }, { status: 400 });

  const { data, error } = await createAdminClient().auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ error: "Invalid token." }, { status: 401 });
  await deleteStrayAccount(data.user);
  return new NextResponse(null, { status: 204 });
}
