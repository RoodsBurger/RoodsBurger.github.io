import { useEffect, useRef, useState } from "react";

interface Project {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  cover: string;
  coverAlt: string;
}

// Hover must rest on a rail item this long before the spotlight switches, so skimming does not strobe.
const HOVER_INTENT_MS = 60;

export default function ProjectSpotlight({
  projects,
  initialActiveId,
}: {
  projects: Project[];
  initialActiveId?: string;
}) {
  const initialIndex = initialActiveId
    ? Math.max(
        0,
        projects.findIndex((p) => p.id === initialActiveId),
      )
    : 0;
  const [active, setActiveIndex] = useState(initialIndex);
  // The text fade runs only after a switch; the section reveal covers the first appearance.
  const [switched, setSwitched] = useState(false);
  const setActive = (i: number) => {
    if (i !== active) setSwitched(true);
    setActiveIndex(i);
  };
  // Project whose title carries the view-transition name; set only on the link being navigated from.
  const [navFrom, setNavFrom] = useState<string | null>(null);
  const [stripActive, setStripActive] = useState(initialIndex);
  const current = projects[active];
  // initialActiveId's open modal <h1> already owns that view-transition name; never duplicate it here.
  const titleVT = (id: string) =>
    navFrom === id && id !== initialActiveId
      ? { viewTransitionName: `project-title-${id}` }
      : undefined;

  const hoverTimer = useRef<number | undefined>(undefined);
  const preloaded = useRef(new Set<string>());
  const stripRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Warms the cover so it is decoded before its crossfade starts.
  const preload = (src: string) => {
    if (preloaded.current.has(src)) return;
    preloaded.current.add(src);
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  };

  const cancelHover = () => window.clearTimeout(hoverTimer.current);
  useEffect(() => cancelHover, []);

  // The dot for whichever strip card crosses the strip's center line is active.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setStripActive(Number((entry.target as HTMLElement).dataset.index));
          }
        }
      },
      { root: strip, rootMargin: "0px -48% 0px -48%", threshold: 0 },
    );
    cardRefs.current.forEach((card) => card && io.observe(card));
    return () => io.disconnect();
  }, []);

  const scrollStripTo = (i: number) => {
    const strip = stripRef.current;
    const card = cardRefs.current[i];
    if (!strip || !card) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pad = parseFloat(getComputedStyle(strip).scrollPaddingLeft) || 0;
    strip.scrollTo({ left: card.offsetLeft - pad, behavior: reduce ? "auto" : "smooth" });
    setStripActive(i);
  };

  return (
    <div>
      {/* Desktop: big spotlight + side preview list */}
      <div className="hidden md:grid md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_340px] gap-4 lg:gap-6">
        <a
          href={`/projects/${current.id}`}
          onPointerDown={() => setNavFrom(current.id)}
          onFocus={() => setNavFrom(current.id)}
          className="group relative h-[460px] lg:h-[540px] rounded-2xl overflow-hidden border border-(--color-border) bg-(--color-muted)"
        >
          {/* Every cover stays mounted and stacked; the active one fades in while settling from 1.02 to 1. */}
          {projects.map((p, i) => (
            <img
              key={p.id}
              src={p.cover}
              alt={i === active ? p.coverAlt : ""}
              aria-hidden={i === active ? undefined : true}
              loading={i === initialIndex ? "eager" : "lazy"}
              decoding="async"
              className={`absolute inset-0 w-full h-full object-cover transition-[opacity,scale] duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[opacity,scale] ${
                i === active
                  ? "opacity-100 scale-100 group-hover:scale-[1.03]"
                  : "opacity-0 scale-[1.02]"
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-7 lg:p-9 flex flex-col gap-3 text-white">
            {/* Keyed by project so the text block replays its fade-up on each switch. */}
            <div
              key={current.id}
              className={switched ? "spot-text-in flex flex-col gap-3" : "flex flex-col gap-3"}
            >
              <div className="flex flex-wrap gap-1.5">
                {current.tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <h3
                className="vt-project-title text-3xl lg:text-4xl font-semibold tracking-tight text-balance"
                style={titleVT(current.id)}
              >
                {current.title}
              </h3>

              <p className="max-w-xl text-sm lg:text-base text-white/80 leading-relaxed text-pretty">
                {current.summary}
              </p>
            </div>

            <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium">
              View project
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </span>
          </div>
        </a>

        <div
          className="flex flex-col gap-3 h-[460px] lg:h-[540px] overflow-y-auto pr-1 spot-rail">
          {projects.map((p, i) => {
            const isActive = i === active;
            return (
              <a
                key={p.id}
                href={`/projects/${p.id}`}
                onMouseEnter={() => {
                  preload(p.cover);
                  cancelHover();
                  hoverTimer.current = window.setTimeout(() => setActive(i), HOVER_INTENT_MS);
                }}
                onMouseLeave={cancelHover}
                onFocus={() => {
                  preload(p.cover);
                  cancelHover();
                  setActive(i);
                  setNavFrom(p.id);
                }}
                onPointerDown={() => {
                  cancelHover();
                  setActive(i);
                  setNavFrom(p.id);
                }}
                aria-current={isActive ? "true" : undefined}
                className={`group flex items-center gap-3 shrink-0 rounded-xl border p-2.5 text-left transition-colors duration-300 ${
                  isActive
                    ? "border-(--color-foreground)/40 bg-(--color-muted)"
                    : "border-(--color-border) hover:border-(--color-foreground)/25"
                }`}
              >
                <div className="relative size-16 lg:size-[72px] shrink-0 rounded-lg overflow-hidden bg-(--color-muted)">
                  <img
                    src={p.cover}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className={`w-full h-full object-cover transition-opacity duration-500 ${
                      isActive ? "" : "opacity-70 group-hover:opacity-100"
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold tracking-tight truncate">
                    {p.title}
                  </p>
                  <p className="mt-0.5 text-xs text-(--color-muted-foreground) line-clamp-2 leading-snug">
                    {p.summary}
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* Mobile: full-bleed scroll-snap strip aligned to the page gutter, one project at a time */}
      <div className="md:hidden -mx-6">
        <div className="relative">
          <div
            ref={stripRef}
            className="proj-strip relative flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-6 px-6 pb-1"
          >
            {projects.map((p, i) => (
              <a
                key={p.id}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                data-index={i}
                href={`/projects/${p.id}`}
                onPointerDown={() => setNavFrom(p.id)}
                onFocus={() => setNavFrom(p.id)}
                className="group shrink-0 snap-start w-[min(300px,82vw)] rounded-2xl border border-(--color-border) bg-(--color-card) overflow-hidden"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-(--color-muted)">
                  <img
                    src={p.cover}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="px-5 py-4">
                  <h3
                    className="vt-project-title text-base font-semibold tracking-tight"
                    style={titleVT(p.id)}
                  >
                    {p.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-(--color-muted-foreground) line-clamp-2 leading-snug">
                    {p.summary}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] font-mono px-2 py-0.5 rounded-full border border-(--color-border)/60 text-(--color-muted-foreground)"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </a>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-(--color-background) to-transparent" />
        </div>

        {/* Pagination: each dot is a 44px tap target that scrolls its card into place */}
        <div className="mt-1 flex justify-center px-2" role="group" aria-label="Project pages">
          {projects.map((p, i) => {
            const isOn = i === stripActive;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => scrollStripTo(i)}
                aria-label={`Show ${p.title}`}
                aria-current={isOn ? "true" : undefined}
                className="size-11 shrink-0 grid place-items-center rounded-full"
              >
                <span
                  aria-hidden="true"
                  className={`block h-1.5 rounded-full transition-[width,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isOn ? "w-4 bg-(--color-foreground)" : "w-1.5 bg-(--color-muted-foreground)/35"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
