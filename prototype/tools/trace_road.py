"""Trace the enemy routes along the true middle of the painted road.

1. Road mask from the painted road's colour (Map v3: dusty sand, darker and grainier than the old map's).
2. Distance to the road edge for every road pixel.
3. Cheapest path from each gate to the AEGIS gate, where stepping near an edge
   costs a lot: the path follows the road's centre line (its "ridge").
Prints the new waypoints and writes an overlay image for checking.

    python3 tools/trace_road.py <map_2x.webp> <overlay.png>
"""
import sys, json, heapq
import numpy as np, cv2

# Where each road comes in: hand-checked against the painting from the top edge through the gate (the gates' posts
# and beacons break the colour mask there), then searched from its last point to the AEGIS gate.
ENTRY = {
    'L': [[174, -30], [176, 40], [182, 80], [196, 118], [214, 140]],
    'R': [[1420, -30], [1404, 16], [1370, 45], [1336, 70], [1302, 98], [1284, 122]],
}
END = [885, 730]   # where the road meets the AEGIS gate (half-size HQ, further down the plaza)
ROUGH = {k: [v[-1], END] for k, v in ENTRY.items()}
img = cv2.resize(cv2.imread(sys.argv[1]), (1672, 941), interpolation=cv2.INTER_AREA)
lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
H, W = img.shape[:2]

def dens(pts, step=4):
    out = []
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        n = max(1, int(np.hypot(x2 - x1, y2 - y1) / step))
        out += [(x1 + (x2 - x1) * k / n, y1 + (y2 - y1) * k / n) for k in range(n)]
    return out + [tuple(pts[-1])]

# The road is lit sand: lightness 128+ (rocks are darker), neither green (acid) nor magenta (neon), warm (b > 146).
lab = cv2.cvtColor(cv2.GaussianBlur(img, (0, 0), 3), cv2.COLOR_BGR2LAB).astype(np.float32)
mask = ((lab[..., 0] > 128) & (lab[..., 1] > 132) & (lab[..., 1] < 152) & (lab[..., 2] > 146)).astype(np.uint8)
k5 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)), iterations=2)
mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, k5)
_, lbl = cv2.connectedComponents(mask)
mask = (lbl == lbl[470, 880]).astype(np.uint8)   # keep only the road network joined to the junction
dt = cv2.distanceTransform(mask, cv2.DIST_L2, 5)

S = 2  # work on a half-resolution grid
m2 = cv2.resize(mask, (W // S, H // S), interpolation=cv2.INTER_NEAREST)
d2 = cv2.resize(dt, (W // S, H // S), interpolation=cv2.INTER_AREA) / S
h2, w2 = m2.shape

def snap(p):
    ys, xs = np.nonzero(m2)
    i = np.argmin((xs - p[0] / S) ** 2 + (ys - p[1] / S) ** 2)
    return (int(ys[i]), int(xs[i]))

def route(a, b):
    a = snap(a); b = snap(b)
    INF = 1e18
    dist = np.full((h2, w2), INF); prev = {}
    dist[a] = 0; pq = [(0.0, a)]
    nb = [(-1, 0, 1), (1, 0, 1), (0, -1, 1), (0, 1, 1), (-1, -1, 1.414), (-1, 1, 1.414), (1, -1, 1.414), (1, 1, 1.414)]
    while pq:
        c, (y, x) = heapq.heappop(pq)
        if (y, x) == b: break
        if c > dist[y, x]: continue
        for dy, dx, w in nb:
            yy, xx = y + dy, x + dx
            if 0 <= yy < h2 and 0 <= xx < w2 and m2[yy, xx]:
                cost = w * (1 + 60.0 / (d2[yy, xx] + 0.5) ** 2)
                nc = c + cost
                if nc < dist[yy, xx]:
                    dist[yy, xx] = nc; prev[(yy, xx)] = (y, x); heapq.heappush(pq, (nc, (yy, xx)))
    p, out = b, []
    while p != a: out.append(p); p = prev[p]
    out.append(a)
    return np.array([(x * S + S / 2, y * S + S / 2) for y, x in out[::-1]], np.float32)

def smooth(p, r=6):
    o = p.copy()
    for i in range(len(p)):
        o[i] = p[max(0, i - r):i + r + 1].mean(0)
    o[0], o[-1] = p[0], p[-1]
    return o

def simplify(arr, step=22):
    pts = [arr[0]]; acc = 0
    for p, q in zip(arr, arr[1:]):
        acc += float(np.hypot(*(q - p)))
        if acc >= step: pts.append(q); acc = 0
    if not np.allclose(pts[-1], arr[-1]): pts.append(arr[-1])
    return [[int(round(x)), int(round(y))] for x, y in pts]

res = {}
for k, p in ROUGH.items():
    path = smooth(route(p[0], p[-1]))
    pts = simplify(path)
    pts = ENTRY[k][:-1] + pts           # in from the top edge through the gate
    while np.hypot(pts[-1][0] - END[0], pts[-1][1] - END[1]) < 8: pts.pop()
    pts.append(END)                     # into the AEGIS gate
    res[k] = pts
# road half-width along each route (for the enemies' sideways spread)
for k in list(res):
    res[k + '_halfw'] = [round(float(dt[min(H - 1, max(0, y)), min(W - 1, max(0, x))]), 1) for x, y in res[k]]
print(json.dumps(res))

ov = img.copy()
ov[mask > 0] = (ov[mask > 0] * 0.65 + np.array([255, 0, 255]) * 0.35).astype(np.uint8)
for k, col in (('L', (0, 255, 0)), ('R', (0, 255, 255))):
    cv2.polylines(ov, [np.array(res[k], np.int32)], False, col, 3)
cv2.imwrite(sys.argv[2], ov[0:800, 100:1480])
