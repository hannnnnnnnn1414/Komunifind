import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getSupabaseAdmin, storageBucket } from "./supabase";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 5 * 1024 * 1024);

export type UploadPrefix = "community" | "event";

export function isValidKey(key: string, prefix: UploadPrefix): boolean {
  return new RegExp(`^${prefix}/[a-f0-9-]+\\.webp$`).test(key);
}

async function processImage(file: File, maxWidth: number): Promise<Buffer> {
  const input = Buffer.from(await file.arrayBuffer());
  return sharp(input)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}

async function saveLocal(buffer: Buffer, prefix: UploadPrefix): Promise<string> {
  const root = process.env.UPLOAD_DIR ?? "./data/uploads";
  const dir = path.join(root, prefix);
  await mkdir(dir, { recursive: true });

  const name = `${randomUUID()}.webp`;
  await writeFile(path.join(dir, name), buffer);
  return `${prefix}/${name}`;
}

async function saveSupabase(buffer: Buffer, prefix: UploadPrefix): Promise<string> {
  const key = `${prefix}/${randomUUID()}.webp`;
  const { error } = await getSupabaseAdmin()
    .storage.from(storageBucket())
    .upload(key, buffer, { contentType: "image/webp", upsert: false });
  if (error) {
    throw new Error(`Upload gambar gagal: ${error.message}`);
  }
  return key;
}

function storageDriver(): "local" | "supabase" {
  return process.env.STORAGE_DRIVER === "supabase" ? "supabase" : "local";
}

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

  const output = await processImage(file, maxWidth);
  if (storageDriver() === "supabase") {
    return saveSupabase(output, prefix);
  }
  return saveLocal(output, prefix);
}
