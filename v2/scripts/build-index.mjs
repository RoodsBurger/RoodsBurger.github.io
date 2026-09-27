#!/usr/bin/env node
// Builds the chat knowledge base from knowledge/*.md into a Pinecone namespace.
// Usage: node --env-file=.env scripts/build-index.mjs [--dry-run] [--namespace <ns>] [--prune]
// The namespace must match v2-[\w-]+; this refuses the default ("") and __default__ namespaces
// since the live site reads from them. --dry-run never touches the network. --prune actually
// deletes stale records; without it, the script only reports how many there are.

import { readdirSync, readFileSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter, chunkMarkdown } from "./lib/chunk.mjs";
import { findBanned } from "./lib/banned.mjs";
import { validateNamespace, pruneDecision } from "./lib/index-guards.mjs";
import { EMBED_MODEL, EMBED_DIM } from "../src/lib/chat/models.ts";

const EMBED_BATCH = 96;
const UPSERT_BATCH = 100;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const prune = args.includes("--prune");
const nsIdx = args.indexOf("--namespace");
const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const namespace = nsIdx >= 0 ? args[nsIdx + 1] : `v2-${today}`;

const nsError = validateNamespace(namespace);
if (nsError) {
  console.error(nsError);
  process.exit(1);
}

const sourceDir = join(dirname(fileURLToPath(import.meta.url)), "..", "knowledge");
const files = readdirSync(sourceDir).filter((f) => f.endsWith(".md")).sort();
const chunks = files.flatMap((f) =>
  chunkMarkdown({ slug: basename(f, ".md"), ...parseFrontmatter(readFileSync(join(sourceDir, f), "utf8")) }),
);

if (chunks.length === 0) {
  console.error("No chunks produced from knowledge/*.md; nothing to index.");
  process.exit(1);
}

const flagged = chunks.map((c) => [c.id, findBanned(c.text)]).filter(([, hit]) => hit);
if (flagged.length) {
  console.error("Banned terms found; nothing uploaded:");
  for (const [id, hit] of flagged) console.error(`  ${id}: "${hit}"`);
  process.exit(1);
}

console.log(`${files.length} files → ${chunks.length} chunks → namespace "${namespace}" (${EMBED_MODEL}, ${EMBED_DIM}d)`);
if (dryRun) {
  for (const c of chunks) console.log(`\n[${c.id}] ${c.url} (${c.text.length} chars)\n${c.text}`);
  process.exit(0);
}

try {
  const { CohereClientV2 } = await import("cohere-ai");
  const { Pinecone } = await import("@pinecone-database/pinecone");
  const cohere = new CohereClientV2({ token: process.env.COHERE_API_KEY });
  const index = new Pinecone({ apiKey: process.env.PINECONE_API_KEY }).index(process.env.INDEX_NAME).namespace(namespace);

  const vectors = [];
  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const batch = chunks.slice(i, i + EMBED_BATCH);
    const res = await cohere.embed({
      model: EMBED_MODEL,
      inputType: "search_document",
      embeddingTypes: ["float"],
      outputDimension: EMBED_DIM,
      texts: batch.map((c) => c.text),
    });
    const floats = res.embeddings?.float ?? [];
    if (floats.length !== batch.length) throw new Error(`Embedding count mismatch: ${floats.length}/${batch.length}`);
    vectors.push(...floats);
  }

  const records = chunks.map((c, i) => ({
    id: c.id,
    values: vectors[i],
    metadata: { slug: c.slug, title: c.title, url: c.url, section: c.section, text: c.text },
  }));
  for (let i = 0; i < records.length; i += UPSERT_BATCH) {
    await index.upsert(records.slice(i, i + UPSERT_BATCH));
  }

  // Finds records left over from chunks that no longer exist.
  const keep = new Set(records.map((r) => r.id));
  const allIds = [];
  let paginationToken;
  do {
    const page = await index.listPaginated({ paginationToken, limit: 100 });
    for (const v of page.vectors ?? []) allIds.push(v.id);
    paginationToken = page.pagination?.next;
  } while (paginationToken);
  const stale = allIds.filter((id) => !keep.has(id));

  const decision = pruneDecision({ staleCount: stale.length, totalCount: allIds.length, prune });
  if (decision.action === "refuse") {
    console.error(decision.reason);
    process.exit(1);
  }
  if (decision.action === "delete") {
    for (let i = 0; i < stale.length; i += 1000) await index.deleteMany(stale.slice(i, i + 1000));
  }
  console.log(decision.reason);

  console.log(`Upserted ${records.length} records.`);
} catch (err) {
  console.error("Indexing failed mid-run; namespace may be partially updated — re-run.");
  console.error(err.message ?? err);
  process.exit(1);
}
