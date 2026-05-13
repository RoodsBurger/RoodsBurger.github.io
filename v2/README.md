# rraimundo.me — v2

Personal portfolio for Rodolfo Raimundo. A complete rewrite of the v1 static site, now built with Astro 5, Tailwind 4, and TypeScript, deployed to Netlify.

## Stack

- **Astro 5** — content-driven, zero JS by default, React islands for interactive pieces
- **React 19** — used only for the chat widget and theme toggle (hydrated on demand)
- **Tailwind v4** — design tokens defined in `src/styles/globals.css` via `@theme`
- **TypeScript** — strict mode
- **Content collections** — project pages live in `src/content/projects/*.mdx`
- **Netlify Functions** — TypeScript-based chat backend at `netlify/functions/chat.ts`
- **shadcn/Vercel-style aesthetic** — Geist font, neutral palette, single accent

## Local development

```bash
# install
npm install

# run frontend only (no chat function)
npm run dev

# run with Netlify Functions (chat works locally)
npm run netlify:dev
```

> **Heads up**: while the v1 site still lives in the parent directory, run `netlify dev` with an explicit functions path so it doesn't auto-detect the v1 function:
> ```bash
> npx netlify-cli dev --offline --functions netlify/functions
> ```
> Once v2 is promoted to the repo root this becomes unnecessary.

Visit:
- Frontend: http://localhost:4321
- With Netlify dev: http://localhost:8888

## Environment variables

Copy `.env.example` to `.env` and fill in:

```
COHERE_API_KEY=...
PINECONE_API_KEY=...
INDEX_NAME=...
```

For production, set these in the Netlify dashboard → Site settings → Environment variables.

## Diagnosing the AI chat

The function exposes a health check endpoint. With `netlify dev` running:

```bash
curl 'http://localhost:8888/.netlify/functions/chat?healthcheck=1'
```

Returns the status of Cohere + Pinecone, plus the record count in the Pinecone index. Use this to confirm:

- API keys are set and valid
- Pinecone index exists and has documents (free-tier indexes are auto-deleted after 7 days of inactivity)
- Model names haven't been deprecated

If the index is empty, repopulate it by running the v1 script:

```bash
cd ..  # back to repo root
python knowledge_base_setup.py
```

## Build

```bash
npm run build    # typechecks then builds to dist/
npm run preview  # preview the production build locally
```

## Deploy

Pushing to the main branch triggers a Netlify build via `netlify.toml`. Build command: `npm run build`. Publish directory: `dist`. Functions: `netlify/functions`.

Before promoting to production, verify on a deploy preview that the chat works against real Cohere/Pinecone.

## Project structure

```
src/
  layouts/         BaseLayout, ProjectLayout
  pages/           index, hobbies, chat, projects/[...slug], 404
  components/      Hero, About, ProjectGrid, Navbar, Footer, ChatWidget (React), etc.
  content/
    projects/      MDX files — one per project
    config.ts      zod schemas
  lib/             cn(), chat-client, site config
  styles/          globals.css with Tailwind tokens
public/
  artifacts/       images and videos used across pages
  documents/       PDFs (resume, reports, coursework) — also used by knowledge_base_setup.py
netlify/
  functions/
    chat.ts        RAG chat function (Cohere + Pinecone)
```

## Adding a new project

1. Drop assets into `public/artifacts/`
2. Create `src/content/projects/<slug>.mdx` with frontmatter (see existing files)
3. Use `<MediaGrid>` / `<MediaWide>` / `<Model3D>` components in the MDX body
4. Build — the new page appears at `/projects/<slug>` automatically

## 3D models — Fusion 360 → web (STL)

CAD projects can include an interactive 3D viewer (drag-rotate, zoom, idle auto-rotate) via the `<Model3D>` component. It renders **binary STL** directly with Three.js — no conversion step needed.

**Export workflow from Fusion 360:**

1. In Fusion 360 → **File → 3D Print…** (or `Utilities → Make → 3D Print`)
2. Select the body / component you want to share
3. Untick "Send to 3D Print Utility", tick "Save as Mesh"
4. Set format to **STL (Binary)** and click OK → save the file
5. Drop the file at `public/models/<slug>.stl`
6. In the project MDX:
   ```mdx
   import Model3D from "@/components/Model3D.astro";

   <Model3D
     src="/models/<slug>.stl"
     alt="<short description>"
     caption="Drag to rotate · scroll to zoom"
     color="#5b6371"
   />
   ```

**Tips:**
- Keep refinement on "Medium" or "Low" if the file gets bigger than ~5 MB — STL grows fast at high tessellation
- The `color` prop controls the material surface tint (any hex). The viewer adds proper lighting + shadow automatically
- For static thumbnails, render a PNG separately in Fusion and use it as the project `cover` image

A placeholder torus-knot ships at `public/models/wallet.stl` so the viewer renders out of the box — replace it with your real Fusion export.

## Notes on the v1 → v2 cutover

The v1 site (in the parent directory) is still the live deployment. Once you're ready to promote v2:

1. Verify Netlify env vars are populated
2. Update Netlify build settings: command `npm run build`, publish `v2/dist` (or move v2 contents to repo root)
3. Set the Functions directory to `v2/netlify/functions`
4. Confirm `rraimundo.me` resolves correctly on a deploy preview before pointing the production branch
