import { useState } from "react";

interface Project {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  cover: string;
  coverAlt: string;
}

export default function ProjectSpotlight({
  projects,
}: {
  projects: Project[];
}) {
  const [active, setActive] = useState(0);
  const current = projects[active];

  return (
    <div>
      {/* Desktop: big spotlight + side preview list */}
      <div className="hidden md:grid md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_340px] gap-4 lg:gap-6">
        <a
          href={`/projects/${current.id}`}
          className="group relative h-[460px] lg:h-[540px] rounded-2xl overflow-hidden border border-(--color-border) bg-(--color-muted)"
        >
          {/* Stack every project's cover so we can crossfade between them
              without remounting the image (which caused a flash on hover). */}
          {projects.map((p, i) => (
            <img
              key={p.id}
              src={p.cover}
              alt={p.coverAlt}
              loading={i === 0 ? "eager" : "lazy"}
              className={`absolute inset-0 w-full h-full object-cover transition-[opacity,transform] duration-500 ease-out will-change-[opacity,transform] group-hover:scale-[1.03] ${i === active ? "opacity-100" : "opacity-0"}`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-7 lg:p-9 flex flex-col gap-3 text-white">
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

            <h3 className="text-3xl lg:text-4xl font-semibold tracking-tight text-balance">
              {current.title}
            </h3>

            <p className="max-w-xl text-sm lg:text-base text-white/80 leading-relaxed text-pretty">
              {current.summary}
            </p>

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

        <div className="flex flex-col gap-3 h-[460px] lg:h-[540px] overflow-y-auto pr-1 spot-rail">
          {projects.map((p, i) => {
            const isActive = i === active;
            return (
              <a
                key={p.id}
                href={`/projects/${p.id}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
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
                    alt={p.coverAlt}
                    loading="lazy"
                    className={`w-full h-full object-cover transition-all duration-500 ${
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

      {/* Mobile: horizontal scroll-snap strip, one project at a time */}
      <div className="md:hidden relative">
        <div className="proj-strip flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4">
          {projects.map((p) => (
            <a
              key={p.id}
              href={`/projects/${p.id}`}
              className="group shrink-0 snap-start w-[300px] rounded-2xl border border-(--color-border) bg-(--color-card) overflow-hidden"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-(--color-muted)">
                <img
                  src={p.cover}
                  alt={p.coverAlt}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="px-5 py-4">
                <h3 className="text-base font-semibold tracking-tight">
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
          <div className="shrink-0 w-1" aria-hidden="true" />
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-(--color-background) to-transparent" />
      </div>
    </div>
  );
}
