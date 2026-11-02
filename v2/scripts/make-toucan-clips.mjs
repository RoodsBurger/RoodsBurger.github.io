#!/usr/bin/env node
// Cuts the Toucan page clips, posters and cover stills from the app's light and dark studio flow renders (00_flow.mp4).
// Usage: FFMPEG=/path/to/ffmpeg [ONLY=budgets,analysis] node scripts/make-toucan-clips.mjs <light 00_flow.mp4> <dark 00_flow.mp4>
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public/artifacts/raiapps");
const ffmpeg = process.env.FFMPEG || "ffmpeg";
const [light, dark] = process.argv.slice(2);
if (!light || !dark) {
  console.error("usage: make-toucan-clips.mjs <light 00_flow.mp4> <dark 00_flow.mp4>");
  process.exit(1);
}

// The phone's screen inside the 2160x3840 studio frame, scaled to 720 wide at 30 fps.
const SCREEN = "crop=1472:3156:344:342";
const VF = `${SCREEN},fps=30,scale=720:1544:flags=lanczos`;

// Start and end seconds of each clip in the flow, which both renders share; each starts once its page has settled.
const CLIPS = [
  { name: "dashboard", from: 0.3, to: 12.6 },
  { name: "activity", from: 13.1, to: 24.5 },
  { name: "budgets", from: 26, to: 42.9 },
  { name: "analysis", from: 43.4, to: 60.3 },
  { name: "invest", from: 61, to: 79.4 },
  { name: "sandbox", from: 80.3, to: 90.3 },
];

// Single frames for the light and dark project covers, at 1080 wide.
const STILLS = [
  { name: "dashboard", at: 0.5 },
  { name: "analysis", at: 47 },
];

// ONLY limits a run to the named clips and stills.
const only = process.env.ONLY?.split(",");
const run = (args) => execFileSync(ffmpeg, ["-loglevel", "error", "-y", ...args], { stdio: "inherit" });

for (const [src, suffix] of [[light, ""], [dark, "-dark"]]) {
  for (const c of CLIPS.filter((c) => !only || only.includes(c.name))) {
    const base = join(outDir, `toucan-${c.name}${suffix}`);
    const cut = ["-ss", String(c.from), "-t", String(c.to - c.from), "-i", src, "-vf", VF, "-an"];
    run([...cut, "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-pix_fmt", "yuv420p", "-movflags", "+faststart", `${base}.mp4`]);
    run([...cut, "-c:v", "libvpx-vp9", "-crf", "38", "-b:v", "0", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", `${base}.webm`]);
    run(["-ss", String(c.from), "-i", src, "-vf", `${SCREEN},scale=720:1544:flags=lanczos`, "-frames:v", "1", "-c:v", "libwebp", "-quality", "85", `${base}.webp`]);
  }
}

for (const [src, suffix] of [[light, ""], [dark, "-dark"]]) {
  for (const s of STILLS.filter((s) => !only || only.includes(s.name))) {
    run(["-ss", String(s.at), "-i", src, "-vf", `${SCREEN},scale=1080:2316:flags=lanczos`, "-frames:v", "1", "-c:v", "libwebp", "-quality", "90", join(outDir, `toucan-${s.name}-still${suffix}.webp`)]);
  }
}
