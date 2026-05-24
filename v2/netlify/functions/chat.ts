import { Pinecone } from "@pinecone-database/pinecone";
import { CohereClientV2 } from "cohere-ai";
import { z } from "zod";

const COHERE_CHAT_MODEL = process.env.COHERE_CHAT_MODEL || "command-r7b-12-2024";
const COHERE_EMBED_MODEL = process.env.COHERE_EMBED_MODEL || "embed-english-v3.0";
const HISTORY_TURN_LIMIT = 6;

const ALLOWED_ORIGINS = new Set(
  [
    "https://rraimundo.me",
    "https://www.rraimundo.me",
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.DEPLOY_URL,
    "http://localhost:4321",
    "http://localhost:8888",
  ].filter(Boolean) as string[],
);

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const RequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  conversationHistory: z.array(MessageSchema).default([]),
  pageContext: z.string().trim().max(400).optional(),
  pageTopic: z.string().trim().max(120).optional(),
});

const ACADEMIC_KEYWORDS = new Set([
  "coefficient", "triangles", "null model", "assortativity",
  "topological", "phenomenon", "covariance", "algorithm", "theorem",
  "approximation", "logarithmic", "distribution", "lemma", "proof",
  "wherein", "citation", "referenced", "methodology", "furthermore",
]);

const PROFILE_SOURCES = new Set([
  "index.html", "hobbies.html", "rodolfo_resume.pdf", "rraimundo_cv.pdf",
  "tobias.html", "knolling.html", "pruning.html",
]);

const PERSONAL_QUESTION_TERMS = new Set([
  "you", "your", "hobby", "hobbies", "interest", "climb", "climbing",
  "ceramic", "teaching", "personal", "background", "experience",
]);

// Matches greetings, pleasantries, and meta questions about the assistant itself.
const FAST_PATH_RE =
  /^\s*(?:(?:hi+|hello+|hey+|howdy|greetings)(?:\s+there)?|yo|sup|good\s+(?:morning|afternoon|evening|night)|how\s+(?:are|r)\s+(?:you|u)(?:\s+doing(?:\s+today)?)?|how(?:\s|')?s\s+it\s+going|what(?:\s|')?s\s+up|thanks?(?:\s+(?:a\s+lot|so\s+much|much))?|thank\s+you(?:\s+(?:very\s+much|so\s+much))?|thx|ty|cheers|ok(?:ay)?|cool|nice|awesome|bye+|goodbye|see\s+ya|cya|night|lol|haha|👋|🙂|😊|who\s+(?:are|r)\s+(?:you|u)|what\s+(?:are|r)\s+(?:you|u)|are\s+(?:you|u)\s+(?:rodolfo|an?\s+(?:bot|ai|robot|human|person|chatbot|assistant)|real|human)|what\s+(?:can|do)\s+(?:you|u)\s+(?:do|know|help\s+with))[\s!.,?]*$/i;
const isFastPath = (msg: string) => FAST_PATH_RE.test(msg);

const FAST_PATH_PROMPT = `You are a friendly chat assistant on Rodolfo Raimundo's portfolio site. Reply in one short sentence. Match the user's tone.

- Greetings or pleasantries ("hi", "thanks", "cool"): respond casually. Do not introduce yourself and do not mention Rodolfo.
- Meta questions about you ("who are you?", "are you Rodolfo?", "what can you do?"): one-sentence self-identification. Examples:
  - "are you Rodolfo?" -> "No, I'm just the AI assistant on his site. Ask me anything about his work."
  - "who are you?" -> "I'm an AI assistant here to answer questions about Rodolfo's projects and background."
  - "what can you do?" -> "I can answer questions about Rodolfo's projects, work, and interests."

Never list his projects, skills, or background unless asked. Never pivot to topics the user didn't bring up.`;

interface PineconeMatch {
  metadata?: { source?: string; text?: string };
  score?: number;
}

const isProfileSource = (source: string) => {
  if (PROFILE_SOURCES.has(source)) return true;
  for (const s of PROFILE_SOURCES) if (source.includes(s)) return true;
  return false;
};

const isLikelyAcademic = (text: string) => {
  const lower = text.toLowerCase();
  let n = 0;
  for (const kw of ACADEMIC_KEYWORDS) {
    if (lower.includes(kw)) {
      n++;
      if (n >= 3) return true;
    }
  }
  return false;
};

const filterContext = (matches: PineconeMatch[], query: string) => {
  const lower = query.toLowerCase();
  const isPersonal = Array.from(PERSONAL_QUESTION_TERMS).some((t) => lower.includes(t));
  if (!isPersonal) return matches;
  const filtered = matches.filter((m) => {
    const source = m.metadata?.source || "";
    const text = m.metadata?.text || "";
    return isProfileSource(source) || !isLikelyAcademic(text);
  });
  return filtered.length > 0 ? filtered : matches;
};

