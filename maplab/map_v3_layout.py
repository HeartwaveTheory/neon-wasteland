"""Map v3 layout: smaller pads, 3 more of them, a half-size HQ and a longer road (on the painting itself).

The painting (art/map-v3-source.webp, 1672 x 941, the game's 1x map) keeps its own art; this only changes the layout:
  - its 4 big build pads become plain plateau dirt with small pads on them: the painting's own pad, scaled to about half.
    The lower-left site gets two small pads side by side (the 3rd new pad); the others one, in the same place,
  - the AEGIS compound is scaled to half size about the point where the road meets it, (885, 556) -> (885, 724); the
    space it gives up becomes plaza with the 2 other new pads, and the road runs on through the plaza to it,
  - the HQ's power cables are taken out and redrawn from the same two pylons to the smaller HQ.

    python3 maplab/map_v3_layout.py      -> prototype/assets/map.webp (and maplab/out/map-v3-layout.png, a PNG copy to look at)
"""
import os
import numpy as np, cv2

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
rng = np.random.default_rng(7)

# ---- layout (1x, the game's map coordinates) ----
BIG_PADS = [(463, 182), (1022, 240), (553, 363), (1200, 378)]   # the painting's pads (cyan ring rx 90, ry 46)
PADS = [(463, 182), (1022, 240), (500, 366), (1200, 378), (604, 360), (752, 650), (1018, 650)]   # game order
PAD_SRC = (1022, 240, 96, 50)    # the painted pad copied for the small ones: centre and half-size of the crop
PAD_S = 0.49                      # small pad = 0.49 x the painted one (ring rx 90 -> 44)
# the compound (and its comms mast): the outline follows the ground line, so no cliff is cut
# (the holo flags with their sandbags, either side, stay where they are: plaza dressing)
HQ_POLY = [(700, 941), (640, 905), (640, 845), (598, 832), (586, 760), (586, 740), (668, 740), (668, 650), (626, 612), (690, 598), (790, 598),
           (790, 556), (958, 556), (1000, 575), (1080, 598), (1105, 640), (1105, 740), (1185, 740), (1185, 790),
           (1165, 820), (1165, 905), (1100, 941)]
# the comms mast's dish and antenna stand in front of the cliff: rebuilt as cliff
NOTCH = [(956, 492), (1032, 492), (1032, 588), (1000, 575), (956, 560)]
A0, A, S = (885, 556), (885, 724), 0.5   # HQ: p' = A + S (p - A0)
ROAD_X, ROAD_SRC = (798, 958), (466, 548)  # the road with its rope fences, and the painted stretch (y) copied down the plaza
# the HQ's painted power cables (pylon arm -> HQ), measured on the painting: [from, to], width
CABLES = [([(616, 500), (707, 612)], 9), ([(614, 527), (712, 620)], 9),
          ([(1124, 484), (1016, 568)], 11), ([(1128, 510), (1020, 588)], 11)]
RIGHT_CABLES = 2   # the last two: masked whole (over the cliff the dark test misses their lit edges)

def hq(p): return (A[0] + S * (p[0] - A0[0]), A[1] + S * (p[1] - A0[1]))

src = cv2.imread(os.path.join(ROOT, 'art', 'map-v3-source.webp'))
H, W = src.shape[:2]
img = src.copy()
z = lambda pts: np.array(pts, np.int32)


def feather(mask, r):
    return cv2.GaussianBlur(mask.astype(np.float32), (0, 0), r)[..., None]


def comp(base, top, alpha):
    return (base.astype(np.float32) * (1 - alpha) + top.astype(np.float32) * alpha).clip(0, 255).astype(np.uint8)


# Fill: the painted dirt is smooth warm tan with soft shading and a few stones. The gap takes the colour of the dirt
# around it (rocks, posts and shadows at its edge are ignored), with soft mottling, a dark contact shadow where it meets
# rock, and a sprinkle of small inked stones.
lab = cv2.cvtColor(src, cv2.COLOR_BGR2LAB).astype(np.float32)


