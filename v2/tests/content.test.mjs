import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { findBanned } from "../scripts/lib/banned.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "src");
const projectsDir = join(root, "src/content/projects");

const PUBLIC_REPOS = new Set(
  ["tobias", "TidyNET", "computation_brain", "grinder", "RaiUsage", "RoodsBurger.github.io"].map((s) =>
    s.toLowerCase(),
  ),
);
const RETIRED = ["wallet", "plex", "raidrive", "lamp"];

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

// The loader globs **/*.mdx under src/content/projects, so project files are gathered the same way.
const projectFiles = () => walk(projectsDir).filter((p) => p.endsWith(".mdx"));
const read = (p) => readFileSync(p, "utf8");
const slugOf = (p) => p.slice(projectsDir.length + 1).replace(/\.mdx$/, "");
const frontmatter = (src) => src.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";

const ARTIFACT_RE = /(\/artifacts\/[^"'`)\s}]+)/g;

test("every /artifacts path referenced under src/ exists in public/", () => {
  const missing = [];
  for (const p of walk(srcDir)) {
    for (const [, path] of read(p).matchAll(ARTIFACT_RE)) {
      if (path.includes("${")) continue; // unresolved template literal, not a literal path
      if (!existsSync(join(root, "public", path))) missing.push(`${p.slice(root.length)}: ${path}`);
    }
  }
  assert.deepEqual(missing, []);
});

test("GitHub links point only at public RoodsBurger repos", () => {
  const bad = [];
  for (const p of walk(srcDir)) {
    for (const [, repo] of read(p).matchAll(/github\.com\/roodsburger\/([^/"')\s#]+)/gi)) {
      if (!PUBLIC_REPOS.has(repo.toLowerCase())) bad.push(`${p.slice(root.length)}: ${repo}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("no banned terms in site source, source file paths, or public filenames", () => {
  const hits = [];
  for (const p of walk(srcDir)) {
    const contentHit = findBanned(read(p));
    if (contentHit) hits.push(`${p.slice(root.length)}: ${contentHit}`);
    const pathHit = findBanned(p.slice(root.length));
    if (pathHit) hits.push(`${p.slice(root.length)} (path): ${pathHit}`);
  }
  for (const p of walk(join(root, "public"))) {
    const term = findBanned(p.slice(root.length));
    if (term) hits.push(`${p.slice(root.length)}: ${term}`);
  }
  assert.deepEqual(hits, []);
});

// Reads the 12-byte glTF header, then chunk 0 (which must be "JSON"), and returns its text.
function glbJsonText(buf) {
  if (buf.length < 20 || buf.toString("ascii", 0, 4) !== "glTF") return "";
  const chunkLength = buf.readUInt32LE(12);
  const chunkType = buf.toString("ascii", 16, 20);
  if (chunkType !== "JSON") return "";
  return buf.toString("utf8", 20, 20 + chunkLength);
}

test("no banned terms in public text assets (svg/json/md/txt) or glb JSON chunks", () => {
  const hits = [];
  const TEXT_EXT = new Set([".svg", ".json", ".md", ".txt"]);
  for (const p of walk(join(root, "public"))) {
    const ext = p.slice(p.lastIndexOf("."));
    if (TEXT_EXT.has(ext)) {
      if (findBanned(readFileSync(p, "utf8"))) hits.push(p.slice(root.length));
    } else if (ext === ".glb") {
      if (findBanned(glbJsonText(readFileSync(p)))) hits.push(p.slice(root.length));
    }
  }
  assert.deepEqual(hits, []);
});

test("retired project slugs are gone", () => {
  const slugs = projectFiles().map(slugOf);
  assert.deepEqual(slugs.filter((s) => RETIRED.includes(s)), []);
});

test("every project frontmatter has title, summary, cover, coverAlt", () => {
  for (const p of projectFiles()) {
    const fm = frontmatter(read(p));
    for (const key of ["title", "summary", "cover", "coverAlt"]) {
      assert.match(fm, new RegExp(`^${key}:`, "m"), `${p.slice(root.length)} missing ${key}`);
    }
  }
});

// Update this exact slug set when a project is added or removed.
test("project slugs are exactly the current set", () => {
  const slugs = projectFiles().map(slugOf).sort();
  assert.deepEqual(slugs, ["chat-project", "desk-lamp", "grinder", "knolling", "pruning", "raiapps", "tobias", "wall-lamp"]);
});

test("no .pdf files under public/ or dist/", () => {
  const hits = [];
  for (const p of walk(join(root, "public"))) {
    if (p.endsWith(".pdf")) hits.push(p.slice(root.length));
  }
  const distDir = join(root, "dist");
  if (existsSync(distDir)) {
    for (const p of walk(distDir)) {
      if (p.endsWith(".pdf")) hits.push(p.slice(root.length));
    }
  }
  assert.deepEqual(hits, []);
});

test("project order values are unique", () => {
  const orders = projectFiles().map((p) => {
    const m = frontmatter(read(p)).match(/^order:\s*(\d+)/m);
    return m ? Number(m[1]) : null;
  });
  assert.equal(new Set(orders).size, orders.length);
});

test("no project has more than 4 tags", () => {
  const bad = [];
  for (const p of projectFiles()) {
    const fm = frontmatter(read(p));
    const m = fm.match(/^tags:\s*\[([^\]]*)\]/m);
    if (!m) {
      bad.push(`${p.slice(root.length)}: no tags: line found`);
      continue;
    }
    const tags = [...m[1].matchAll(/"([^"]*)"/g)].map(([, tag]) => tag);
    if (tags.length > 4) bad.push(`${p.slice(root.length)}: ${tags.length} tags`);
  }
  assert.deepEqual(bad, []);
});