const corsHeaders = (origin: string | undefined) => {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://rraimundo.me";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
};

const json = (status: number, body: unknown, origin: string | undefined) => ({
  statusCode: status,
  headers: corsHeaders(origin),
  body: JSON.stringify(body),
});

const SYSTEM_PROMPT = `You are a friendly chat assistant on Rodolfo Raimundo's personal portfolio site. You are not Rodolfo.

Voice (this is the most important rule):
- Always refer to him in the third person: "Rodolfo", "he", "his". Never use "I", "me", or "my" to refer to him.
- The retrieved portfolio context is written by Rodolfo in the first person. You must silently rewrite it into the third person before answering.
  Example — if the context says: "I built Tobias to learn FOC control."
  You write: "Rodolfo built Tobias to learn FOC control." (never "I built Tobias…")
- Reserve "I" / "my" for yourself, the assistant ("I don't have that detail"). Do not introduce yourself unless the user asks who you are.

Decide what kind of message this is, then reply accordingly:

1. Greeting or small talk ("hi", "how are you", "thanks", "lol", "ok"):
   - Reply naturally and briefly, like a person would.
   - Don't mention Rodolfo or pivot to his work.
   - Ignore any retrieved portfolio context for this turn; it isn't relevant.

2. Question about Rodolfo, his projects, background, or interests:
   - Ground every claim in the provided portfolio context.
   - If the context doesn't cover it, say you don't have that detail. Never invent.
   - Paraphrase the context; never paste it verbatim.
   - On a project page, "this", "it", or "tell me more" refers to the project the user is viewing.

3. General technical or world question that isn't about Rodolfo:
   - Answer from your own knowledge.

Length (strict):
- Default to one or two sentences. Always. This applies even when the retrieved context is long.
- Use the context to verify facts, not to pad. Include only what directly answers what was asked.
- No bullet lists, no headings, no multi-paragraph answers unless the user explicitly asks ("more", "details", "tell me everything", "list", "breakdown", "elaborate", "in depth").
- Lead with the answer; skip setup ("Sure!", "Of course!", "Based on the context…", "Great question!").
- If you finish a short answer and there's more available, you may end with "Want more detail?" — but never volunteer the detail unprompted.

Examples:
- "What is Tobias?" -> "Tobias is a quadrupedal robot Rodolfo built to learn walking via reinforcement learning."
- "What tech does it use?" -> "PyTorch and PyBullet for the RL, Fusion 360 for the CAD."
- "Tell me more about Tobias." -> longer answer with the technical detail.

Tone:
- Match the user's energy. Casual gets casual.
- Friendly and direct, never marketing-y or over-eager.`;

async function healthCheck(origin: string | undefined) {
  const result: Record<string, unknown> = {
    cohere: "unknown",
    pinecone: "unknown",
    env: {
      COHERE_API_KEY: !!process.env.COHERE_API_KEY,
      PINECONE_API_KEY: !!process.env.PINECONE_API_KEY,
      INDEX_NAME: process.env.INDEX_NAME || null,
    },
  };

  if (process.env.COHERE_API_KEY) {
    try {
      const cohere = new CohereClientV2({ token: process.env.COHERE_API_KEY });
      await cohere.embed({
        texts: ["healthcheck"],
        model: COHERE_EMBED_MODEL,
        inputType: "search_query",
        embeddingTypes: ["float"],
      });
      result.cohere = "ok";
    } catch (e) {
      result.cohere = `error: ${(e as Error).message}`;
    }
  } else {
    result.cohere = "missing api key";
  }

  if (process.env.PINECONE_API_KEY && process.env.INDEX_NAME) {
    try {
      const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
      const idx = pc.index(process.env.INDEX_NAME);
      const stats = await idx.describeIndexStats();
      result.pinecone = "ok";
      result.indexRecordCount = stats.totalRecordCount ?? 0;
    } catch (e) {
      result.pinecone = `error: ${(e as Error).message}`;
    }
  } else {
    result.pinecone = "missing api key or index name";
  }

  return json(200, result, origin);
}

