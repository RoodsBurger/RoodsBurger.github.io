import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readTextStream, streamChatMessage, RateLimitError } from "../src/lib/chat-client.ts";

// Builds a Response whose body yields the given byte chunks in order.
function streamedResponse(chunks, init = {}) {
  const body = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" }, ...init });
}

const enc = (s) => new TextEncoder().encode(s);
const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

test("readTextStream reports the accumulated text after each chunk", async () => {
  const seen = [];
  const text = await readTextStream(streamedResponse([enc("Tobias "), enc("is a "), enc("robot.")]), (t) => seen.push(t));
  assert.equal(text, "Tobias is a robot.");
  assert.deepEqual(seen, ["Tobias ", "Tobias is a ", "Tobias is a robot."]);
});

test("readTextStream decodes a multibyte character split across chunks", async () => {
  const bytes = enc("café ok");
  const split = bytes.indexOf(0xc3) + 1;
  const seen = [];
  const text = await readTextStream(streamedResponse([bytes.slice(0, split), bytes.slice(split)]), (t) => seen.push(t));
  assert.equal(text, "café ok");
  assert.ok(seen.every((t) => !t.includes("�")));
});

test("streamChatMessage posts the page slug and returns the streamed reply", async () => {
  let sent;
  globalThis.fetch = async (url, init) => {
    sent = { url, body: JSON.parse(init.body) };
    return streamedResponse([enc("Hello"), enc(" there")]);
  };
  const deltas = [];
  const reply = await streamChatMessage("hi", [], { pageSlug: "tobias", onDelta: (t) => deltas.push(t) });
  assert.equal(reply, "Hello there");
  assert.deepEqual(deltas, ["Hello", "Hello there"]);
  assert.equal(sent.url, "/.netlify/functions/chat");
  assert.equal(sent.body.pageSlug, "tobias");
});

test("streamChatMessage throws RateLimitError with the server message on 429", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ error: "Slow down, please." }), { status: 429 });
  await assert.rejects(streamChatMessage("hi"), (err) => err instanceof RateLimitError && err.message === "Slow down, please.");
});

test("streamChatMessage throws a generic error on other failures, hiding server details", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ error: "upstream secret detail" }), { status: 502 });
  await assert.rejects(streamChatMessage("hi"), (err) => !(err instanceof RateLimitError) && !err.message.includes("secret"));
});

test("streamChatMessage rejects an empty streamed reply", async () => {
  globalThis.fetch = async () => streamedResponse([]);
  await assert.rejects(streamChatMessage("hi"));
});

test("readTextStream replaces a mid-stream read failure with the generic error", async () => {
  let pulls = 0;
  const body = new ReadableStream({
    pull(controller) {
      pulls += 1;
      if (pulls === 1) controller.enqueue(enc("partial"));
      else controller.error(new TypeError("network reset at 10.0.0.1"));
    },
  });
  const seen = [];
  await assert.rejects(readTextStream(new Response(body), (t) => seen.push(t)), (err) => err.message === "Something went wrong. Please try again.");
  assert.deepEqual(seen, ["partial"]);
});

test("streamChatMessage replaces a fetch failure with the generic error", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("Failed to fetch");
  };
  await assert.rejects(streamChatMessage("hi"), (err) => err.message === "Something went wrong. Please try again.");
});

test("streamChatMessage passes the abort signal to fetch and rethrows the abort unchanged", async () => {
  const controller = new AbortController();
  globalThis.fetch = async (_url, init) => {
    assert.equal(init.signal, controller.signal);
    controller.abort();
    throw new DOMException("The operation was aborted.", "AbortError");
  };
  await assert.rejects(streamChatMessage("hi", [], { signal: controller.signal }), (err) => err.name === "AbortError");
});
