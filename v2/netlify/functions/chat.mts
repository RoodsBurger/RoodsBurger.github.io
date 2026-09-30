import { createHash, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { Pinecone } from "@pinecone-database/pinecone";
import { CohereClientV2 } from "cohere-ai";
import { clientKey } from "../../src/lib/chat/client-key.ts";
import { CHAT_MODEL, EMBED_DIM, EMBED_MODEL, NAMESPACE, RERANK_MODEL } from "../../src/lib/chat/models.ts";
import { isAllowedOrigin } from "../../src/lib/chat/origin.ts";
import {
  buildMessages,
  FAST_PATH_PROMPT,
  isFastPath,
  isPromptExtraction,
  leaksPrompt,
  PROMPT_REFUSAL,
  type ChatCompletionMessage,
} from "../../src/lib/chat/prompts.ts";
import { checkLimit, memoryStore, type CounterStore, type CounterValue } from "../../src/lib/chat/rate-limit.ts";
import { retrievalQuery, selectDocuments, type RetrievedMatch, type SelectedDocument } from "../../src/lib/chat/retrieval.ts";
import { RequestSchema, trimHistory, type ChatRequest } from "../../src/lib/chat/schema.ts";

const IP_LIMIT = 20;
const IP_WINDOW_MS = 10 * 60 * 1000;
const DAY_LIMIT = 1500;
const DAY_MS = 24 * 60 * 60 * 1000;
const TOP_K = 20;
const EMBED_TIMEOUT_MS = 6000;
const PINECONE_TIMEOUT_MS = 6000;
const RERANK_TIMEOUT_MS = 6000;
const FIRST_BYTE_TIMEOUT_MS = 10000;
const IDLE_TIMEOUT_MS = 10000;

const CUT_OFF_SUFFIX = "\n\n(Sorry, the reply was cut off.)";
// Characters held back at the start of a reply so a leaked system prompt is caught before any of it is sent.
const LEAK_HOLD_CHARS = 160;
const EMPTY_REPLY = "Sorry, I couldn't put an answer together. Could you rephrase the question?";

const ERRORS = {
  method: "Method not allowed.",
  origin: "Forbidden.",
  invalid: "Invalid request.",
  unavailable: "The assistant is unavailable right now. Please try again later.",
  ipLimit: "You're sending messages too quickly. Please wait a few minutes and try again.",
  dayLimit: "The assistant has reached its daily limit. Please try again tomorrow.",
};

// The subset of the Netlify Functions v2 context this handler reads.
interface FunctionContext {
  ip?: string;
}

const fallbackStore = memoryStore();
let warnedFallback = false;

// Adapts the chat-rate Blobs store to the CounterStore interface, or returns an in-memory store when Blobs isn't configured.
function rateStore(): CounterStore {
  try {
    const store = getStore({ name: "chat-rate", consistency: "strong" });
    return {
      async get(key) {
        return ((await store.get(key, { type: "json" })) as CounterValue | null) ?? null;
      },
      async set(key, value) {
        await store.setJSON(key, value);
      },
    };
  } catch {
    if (!warnedFallback && process.env.SITE_ID) {
      warnedFallback = true;
      console.warn("Netlify Blobs unavailable on Netlify; rate limits use per-instance memory.");
    }
    return fallbackStore;
  }
}

// Reflects the origin in CORS headers; callers pass null for an origin that failed the allowlist.
function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = { Vary: "Origin" };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS";
  }
  return headers;
}

function json(status: number, body: unknown, origin: string | null, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...extra,
    },
  });
}

// Compares fixed-length SHA-256 digests so neither the token's content nor its length leaks through timing.
function tokenMatches(given: string, expected: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(given), digest(expected));
}

// Builds a Pinecone client whose every HTTP call shares one timeout signal.
function pineconeWithTimeout(apiKey: string, ms: number): Pinecone {
  const signal = AbortSignal.timeout(ms);
  return new Pinecone({
    apiKey,
    fetchApi: (input, init) => fetch(input, { ...init, signal }),
  });
}

async function healthcheck(token: string, origin: string | null): Promise<Response> {
  const expected = process.env.HEALTHCHECK_TOKEN;
  if (!expected || !tokenMatches(token, expected)) return json(200, { status: "ok" }, origin);

  const result: Record<string, unknown> = { status: "ok", namespace: NAMESPACE, embedModel: EMBED_MODEL, chatModel: CHAT_MODEL };
  try {
    const cohere = new CohereClientV2({ token: process.env.COHERE_API_KEY ?? "" });
    await cohere.embed(
      { texts: ["healthcheck"], model: EMBED_MODEL, inputType: "search_query", embeddingTypes: ["float"], outputDimension: EMBED_DIM },
      { abortSignal: AbortSignal.timeout(EMBED_TIMEOUT_MS), maxRetries: 0 },
    );
    result.cohere = "ok";
  } catch (e) {
    console.error("Healthcheck embed failed:", (e as Error).name, (e as Error).message);
    result.cohere = "error";
    result.status = "degraded";
  }
  try {
    const pc = pineconeWithTimeout(process.env.PINECONE_API_KEY ?? "", PINECONE_TIMEOUT_MS);
    const stats = await pc.index(process.env.INDEX_NAME ?? "").describeIndexStats();
    result.pinecone = "ok";
    result.namespaceRecordCount = stats.namespaces?.[NAMESPACE]?.recordCount ?? 0;
  } catch (e) {
    console.error("Healthcheck Pinecone failed:", (e as Error).name, (e as Error).message);
    result.pinecone = "error";
    result.status = "degraded";
  }
  return json(200, result, origin);
}

