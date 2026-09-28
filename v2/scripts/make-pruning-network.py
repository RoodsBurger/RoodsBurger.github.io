# Pruned layered network: curved edges, faint pruned connections, ringed live nodes, accent on the strongest paths.
import random, sys
random.seed(11)
W, H = 1600, 1200
layers = [7, 10, 10, 7, 3]
xs = [W * (0.14 + 0.72 * i / (len(layers) - 1)) for i in range(len(layers))]
def ys(n):
    span = H * 0.66
    return [H / 2 - span / 2 + span * (j + 0.5) / n for j in range(n)]
nodes = [[(xs[i], y) for y in ys(n)] for i, n in enumerate(layers)]
edges = [(i, a, b, random.gauss(0, 1)) for i in range(len(layers) - 1) for a in range(layers[i]) for b in range(layers[i + 1])]
thr = sorted(abs(e[3]) for e in edges)[int(len(edges) * 0.86)]
kept = [e for e in edges if abs(e[3]) >= thr]
# Every output keeps its strongest incoming connection, so the pruned network still produces all outputs.
last = len(layers) - 2
for b in range(layers[-1]):
    best = max((e for e in edges if e[0] == last and e[2] == b), key=lambda e: abs(e[3]))
    if best not in kept: kept.append(best)
alive = {(i, a) for i, a, b, w in kept} | {(i + 1, b) for i, a, b, w in kept}
top = set(sorted(kept, key=lambda e: -abs(e[3]))[:7])
def curve(x1, y1, x2, y2):
    dx = (x2 - x1) * 0.5
    return f"M{x1:.1f} {y1:.1f} C{x1 + dx:.1f} {y1:.1f} {x2 - dx:.1f} {y2:.1f} {x2:.1f} {y2:.1f}"
def svg(theme):
    if theme == "light":
        bg, ink, dead, accent, ring = "#ffffff", "#27272a", "#d4d4d8", "#7a1e22", "#ffffff"
    else:
        bg, ink, dead, accent, ring = "#1c1c20", "#e4e4e7", "#3f3f46", "#d8676d", "#1c1c20"
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">', f'<rect width="{W}" height="{H}" fill="{bg}"/>']
    for i, a, b, w in edges:
        if (i, a, b, w) in kept: continue
        (x1, y1), (x2, y2) = nodes[i][a], nodes[i + 1][b]
        o.append(f'<path d="{curve(x1, y1, x2, y2)}" fill="none" stroke="{ink}" stroke-opacity="0.07" stroke-width="1.5"/>')
    for e in sorted(kept, key=lambda e: e in top):
        i, a, b, w = e
        (x1, y1), (x2, y2) = nodes[i][a], nodes[i + 1][b]
        s = min(1, (abs(w) - thr) / (2.8 - thr))
        if e in top:
            o.append(f'<path d="{curve(x1, y1, x2, y2)}" fill="none" stroke="{accent}" stroke-opacity="0.95" stroke-width="{4 + 2 * s:.1f}" stroke-linecap="round"/>')
        else:
            o.append(f'<path d="{curve(x1, y1, x2, y2)}" fill="none" stroke="{ink}" stroke-opacity="{0.45 + 0.35 * s:.2f}" stroke-width="{2.4 + 2 * s:.1f}" stroke-linecap="round"/>')
    for i, layer in enumerate(nodes):
        for j, (x, y) in enumerate(layer):
            if (i, j) in alive:
                o.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="17" fill="{ink}" stroke="{ring}" stroke-width="5"/>')
            else:
                o.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="13" fill="{bg}" stroke="{dead}" stroke-width="3" stroke-dasharray="5 5"/>')
    o.append('</svg>')
    return "\n".join(o)
for t in ("light", "dark"):
    open(f"{sys.argv[1]}/net-{t}.svg", "w").write(svg(t))
print(len(edges), len(kept), len(alive), sum(layers))
