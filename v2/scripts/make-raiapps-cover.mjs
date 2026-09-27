#!/usr/bin/env node
// Composes the RaiApps cover: three complete phone screenshots side by side on a dark neutral background.
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const artDir = join(root, "public/artifacts/raiapps");
const outPath = join(artDir, "cover.webp");

const CANVAS_W = 2560;
const CANVAS_H = 1600;
const BG = "#18181b";
const BEZEL = "#0c0c0e";
const BORDER = "#3f3f46";

// Screenshot source geometry: full, uncropped 1080x2400 phone screenshots.
const SOURCE_W = 1080;
const SOURCE_H = 2400;

// Phone card geometry: a thin bezel, full-height ~82% of the canvas, nothing cropped; the spotlight's gradient may overlap the phones' lower part, which is accepted.
const BEZEL_PAD = 8;
const OUTER_RADIUS = 58;
const INNER_RADIUS = 50;
const PHONE_H = Math.round(CANVAS_H * 0.82);
const INNER_H = PHONE_H - 2 * BEZEL_PAD;
const INNER_W = Math.round((INNER_H * SOURCE_W) / SOURCE_H);
const PHONE_W = INNER_W + 2 * BEZEL_PAD;
const GAP = 64;

// Vertically centred on the canvas, with margins comfortably above the 8% floor.
const TOP_Y = Math.round((CANVAS_H - PHONE_H) / 2);

const roundedRectMask = (w, h, r) =>
  Buffer.from(`<svg width="${w}" height="${h}"><rect x="0" y="0" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#fff"/></svg>`);

const borderOverlay = (w, h, r) =>
  Buffer.from(
    `<svg width="${w}" height="${h}"><rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${r}" ry="${r}" fill="none" stroke="${BORDER}" stroke-width="1.5"/></svg>`,
  );

async function buildPhone(screenshotPath) {
  const screenshot = await sharp(screenshotPath)
    .resize(INNER_W, INNER_H, { fit: "cover" })
    .toBuffer();
  const roundedScreenshot = await sharp(screenshot)
    .composite([{ input: roundedRectMask(INNER_W, INNER_H, INNER_RADIUS), blend: "dest-in" }])
    .png()
    .toBuffer();

  const bezel = await sharp(roundedRectMask(PHONE_W, PHONE_H, OUTER_RADIUS))
    .composite([{ input: await sharp({ create: { width: PHONE_W, height: PHONE_H, channels: 4, background: BEZEL } }).png().toBuffer(), blend: "in" }])
    .png()
    .toBuffer();

  return sharp(bezel)
    .composite([
      { input: roundedScreenshot, left: BEZEL_PAD, top: BEZEL_PAD },
      { input: borderOverlay(PHONE_W, PHONE_H, OUTER_RADIUS), left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

const phones = await Promise.all(
  ["budget-dashboard.webp", "climbing-today.webp", "budget-analysis.webp"].map((f) => buildPhone(join(artDir, f))),
);

const totalW = PHONE_W * 3 + GAP * 2;
const startX = Math.round((CANVAS_W - totalW) / 2);
const positions = [0, 1, 2].map((i) => startX + i * (PHONE_W + GAP));

const cover = await sharp({ create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: BG } })
  .composite(phones.map((input, i) => ({ input, left: positions[i], top: TOP_Y })))
  .webp({ quality: 90 })
  .toBuffer();

writeFileSync(outPath, cover);
console.log(`wrote ${outPath} (${cover.length} bytes)`);
