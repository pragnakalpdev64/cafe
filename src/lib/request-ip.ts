import "server-only";
import { headers } from "next/headers";

/** Client IP as forwarded by Caddy in production; "local" in development. */
export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}
