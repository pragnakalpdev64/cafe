import { jwtVerify } from "jose";
import { type NextRequest, NextResponse } from "next/server";

// Optimistic check only (cookie signature + expiry). The real check – user still
// active, role, session version – happens in the data access layer on every request.
const SESSION_COOKIE = "hh_session";

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isLogin = pathname === "/admin/login";
  if (pathname === "/admin/session-ended") return NextResponse.next();
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  let valid = false;
  if (token && process.env.AUTH_SECRET) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET), { algorithms: ["HS256"] });
      valid = true;
    } catch {
      valid = false;
    }
  }

  if (!valid && !isLogin) {
    const url = new URL("/admin/login", req.nextUrl);
    if (pathname !== "/admin") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (valid && isLogin) return NextResponse.redirect(new URL("/admin", req.nextUrl));
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
