import { readFile } from "node:fs/promises";
import path from "node:path";

const KEY_RE = /^(community|event)\/[a-zA-Z0-9-]+\.webp$/;

export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  const { key } = await context.params;
  const joined = key.join("/");
  if (!KEY_RE.test(joined)) {
    return new Response("Not found", { status: 404 });
  }

  const root = process.env.UPLOAD_DIR ?? "./data/uploads";
  try {
    const file = await readFile(path.join(root, joined));
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=2592000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
