import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export function uploadRoot() {
  return path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
}

/** Resolves a stored relative path inside the upload root, or null if it tries to escape it. */
export function resolveUpload(relative: string) {
  const root = uploadRoot();
  const full = path.resolve(root, relative);
  return full.startsWith(root + path.sep) ? full : null;
}

/**
 * Shrinks a phone photo to a 1200px WebP (also strips EXIF/location data) and stores it.
 * Returns the path relative to the upload root, e.g. "menu/abc.webp".
 */
export async function saveMenuPhoto(file: File) {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Photo is larger than 8 MB.");
  const input = Buffer.from(await file.arrayBuffer());
  let output: Buffer;
  try {
    output = await sharp(input)
      .rotate() // respect camera orientation before EXIF is dropped
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw new Error("That file isn't a photo we can read. Use JPG, PNG, WebP or HEIC.");
  }
  const relative = `menu/${randomUUID()}.webp`;
  const full = resolveUpload(relative)!;
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, output);
  return relative;
}

export async function deleteUpload(relative: string | null | undefined) {
  if (!relative) return;
  const full = resolveUpload(relative);
  if (full) await unlink(full).catch(() => {});
}
