// Single source of truth for the model names, dimension, and Pinecone namespace the chat pipeline and the indexer both use.

export const EMBED_MODEL = "embed-v4.0";
export const EMBED_DIM = 1024;
export const RERANK_MODEL = "rerank-v4.0-fast";
export const CHAT_MODEL = process.env.COHERE_CHAT_MODEL || "command-a-03-2025";

// The namespace the current knowledge base lives in.
export const NAMESPACE_DEFAULT = "v2-20260930";
export const NAMESPACE = process.env.PINECONE_NAMESPACE || NAMESPACE_DEFAULT;
