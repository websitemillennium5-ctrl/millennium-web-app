import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { STUDY_BUCKET } from "@/lib/study";

/**
 * Opens a study material file: the row is read as the signed-in user, so RLS decides who may see it
 * (their batch, everyone's, or staff), then a 5-minute signed URL to the private bucket is handed out.
 * ?download=1 saves the file instead of opening it in the browser.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/student/study/[id]/file">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data } = await supabase.from("study_materials").select("file_path, file_name").eq("id", id).maybeSingle();
  if (!data?.file_path) return new NextResponse("Not found", { status: 404 });

  const download = request.nextUrl.searchParams.has("download") ? (data.file_name ?? true) : undefined;
  const { data: signed, error } = await createAdminClient().storage.from(STUDY_BUCKET).createSignedUrl(data.file_path, 300, { download });
  if (error || !signed) return new NextResponse("Couldn't open this file", { status: 500 });
  return NextResponse.redirect(signed.signedUrl);
}
