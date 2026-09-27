import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFrontmatter, chunkMarkdown } from "../scripts/lib/chunk.mjs";

const doc = `---
title: "Precision Coffee Grinder"
url: "/projects/grinder"
---

Intro paragraph before any heading.

## How it works

A stepper drives the burr.

A servo feeds beans.

## Hardware

Raspberry Pi and a custom PCB.
`;

test("parseFrontmatter reads quoted and bare values and returns the body", () => {
  const { data, body } = parseFrontmatter(doc);
  assert.equal(data.title, "Precision Coffee Grinder");
  assert.equal(data.url, "/projects/grinder");
  assert.match(body, /^Intro paragraph/);
});

test("parseFrontmatter tolerates a missing frontmatter block", () => {
  const { data, body } = parseFrontmatter("## Only\n\ntext");
  assert.deepEqual(data, {});
  assert.equal(body, "## Only\n\ntext");
});

test("chunkMarkdown splits on ## headings and keeps the intro as Overview", () => {
  const chunks = chunkMarkdown({ slug: "grinder", ...parseFrontmatter(doc) });
  assert.deepEqual(chunks.map((c) => c.section), ["Overview", "How it works", "Hardware"]);
  assert.deepEqual(chunks.map((c) => c.id), ["grinder#0", "grinder#1", "grinder#2"]);
});

test("chunk text carries title and section so each chunk stands alone", () => {
  const [, how] = chunkMarkdown({ slug: "grinder", ...parseFrontmatter(doc) });
  assert.equal(how.text, "Precision Coffee Grinder · How it works\n\nA stepper drives the burr.\n\nA servo feeds beans.");
  assert.equal(how.title, "Precision Coffee Grinder");
  assert.equal(how.url, "/projects/grinder");
  assert.equal(how.slug, "grinder");
});

test("long sections split on paragraph boundaries under maxChars", () => {
  const para = "x".repeat(300);
  const body = `## Long\n\n${[para, para, para, para].join("\n\n")}`;
  const chunks = chunkMarkdown({ slug: "s", data: { title: "T", url: "/" }, body }, { maxChars: 700 });
  assert.equal(chunks.length, 2);
  assert.ok(chunks.every((c) => c.section === "Long"));
  assert.ok(chunks.every((c) => c.text.length <= 700 + "T · Long\n\n".length));
  assert.deepEqual(chunks.map((c) => c.id), ["s#0", "s#1"]);
});

test("empty sections are skipped", () => {
  const chunks = chunkMarkdown({ slug: "e", data: { title: "E", url: "/" }, body: "## A\n\n## B\n\ntext" });
  assert.deepEqual(chunks.map((c) => c.section), ["B"]);
});

test("a frontmatter slug overrides the filename-derived slug in both the id and metadata", () => {
  const chunks = chunkMarkdown({
    slug: "tidynet",
    data: { title: "TidyNET", url: "/projects/knolling", slug: "knolling" },
    body: "## Overview\n\ntext",
  });
  assert.deepEqual(chunks.map((c) => c.id), ["knolling#0"]);
  assert.equal(chunks[0].slug, "knolling");
});

test("with no frontmatter slug, the filename-derived slug is used as before", () => {
  const chunks = chunkMarkdown({ slug: "grinder", ...parseFrontmatter(doc) });
  assert.equal(chunks[0].slug, "grinder");
});
