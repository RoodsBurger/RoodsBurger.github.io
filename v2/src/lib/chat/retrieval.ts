// A Pinecone match, trimmed to the fields retrieval cares about.
export interface RetrievedMatch {
  id: string;
  metadata?: {
    slug?: string;
    title?: string;
    url?: string;
    text?: string;
  };
}

// One rerank result, pointing back at its position in the array passed to the reranker.
export interface RerankResult {
  index: number;
  relevanceScore: number;
}

export interface SelectedDocument {
  id: string;
  title: string;
  url: string;
  text: string;
}

export interface SelectDocumentsOptions {
  threshold?: number;
  max?: number;
  pageSlug?: string;
  boost?: number;
}

// Applies the relevance threshold and the current-page boost, then keeps the top-scoring matches.
export function selectDocuments(
  matches: RetrievedMatch[],
  rerank: RerankResult[],
  { threshold = 0.3, max = 4, pageSlug, boost = 0.15 }: SelectDocumentsOptions = {},
): SelectedDocument[] {
  const scored: Array<{ match: RetrievedMatch; score: number }> = [];
  for (const result of rerank) {
    const match = matches[result.index];
    if (!match || !match.metadata?.text) continue;
    const onCurrentPage = Boolean(pageSlug) && match.metadata?.slug === pageSlug;
    const score = result.relevanceScore + (onCurrentPage ? boost : 0);
    if (score >= threshold) scored.push({ match, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, max).map(({ match }) => ({
    id: match.id,
    title: match.metadata?.title ?? "",
    url: match.metadata?.url ?? "",
    text: match.metadata?.text ?? "",
  }));
}
