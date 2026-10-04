import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Role } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { decryptSession, SESSION_COOKIE } from "./session";

export type CurrentUser = { id: string; name: string; username: string; role: Role };

/**
 * Data Access Layer: the real auth check. Every admin page and server action calls
 * this – the proxy only does a quick cookie check for redirects.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const session = await decryptSession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await db.staffUser.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, username: true, role: true, active: true, sessionVersion: true },
  });
  if (!user || !user.active || user.sessionVersion !== session.version) return null;
  return { id: user.id, name: user.name, username: user.username, role: user.role };
});

/** For pages: redirect to login (or the dashboard if the role is too low). */
export async function requireUser(role?: Role): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/session-ended");
  if (role === "OWNER" && user.role !== "OWNER") redirect("/admin");
  return user;
}

export class AuthError extends Error {}

/** For server actions: throw instead of redirecting. */
export async function assertUser(role?: Role): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Please log in again.");
  if (role === "OWNER" && user.role !== "OWNER") throw new AuthError("Only the owner can do this.");
  return user;
}