def noise(scale, seed):
    r = np.random.default_rng(seed).standard_normal((H // scale + 2, W // scale + 2)).astype(np.float32)
    return cv2.resize(cv2.GaussianBlur(r, (0, 0), 1), (W, H), interpolation=cv2.INTER_CUBIC)


MOTTLE = 0.035 * noise(22, 1) + 0.015 * noise(6, 2)


def stones(im, mask, density, seed, big=False):
    r = np.random.default_rng(seed)
    ys, xs = np.nonzero(cv2.erode(mask, np.ones((7, 7), np.uint8)))
    n = int(len(xs) * density)
    lay = im.copy()
    for k in r.choice(len(xs), n, replace=False):
        x, y = int(xs[k]), int(ys[k])
        rx = r.uniform(1.0, 2.0) * (2.2 if big and r.random() < .5 else 1); ry = rx * r.uniform(.55, .8)
        base = im[y, x].astype(np.float32)
        cv2.ellipse(lay, (x + 1, y + 1), (round(rx + 1), round(ry + 1)), 0, 0, 360, tuple(float(c) for c in base * .75), -1, cv2.LINE_AA)   # shadow
        cv2.ellipse(lay, (x, y), (round(rx), round(ry)), 0, 0, 360, tuple(float(c) for c in base * r.uniform(.7, 1.05)), -1, cv2.LINE_AA)
        cv2.ellipse(lay, (x, y), (round(rx), round(ry)), 0, 0, 360, tuple(float(c) for c in base * .4), 1, cv2.LINE_AA)
        cv2.ellipse(lay, (x - 1, y - 1), (max(1, round(rx * .45)), max(1, round(ry * .4))), 0, 0, 360, tuple(float(min(255, c * 1.25)) for c in base), -1, cv2.LINE_AA)
    return lay


# The painting's fine detail (it minus its blur), from dirt all over the map: laid over the fills so they carry the same
# brushwork as the rest of the painting.
DET = src.astype(np.float32) - cv2.GaussianBlur(src.astype(np.float32), (0, 0), 3)
_ref = np.median(lab[740:800, 600:660].reshape(-1, 3), axis=0)
_dirtlike = ((np.sqrt(((lab - _ref) ** 2).sum(-1)) < 34) & (cv2.cvtColor(src, cv2.COLOR_BGR2HSV)[..., 1] < 150)).astype(np.float32)
_I = cv2.integral(_dirtlike)


def detail(mask, p=24):
    ys, xs = np.nonzero(cv2.dilate(mask, np.ones((p, p), np.uint8)))
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    h, w = y1 - y0, x1 - x0
    srcs = [(x, y) for y in range(0, H - p, 4) for x in range(0, W - p, 4)
            if (_I[y + p, x + p] - _I[y, x + p] - _I[y + p, x] + _I[y, x]) / (p * p) > 0.97 and not mask[y:y + p, x:x + p].any()]
    srcs = np.array(srcs)
    win = cv2.getGaussianKernel(p, p / 4); win = (win @ win.T)[..., None].astype(np.float32)
    out = np.zeros((h, w, 3), np.float32); ws = np.zeros((h, w, 1), np.float32)
    r = np.random.default_rng(len(srcs))
    for y in range(-p // 2, h, p // 3):
        for x in range(-p // 2, w, p // 3):
            sx, sy = srcs[r.integers(len(srcs))]
            pt = DET[sy:sy + p, sx:sx + p]
            a0, b0 = max(0, y), max(0, x); a1, b1 = min(h, y + p), min(w, x + p)
            out[a0:a1, b0:b1] += pt[a0 - y:a1 - y, b0 - x:b1 - x] * win[a0 - y:a1 - y, b0 - x:b1 - x]
            ws[a0:a1, b0:b1] += win[a0 - y:a1 - y, b0 - x:b1 - x]
    full = np.zeros((H, W, 3), np.float32)
    full[y0:y1, x0:x1] = out / np.maximum(ws, 1e-3) * 1.6   # windowed averaging softens it: bring it back up
    return full


def dirt(im, mask, seed, band=26, puddles=(), settle=10, pct=65):
    ring = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * band + 1, 2 * band + 1))) & (1 - mask)
    L = lab[..., 0]
    lit = (ring > 0) & (L > np.percentile(L[ring > 0], pct))
    ref = np.median(lab[lit], axis=0)                                    # the lit dirt, not rocks or shadow
    ref_bgr = cv2.cvtColor(np.uint8([[ref]]), cv2.COLOR_LAB2BGR)[0, 0].astype(np.float32)
    dirt_px = (np.sqrt(((lab - ref) ** 2).sum(-1)) < 30) & (ring > 0)
    hole = ((mask > 0) | ((ring > 0) & ~dirt_px)).astype(np.uint8)      # carry in the dirt at the edge only
    k = 2
    sm = cv2.resize(im, (W // k, H // k), interpolation=cv2.INTER_AREA)
    hm2 = cv2.dilate(cv2.resize(hole, (W // k, H // k), interpolation=cv2.INTER_NEAREST), np.ones((3, 3), np.uint8))
    edge = cv2.GaussianBlur(cv2.resize(cv2.inpaint(sm, hm2, 8, cv2.INPAINT_TELEA), (W, H), interpolation=cv2.INTER_CUBIC).astype(np.float32), (0, 0), 3)
    d_in = cv2.distanceTransform(mask, cv2.DIST_L2, 3)
    w = np.exp(-d_in / settle)[..., None]                                    # match the edge, then settle on the lit dirt
    fill = edge * w + ref_bgr * (1 - w)
    fill = fill * (1 + MOTTLE)[..., None] + detail(mask)
    rock = ((ring > 0) & ~dirt_px & (L < 80)).astype(np.uint8)
    dr = cv2.distanceTransform(1 - rock, cv2.DIST_L2, 3)
    fill = fill * (1 - 0.22 * np.exp(-dr / 4))[..., None]                 # a little contact shadow at rock
    out = comp(im, fill.clip(0, 255).astype(np.uint8), cv2.GaussianBlur(mask.astype(np.float32), (0, 0), 1.5)[..., None])
    for (px, py, prx) in puddles:                                        # puddles, like the painting's: dark, a light rim
        pl = np.zeros((H, W), np.float32)
        cv2.ellipse(pl, (px, py), (prx, round(prx * .45)), 0, 0, 360, 1, -1, cv2.LINE_AA)
        a = cv2.GaussianBlur(pl, (0, 0), 1.2)[..., None]
        col = np.float32([118, 104, 92])                                 # bluish grey (BGR)
        out = comp(out, np.broadcast_to(col, out.shape), a * 0.75)
        rim = np.zeros((H, W), np.float32)
        cv2.ellipse(rim, (px - 2, py - 1), (prx - 3, round(prx * .45) - 2), 0, 200, 330, 1, 1, cv2.LINE_AA)
        out = comp(out, np.broadcast_to(np.float32([190, 180, 168]), out.shape), rim[..., None] * 0.6)
    return stones(out, mask, 0.0003, seed)


hm = np.zeros((H, W), np.uint8); cv2.fillPoly(hm, [z(HQ_POLY)], 1)
pm = np.zeros((H, W), np.uint8)
for x, y in BIG_PADS: cv2.ellipse(pm, (x, y), (100, 52), 0, 0, 360, 1, -1)
cm = np.zeros((H, W), np.uint8)
for pts, w in CABLES: cv2.polylines(cm, [z(pts)], False, 1, w)
cm &= (1 - hm) & (cv2.cvtColor(src, cv2.COLOR_BGR2GRAY) < 95).astype(np.uint8)
for pts, w in CABLES[-RIGHT_CABLES:]: cv2.polylines(cm, [z(pts)], False, 1, w)
cm &= (1 - hm)
cm = cv2.dilate(cm, np.ones((5, 5), np.uint8))

# ---- 1. the HQ's cables over the cliffs, and the mast's dish and antenna -> cliff (and ground), quilted from small
# patches of the cliffs and ground beside them ----
nm = np.zeros((H, W), np.uint8); cv2.fillPoly(nm, [z(NOTCH)], 1)


def quilt(im, mask, pool, p=14, ov=5, cands=150):
    out = im.astype(np.float32).copy(); known = (1 - mask).astype(np.float32)
    ys, xs = np.nonzero(mask); r = np.random.default_rng(3)
    ramp = np.minimum(np.arange(p) + 1, p - np.arange(p)) / (ov + 1); win = np.clip(np.minimum.outer(ramp, ramp), 0, 1)[..., None]
    for ty in range(ys.min() - ov, ys.max() + 1, p - ov):
        for tx in range(xs.min() - ov, xs.max() + 1, p - ov):
            if not mask[ty:ty + p, tx:tx + p].any(): continue
            tgt = out[ty:ty + p, tx:tx + p]; wk = known[ty:ty + p, tx:tx + p][..., None]
            idx = pool[r.integers(0, len(pool), cands)]
            errs = [float((((im_src[sy:sy + p, sx:sx + p] - tgt) ** 2) * wk).sum()) for sx, sy in idx]
            sx, sy = idx[int(np.argsort(errs)[r.integers(0, 3)])]
            m = mask[ty:ty + p, tx:tx + p][..., None].astype(np.float32)
            wgt = np.where(wk > 0, win, 1.0) * m
            out[ty:ty + p, tx:tx + p] = tgt * (1 - wgt) + im_src[sy:sy + p, sx:sx + p] * wgt
            known[ty:ty + p, tx:tx + p] = np.maximum(known[ty:ty + p, tx:tx + p], m[..., 0])
    return comp(im, out.clip(0, 255).astype(np.uint8), cv2.GaussianBlur(mask.astype(np.float32), (0, 0), 1)[..., None])


im_src = src.astype(np.float32)
bad = cv2.dilate(nm | hm | cm, np.ones((9, 9), np.uint8))
CLIFF = np.array([(x, y) for y in range(440, 560, 2) for x in range(1034, 1110, 2) if not bad[y:y + 14, x:x + 14].any()]
                 + [(x, y) for y in range(470, 620, 2) for x in range(560, 760, 2) if not bad[y:y + 14, x:x + 14].any()])
img = quilt(img, nm | cm, CLIFF)
# ---- 2. the big pads -> plateau dirt (one at a time, each takes its own clearing's colour) ----
for k, (x, y) in enumerate(BIG_PADS):
    m = np.zeros((H, W), np.uint8); cv2.ellipse(m, (x, y), (100, 52), 0, 0, 360, 1, -1)
    img = dirt(img, m, 10 + k)
# ---- 3. the old HQ -> plaza ----
img = dirt(img, hm, 20, band=40, settle=40, pct=50, puddles=[(700, 812, 16), (1080, 700, 12), (640, 720, 10)])

# ---- 4. the road on through the plaza: the painted road above, copied down in overlapping slices ----
rx0, rx1 = ROAD_X
strip = src[ROAD_SRC[0]:ROAD_SRC[1], rx0:rx1].astype(np.float32)
sx = np.linspace(0, 1, rx1 - rx0)
edge = np.clip(np.minimum(sx, 1 - sx) / 0.12, 0, 1)[None, :, None]
y, end = 548, 742
while y < end:
    h = min(len(strip), end - y + 10)
    a = edge * np.clip(np.arange(h) / 20, 0, 1)[:, None, None] * np.ones((h, rx1 - rx0, 1), np.float32)
    img[y:y + h, rx0:rx1] = comp(img[y:y + h, rx0:rx1], strip[:h], a)
    if y + h >= end: break
    y += h - 20

# ---- 5. the half-size HQ: the compound's own pixels (buildings, their shadows), not the dirt around them ----
ref = lab[720:800, 600:660].reshape(-1, 3).mean(0)
dist = np.sqrt(((lab - ref) ** 2).sum(-1))
obj = ((dist > 30) & (hm > 0)).astype(np.uint8)
obj = cv2.morphologyEx(obj, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
obj = cv2.morphologyEx(obj, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
n, lbl, st, _ = cv2.connectedComponentsWithStats(obj)
obj = np.isin(lbl, [k for k in range(1, n) if st[k, cv2.CC_STAT_AREA] > 60]).astype(np.uint8)   # drop dirt speckle
obj = cv2.dilate(obj, np.ones((3, 3), np.uint8))
M = np.float32([[S, 0, A[0] - S * A0[0]], [0, S, A[1] - S * A0[1]]])
small = cv2.warpAffine(src, M, (W, H), flags=cv2.INTER_AREA)
sm = cv2.warpAffine(obj.astype(np.float32), M, (W, H), flags=cv2.INTER_LINEAR)
img = comp(img, small, cv2.GaussianBlur(sm, (0, 0), 0.7)[..., None].clip(0, 1))

# ---- 6. the small pads: the painted pad, scaled ----
cx, cy, rx, ry = PAD_SRC
pad = src[cy - ry:cy + ry, cx - rx:cx + rx]
pw, ph = round(2 * rx * PAD_S), round(2 * ry * PAD_S)
pad = cv2.resize(pad, (pw, ph), interpolation=cv2.INTER_AREA)
pmask = np.zeros((ph, pw), np.float32); cv2.ellipse(pmask, (pw // 2, ph // 2), (pw // 2 - 1, ph // 2 - 1), 0, 0, 360, 1, -1)
pmask = cv2.GaussianBlur(pmask, (0, 0), 0.8)[..., None]
for x, y in PADS:
    sh = np.zeros((H, W), np.float32)   # a soft contact shadow, lower right
    cv2.ellipse(sh, (x + 3, y + 4), (pw // 2 + 2, ph // 2 + 2), 0, 0, 360, 1, -1)
    img = (img.astype(np.float32) * (1 - 0.3 * cv2.GaussianBlur(sh, (0, 0), 3)[..., None])).astype(np.uint8)
    x0, y0 = x - pw // 2, y - ph // 2
    img[y0:y0 + ph, x0:x0 + pw] = comp(img[y0:y0 + ph, x0:x0 + pw], pad, pmask)

# ---- 7. the power lines from the two pylons to the smaller HQ ----
def cable(p0, p1, sag):
    t = np.linspace(0, 1, 50)
    return np.stack([p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t + sag * 4 * t * (1 - t)], 1)

WIRE_ENDS = {'L': hq((707, 612)), 'R': hq((1018, 572))}
lay = img.copy()
for (a, b), _ in CABLES:
    pts = np.round(cable(a, hq(b), 10 + 0.04 * np.hypot(*np.subtract(hq(b), a))) * 16).astype(np.int32)
    cv2.polylines(lay, [pts], False, (20, 16, 18), 4, cv2.LINE_AA, shift=4)
    cv2.polylines(lay, [pts - [0, 4]], False, (66, 60, 64), 1, cv2.LINE_AA, shift=4)
img = lay

# ---- 8. ruins and debris: props cut from the painting (the old compound's outbuildings, its truck, tyres, barrels,
# crates), wrecked (darker, sooty, a caved-in roof, a tilt), on the plaza and around the pad clearings ----
def cutout(x0, y0, x1, y1, poly, label=None):
    """A prop from the painting: the crop (x0, y0)-(x1, y1), its outline traced by hand (poly, crop px), and the stencilled
    label it carries painted out (label: a box in crop px), so a copy doesn't read as the HQ's own building."""
    crop = src[y0:y1, x0:x1].copy()
    if label:
        lm = np.zeros(crop.shape[:2], np.uint8); cv2.rectangle(lm, label[:2], label[2:], 1, -1)
        crop = cv2.inpaint(crop, lm, 3, cv2.INPAINT_TELEA)
    a = np.zeros(crop.shape[:2], np.float32); cv2.fillPoly(a, [np.array(poly, np.int32)], 1, cv2.LINE_AA)
    return crop, cv2.GaussianBlur(a, (0, 0), 0.5)


def wreck(prop, dark=0.72, soot=0.35, hole=None, angle=0, seed=0, hue=None):
    """Wreck a prop: recoloured (hue, OpenCV 0-180), darker, sooty from the top down, a caved-in hole (polygon in prop
    px) with broken rafters across it, soot burnt round it and rust running down from it, and a tilt."""
    c, a = prop; h, w = a.shape
    r = np.random.default_rng(seed)
    if hue is not None:
        hsv = cv2.cvtColor(c, cv2.COLOR_BGR2HSV).astype(np.float32)
        hsv[..., 0] = hue; hsv[..., 1] = np.clip(hsv[..., 1] * 1.1 + 40, 0, 200)
        c = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
    c = c.astype(np.float32) * dark
    c = c * np.linspace(1 - soot, 1, h)[:, None, None] * np.array([0.95, 0.98, 1.06])
    if hole:
        pts = np.array(hole, np.int32)
        bx, by, bw, bh = cv2.boundingRect(pts)
        burn = np.zeros((h, w), np.float32)                              # soot burnt round the hole
        cv2.ellipse(burn, (bx + bw // 2, by + bh // 2), (bw // 2 + 8, bh // 2 + 7), 0, 0, 360, 1, -1)
        c = c * (1 - 0.55 * cv2.GaussianBlur(burn, (0, 0), 4))[..., None]
        for _ in range(5):                                               # rust running down below it
            x = int(r.uniform(bx, bx + bw)); y = by + bh
            cv2.line(c, (x, y), (x + int(r.uniform(-1, 2)), min(h - 2, y + int(r.uniform(8, 22)))), (40, 70, 128), 1, cv2.LINE_AA)
        cv2.fillPoly(c, [pts], (24, 18, 20))                             # the dark inside
        for k in range(3):                                               # broken rafters across it
            x = bx + int(bw * (k + 1) / 4)
            cv2.line(c, (x, by - 1), (x + int(r.uniform(-6, 6)), by + int(bh * r.uniform(0.5, 1.1))), (70, 78, 90), 2, cv2.LINE_AA)
            cv2.line(c, (x, by - 1), (x + int(r.uniform(-6, 6)), by + int(bh * r.uniform(0.5, 1.1))), (16, 12, 14), 1, cv2.LINE_AA)
        cv2.polylines(c, [pts], True, (40, 74, 132), 2, cv2.LINE_AA)    # torn, rusty edge
        cv2.polylines(c, [pts], True, (14, 10, 12), 1, cv2.LINE_AA)
    c = c.clip(0, 255).astype(np.uint8)
    if angle:
        M = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1)
        c = cv2.warpAffine(c, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        a = cv2.warpAffine(a, M, (w, h), flags=cv2.INTER_LINEAR)
    return c, a


def place(im, prop, cx, cy, scale=1.0, flip=False, shadow=0.35):
    """Stand a prop with its bottom centre at (cx, cy), with a soft contact shadow to the lower right."""
    c, a = prop
    if flip: c, a = c[:, ::-1], a[:, ::-1]
    if scale != 1:
        c = cv2.resize(c, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        a = cv2.resize(a, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    h, w = a.shape
    x0, y0 = int(cx - w / 2), int(cy - h)
    sh = np.zeros((H, W), np.float32)
    cv2.ellipse(sh, (int(cx + w * .08), int(cy - 1)), (int(w * .55), max(3, int(h * .14))), 0, 0, 360, 1, -1)
    sh = cv2.GaussianBlur(sh, (0, 0), 3)[..., None]
    im = (im.astype(np.float32) * (1 - shadow * sh)).astype(np.uint8)
    region = im[y0:y0 + h, x0:x0 + w]
    im[y0:y0 + h, x0:x0 + w] = comp(region, c, a[..., None])
    return im


def rubble(im, cx, cy, n, spread, seed):
    r = np.random.default_rng(seed)
    m = np.zeros((H, W), np.uint8)
    for _ in range(n):
        cv2.ellipse(m, (int(cx + r.normal(0, spread)), int(cy + r.normal(0, spread * .35))), (2, 1), 0, 0, 360, 1, -1)
    return stones(im, cv2.dilate(m, np.ones((9, 9), np.uint8)), 0.02, seed)


MESS = cutout(722, 818, 808, 882, [(1, 4), (80, 4), (78, 58), (1, 58)], label=(22, 30, 50, 44))
BUNKS = cutout(640, 782, 722, 882, [(4, 22), (60, 18), (68, 24), (68, 56), (76, 60), (76, 88), (4, 88), (2, 58)], label=(22, 64, 58, 80))
SHED = cutout(986, 782, 1102, 862, [(8, 8), (108, 6), (110, 30), (104, 58), (14, 58), (10, 30)], label=(13, 36, 34, 49))
TRUCK = cutout(986, 838, 1084, 898, [(8, 8), (62, 4), (88, 4), (93, 14), (94, 46), (88, 55), (8, 55), (4, 42)])
TYRES = cutout(154, 740, 214, 782, [(26, 16), (56, 16), (57, 40), (26, 40)])
BARRELS = cutout(970, 840, 996, 878, [(8, 2), (20, 2), (21, 33), (8, 33)])
CRATES = cutout(772, 780, 806, 820, [(1, 2), (14, 2), (15, 36), (1, 36)])

ruins = [
    # the plaza: a burnt-out container, a caved-in shed, a dead truck, and junk
    (wreck(MESS, dark=0.8, soot=0.45, hue=12, hole=[(6, 5), (30, 3), (52, 8), (58, 20), (40, 30), (24, 26), (10, 18)], angle=-4, seed=1), 676, 868, 1.0, False),
    (wreck(SHED, dark=0.62, soot=0.4, hole=[(40, 8), (70, 6), (100, 12), (96, 30), (74, 38), (52, 30)], angle=5, seed=2), 1092, 612, 0.82, True),
    (wreck(TRUCK, dark=0.55, soot=0.55, angle=-9), 1102, 870, 0.92, True),
    (wreck(TYRES, dark=0.8, soot=0.15), 640, 640, 0.8, False),
    (wreck(CRATES, dark=0.7, soot=0.3, angle=-14), 662, 646, 0.8, True),
    (wreck(BARRELS, dark=0.75, soot=0.15, angle=80), 616, 652, 0.85, False),
    (wreck(TYRES, dark=0.85, soot=0.1), 724, 768, 0.8, False),
    (wreck(BARRELS, dark=0.8, soot=0.1, angle=88), 790, 708, 0.9, False),   # knocked over
    (wreck(CRATES, dark=0.8, soot=0.2), 1062, 704, 0.9, True),
    # around the pad clearings, at their edges, clear of the pads
    (wreck(TYRES, dark=0.85, soot=0.1), 392, 214, 0.65, True),
    (wreck(BARRELS, dark=0.8, soot=0.1, angle=-84), 534, 160, 0.8, False),
    (wreck(CRATES, dark=0.75, soot=0.25, angle=-6), 448, 404, 0.75, False),
    (wreck(BARRELS, dark=0.8, soot=0.1), 950, 262, 0.8, False),
    (wreck(TYRES, dark=0.85, soot=0.1), 1094, 222, 0.6, False),
    (wreck(CRATES, dark=0.75, soot=0.25, angle=5), 1124, 402, 0.75, True),
    (wreck(BARRELS, dark=0.8, soot=0.1, angle=92), 1276, 356, 0.8, False),
]
for prop, x, y, sc, fl in ruins:
    img = place(img, prop, x, y, sc, fl)
for k, (x, y, n) in enumerate([(676, 872, 60), (1092, 616, 45), (640, 650, 30), (1102, 874, 24)]):
    img = rubble(img, x, y, n, 16, 40 + k)

cv2.imwrite(os.path.join(ROOT, 'prototype', 'assets', 'map.webp'), img, [cv2.IMWRITE_WEBP_QUALITY, 95])
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
cv2.imwrite(os.path.join(HERE, 'out', 'map-v3-layout.png'), img)   # a PNG copy for looking at
print('ok', img.shape, 'wire ends', {k: tuple(round(v) for v in p) for k, p in WIRE_ENDS.items()})
