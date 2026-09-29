// Opens project pages as in-place modals over the current page and closes them without reloading it.
// A project URL loaded directly renders the home page behind its modal; closing that one also stays in place.

const PROJECT_PATH = /^\/projects\/([a-z0-9-]+)\/?$/;
const CLOSE_SELECTOR = 'a[href="/#projects"]';
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface OpenModal {
  overlay: HTMLElement;
  id: string;
  trigger: HTMLElement | null;
  inerted: HTMLElement[];
  pausedVideos: HTMLVideoElement[];
  bgTitle: string;
  // Wrapper around the server-rendered home page on a directly loaded project URL.
  directBg: HTMLElement | null;
}

let current: OpenModal | null = null;
let busy: Promise<void> = Promise.resolve();
let scriptRun = 0;
const pages = new Map<string, Promise<Document>>();

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canMorph = () => "startViewTransition" in document && !reducedMotion();
const nextTask = () => new Promise<void>((r) => setTimeout(r, 0));

function projectPath(href: string): string | null {
  const url = new URL(href, location.href);
  if (url.origin !== location.origin) return null;
  return PROJECT_PATH.test(url.pathname) ? url.pathname.replace(/\/$/, "") : null;
}

// Fetches and parses a project page once; a failed fetch is dropped so a later attempt retries.
function load(path: string): Promise<Document> {
  let page = pages.get(path);
  if (!page) {
    page = fetch(path, { credentials: "same-origin" })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.text();
      })
      .then((html) => new DOMParser().parseFromString(html, "text/html"));
    page.catch(() => pages.delete(path));
    pages.set(path, page);
  }
  return page;
}

function warm(href: string) {
  const path = projectPath(href);
  if (path) load(path).catch(() => {});
}

// Copies stylesheets the project page needs that this page does not already carry.
async function adoptStyles(doc: Document) {
  const have = new Set(
    Array.from(document.head.querySelectorAll("style")).map((s) => s.textContent),
  );
  const links = new Set(
    Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).map((l) => l.href),
  );
  const pending: Promise<unknown>[] = [];
  doc.head.querySelectorAll("style").forEach((s) => {
    if (!have.has(s.textContent)) document.head.append(s.cloneNode(true));
  });
  doc.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((l) => {
    const href = new URL(l.getAttribute("href") || "", location.href).href;
    if (links.has(href)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    pending.push(new Promise<void>((r) => (link.onload = link.onerror = () => r())));
    document.head.append(link);
  });
  await Promise.all(pending);
}

// Parsed scripts never execute, so each one inside the modal is recreated; module files get a fresh URL to run again.
function runScripts(root: HTMLElement) {
  root.querySelectorAll("script").forEach((old) => {
    const script = document.createElement("script");
    for (const { name, value } of Array.from(old.attributes)) script.setAttribute(name, value);
    const src = old.getAttribute("src");
    if (src && old.type === "module") {
      const url = new URL(src, location.href);
      url.searchParams.set("rr", String(++scriptRun));
      script.src = url.href;
    } else {
      script.textContent = old.textContent;
    }
    old.replaceWith(script);
  });
}

// Everything but the modal and the chat widget leaves the focus order and the accessibility tree.
function inertBackground(overlay: HTMLElement): HTMLElement[] {
  const chat = document.querySelector('[aria-label="AI assistant"]');
  const inerted: HTMLElement[] = [];
  Array.from(document.body.children).forEach((el) => {
    if (!(el instanceof HTMLElement) || el.contains(overlay) || (chat && el.contains(chat))) return;
    if (el.tagName === "SCRIPT" || el.tagName === "STYLE" || el.inert) return;
    el.inert = true;
    inerted.push(el);
  });
  // A directly loaded modal sits inside <main>; its siblings there go inert too.
  const main = overlay.parentElement;
  if (main && main !== document.body) {
    Array.from(main.children).forEach((el) => {
      if (el === overlay || !(el instanceof HTMLElement) || el.inert) return;
      el.inert = true;
      inerted.push(el);
    });
  }
  return inerted;
}

// Background videos pause while a modal covers them and resume when it closes.
function pauseBackground(overlay: HTMLElement): HTMLVideoElement[] {
  const paused: HTMLVideoElement[] = [];
  document.querySelectorAll("video").forEach((v) => {
    if (overlay.contains(v) || v.paused) return;
    v.pause();
    paused.push(v);
  });
  return paused;
}

