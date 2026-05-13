#!/usr/bin/env node
// One-shot Cohere + Pinecone sanity check.
//
// Usage:
//   1) Put keys in v2/.env (gitignored):
//        COHERE_API_KEY=...
//        PINECONE_API_KEY=...
//        INDEX_NAME=rodolfo-portfolio
//   2) From v2/, run: node scripts/sanity-chat.mjs
//
// Exercises the same path as the Netlify function: embed → Pinecone query → chat.

import "dotenv/config";
import { CohereClientV2 } from "cohere-ai";
import { Pinecone } from "@pinecone-database/pinecone";

const need = ["COHERE_API_KEY", "PINECONE_API_KEY", "INDEX_NAME"];
const missing = need.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("Missing env vars:", missing.join(", "));
  process.exit(1);
}

const cohere = new CohereClientV2({ token: process.env.COHERE_API_KEY });
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

const query = process.argv.slice(2).join(" ") || "What did Rodolfo build for TidyNET?";

console.log(`\nQuery: "${query}"\n`);

// 1. Embed
let vec;
try {
  process.stdout.write("Cohere embed... ");
  const embed = await cohere.embed({
    texts: [query],
    model: "embed-english-v3.0",
    inputType: "search_query",
    embeddingTypes: ["float"],
  });
  vec = embed.embeddings?.float?.[0];
  if (!vec) throw new Error("no embedding returned");
  console.log(`ok (${vec.length}d vector)`);
} catch (e) {
  console.log(`✗ FAIL (${e.statusCode || ""} ${e.message?.split("\n")[0] || e})`);
  console.log("  → Rotate COHERE_API_KEY at https://dashboard.cohere.com/api-keys\n");
}

// 2. Pinecone stats
let stats;
try {
  process.stdout.write("Pinecone stats... ");
  const idx = pc.index(process.env.INDEX_NAME);
  stats = await idx.describeIndexStats();
  console.log(`ok (${stats.totalRecordCount ?? 0} records)`);
} catch (e) {
  console.log(`✗ FAIL (${e.message?.split("\n")[0] || e})`);
  console.log("  → Check PINECONE_API_KEY and that index '" + process.env.INDEX_NAME + "' exists at https://app.pinecone.io\n");
}

if (!vec || !stats) {
  console.log("\n✗ Cannot continue without a working embedding + Pinecone connection.");
  process.exit(1);
}

const index = pc.index(process.env.INDEX_NAME);

process.stdout.write("Pinecone query... ");
const res = await index.query({ vector: vec, topK: 5, includeMetadata: true });
console.log(`ok (${res.matches?.length ?? 0} matches)`);

if (!res.matches?.length) {
  console.log("\n⚠ Pinecone returned no matches — index is empty or wiped.");
  console.log("  Run knowledge_base_setup.py from the v1 repo root to repopulate.");
  process.exit(0);
}

const context = res.matches
  .filter((m) => m.metadata?.text)
  .slice(0, 5)
  .map((m) => `[${m.metadata?.source || "unknown"}]\n${m.metadata?.text}`)
  .join("\n\n");

console.log(`\nTop sources:`);
res.matches.slice(0, 5).forEach((m, i) => {
  console.log(`  ${i + 1}. ${m.metadata?.source || "(no source)"} (score: ${m.score?.toFixed(3)})`);
});

// 3. Chat
process.stdout.write("\nCohere chat... ");
const chat = await cohere.chat({
  model: "command-a-03-2025",
  temperature: 0.3,
  messages: [
    {
      role: "system",
      content:
        "You are Rodolfo's portfolio assistant. Ground every claim in the verified context provided. Keep answers concise.",
    },
    { role: "user", content: query },
    {
      role: "system",
      content: `Verified information about Rodolfo:\n\n${context}`,
    },
  ],
});
const text = chat?.message?.content?.[0]?.text;
console.log("ok\n");

console.log("─── Answer ─────────────────────────────────────────");
console.log(text || "(empty)");
console.log("────────────────────────────────────────────────────\n");
console.log("✓ All three SDK calls succeeded. Chat is fully working.\n");
