// Markdown → retrieval chunks for the chat knowledge base.

export function parseFrontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { data: {}, body: src };
  const data = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].trim().replace(/^["'](.*)["']$/, "$1");
  }
  return { data, body: src.slice(m[0].length).trim() };
}

// Groups paragraphs into pieces no longer than maxChars; a single oversized paragraph stays whole.
function packParagraphs(paragraphs, maxChars) {
  const pieces = [];
  let cur = "";
  for (const p of paragraphs) {
    if (cur && cur.length + 2 + p.length > maxChars) {
      pieces.push(cur);
      cur = p;
    } else {
      cur = cur ? `${cur}\n\n${p}` : p;
    }
  }
  if (cur) pieces.push(cur);
  return pieces;
}

export function chunkMarkdown({ slug, data, body }, { maxChars = 900 } = {}) {
  // A frontmatter `slug:` overrides the filename-derived slug, so a knowledge file can index
  // under the page slug it actually describes.
  const effectiveSlug = data.slug || slug;
  const title = data.title ?? slug;
  const url = data.url ?? "/";
  const sections = [];
  let current = { section: "Overview", lines: [] };
  for (const line of body.split("\n")) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      sections.push(current);
      current = { section: h[1], lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  sections.push(current);

  const chunks = [];
  for (const { section, lines } of sections) {
    const paragraphs = lines.join("\n").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    if (!paragraphs.length) continue;
    for (const piece of packParagraphs(paragraphs, maxChars)) {
      chunks.push({
        id: `${effectiveSlug}#${chunks.length}`,
        slug: effectiveSlug,
        title,
        url,
        section,
        text: `${title} · ${section}\n\n${piece}`,
      });
    }
  }
  return chunks;
}