// Resumes paused videos plus autoplay videos that stayed paused behind a directly loaded modal.
function resumeBackground(paused: HTMLVideoElement[]) {
  const onScreen = (v: HTMLVideoElement) => {
    const r = v.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < innerHeight;
  };
  const autoplay = Array.from(document.querySelectorAll<HTMLVideoElement>("video[autoplay]")).filter(
    (v) => !v.closest("[data-mediaseq]"),
  );
  new Set([...paused, ...autoplay]).forEach((v) => {
    if (v.isConnected && v.paused && onScreen(v)) v.play().catch(() => {});
  });
}

// Focuses the dialog itself; sentinels at the card's edges wrap Tab and Shift+Tab around the card.
function trapFocus(overlay: HTMLElement) {
  const dialog = overlay.querySelector<HTMLElement>(".project-modal");
  const card = overlay.querySelector<HTMLElement>(".project-card");
  if (!dialog || !card) return;
  dialog.focus({ preventScroll: true });

  const focusables = () =>
    Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => !el.hasAttribute("data-focus-sentinel") && (el.offsetParent !== null || el === document.activeElement),
    );
  const inChat = (el: EventTarget | null) => {
    const chat = document.querySelector('[aria-label="AI assistant"]');
    return !!(chat && el instanceof Node && chat.contains(el));
  };
  const redirect = (pick: (items: HTMLElement[], e: FocusEvent) => HTMLElement) => (e: FocusEvent) => {
    // Focus arriving from the chat widget is intentional, and an open <dialog> manages its own focus.
    if (inChat(e.relatedTarget) || document.querySelector("dialog[open]")) return;
    const items = focusables();
    if (items.length) pick(items, e).focus();
  };
  card.querySelector('[data-focus-sentinel="start"]')?.addEventListener(
    "focus",
    redirect((items, e) => (e.relatedTarget === dialog ? items[0] : items[items.length - 1])) as EventListener,
  );
  card.querySelector('[data-focus-sentinel="end"]')?.addEventListener(
    "focus",
    redirect((items) => items[0]) as EventListener,
  );
}

function mount(overlay: HTMLElement, trigger: HTMLElement | null, bgTitle: string, directBg: HTMLElement | null) {
  current = {
    overlay,
    id: overlay.querySelector<HTMLElement>(".project-modal")?.dataset.projectId || "",
    trigger,
    inerted: inertBackground(overlay),
    pausedVideos: pauseBackground(overlay),
    bgTitle,
    directBg,
  };
  trapFocus(overlay);
}

