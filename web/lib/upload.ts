import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 5 * 1024 * 1024);

export type UploadPrefix = "community" | "event";

export async function saveImage(
  file: File | null,
  prefix: UploadPrefix,
  maxWidth = 1600,
): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (!ALLOWED.has(file.type)) {
    throw new Error("Format gambar harus JPG, PNG, atau WebP");
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`Ukuran gambar maksimal ${Math.round(MAX_BYTES / 1024 / 1024)} MB`);
  }

  const input = Buffer.from(await file.arrayBuffer());
  const output = await sharp(input)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const root = process.env.UPLOAD_DIR ?? "./data/uploads";
  const dir = path.join(root, prefix);
  await mkdir(dir, { recursive: true });

  const name = `${randomUUID()}.webp`;
  await writeFile(path.join(dir, name), output);
  return `${prefix}/${name}`;
}

export function isValidKey(key: string, prefix: UploadPrefix): boolean {
  return new RegExp(`^${prefix}/[a-f0-9-]+\\.webp$`).test(key);
}
