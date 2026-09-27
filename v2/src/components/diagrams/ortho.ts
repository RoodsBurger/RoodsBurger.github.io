// Orthogonal diagram layout: turns a grid spec into positioned nodes, groups, routed edges and labels, and rejects layouts that collide.

export type Side = "t" | "r" | "b" | "l";
export type Tone = "default" | "muted" | "accent";

export interface DiagramNode {
  id: string;
  col: number;
  row: number;
  /** Column span (default 1). */
  w?: number;
  /** Row span (default 1). */
  h?: number;
  title: string;
  sub?: string;
  tone?: Tone;
}

export interface Box4 {
  t: number;
  r: number;
  b: number;
  l: number;
}

export interface DiagramGroup {
  id: string;
  title: string;
  nodes: string[];
  pad?: Partial<Box4>;
}

/** A position in grid units: an integer n is the centre of the gap before column/row n, n + f is fraction f into column/row n. */
export interface GridPoint {
  x?: number;
  y?: number;
  dx?: number;
  dy?: number;
}

export interface DiagramEdge {
  from: string;
  to: string;
  fromSide?: Side;
  toSide?: Side;
  label?: string | string[];
  /** Index of the segment the label sits beside (default: the longest). */
  labelSeg?: number;
  labelSide?: "above" | "below" | "left" | "right";
  /** Grid-unit position of the label along its segment (default: the segment midpoint). */
  labelAt?: number;
  labelDx?: number;
  labelDy?: number;
  dashed?: boolean;
  bidir?: boolean;
  via?: GridPoint[];
  tone?: "primary" | "secondary";
  fromOffset?: number;
  toOffset?: number;
}