// Visible title of the given project outside the modal, used as the morph partner.
function sourceTitle(id: string, within?: Element | null): HTMLElement | null {
  const scope = within || document;
  const titles = scope.querySelectorAll<HTMLElement>(`a[href="/projects/${id}"] .vt-project-title`);
  for (const el of Array.from(titles)) {
    if (current?.overlay.contains(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth) return el;
  }
  return null;
}

async function show(path: string, push: boolean, trigger: HTMLElement | null) {
  let doc: Document;
  try {
    doc = await load(path);
  } catch {
    location.href = path;
    return;
  }
  const incoming = doc.querySelector<HTMLElement>(".project-modal-overlay");
  if (!incoming) {
    location.href = path;
    return;
  }
  await adoptStyles(doc);
  const overlay = document.importNode(incoming, true);
  if (push) history.pushState({ rrModal: path }, "", path);
  const bgTitle = current ? current.bgTitle : document.title;
  document.title = doc.title;

  if (current) {
    // Another project opened from inside a modal replaces the card in place.
    current.overlay.replaceWith(overlay);
    current.overlay = overlay;
    current.id = overlay.querySelector<HTMLElement>(".project-modal")?.dataset.projectId || "";
    runScripts(overlay);
    document.dispatchEvent(new CustomEvent("rr:content", { detail: overlay }));
    trapFocus(overlay);
    return;
  }

  const insert = () => {
    document.body.append(overlay);
    runScripts(overlay);
    mount(overlay, trigger, bgTitle, null);
    document.dispatchEvent(new CustomEvent("rr:content", { detail: overlay }));
  };
  const id = overlay.querySelector<HTMLElement>(".project-modal")?.dataset.projectId || "";
  // The tapped card's own title morphs; a rail item hands off to the spotlight title it just activated.
  const from = trigger ? sourceTitle(id, trigger) || sourceTitle(id) : null;
  if (!canMorph()) {
    insert();
    return;
  }
  if (from) from.style.viewTransitionName = `project-title-${id}`;
  const vt = document.startViewTransition(() => {
    if (from) from.style.viewTransitionName = "";
    insert();
  });
  await vt.updateCallbackDone.catch(() => {});
}

async function hide() {
  const open = current;
  if (!open) return;
  current = null;
  // The spotlight moves to the closed project while the modal still covers it.
  document.dispatchEvent(new CustomEvent("rr:project-closed", { detail: open.id }));
  document.title = open.bgTitle;

  const restore = () => {
    open.overlay.remove();
    open.inerted.forEach((el) => (el.inert = false));
    if (open.directBg) {
      open.directBg.inert = false;
      open.directBg.removeAttribute("aria-hidden");
    }
    resumeBackground(open.pausedVideos);
    if (open.trigger?.isConnected) open.trigger.focus({ preventScroll: true });
  };

  if (canMorph()) {
    await nextTask();
    await nextTask();
    const to = sourceTitle(open.id);
    const vt = document.startViewTransition(() => {
      restore();
      if (to) to.style.viewTransitionName = `project-title-${open.id}`;
    });
    await vt.finished.catch(() => {});
    if (to) to.style.viewTransitionName = "";
    return;
  }
  if (reducedMotion()) {
    restore();
    return;
  }
  open.overlay.classList.add("is-closing");
  await new Promise<void>((r) => {
    const done = () => r();
    open.overlay.addEventListener("animationend", done, { once: true });
    setTimeout(done, 250);
  });
  restore();
}

// Serializes open and close so fast repeated input never interleaves two transitions.
function queue(task: () => Promise<void>) {
  busy = busy.then(task, task);
  return busy;
}

function requestClose() {
  if (!current) return;
  if (history.state?.rrModal) history.back();
  else queue(hide);
}

function onClick(e: MouseEvent) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;

  if (current && current.overlay.contains(a) && (a.matches(CLOSE_SELECTOR) || a.hasAttribute("data-project-backdrop"))) {
    e.preventDefault();
    requestClose();
    return;
  }
  // Back links return through history when they lead to the previous page, which restores it with its scroll.
  if (a.hasAttribute("data-back") && document.referrer) {
    const ref = new URL(document.referrer);
    const to = new URL(a.href);
    if (ref.origin === to.origin && ref.pathname === to.pathname && history.length > 1) {
      e.preventDefault();
      history.back();
      return;
    }
  }
  const path = projectPath(a.href);
  if (!path) return;
  e.preventDefault();
  if (current && current.id === PROJECT_PATH.exec(path)?.[1]) return;
  queue(() => show(path, true, current ? current.trigger : a));
}

function onPopState() {
  const match = PROJECT_PATH.exec(location.pathname);
  if (match && history.state?.rrModal) {
    if (!current || current.id !== match[1]) queue(() => show(location.pathname, false, current?.trigger ?? null));
  } else if (current) {
    queue(hide);
  }
}

// A directly loaded project URL gets a home entry beneath it, so Back and close both reveal the page behind.
function adoptDirectModal() {
  const overlay = document.querySelector<HTMLElement>(".project-modal-overlay");
  if (!overlay) return;
  const directBg = document.querySelector<HTMLElement>("[data-modal-bg]");
  const bgTitle = document.querySelector<HTMLMetaElement>('meta[property="og:site_name"]')?.content || document.title;
  mount(overlay, null, bgTitle, directBg);
  if (!history.state?.rrModal) {
    const path = location.pathname.replace(/\/$/, "");
    const title = document.title;
    history.replaceState(null, "", "/");
    history.pushState({ rrModal: path }, "", path + location.search + location.hash);
    document.title = title;
  }
}

// Project pages are fetched ahead of a tap: on hover, touch or focus, and all visible ones once the page is idle.
function warmUp() {
  const onIntent = (e: Event) => {
    const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (a) warm(a.href);
  };
  document.addEventListener("pointerover", onIntent, { passive: true });
  document.addEventListener("touchstart", onIntent, { passive: true });
  document.addEventListener("focusin", onIntent);

  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return;
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1500));
  window.addEventListener(
    "load",
    () =>
      idle(() => {
        const hrefs = new Set(
          Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/projects/"]')).map((a) => a.href),
        );
        // One at a time so warming never competes with the page's own media.
        hrefs.forEach((href) => {
          busyWarm = busyWarm.then(() => {
            const path = projectPath(href);
            return path ? load(path).then(() => {}, () => {}) : undefined;
          });
        });
      }),
    { once: true },
  );
}
let busyWarm: Promise<void> = Promise.resolve();

adoptDirectModal();
document.addEventListener("click", onClick);
window.addEventListener("popstate", onPopState);
warmUp();