// Returns the 429 message and Retry-After seconds when a limit is hit, or null when the request may proceed.
async function rateLimit(ip: string, now: number): Promise<{ message: string; retryAfter: number } | null> {
  const store = rateStore();
  try {
    // checkLimit reads then writes, so concurrent requests can occasionally both pass the last slot.
    const perIp = await checkLimit(store, `ip:${clientKey(ip, process.env.SITE_ID || "")}:${Math.floor(now / IP_WINDOW_MS)}`, { limit: IP_LIMIT, windowMs: IP_WINDOW_MS, now });
    if (!perIp.allowed) return { message: ERRORS.ipLimit, retryAfter: Math.ceil((perIp.resetAt - now) / 1000) };
    const day = new Date(now).toISOString().slice(0, 10);
    const daily = await checkLimit(store, `day:${day}`, { limit: DAY_LIMIT, windowMs: DAY_MS, now });
    if (!daily.allowed) {
      const midnight = Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate() + 1);
      return { message: ERRORS.dayLimit, retryAfter: Math.ceil((midnight - now) / 1000) };
    }
    return null;
  } catch (e) {
    console.error("Rate limit store failed; allowing request:", (e as Error).name, (e as Error).message);
    return null;
  }
}

// Embeds the query, searches Pinecone, reranks, and keeps the documents that clear the threshold.
async function retrieve(cohere: CohereClientV2, query: string, pageSlug: string | undefined): Promise<SelectedDocument[]> {
  const embed = await cohere.embed(
    { texts: [query], model: EMBED_MODEL, inputType: "search_query", embeddingTypes: ["float"], outputDimension: EMBED_DIM },
    { abortSignal: AbortSignal.timeout(EMBED_TIMEOUT_MS), maxRetries: 0 },
  );
  const vector = embed.embeddings?.float?.[0];
  if (!vector) throw new Error("No embedding returned");

  const pc = pineconeWithTimeout(process.env.PINECONE_API_KEY ?? "", PINECONE_TIMEOUT_MS);
  const found = await pc
    .index(process.env.INDEX_NAME ?? "")
    .namespace(NAMESPACE)
    .query({ vector, topK: TOP_K, includeMetadata: true });

  const matches: RetrievedMatch[] = (found.matches ?? [])
    .map((m) => ({ id: m.id, metadata: m.metadata as RetrievedMatch["metadata"] }))
    .filter((m) => typeof m.metadata?.text === "string" && m.metadata.text.length > 0);
  if (matches.length === 0) return [];

  const rerank = await cohere.rerank(
    { model: RERANK_MODEL, query, documents: matches.map((m) => m.metadata?.text ?? "") },
    { abortSignal: AbortSignal.timeout(RERANK_TIMEOUT_MS), maxRetries: 0 },
  );
  return selectDocuments(matches, rerank.results, { pageSlug });
}

