import { memo, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { streamChatMessage, type ChatMessage } from "@/lib/chat-client";
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

// Slug of the project page being viewed, matching the server's pageSlug pattern.
function getPageSlug(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const match = /^\/projects\/([a-z0-9-]{1,40})\/?$/.exec(window.location.pathname);
  return match?.[1];
}

// History sent to the server: the most recent turns, each clipped to the server's length limit.
const HISTORY_SEND = 12;
const HISTORY_ITEM_MAX = 2000;

const SANITIZE_CONFIG = {
  FORBID_TAGS: ["img", "form", "input", "style"],
  FORBID_ATTR: ["style"],
};

// External http(s) links open in a new tab without referrer or opener; same-site links are left as they are.
if (typeof window !== "undefined") {
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName !== "A") return;
    const href = node.getAttribute("href");
    if (!href) return;
    let url: URL;
    try {
      url = new URL(href, window.location.href);
    } catch {
      return;
    }
    if (!/^https?:$/.test(url.protocol) || url.origin === window.location.origin) return;
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  });
}

function renderMarkdown(text: string): string {
  if (typeof window === "undefined") return "";
  // marked is sync when no async extensions are configured
  return DOMPurify.sanitize(marked.parse(text) as string, SANITIZE_CONFIG);
}

// Re-parses and re-sanitizes only when this bubble's text changes.
const AssistantBubble = memo(function AssistantBubble({ content }: { content: string }) {
  const html = useMemo(() => renderMarkdown(content), [content]);
  return (
    <div
      className="chat-md max-w-[85%] rounded-2xl rounded-bl-sm bg-(--color-muted) text-(--color-foreground) px-3.5 py-2.5 text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

// Distance from the bottom, in pixels, within which streamed text keeps the view pinned.
const STICK_THRESHOLD = 40;

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
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hydratedRef = useRef(false);
  // Whether the view is pinned to the bottom; only an upward scroll away from the bottom unpins it.
  const stickRef = useRef(true);
  const lastScrollTopRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // Abort any in-flight reply when the widget unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

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

  // Follows new content while pinned: instant during streaming, smooth otherwise.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !stickRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: streamingId ? "auto" : "smooth" });
  }, [messages, isLoading, streamingId]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= STICK_THRESHOLD;
    if (nearBottom) stickRef.current = true;
    else if (el.scrollTop < lastScrollTopRef.current) stickRef.current = false;
    lastScrollTopRef.current = el.scrollTop;
  };

  const submit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    const userMsg: UIMessage = {
      role: "user",
      content: trimmed,
      id: crypto.randomUUID(),
    };
    stickRef.current = true;
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const history: ChatMessage[] = messages.slice(-HISTORY_SEND).map(({ role, content }) => ({
      role,
      content: content.slice(0, HISTORY_ITEM_MAX),
    }));

    // The assistant bubble appears with the first streamed text and grows in place, at most once per frame.
    const replyId = crypto.randomUUID();
    let started = false;
    let latest = "";
    let frame = 0;
    const flush = () => {
      frame = 0;
      const text = latest;
      if (!started) {
        started = true;
        setStreamingId(replyId);
        setMessages((prev) => [...prev, { role: "assistant", content: text, id: replyId }]);
        return;
      }
      setMessages((prev) => prev.map((m) => (m.id === replyId ? { ...m, content: text } : m)));
    };
    const onDelta = (text: string) => {
      latest = text;
      if (!frame) frame = requestAnimationFrame(flush);
    };

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamChatMessage(trimmed, history, {
        pageTopic: getPageTopic(),
        pageSlug: getPageSlug(),
        onDelta,
        signal: controller.signal,
      });
    } catch (err) {
      if (controller.signal.aborted) return;
      // Rate-limit and generic failures both carry a user-facing message.
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      if (frame) {
        cancelAnimationFrame(frame);
        if (!controller.signal.aborted) flush();
      }
      if (abortRef.current === controller) abortRef.current = null;
      if (!controller.signal.aborted) {
        setStreamingId(null);
        setIsLoading(false);
      }
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
              Answers from rraimundo.me
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

      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-4 animate-in">
            <div className="rounded-xl bg-(--color-muted)/50 p-4 text-sm leading-relaxed">
              Ask about Rodolfo's projects, work, education or hobbies.
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
              <AssistantBubble content={m.content} />
            )}
          </div>
        ))}

        {isLoading && !streamingId && (
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
          maxLength={2000}
          placeholder="Ask a question"
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
        Cohere Command A · answers from site content
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
