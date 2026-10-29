import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STUDY_BUCKET } from "@/lib/study";

/**
 * Signed URL for a study material file, for the student mobile app. The app sends its Supabase access token as a
 * Bearer token; the row is read as that user, so RLS decides who may see it (their batch, everyone's), then a
 * 5-minute signed URL to the private bucket is returned. Same flow as /student/study/[id]/file, minus the redirect.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data: claims } = await supabase.auth.getClaims(token);
  if (!claims?.claims.sub) return NextResponse.json({ error: "Session expired. Sign in again." }, { status: 401 });

  const { id } = await ctx.params;
  const { data } = await supabase.from("study_materials").select("file_path, file_name").eq("id", id).maybeSingle();
  if (!data?.file_path) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: signed, error } = await createAdminClient().storage.from(STUDY_BUCKET).createSignedUrl(data.file_path, 300);
  if (error || !signed) return NextResponse.json({ error: "Couldn't open this file" }, { status: 500 });
  return NextResponse.json({ url: signed.signedUrl, name: data.file_name });
}
