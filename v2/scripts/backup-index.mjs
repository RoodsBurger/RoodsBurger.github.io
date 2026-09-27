#!/usr/bin/env node
// Dumps every record (id, values, metadata) of one Pinecone namespace to a local JSON file.
// Usage: node --env-file=.env scripts/backup-index.mjs [--namespace <ns>]   (default namespace when omitted)

import { Pinecone } from "@pinecone-database/pinecone";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const nsIdx = args.indexOf("--namespace");
const namespace = nsIdx >= 0 ? args[nsIdx + 1] ?? "" : "";

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.index(process.env.INDEX_NAME).namespace(namespace);

const ids = [];
let paginationToken;
do {
  const page = await index.listPaginated({ paginationToken, limit: 100 });
  ids.push(...(page.vectors ?? []).map((v) => v.id));
  paginationToken = page.pagination?.next;
} while (paginationToken);

const records = [];
for (let i = 0; i < ids.length; i += 100) {
  const res = await index.fetch(ids.slice(i, i + 100));
  for (const r of Object.values(res.records ?? {})) {
    records.push({ id: r.id, values: r.values, metadata: r.metadata });
  }
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", ".pinecone-backup");
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const file = join(outDir, `${namespace || "default"}-${stamp}.json`);
writeFileSync(file, JSON.stringify({ index: process.env.INDEX_NAME, namespace, count: records.length, records }));
console.log(`Backed up ${records.length}/${ids.length} records from namespace "${namespace || "(default)"}" → ${file}`);
