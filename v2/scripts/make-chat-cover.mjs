#!/usr/bin/env node
// Composites transparent ChatRag diagram captures (light and dark theme) onto transparent cover canvases.
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [lightPath, darkPath] = process.argv.slice(2);

if (!lightPath || !darkPath) {
  console.error("usage: node scripts/make-chat-cover.mjs <light-diagram.png> <dark-diagram.png>");
  process.exit(1);
}

const CANVAS_W = 2560;
const CANVAS_H = 1600;
// Transparent, so the card behind the cover shows through in either theme.
const BG = { r: 0, g: 0, b: 0, alpha: 0 };

// The diagram fills about 80% of the canvas width, keeping its own aspect ratio.
const TARGET_W = Math.round(CANVAS_W * 0.8);

async function build(diagramPath, outPath) {
  const meta = await sharp(diagramPath).metadata();
  const targetH = Math.round((meta.height / meta.width) * TARGET_W);
  const diagram = await sharp(diagramPath).resize(TARGET_W, targetH).toBuffer();
  const left = Math.round((CANVAS_W - TARGET_W) / 2);
  const top = Math.round((CANVAS_H - targetH) / 2);
  const cover = await sharp({ create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: BG } })
    .composite([{ input: diagram, left, top }])
    .webp({ quality: 90, alphaQuality: 100 })
    .toBuffer();
  writeFileSync(outPath, cover);
  console.log(`wrote ${outPath} (${cover.length} bytes)`);
}

await build(lightPath, join(root, "public/artifacts/chat/cover.webp"));
await build(darkPath, join(root, "public/artifacts/chat/cover-dark.webp"));
