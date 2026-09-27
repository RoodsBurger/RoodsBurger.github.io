export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface StreamChatOptions {
  pageTopic?: string;
  pageSlug?: string;
  onDelta?: (textSoFar: string) => void;
  signal?: AbortSignal;
}

const FUNCTION_URL = "/.netlify/functions/chat";
const GENERIC_ERROR = "Something went wrong. Please try again.";
const RATE_LIMIT_FALLBACK = "You're sending messages too quickly. Please wait a few minutes and try again.";

// Thrown when the chat function answers 429; the message is the server's friendly text.
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

// Rethrows aborts unchanged so callers can tell them apart, and replaces any other failure with the generic error.
function toClientError(err: unknown, signal?: AbortSignal): Error {
  if (signal?.aborted) return err instanceof Error ? err : new Error(GENERIC_ERROR);
  return new Error(GENERIC_ERROR);
}

// Reads a streamed UTF-8 text body, reporting the accumulated text after every chunk.
export async function readTextStream(
  response: Response,
  onDelta?: (textSoFar: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (!response.body) throw new Error(GENERIC_ERROR);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  while (true) {
    let result: ReadableStreamReadResult<Uint8Array>;
    try {
      result = await reader.read();
    } catch (err) {
      throw toClientError(err, signal);
    }
    const { done, value } = result;
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (!chunk) continue;
    text += chunk;
    onDelta?.(text);
  }
  const tail = decoder.decode();
  if (tail) {
    text += tail;
    onDelta?.(text);
  }
  return text;
}

// Posts a message to the chat function and streams the reply text through onDelta, resolving with the full reply.
export async function streamChatMessage(
  message: string,
  conversationHistory: ChatMessage[] = [],
  { pageTopic, pageSlug, onDelta, signal }: StreamChatOptions = {},
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, conversationHistory, pageTopic, pageSlug }),
      signal,
    });
  } catch (err) {
    throw toClientError(err, signal);
  }

  if (response.status === 429) {
    const body = (await response.json().catch(() => ({}))) as { error?: unknown };
    throw new RateLimitError(typeof body.error === "string" && body.error ? body.error : RATE_LIMIT_FALLBACK);
  }
  if (!response.ok) throw new Error(GENERIC_ERROR);

  const text = await readTextStream(response, onDelta, signal);
  if (!text.trim()) throw new Error(GENERIC_ERROR);
  return text;
}
