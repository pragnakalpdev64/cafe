"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { dummyVerify, verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { consumeRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

const LoginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, "Enter your username or phone").max(64),
  password: z.string().min(1, "Enter your password").max(200),
  next: z.string().optional(),
});

export type LoginState = { error?: string; username?: string } | undefined;

const WINDOW = 15 * 60;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { username, password, next } = parsed.data;

  const ip = await clientIp();
  const ipOk = await consumeRateLimit(`login:ip:${ip}`, 20, WINDOW);
  const userOk = await consumeRateLimit(`login:user:${username}`, 5, WINDOW);
  if (!ipOk || !userOk) {
    return { error: "Too many attempts. Please wait 15 minutes and try again.", username };
  }

  // staff can log in with their username or their phone number
  const user = await db.staffUser.findFirst({
    where: { OR: [{ username }, { phone: username }] },
  });
  const ok = user ? await verifyPassword(user.passwordHash, password) : await dummyVerify(password);
  if (!user || !ok || !user.active) {
    return { error: "Wrong username or password.", username };
  }

  await resetRateLimit(`login:user:${username}`);
  await db.staffUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession({ userId: user.id, role: user.role, version: user.sessionVersion });

  // only allow redirects back into the dashboard
  redirect(next && /^\/admin(\/[\w\-/]*)?$/.test(next) ? next : "/admin");
}

export async function logout() {
  await deleteSession();
  redirect("/admin/login");
}
