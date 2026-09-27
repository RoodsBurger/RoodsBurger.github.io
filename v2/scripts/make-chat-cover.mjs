#!/usr/bin/env node
// Composites a cropped ChatRag diagram screenshot onto the chat cover canvas; pass the screenshot path as the CLI arg.
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "public/artifacts/chat/cover.webp");
const diagramPath = process.argv[2];

if (!diagramPath) {
  console.error("usage: node scripts/make-chat-cover.mjs <path-to-cropped-diagram-screenshot.png>");
  process.exit(1);
}

const CANVAS_W = 2560;
const CANVAS_H = 1600;
// Matches --color-background in light theme (hsl(60 12% 97%)).
const BG = "#f8f8f6";

// The diagram fills about 80% of the canvas width, keeping its own aspect ratio.
const TARGET_W = Math.round(CANVAS_W * 0.8);

const diagramMeta = await sharp(diagramPath).metadata();
const targetH = Math.round((diagramMeta.height / diagramMeta.width) * TARGET_W);
const diagram = await sharp(diagramPath).resize(TARGET_W, targetH).toBuffer();

const left = Math.round((CANVAS_W - TARGET_W) / 2);
const top = Math.round((CANVAS_H - targetH) / 2);

const cover = await sharp({ create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: BG } })
  .composite([{ input: diagram, left, top }])
  .webp({ quality: 90 })
  .toBuffer();

writeFileSync(outPath, cover);
console.log(`wrote ${outPath} (${cover.length} bytes)`);
