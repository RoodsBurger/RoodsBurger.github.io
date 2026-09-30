import { test } from "node:test";
import assert from "node:assert/strict";
import { retrievalQuery, selectDocuments } from "../src/lib/chat/retrieval.ts";

const matches = [
  { id: "a#0", metadata: { slug: "tobias", title: "Tobias", url: "/projects/tobias", text: "Tobias text" } },
  { id: "b#0", metadata: { slug: "grinder", title: "Grinder", url: "/projects/grinder", text: "Grinder text" } },
  { id: "c#0", metadata: { slug: "wall-lamp", title: "Wall Lamp", url: "/projects/wall-lamp", text: "Lamp text" } },
  { id: "d#0", metadata: { slug: "pruning", title: "Pruning", url: "/projects/pruning", text: "Pruning text" } },
  { id: "e#0", metadata: { slug: "knolling", title: "TidyNET", url: "/projects/knolling", text: "TidyNET text" } },
];

test("rerank empty returns no documents", () => {
  assert.deepEqual(selectDocuments(matches, []), []);
});

test("keeps only results at or above the default 0.3 threshold", () => {
  const rerank = [
    { index: 0, relevanceScore: 0.5 },
    { index: 1, relevanceScore: 0.29 },
  ];
  const selected = selectDocuments(matches, rerank);
  assert.deepEqual(selected.map((d) => d.id), ["a#0"]);
});

test("sorts by score descending and caps at the default max of 4", () => {
  const rerank = [
    { index: 0, relevanceScore: 0.4 },
    { index: 1, relevanceScore: 0.9 },
    { index: 2, relevanceScore: 0.6 },
  ];
  const selected = selectDocuments(matches, rerank, { max: 2 });
  assert.deepEqual(selected.map((d) => d.id), ["b#0", "c#0"]);
});

test("boosts a result whose slug equals pageSlug before thresholding", () => {
  const rerank = [{ index: 1, relevanceScore: 0.2 }];
  assert.deepEqual(selectDocuments(matches, rerank, { pageSlug: "grinder" }), [
    { id: "b#0", title: "Grinder", url: "/projects/grinder", text: "Grinder text" },
  ]);
  assert.deepEqual(selectDocuments(matches, rerank, { pageSlug: "tobias" }), []);
});

test("a custom boost changes whether a same-page result clears the threshold", () => {
  const rerank = [{ index: 2, relevanceScore: 0.28 }];
  assert.deepEqual(selectDocuments(matches, rerank, { pageSlug: "wall-lamp", boost: 0.01 }), []);
  const selected = selectDocuments(matches, rerank, { pageSlug: "wall-lamp", boost: 0.05 });
  assert.equal(selected.length, 1);
  assert.equal(selected[0].id, "c#0");
});

test("a rerank index with no matching document is skipped", () => {
  const rerank = [{ index: 99, relevanceScore: 0.9 }];
  assert.deepEqual(selectDocuments(matches, rerank), []);
});

test("with no options, caps at the default max of 4 even when 5 results clear the threshold", () => {
  const rerank = [0, 1, 2, 3, 4].map((index) => ({ index, relevanceScore: 0.5 + index * 0.01 }));
  const selected = selectDocuments(matches, rerank);
  assert.equal(selected.length, 4);
  assert.deepEqual(selected.map((d) => d.id), ["e#0", "d#0", "c#0", "b#0"]);
});

test("a boosted result overtakes a higher raw score", () => {
  const rerank = [
    { index: 0, relevanceScore: 0.6 },
    { index: 1, relevanceScore: 0.5 },
  ];
  const selected = selectDocuments(matches, rerank, { pageSlug: "grinder", boost: 0.15 });
  assert.deepEqual(selected.map((d) => d.id), ["b#0", "a#0"]);
});

test("a score of exactly the 0.3 threshold is kept", () => {
  const rerank = [{ index: 0, relevanceScore: 0.3 }];
  assert.deepEqual(selectDocuments(matches, rerank).map((d) => d.id), ["a#0"]);
});

test("a match with no metadata text is skipped even with a high score", () => {
  const noText = [{ id: "f#0", metadata: { slug: "chat-project", title: "Chat", url: "/projects/chat-project" } }];
  const rerank = [{ index: 0, relevanceScore: 0.99 }];
  assert.deepEqual(selectDocuments(noText, rerank), []);
});

test("retrievalQuery is the bare message with no history or page topic", () => {
  assert.equal(retrievalQuery("What is Tobias?", []), "What is Tobias?");
});

test("retrievalQuery folds in the previous user turn so follow-ups keep their topic", () => {
  const history = [
    { role: "user", content: "Should I hire him?" },
    { role: "assistant", content: "He ships research into production." },
  ];
  assert.equal(
    retrievalQuery("That's not an answer to my question", history),
    "Earlier question: Should I hire him?\nEarlier answer: He ships research into production.\n\nCurrent question: That's not an answer to my question",
  );
});

test("retrievalQuery appends the page topic", () => {
  assert.equal(retrievalQuery("Tell me more", [], "Tobias"), "Tell me more\n\n(In the context of: Tobias)");
});
