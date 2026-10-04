import { readFile } from "node:fs/promises";
import { resolveUpload } from "@/lib/uploads";

// Serves uploaded menu photos. Files get a fresh random name on every upload,
// so they can be cached forever.
export async function GET(_req: Request, ctx: RouteContext<"/media/[...path]">) {
  const { path } = await ctx.params;
  const relative = path.join("/");
  const full = /^[\w/-]+\.webp$/.test(relative) ? resolveUpload(relative) : null;
  if (!full) return new Response("Not found", { status: 404 });
  try {
    const body = await readFile(full);
    return new Response(body, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