export interface DiagramSpec {
  cols: number;
  rows: number;
  /** Cell size in px; w is derived from the render width when omitted. */
  cell: { w?: number; h: number; gapX: number | number[]; gapY: number | number[] };
  pad?: Partial<Box4>;
  /** Distance between neighbouring ports on one node side. */
  portGap?: number;
  nodes: DiagramNode[];
  groups?: DiagramGroup[];
  edges: DiagramEdge[];
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TextItem {
  x: number;
  y: number;
  text: string;
  size: number;
  anchor: "start" | "middle" | "end";
  box: Rect;
}

export interface LaidNode extends Rect {
  id: string;
  tone: Tone;
  title: TextItem;
  sub?: TextItem;
}

export interface LaidGroup extends Rect {
  id: string;
  title: TextItem;
}

export interface LaidEdge {
  from: string;
  to: string;
  d: string;
  points: Array<[number, number]>;
  tone: "primary" | "secondary";
  dashed: boolean;
  bidir: boolean;
  label: TextItem[];
  labelHalo: "card" | "muted";
}

export interface LaidDiagram {
  viewBox: { x: number; y: number; w: number; h: number };
  renderWidth: number;
  /** viewBox units per rendered CSS px at full width. */
  k: number;
  sizes: { title: number; sub: number; label: number; group: number; arrow: number; nodeRadius: number; groupRadius: number; halo: number };
  nodes: LaidNode[];
  groups: LaidGroup[];
  edges: LaidEdge[];
}

// Rendered CSS px sizes; the layout multiplies them by k so text renders at exactly these sizes.
const PX = { title: 13, sub: 11, label: 11, group: 11, arrow: 7, corner: 6, nodeRadius: 8, groupRadius: 12, textInset: 8, labelGap: 5, labelSideGap: 8, halo: 4 };
// Geist Mono advances every glyph by 0.6em, so text width is exact from the character count.
const CHAR_EM = 0.6;
const LINE_EM = 1.2;
const GROUP_TRACKING_EM = 0.06;
const DEFAULT_GROUP_PAD: Box4 = { t: 34, r: 16, b: 16, l: 16 };
const EPS = 0.01;

type Pt = [number, number];

function arr(v: number | number[], n: number): number[] {
  return Array.isArray(v) ? v : Array.from({ length: n }, () => v);
}

function textWidth(text: string, size: number, tracking = 0): number {
  return text.length * size * (CHAR_EM + tracking);
}

function textItem(x: number, y: number, text: string, size: number, anchor: TextItem["anchor"], tracking = 0): TextItem {
  const w = textWidth(text, size, tracking);
  const h = size * LINE_EM;
  const left = anchor === "start" ? x : anchor === "end" ? x - w : x - w / 2;
  return { x, y, text, size, anchor, box: { x: left, y: y - h / 2, w, h } };
}

function overlaps(a: Rect, b: Rect, margin = 0): boolean {
  return a.x < b.x + b.w + margin && b.x < a.x + a.w + margin && a.y < b.y + b.h + margin && b.y < a.y + a.h + margin;
}

// True when an axis-aligned segment enters the open interior of a rect.
function segHitsRect(p: Pt, q: Pt, r: Rect, inset = 0.5): boolean {
  const x0 = r.x + inset, x1 = r.x + r.w - inset, y0 = r.y + inset, y1 = r.y + r.h - inset;
  const sx0 = Math.min(p[0], q[0]), sx1 = Math.max(p[0], q[0]), sy0 = Math.min(p[1], q[1]), sy1 = Math.max(p[1], q[1]);
  return sx1 > x0 && sx0 < x1 && sy1 > y0 && sy0 < y1;
}

// True when two axis-aligned segments touch or overlap.
function segsMeet(a: [Pt, Pt], b: [Pt, Pt]): boolean {
  const ax0 = Math.min(a[0][0], a[1][0]), ax1 = Math.max(a[0][0], a[1][0]), ay0 = Math.min(a[0][1], a[1][1]), ay1 = Math.max(a[0][1], a[1][1]);
  const bx0 = Math.min(b[0][0], b[1][0]), bx1 = Math.max(b[0][0], b[1][0]), by0 = Math.min(b[0][1], b[1][1]), by1 = Math.max(b[0][1], b[1][1]);
  return ax0 <= bx1 + EPS && bx0 <= ax1 + EPS && ay0 <= by1 + EPS && by0 <= ay1 + EPS;
}

function segments(points: Pt[]): Array<[Pt, Pt]> {
  const out: Array<[Pt, Pt]> = [];
  for (let i = 0; i < points.length - 1; i++) out.push([points[i], points[i + 1]]);
  return out;
}

function roundedPath(points: Pt[], radius: number): string {
  const f = (n: number) => Number(n.toFixed(2));
  let d = `M${f(points[0][0])},${f(points[0][1])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1], [cx, cy] = points[i], [nx, ny] = points[i + 1];
    const lin = Math.hypot(cx - px, cy - py), lout = Math.hypot(nx - cx, ny - cy);
    const r = Math.min(radius, lin / 2, lout / 2);
    const ax = cx - ((cx - px) / lin) * r, ay = cy - ((cy - py) / lin) * r;
    const bx = cx + ((nx - cx) / lout) * r, by = cy + ((ny - cy) / lout) * r;
    d += ` L${f(ax)},${f(ay)} Q${f(cx)},${f(cy)} ${f(bx)},${f(by)}`;
  }
  const last = points[points.length - 1];
  return `${d} L${f(last[0])},${f(last[1])}`;
}

// Drops repeated points and merges collinear runs so every point is a real corner.
function simplify(points: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of points) {
    const prev = out[out.length - 1];
    if (prev && Math.abs(prev[0] - p[0]) < EPS && Math.abs(prev[1] - p[1]) < EPS) continue;
    if (out.length >= 2) {
      const a = out[out.length - 2];
      const collinear = (Math.abs(a[0] - prev[0]) < EPS && Math.abs(prev[0] - p[0]) < EPS) || (Math.abs(a[1] - prev[1]) < EPS && Math.abs(prev[1] - p[1]) < EPS);
      if (collinear) out.pop();
    }
    out.push(p);
  }
  return out;
}

const OUTWARD: Record<Side, Pt> = { t: [0, -1], r: [1, 0], b: [0, 1], l: [-1, 0] };

export function layoutDiagram(spec: DiagramSpec, renderWidth: number, name: string): LaidDiagram {
  const errors: string[] = [];
  const pad: Box4 = { t: 0, r: 18, b: 0, l: 18, ...spec.pad };
  const gapX = arr(spec.cell.gapX, spec.cols - 1);
  const gapY = arr(spec.cell.gapY, spec.rows - 1);
  const gapSumX = gapX.reduce((s, g) => s + g, 0);
  const cellW = spec.cell.w ?? (renderWidth - pad.l - pad.r - gapSumX) / spec.cols;
  const cellH = spec.cell.h;
  const vbW = pad.l + pad.r + gapSumX + cellW * spec.cols;
  const k = vbW / renderWidth;
  const S = Object.fromEntries(Object.entries(PX).map(([key, v]) => [key, v * k])) as typeof PX;

  const colX: number[] = [];
  for (let c = 0, x = pad.l; c < spec.cols; c++) {
    colX.push(x);
    x += cellW + (gapX[c] ?? 0);
  }
  const rowY: number[] = [];
  for (let r = 0, y = pad.t; r < spec.rows; r++) {
    rowY.push(y);
    y += cellH + (gapY[r] ?? 0);
  }
  const gridBottom = rowY[spec.rows - 1] + cellH;

  // Grid-unit coordinate: integer n is the centre of the gap before track n; n + f is fraction f into track n.
  const along = (v: number, starts: number[], size: number, lo: number, hi: number): number => {
    const n = Math.floor(v + EPS);
    const f = v - n;
    if (f > EPS) return starts[n] + f * size;
    const before = n === 0 ? lo : starts[n - 1] + size;
    const after = n >= starts.length ? hi : starts[n];
    return (before + after) / 2;
  };
  const gx = (v: number) => along(v, colX, cellW, 0, vbW);
  const gy = (v: number) => along(v, rowY, cellH, rowY[0] - pad.t, gridBottom + pad.b);

  // Nodes.
  const nodes: LaidNode[] = spec.nodes.map((n) => {
    const cs = n.w ?? 1, rs = n.h ?? 1;
    const x = colX[n.col], y = rowY[n.row];
    const w = colX[n.col + cs - 1] + cellW - x;
    const h = rowY[n.row + rs - 1] + cellH - y;
    const cx = x + w / 2, cy = y + h / 2;
    const titleY = n.sub ? cy - S.sub * 0.78 : cy;
    const title = textItem(cx, titleY, n.title, S.title, "middle");
    const sub = n.sub ? textItem(cx, cy + S.title * 0.72, n.sub, S.sub, "middle") : undefined;
    for (const t of [title, sub]) {
      if (t && t.box.w > w - 2 * S.textInset) errors.push(`node "${n.id}" text "${t.text}" is ${t.box.w.toFixed(0)} wide, node allows ${(w - 2 * S.textInset).toFixed(0)}`);
    }
    return { id: n.id, x, y, w, h, tone: n.tone ?? "default", title, sub };
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const get = (id: string): LaidNode => {
    const n = byId.get(id);
    if (!n) throw new Error(`OrthoDiagram ${name}: unknown node "${id}"`);
    return n;
  };
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    if (overlaps(nodes[i], nodes[j])) errors.push(`nodes "${nodes[i].id}" and "${nodes[j].id}" overlap`);
  }

  // Groups.
  const groups: LaidGroup[] = (spec.groups ?? []).map((g) => {
    const p: Box4 = { ...DEFAULT_GROUP_PAD, ...g.pad };
    const members = g.nodes.map(get);
    const x0 = Math.min(...members.map((m) => m.x)) - p.l * k;
    const y0 = Math.min(...members.map((m) => m.y)) - p.t * k;
    const x1 = Math.max(...members.map((m) => m.x + m.w)) + p.r * k;
    const y1 = Math.max(...members.map((m) => m.y + m.h)) + p.b * k;
    const title = textItem(x0 + 12 * k, y0 + 17 * k, g.title, S.group, "start", GROUP_TRACKING_EM);
    return { id: g.id, x: x0, y: y0, w: x1 - x0, h: y1 - y0, title };
  });
  for (const g of groups) for (const n of nodes) {
    const inside = n.x >= g.x && n.x + n.w <= g.x + g.w && n.y >= g.y && n.y + n.h <= g.y + g.h;
    const member = spec.groups?.find((sg) => sg.id === g.id)?.nodes.includes(n.id);
    if (!member && overlaps(g, n)) errors.push(`node "${n.id}" overlaps group "${g.id}"`);
    if (member && !inside) errors.push(`node "${n.id}" escapes group "${g.id}"`);
  }

  // Edge sides: explicit, or inferred from relative position.
  const sides = spec.edges.map((e) => {
    const a = get(e.from), b = get(e.to);
    const acx = a.x + a.w / 2, acy = a.y + a.h / 2, bcx = b.x + b.w / 2, bcy = b.y + b.h / 2;
    const sameRow = Math.abs(acy - bcy) < EPS, sameCol = Math.abs(acx - bcx) < EPS;
    const fromSide: Side = e.fromSide ?? (sameRow ? (bcx > acx ? "r" : "l") : acy < bcy ? "b" : "t");
    const toSide: Side = e.toSide ?? (sameCol ? (bcy > acy ? "t" : "b") : sameRow ? (bcx > acx ? "l" : "r") : bcx > acx ? "l" : "r");
    return { fromSide, toSide };
  });

  // Ports: edges sharing a node side spread along it, ordered by where their other end lies.
  const portGap = (spec.portGap ?? 12) * k;
  const offsets = spec.edges.map(() => ({ from: 0, to: 0 }));
  const bySide = new Map<string, Array<{ edge: number; end: "from" | "to"; key: number }>>();
  spec.edges.forEach((e, i) => {
    for (const end of ["from", "to"] as const) {
      const side = end === "from" ? sides[i].fromSide : sides[i].toSide;
      const explicit = end === "from" ? e.fromOffset : e.toOffset;
      if (explicit !== undefined) {
        offsets[i][end] = explicit * k;
        continue;
      }
      const other = get(end === "from" ? e.to : e.from);
      const key = side === "l" || side === "r" ? other.y + other.h / 2 : other.x + other.w / 2;
      const id = `${end === "from" ? e.from : e.to}:${side}`;
      if (!bySide.has(id)) bySide.set(id, []);
      bySide.get(id)!.push({ edge: i, end, key });
    }
  });
  for (const list of bySide.values()) {
    list.sort((p, q) => p.key - q.key || p.edge - q.edge);
    list.forEach((item, idx) => {
      offsets[item.edge][item.end] = (idx - (list.length - 1) / 2) * portGap;
    });
  }

  const port = (n: LaidNode, side: Side, off: number): Pt => {
    const cx = n.x + n.w / 2, cy = n.y + n.h / 2;
    if (side === "t") return [cx + off, n.y];
    if (side === "b") return [cx + off, n.y + n.h];
    if (side === "l") return [n.x, cy + off];
    return [n.x + n.w, cy + off];
  };

  // Routes: leave along the exit axis, turn at each via channel, then finish with an L or a mid-gap Z.
  const edges: LaidEdge[] = spec.edges.map((e, i) => {
    const a = get(e.from), b = get(e.to);
    const { fromSide, toSide } = sides[i];
    const s = port(a, fromSide, offsets[i].from);
    const t = port(b, toSide, offsets[i].to);
    const pts: Pt[] = [s];
    let axis: "h" | "v" = fromSide === "l" || fromSide === "r" ? "h" : "v";
    let p = s;
    for (const v of e.via ?? []) {
      if (axis === "h") {
        if (v.x === undefined) throw new Error(`OrthoDiagram ${name}: edge ${e.from}->${e.to} via needs x while moving horizontally`);
        p = [gx(v.x) + (v.dx ?? 0) * k, p[1]];
        axis = "v";
      } else {
        if (v.y === undefined) throw new Error(`OrthoDiagram ${name}: edge ${e.from}->${e.to} via needs y while moving vertically`);
        p = [p[0], gy(v.y) + (v.dy ?? 0) * k];
        axis = "h";
      }
      pts.push(p);
    }
    const endAxis = toSide === "l" || toSide === "r" ? "h" : "v";
    if (axis === endAxis) {
      if (axis === "h" && Math.abs(p[1] - t[1]) > EPS) {
        const mx = (p[0] + t[0]) / 2;
        pts.push([mx, p[1]], [mx, t[1]]);
      } else if (axis === "v" && Math.abs(p[0] - t[0]) > EPS) {
        const my = (p[1] + t[1]) / 2;
        pts.push([p[0], my], [t[0], my]);
      }
    } else {
      pts.push(axis === "h" ? [t[0], p[1]] : [p[0], t[1]]);
    }
    pts.push(t);
    const points = simplify(pts);
    const segs = segments(points);

    // The first segment must leave the source outward and the last must enter the target inward.
    const [f0, f1] = segs[0];
    const outDir = OUTWARD[fromSide];
    if ((f1[0] - f0[0]) * outDir[0] + (f1[1] - f0[1]) * outDir[1] <= 0) errors.push(`edge ${e.from}->${e.to} leaves ${e.from} inward`);
    const [l0, l1] = segs[segs.length - 1];
    const inDir = OUTWARD[toSide];
    if ((l1[0] - l0[0]) * inDir[0] + (l1[1] - l0[1]) * inDir[1] >= 0) errors.push(`edge ${e.from}->${e.to} enters ${e.to} from inside`);
    const minEnd = S.arrow + S.corner + 2 * k;
    if (Math.hypot(l1[0] - l0[0], l1[1] - l0[1]) < minEnd) errors.push(`edge ${e.from}->${e.to} final segment is too short for its arrowhead`);
    if (e.bidir && Math.hypot(f1[0] - f0[0], f1[1] - f0[1]) < minEnd) errors.push(`edge ${e.from}->${e.to} first segment is too short for its arrowhead`);

    // Label beside one straight segment, never on it.
    const label: TextItem[] = [];
    if (e.label) {
      const lines = Array.isArray(e.label) ? e.label : [e.label];
      let segIdx = e.labelSeg ?? 0;
      if (e.labelSeg === undefined) {
        let best = -1;
        segs.forEach(([u, v], idx) => {
          const len = Math.hypot(v[0] - u[0], v[1] - u[1]);
          if (len > best + EPS) {
            best = len;
            segIdx = idx;
          }
        });
      }
      const [u, v] = segs[segIdx];
      const lh = S.label * LINE_EM;
      const n = lines.length;
      const dx = (e.labelDx ?? 0) * k, dy = (e.labelDy ?? 0) * k;
      const horizontal = Math.abs(u[1] - v[1]) < EPS;
      if (e.labelSide && (e.labelSide === "above" || e.labelSide === "below") !== horizontal) errors.push(`edge ${e.from}->${e.to} label side "${e.labelSide}" does not fit a ${horizontal ? "horizontal" : "vertical"} segment`);
      if (horizontal) {
        const side = e.labelSide ?? "above";
        const cx = (e.labelAt !== undefined ? gx(e.labelAt) : (u[0] + v[0]) / 2) + dx;
        lines.forEach((text, li) => {
          const cy = side === "above" ? u[1] - S.labelGap - (n - li - 0.5) * lh : u[1] + S.labelGap + (li + 0.5) * lh;
          label.push(textItem(cx, cy + dy, text, S.label, "middle"));
        });
      } else {
        const side = e.labelSide ?? "right";
        const cy = (e.labelAt !== undefined ? gy(e.labelAt) : (u[1] + v[1]) / 2) + dy;
        const x = side === "right" ? u[0] + S.labelSideGap : u[0] - S.labelSideGap;
        lines.forEach((text, li) => {
          label.push(textItem(x + dx, cy - (n * lh) / 2 + (li + 0.5) * lh, text, S.label, side === "right" ? "start" : "end"));
        });
      }
    }
    const inGroup = label.length > 0 && groups.some((g) => {
      const bx = label[0].box;
      return bx.x >= g.x && bx.x + bx.w <= g.x + g.w && bx.y >= g.y && bx.y + bx.h <= g.y + g.h;
    });
    return {
      from: e.from,
      to: e.to,
      d: roundedPath(points, S.corner),
      points,
      tone: e.tone ?? "primary",
      dashed: e.dashed ?? false,
      bidir: e.bidir ?? false,
      label,
      labelHalo: inGroup ? "muted" : "card",
    };
  });

  // Collision rules: no edge through a node or group title, no crossings, no label touching anything.
  const allLabels = edges.flatMap((e, i) => e.label.map((t) => ({ t, edge: i })));
  const titles = groups.map((g) => g.title);
  edges.forEach((e, i) => {
    for (const [p, q] of segments(e.points)) {
      for (const n of nodes) if (segHitsRect(p, q, n)) errors.push(`edge ${e.from}->${e.to} passes through node "${n.id}"`);
      for (const t of titles) if (segHitsRect(p, q, t.box, -2 * k)) errors.push(`edge ${e.from}->${e.to} passes through group title "${t.text}"`);
      for (const { t } of allLabels) if (segHitsRect(p, q, t.box, -2 * k)) errors.push(`edge ${e.from}->${e.to} passes through label "${t.text}"`);
    }
    for (let j = i + 1; j < edges.length; j++) {
      const f = edges[j];
      for (const s1 of segments(e.points)) for (const s2 of segments(f.points)) {
        if (segsMeet(s1, s2)) errors.push(`edges ${e.from}->${e.to} and ${f.from}->${f.to} cross or touch`);
      }
    }
  });
  allLabels.forEach(({ t, edge }, i) => {
    for (const n of nodes) if (overlaps(t.box, n, 3 * k)) errors.push(`label "${t.text}" touches node "${n.id}"`);
    for (const g of titles) if (overlaps(t.box, g.box, 3 * k)) errors.push(`label "${t.text}" touches group title "${g.text}"`);
    for (const g of groups) {
      const m = 4 * k;
      const inside = t.box.x >= g.x + m && t.box.x + t.box.w <= g.x + g.w - m && t.box.y >= g.y + m && t.box.y + t.box.h <= g.y + g.h - m;
      if (!inside && overlaps(t.box, g, m)) errors.push(`label "${t.text}" straddles the border of group "${g.id}"`);
    }
    for (let j = i + 1; j < allLabels.length; j++) if (allLabels[j].edge !== edge && overlaps(t.box, allLabels[j].t.box, 2 * k)) errors.push(`labels "${t.text}" and "${allLabels[j].t.text}" overlap`);
  });

  // Vertical extent fits the content; horizontal extent is fixed by the render width.
  const boxes: Rect[] = [...nodes, ...groups, ...allLabels.map((l) => l.t.box), ...titles.map((t) => t.box)];
  const minX = Math.min(...boxes.map((b) => b.x)), maxX = Math.max(...boxes.map((b) => b.x + b.w));
  if (minX < 0.5 * k || maxX > vbW - 0.5 * k) errors.push(`content spans x ${minX.toFixed(1)}..${maxX.toFixed(1)}, outside 0..${vbW.toFixed(1)}`);
  const minY = Math.min(...boxes.map((b) => b.y)) - 2 * k;
  const maxY = Math.max(...boxes.map((b) => b.y + b.h)) + 2 * k;

  if (errors.length) throw new Error(`OrthoDiagram ${name}:\n  ${[...new Set(errors)].join("\n  ")}`);

  return {
    viewBox: { x: 0, y: minY, w: vbW, h: maxY - minY },
    renderWidth,
    k,
    sizes: { title: S.title, sub: S.sub, label: S.label, group: S.group, arrow: S.arrow, nodeRadius: S.nodeRadius, groupRadius: S.groupRadius, halo: S.halo },
    nodes,
    groups,
    edges,
  };
}
