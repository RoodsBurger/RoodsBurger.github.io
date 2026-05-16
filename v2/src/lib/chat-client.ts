export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatResponse {
  message: {
    role: "assistant";
    content: Array<{ type: "text"; text: string }>;
  };
}

export interface ChatErrorResponse {
  error: string;
  details?: string;
}

const FUNCTION_URL = "/.netlify/functions/chat";

export async function sendChatMessage(
  message: string,
  conversationHistory: ChatMessage[] = [],
  pageContext?: string,
): Promise<string> {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, conversationHistory, pageContext }),
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as ChatErrorResponse;
    throw new Error(err.error || `Chat function failed (${response.status})`);
  }

  const data = (await response.json()) as ChatResponse;
  const text = data?.message?.content?.[0]?.text;
  if (!text) throw new Error("Empty response from chat function");
  return text;
}
