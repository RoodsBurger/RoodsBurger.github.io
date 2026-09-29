import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";

interface Project {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  cover: string;
  coverDark?: string;
  coverAlt: string;
}

// Renders a cover image, plus its dark-theme variant when there is one; CSS shows the one matching the theme.
function CoverImg({ p, className, ...rest }: { p: Project; className: string } & ImgHTMLAttributes<HTMLImageElement>) {
  if (!p.coverDark) return <img src={p.cover} className={className} {...rest} />;
  return (
    <>
      <img src={p.cover} className={`${className} cover-when-light`} {...rest} />
      <img src={p.coverDark} className={`${className} cover-when-dark`} {...rest} />
    </>
  );
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
  const [stripActive, setStripActive] = useState(initialIndex);
  const current = projects[active];

  const hoverTimer = useRef<number | undefined>(undefined);
  const preloaded = useRef(new Set<string>());
  const stripRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const railRef = useRef<HTMLDivElement>(null);
  const railItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

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
      { root: strip, rootMargin: "0px -49% 0px -49%", threshold: 0 },
    );
    cardRefs.current.forEach((card) => card && io.observe(card));
    return () => io.disconnect();
  }, []);

  const scrollStripTo = (i: number, instant = false) => {
    const strip = stripRef.current;
    const card = cardRefs.current[i];
    if (!strip || !card) return;
    const reduce = instant || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const left = card.offsetLeft - (strip.clientWidth - card.offsetWidth) / 2;
    strip.scrollTo({ left, behavior: reduce ? "instant" : "smooth" });
    setStripActive(i);
  };

  // Centers a rail item within the rail without moving the page.
  const scrollRailTo = (i: number) => {
    const rail = railRef.current;
    const item = railItemRefs.current[i];
    if (!rail || !item || !rail.clientHeight) return;
    const railBox = rail.getBoundingClientRect();
    const itemBox = item.getBoundingClientRect();
    rail.scrollTop += itemBox.top - railBox.top - (railBox.height - itemBox.height) / 2;
  };

  // Opens with the active project in view; when a project modal closes, that project becomes active.
  useEffect(() => {
    if (initialIndex) {
      scrollRailTo(initialIndex);
      scrollStripTo(initialIndex, true);
    }
    const onClosed = (e: Event) => {
      const i = projects.findIndex((p) => p.id === (e as CustomEvent<string>).detail);
      if (i < 0) return;
      setActiveIndex(i);
      scrollRailTo(i);
      scrollStripTo(i, true);
    };
    document.addEventListener("rr:project-closed", onClosed);
    return () => document.removeEventListener("rr:project-closed", onClosed);
  }, []);

  return (
    <div>
      {/* Desktop: big spotlight + side preview list */}
      <div className="hidden md:grid md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_340px] gap-4 lg:gap-6">
        <a
          href={`/projects/${current.id}`}
          className="group relative h-[460px] lg:h-[540px] rounded-2xl overflow-hidden border border-(--color-border) bg-(--color-muted)"
        >
          {/* Every cover stays mounted and stacked; the active one fades in while settling from 1.02 to 1. */}
          {projects.map((p, i) => (
            <CoverImg
              key={p.id}
              p={p}
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

              <h3 className="vt-project-title text-3xl lg:text-4xl font-semibold tracking-tight text-balance">
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
          ref={railRef}
          className="flex flex-col gap-3 h-[460px] lg:h-[540px] overflow-y-auto pr-1 spot-rail">
          {projects.map((p, i) => {
            const isActive = i === active;
            return (
              <a
                key={p.id}
                ref={(el) => {
                  railItemRefs.current[i] = el;
                }}
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
                }}
                onPointerDown={() => {
                  cancelHover();
                  setActive(i);
                }}
                aria-current={isActive ? "true" : undefined}
                className={`group flex items-center gap-3 shrink-0 rounded-xl border p-2.5 text-left transition-colors duration-300 ${
                  isActive
                    ? "border-(--color-signal)/55 bg-(--color-muted)"
                    : "border-(--color-border) hover:border-(--color-foreground)/25"
                }`}
              >
                <div className="relative size-16 lg:size-[72px] shrink-0 rounded-lg overflow-hidden bg-(--color-muted)">
                  <CoverImg
                    p={p}
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

      {/* Mobile: full-bleed strip with the active card centered and its neighbours peeking in on both sides */}
      <div className="md:hidden -mx-6">
        <div className="relative">
          <div
            ref={stripRef}
            className="proj-strip relative flex gap-3 overflow-x-auto snap-x snap-mandatory overscroll-x-contain px-[calc(50%-min(150px,39vw))] pb-1"
          >
            {projects.map((p, i) => (
              <a
                key={p.id}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                data-index={i}
                href={`/projects/${p.id}`}
                onClick={(e) => {
                  // Tapping a peeking card brings it to the center first instead of opening it.
                  if (i === stripActive) return;
                  e.preventDefault();
                  scrollStripTo(i);
                }}
                className={`group shrink-0 snap-center snap-always w-[min(300px,78vw)] rounded-2xl border border-(--color-border) bg-(--color-card) overflow-hidden transition-[scale,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  i === stripActive ? "" : "scale-[0.94] opacity-55"
                }`}
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-(--color-card)">
                  <CoverImg
                    p={p}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="px-5 py-4">
                  <h3 className="vt-project-title text-base font-semibold tracking-tight">
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
                    isOn ? "w-4 bg-(--color-signal)" : "w-1.5 bg-(--color-muted-foreground)/35"
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
