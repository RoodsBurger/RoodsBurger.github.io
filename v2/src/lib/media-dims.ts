import { existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

// Astro/Netlify always run build and dev from the v2/ project root, so cwd resolves public/ reliably.
const publicDir = join(process.cwd(), "public");
let warnedMissingPublicDir = false;

export interface MediaDims {
  width: number;
  height: number;
}

// Reads an image's intrinsic pixel size from public/ for width/height attributes; videos and unreadable files use the caller's fallback.
export async function dimsFor(src: string, isVideo: boolean, fallback: MediaDims): Promise<MediaDims> {
  if (!existsSync(publicDir) && !warnedMissingPublicDir) {
    warnedMissingPublicDir = true;
    console.warn(`[media-dims] public/ not found under process.cwd() (${process.cwd()}); using fallback media dimensions.`);
  }
  if (isVideo) return fallback;
  const filePath = join(publicDir, src);
  if (!existsSync(filePath)) return fallback;
  try {
    const meta = await sharp(filePath).metadata();
    if (meta.width && meta.height) return { width: meta.width, height: meta.height };
  } catch {
    // Fall through to the fallback size below.
  }
  return fallback;
}
