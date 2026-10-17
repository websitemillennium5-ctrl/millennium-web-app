import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Optimistic gate only: keeps signed-out visitors out of the portals. Role checks happen in each portal layout.
export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname } = request.nextUrl;
  const portal = pathname.startsWith("/admin") ? "/admin" : "/student";
  const isLogin = pathname === `${portal}/login`;

  if (!userId && !isLogin) {
    const url = new URL(`${portal}/login`, request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/student/:path*", "/admin/:path*"],
};