export const handler = async (event: {
  httpMethod: string;
  body?: string | null;
  headers?: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined> | null;
}) => {
  const origin = event.headers?.origin || event.headers?.Origin;

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders(origin), body: "" };
  }

  if (event.httpMethod === "GET") {
    if (event.queryStringParameters?.healthcheck === "1") {
      return await healthCheck(origin);
    }
    return json(405, { error: "Method not allowed" }, origin);
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" }, origin);
  }

  let parsed: z.infer<typeof RequestSchema>;
  try {
    parsed = RequestSchema.parse(JSON.parse(event.body || "{}"));
  } catch (e) {
    return json(400, { error: "Invalid request body", details: (e as Error).message }, origin);
  }

  const { message, conversationHistory, pageContext, pageTopic } = parsed;
  const recentHistory = conversationHistory.slice(-HISTORY_TURN_LIMIT);
  const fastPath = isFastPath(message);

  // Fold the current page topic into the embed query so Pinecone surfaces that page's chunks.
  const retrievalQuery = pageTopic
    ? `${message}\n\n(In the context of: ${pageTopic})`
    : message;

  if (!process.env.COHERE_API_KEY || !process.env.PINECONE_API_KEY || !process.env.INDEX_NAME) {
    console.error("Missing required environment variables");
    return json(
      500,
      {
        error: "Server misconfigured",
        details: "One or more required environment variables are missing",
      },
      origin,
    );
  }

  const cohere = new CohereClientV2({ token: process.env.COHERE_API_KEY });

  // Greetings and pleasantries skip embed + Pinecone and use a Rodolfo-free prompt.
  if (fastPath) {
    const chatMessages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [
      { role: "system", content: FAST_PATH_PROMPT },
      ...recentHistory.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];
    try {
      const chatResponse = await cohere.chat({
        model: COHERE_CHAT_MODEL,
        messages: chatMessages,
        temperature: 0.5,
      });
      if (chatResponse?.message && Array.isArray(chatResponse.message.content)) {
        return json(200, { message: chatResponse.message }, origin);
      }
      return json(
        200,
        {
          message: {
            role: "assistant",
            content: [{ type: "text", text: "Hey!" }],
          },
        },
        origin,
      );
    } catch (e) {
      const err = e as Error;
      console.error("Cohere chat failed (fast path):", err.name, err.message);
      return json(502, { error: "Chat service failed", details: err.message }, origin);
    }
  }

  let queryEmbedding: number[];
  try {
    const embedResponse = await cohere.embed({
      texts: [retrievalQuery],
      model: COHERE_EMBED_MODEL,
      inputType: "search_query",
      embeddingTypes: ["float"],
    });
    const first = embedResponse.embeddings?.float?.[0];
    if (!first) throw new Error("No embedding returned");
    queryEmbedding = first;
  } catch (e) {
    const err = e as Error;
    console.error("Cohere embed failed:", err.name, err.message);
    return json(502, { error: "Embedding service failed", details: err.message }, origin);
  }

  let contextText = "";
  try {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.index(process.env.INDEX_NAME);
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: 10,
      includeMetadata: true,
    });

    if (queryResponse.matches && queryResponse.matches.length > 0) {
      const filtered = filterContext(queryResponse.matches as PineconeMatch[], message);
      const top = filtered.slice(0, 5);
      contextText = top
        .filter((m) => m.metadata?.text)
        .map((m) => `[From: ${m.metadata?.source || "unknown"}]\n${m.metadata?.text}`)
        .join("\n\n");
    }
  } catch (e) {
    const err = e as Error;
    console.error("Pinecone query failed:", err.name, err.message);
    return json(502, { error: "Vector search failed", details: err.message }, origin);
  }

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  if (pageContext) {
    messages.push({
      role: "system",
      content: `Current page context: ${pageContext}`,
    });
  }

  messages.push(
    ...recentHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  );

  if (contextText) {
    messages.push({
      role: "system",
      content: `Verified information about Rodolfo (from his portfolio, resume, CV, coursework, and other documents). Ground your response in this only:\n\n${contextText}`,
    });
  } else {
    messages.push({
      role: "system",
      content:
        "No specific portfolio information was retrieved for this query. If the question is about Rodolfo, acknowledge you don't have that specific information. For general technical questions, you may answer from general knowledge.",
    });
  }

  try {
    const chatResponse = await cohere.chat({
      model: COHERE_CHAT_MODEL,
      messages,
      temperature: 0.3,
    });

    if (chatResponse?.message && Array.isArray(chatResponse.message.content)) {
      return json(200, { message: chatResponse.message }, origin);
    }

    console.warn("Unexpected Cohere response shape:", JSON.stringify(chatResponse).slice(0, 300));
    return json(
      200,
      {
        message: {
          role: "assistant",
          content: [
            { type: "text", text: "I'm sorry, I couldn't generate a response. Please try again." },
          ],
        },
      },
      origin,
    );
  } catch (e) {
    const err = e as Error;
    console.error("Cohere chat failed:", err.name, err.message);
    return json(502, { error: "Chat service failed", details: err.message }, origin);
  }
};
