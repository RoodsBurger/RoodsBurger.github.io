#!/usr/bin/env node
// Fails when any commit between the base ref and HEAD adds or removes text containing a banned term.
// Never prints term text: a hit reports only the commit sha, the file path (or a placeholder when the
// path itself contains a term), and whether it came from the commit message, a path, or a diff line.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { findBanned } from "./lib/banned.mjs";

const DIFF_GIT_RE = /^diff --git a\/(.*) b\/(.*)$/;
const RENAME_FROM_RE = /^rename from (.*)$/;
const RENAME_TO_RE = /^rename to (.*)$/;
const BINARY_RE = /^Binary files (.*) and (.*) differ$/;

const stripPrefix = (p) => p.replace(/^[ab]\//, "");

export function checkHistory(base = "main", { cwd = process.cwd(), hashes, key } = {}) {
  const log = execFileSync(
    "git",
    ["-c", "core.quotePath=false", "log", "-p", "--format=COMMIT %h%n%B", `${base}..HEAD`],
    { cwd, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }
  );

  const hits = [];
  const seenPathHits = new Set();
  let sha = "";
  let inMessage = false;
  let file = "";

  const notePath = (rawPath) => {
    if (!rawPath || rawPath === "/dev/null") return;
    const path = stripPrefix(rawPath);
    const banned = findBanned(path, hashes, key);
    file = banned ? "[redacted path]" : path;
    const dedupeKey = `${sha}:${path}`;
    if (banned && !seenPathHits.has(dedupeKey)) {
      seenPathHits.add(dedupeKey);
      hits.push(`${sha} [redacted path] (path)`);
    }
  };

  for (const line of log.split("\n")) {
    if (line.startsWith("COMMIT ")) {
      sha = line.slice("COMMIT ".length).trim();
      inMessage = true;
      file = "";
      continue;
    }

    if (inMessage) {
      if (line.startsWith("diff --git ")) {
        inMessage = false;
      } else {
        if (findBanned(line, hashes, key)) hits.push(`${sha} (commit message)`);
        continue;
      }
    }

    const diffMatch = line.match(DIFF_GIT_RE);
    if (diffMatch) {
      notePath(diffMatch[1]);
      notePath(diffMatch[2]);
      continue;
    }
    const renameFrom = line.match(RENAME_FROM_RE);
    if (renameFrom) { notePath(renameFrom[1]); continue; }
    const renameTo = line.match(RENAME_TO_RE);
    if (renameTo) { notePath(renameTo[1]); continue; }
    const binary = line.match(BINARY_RE);
    if (binary) { notePath(binary[1]); notePath(binary[2]); continue; }

    if ((line.startsWith("+") || line.startsWith("-")) && !line.startsWith("+++") && !line.startsWith("---")) {
      if (findBanned(line, hashes, key)) hits.push(`${sha} ${file} (${line[0]} line)`);
    }
  }

  return hits;
}

function main() {
  const base = process.argv[2] || "main";
  const hits = checkHistory(base);
  if (hits.length) {
    console.error(`${hits.length} banned-term lines in history:`);
    for (const h of hits.slice(0, 50)) console.error("  " + h);
    process.exit(1);
  }
  console.log(`History clean (${base}..HEAD).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
