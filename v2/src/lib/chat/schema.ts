import { z } from "zod";

// A single turn of prior conversation; only user and assistant turns are ever replayed to the model.
export const HistoryMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(2000),
});

export type HistoryMessage = z.infer<typeof HistoryMessageSchema>;

export const RequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  conversationHistory: z.array(HistoryMessageSchema).max(50).default([]),
  pageTopic: z.string().trim().max(120).optional(),
  pageSlug: z
    .string()
    .regex(/^[a-z0-9-]{1,40}$/)
    .optional(),
});

export type ChatRequest = z.infer<typeof RequestSchema>;

// Keeps only the most recent messages so the model never sees an unbounded history.
export const HISTORY_LIMIT = 12;

export function trimHistory(history: HistoryMessage[]): HistoryMessage[] {
  return history.slice(-HISTORY_LIMIT);
}