// Starts the chat stream and returns a UTF-8 text stream of its content deltas.
async function streamReply(
  cohere: CohereClientV2,
  messages: ChatCompletionMessage[],
  documents: SelectedDocument[],
  temperature: number,
): Promise<ReadableStream<Uint8Array>> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Aborts the upstream request when no event arrives within the given window.
  const arm = (ms: number) => {
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(), ms);
  };
  arm(FIRST_BYTE_TIMEOUT_MS);
  let upstream;
  try {
    upstream = await cohere.chatStream(
      {
        model: CHAT_MODEL,
        messages,
        temperature,
        ...(documents.length > 0
          ? { documents: documents.map((d) => ({ id: d.id, data: { title: d.title, url: d.url, text: d.text } })) }
          : {}),
      },
      { abortSignal: controller.signal, maxRetries: 0 },
    );
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }

  const events = upstream[Symbol.asyncIterator]();
  const encoder = new TextEncoder();
  // Set when the client disconnects, so the resulting abort is not treated as an upstream failure.
  let cancelled = false;
  // Set once any text has been sent, so an upstream that ends silently still gets a visible reply.
  let sent = false;
  // The whole reply so far, checked for system prompt text; nothing is sent until LEAK_HOLD_CHARS have arrived or the reply ends.
  let full = "";
  let held = "";
  // Stops the upstream and ends the reply with the refusal when the model starts reciting its instructions.
  const stopLeak = async (out: ReadableStreamDefaultController<Uint8Array>) => {
    clearTimeout(timer);
    console.error("Chat reply leaked the system prompt; replaced with a refusal.");
    out.enqueue(encoder.encode(sent ? `\n\n${PROMPT_REFUSAL}` : PROMPT_REFUSAL));
    out.close();
    controller.abort();
    await events.return?.().catch(() => undefined);
  };
  return new ReadableStream<Uint8Array>({
    async pull(out) {
      try {
        while (true) {
          const next = await events.next();
          if (next.done) {
            clearTimeout(timer);
            if (held) {
              out.enqueue(encoder.encode(held));
              held = "";
              sent = true;
            }
            if (!sent) {
              console.error("Chat stream ended with no text.");
              out.enqueue(encoder.encode(EMPTY_REPLY));
            }
            out.close();
            return;
          }
          arm(IDLE_TIMEOUT_MS);
          const event = next.value;
          if (event.type === "content-delta") {
            const text = event.delta?.message?.content?.text;
            if (text) {
              full += text;
              if (leaksPrompt(full)) return await stopLeak(out);
              held += text;
              if (sent || full.length >= LEAK_HOLD_CHARS) {
                out.enqueue(encoder.encode(held));
                held = "";
                sent = true;
                return;
              }
            }
          }
        }
      } catch (e) {
        clearTimeout(timer);
        if (cancelled) return;
        console.error("Chat stream failed:", (e as Error).name, (e as Error).message);
        out.enqueue(encoder.encode(sent ? CUT_OFF_SUFFIX : EMPTY_REPLY));
        out.close();
      }
    },
    async cancel() {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
      // The upstream may already be closed by the abort, so a failed return is ignored.
      await events.return?.().catch(() => undefined);
    },
  });
}

// Sends a fixed reply in the same plain-text format as a streamed one.
function textReply(text: string, origin: string | null): Response {
  return new Response(text, {
    status: 200,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function handlePost(req: Request, context: FunctionContext | undefined, origin: string | null): Promise<Response> {
  let parsed: ChatRequest;
  try {
    parsed = RequestSchema.parse(await req.json());
  } catch {
    return json(400, { error: ERRORS.invalid }, origin);
  }

  if (!process.env.COHERE_API_KEY || !process.env.PINECONE_API_KEY || !process.env.INDEX_NAME) {
    console.error("Missing required environment variables");
    return json(500, { error: ERRORS.unavailable }, origin);
  }

  const now = Date.now();
  const ip = context?.ip || req.headers.get("x-nf-client-connection-ip") || "unknown";
  const limited = await rateLimit(ip, now);
  if (limited) return json(429, { error: limited.message }, origin, { "Retry-After": String(limited.retryAfter) });

  const { message, pageTopic, pageSlug } = parsed;
  if (isPromptExtraction(message)) return textReply(PROMPT_REFUSAL, origin);
  const history = trimHistory(parsed.conversationHistory);
  const cohere = new CohereClientV2({ token: process.env.COHERE_API_KEY });

  let messages: ChatCompletionMessage[];
  let documents: SelectedDocument[] = [];
  let temperature = 0.3;
  if (isFastPath(message)) {
    messages = [{ role: "system", content: FAST_PATH_PROMPT }, ...history, { role: "user", content: message }];
    temperature = 0.5;
  } else {
    const query = retrievalQuery(message, history, pageTopic);
    try {
      documents = await retrieve(cohere, query, pageSlug);
    } catch (e) {
      console.error("Retrieval failed:", (e as Error).name, (e as Error).message);
      return json(502, { error: ERRORS.unavailable }, origin);
    }
    console.info("chat retrieval", JSON.stringify({ ids: documents.map((d) => d.id) }));
    messages = buildMessages({ message, history, pageSlug, grounded: documents.length > 0 });
  }

  let body: ReadableStream<Uint8Array>;
  try {
    body = await streamReply(cohere, messages, documents, temperature);
  } catch (e) {
    console.error("Chat request failed:", (e as Error).name, (e as Error).message);
    return json(502, { error: ERRORS.unavailable }, origin);
  }

  return new Response(body, {
    status: 200,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export default async (req: Request, context?: FunctionContext): Promise<Response> => {
  const requestOrigin = req.headers.get("origin");
  // The allowed origin to reflect in CORS headers, or null; the function's own origin counts because deploy URL env vars are absent at runtime.
  const origin = isAllowedOrigin(requestOrigin, process.env, req.url) ? requestOrigin : null;

  if (req.method === "OPTIONS") {
    if (!origin) return new Response(null, { status: 403, headers: { Vary: "Origin" } });
    return new Response(null, { status: 204, headers: { ...corsHeaders(origin), "Access-Control-Max-Age": "600" } });
  }

  if (req.method === "GET") {
    const token = new URL(req.url).searchParams.get("healthcheck");
    if (token !== null) return healthcheck(token, origin);
    return json(405, { error: ERRORS.method }, origin);
  }

  if (req.method !== "POST") return json(405, { error: ERRORS.method }, origin);
  if (!origin) return json(403, { error: ERRORS.origin }, null);

  return handlePost(req, context, origin);
};
