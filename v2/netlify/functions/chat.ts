import { Pinecone } from "@pinecone-database/pinecone";
import { CohereClientV2 } from "cohere-ai";
import { z } from "zod";

const COHERE_CHAT_MODEL = process.env.COHERE_CHAT_MODEL || "command-a-03-2025";
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

const SYSTEM_PROMPT = `You are Rodolfo's AI assistant. You provide information about Rodolfo Raimundo's work, projects, education, experiences, and interests.

RULES:
1. Only share factual information about Rodolfo that is explicitly mentioned in the provided context.
2. If you don't have specific information about Rodolfo in the context, say so — never invent or assume details about his background.
3. For general technical questions (not specifically about Rodolfo), you may answer from your general knowledge.
4. Keep responses concise, focused, and well-formatted. Use bullet points or numbered lists for multi-part answers.
5. Paraphrase context — never copy-paste verbatim.
6. Maintain a friendly, professional tone.
7. If the retrieved context is unrelated to the question, acknowledge that you don't have that specific information.`;

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

  const { message, conversationHistory } = parsed;
  const recentHistory = conversationHistory.slice(-HISTORY_TURN_LIMIT);

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

  let queryEmbedding: number[];
  try {
    const embedResponse = await cohere.embed({
      texts: [message],
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
    ...recentHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

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
