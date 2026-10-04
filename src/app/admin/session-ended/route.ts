import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

// The cookie was signed by us but the account is now inactive, its password changed,
// or it was deleted. Pages can't change cookies while rendering, so they send the
// browser here to clear it – otherwise the proxy would bounce login ⇄ dashboard.
export function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/admin/login", req.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
