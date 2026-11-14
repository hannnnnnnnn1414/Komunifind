import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/me", "/dashboard", "/admin"];
const SESSION_COOKIE = "kf_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!needsAuth) return NextResponse.next();

  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/me/:path*", "/dashboard/:path*", "/admin/:path*"],
};
