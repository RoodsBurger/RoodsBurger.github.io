import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";
import { marked } from "marked";
import { sendChatMessage, type ChatMessage } from "@/lib/chat-client";
import { cn } from "@/lib/cn";

marked.setOptions({ gfm: true, breaks: true });

// Conversation is persisted in sessionStorage so it survives page navigations.
const STORE_KEY = "rr-chat-v1";
const MAX_PERSIST = 60;

interface PersistedChat {
  open: boolean;
  messages: UIMessage[];
}

function loadChat(): PersistedChat | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedChat;
    if (!parsed || !Array.isArray(parsed.messages)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveChat(state: PersistedChat): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable; non-fatal */
  }
}

// Read the project title from the modal first; falls back to any h1.
function projectTitle(): string {
  if (typeof document === "undefined") return "";
  const t =
    document.getElementById("project-modal-title")?.textContent ||
    document.querySelector("article[role='dialog'] h1")?.textContent ||
    document.querySelector("h1")?.textContent ||
    "";
  return t.trim();
}

// Short description of the current page; lets the assistant resolve deictic questions.
function getPageContext(): string {
  if (typeof window === "undefined") return "";
  const path = window.location.pathname;
  const docTitle = document.title || "";
  const lead = docTitle.split(" · ")[0]?.trim();

  if (path === "/") return "The user is on the home page of Rodolfo's portfolio.";
  if (path === "/projects") return "The user is on the Projects listing page.";
  if (path === "/hobbies")
    return "The user is on the Personal page, about Rodolfo's hobbies and life outside work.";
  if (path === "/chat") return "The user is on the dedicated chat page.";
  if (path.startsWith("/projects/")) {
    const name = projectTitle() || lead || "a project";
    return `The user is viewing the project page for "${name}" (${path}). If their question is ambiguous (e.g. "this", "it", "tell me more"), assume it refers to this project.`;
  }
  return lead
    ? `The user is on the "${lead}" page (${path}).`
    : `The user is on ${path}.`;
}

// Concise subject for the current page used to steer RAG retrieval.
function getPageTopic(): string {
  if (typeof window === "undefined") return "";
  const path = window.location.pathname;
  const lead = (document.title || "").split(" · ")[0]?.trim();

  if (path === "/") return "Rodolfo Raimundo portfolio overview";
  if (path === "/projects") return "Rodolfo's projects";
  if (path === "/hobbies")
    return "Rodolfo's hobbies and life outside work";
  if (path === "/chat") return "";
  if (path.startsWith("/projects/")) {
    return projectTitle() || lead || "";
  }
  return lead || "";
}

function renderMarkdown(text: string): string {
  // marked is sync when no async extensions are configured
  return marked.parse(text) as string;
}

interface Props {
  mode?: "floating" | "embedded";
}

const SUGGESTIONS = [
  "What are Rodolfo's projects?",
  "Tell me about his robotics work",
  "What are his hobbies?",
  "What's his academic background?",
];

interface UIMessage {
  role: "user" | "assistant";
  content: string;
  id: string;
}

export default function ChatWidget({ mode = "floating" }: Props) {
  const [isOpen, setIsOpen] = useState(mode === "embedded");
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hydratedRef = useRef(false);

  // Hydrate the saved conversation after mount to avoid hydration mismatch.
  useEffect(() => {
    const saved = loadChat();
    if (saved) {
      if (saved.messages.length) setMessages(saved.messages);
      if (mode === "floating" && saved.open) setIsOpen(true);
    }
    hydratedRef.current = true;
  }, [mode]);

  // Persist conversation and open state on every change.
  useEffect(() => {
    if (!hydratedRef.current) return;
    saveChat({
      open: mode === "floating" ? isOpen : true,
      messages: messages.slice(-MAX_PERSIST),
    });
  }, [messages, isOpen, mode]);


  useEffect(() => {
    if (mode === "floating" && isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen, mode]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  const submit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    const userMsg: UIMessage = {
      role: "user",
      content: trimmed,
      id: crypto.randomUUID(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const history: ChatMessage[] = [...messages, userMsg].map(({ role, content }) => ({
      role,
      content,
    }));

    try {
      const reply = await sendChatMessage(
        trimmed,
        history.slice(0, -1),
        getPageContext(),
        getPageTopic(),
      );
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply, id: crypto.randomUUID() },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    void submit(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit(input);
    }
  };

  const panel = (
    <div
      className={cn(
        "flex flex-col bg-(--color-card) text-(--color-card-foreground) border border-(--color-border) overflow-hidden",
        mode === "floating"
          ? "fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[min(380px,calc(100vw-2rem))] h-[min(560px,calc(100vh-6rem))] rounded-2xl shadow-2xl z-[70] origin-bottom-right animate-chat-in"
          : "w-full h-[min(640px,calc(100vh-12rem))] rounded-2xl shadow-sm",
      )}
      role="dialog"
      aria-label="AI assistant"
    >
      <header className="flex items-center justify-between px-4 py-3 border-b border-(--color-border)/60">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-md bg-(--color-accent)/10 text-(--color-accent) flex items-center justify-center">
            <Sparkles size={14} />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">Ask about Rodolfo</div>
            <div className="text-[11px] text-(--color-muted-foreground)">
              AI assistant for answers from his portfolio
            </div>
          </div>
        </div>
        {mode === "floating" && (
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close chat"
            className="p-1.5 rounded-md text-(--color-muted-foreground) hover:bg-(--color-muted) hover:text-(--color-foreground) transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-4 animate-in">
            <div className="rounded-xl bg-(--color-muted)/50 p-4 text-sm leading-relaxed">
              Hi! I'm trained on Rodolfo's portfolio, resume, and research. Ask me
              anything about his projects, skills, or background.
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-(--color-muted-foreground) uppercase tracking-wider">
                Try asking
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void submit(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-(--color-border) hover:border-(--color-accent) hover:text-(--color-accent) transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex animate-in",
              m.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            {m.role === "user" ? (
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-(--color-accent) text-(--color-accent-foreground) px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
                {m.content}
              </div>
            ) : (
              <div
                className="chat-md max-w-[85%] rounded-2xl rounded-bl-sm bg-(--color-muted) text-(--color-foreground) px-3.5 py-2.5 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
              />
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-(--color-muted) px-3.5 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-(--color-muted-foreground)/60 animate-bounce [animation-delay:-0.3s]"></span>
                <span className="size-1.5 rounded-full bg-(--color-muted-foreground)/60 animate-bounce [animation-delay:-0.15s]"></span>
                <span className="size-1.5 rounded-full bg-(--color-muted-foreground)/60 animate-bounce"></span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-400">
            {error}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-(--color-border)/60 p-3 flex items-end gap-2"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Ask anything..."
          className="flex-1 resize-none bg-transparent text-sm px-3 py-2 rounded-lg border border-(--color-border) focus:border-(--color-accent) focus:outline-none focus:ring-2 focus:ring-(--color-ring)/30 max-h-32"
          aria-label="Message"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="size-9 shrink-0 rounded-lg bg-(--color-accent) text-(--color-accent-foreground) flex items-center justify-center hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          aria-label="Send message"
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </form>

      <div className="px-3 pb-2 pt-0 text-center text-[10px] font-mono text-(--color-muted-foreground)/50 tracking-wider">
        Powered by Cohere · RAG over portfolio
      </div>
    </div>
  );

  if (mode === "embedded") return panel;

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open chat"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[70] group size-12 rounded-full bg-(--color-accent) text-(--color-accent-foreground) shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        >
          <MessageCircle size={20} />
        </button>
      )}
      {isOpen && panel}
    </>
  );
}
