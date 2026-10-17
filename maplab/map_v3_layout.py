"""Map v3 layout: smaller pads, 3 more of them, a half-size HQ and a longer road (on the painting itself).

The painting (art/map-v3-source.webp, 1672 x 941, the game's 1x map) keeps its own art; this only changes the layout:
  - its 4 big build pads become plain plateau dirt with small pads on them: the painting's own pad, scaled to about half.
    The lower-left site gets two small pads side by side (the 3rd new pad); the others one, in the same place,
  - the AEGIS compound is scaled to half size about the point where the road meets it, (885, 556) -> (885, 724); the
    space it gives up becomes plaza with the 2 other new pads, and the road runs on through the plaza to it,
  - the HQ's power cables are taken out and redrawn from the same two pylons to the smaller HQ.

    python3 maplab/map_v3_layout.py      -> prototype/assets/map.webp (and maplab/out/map-v3-layout.png, a PNG copy to look at)
"""
import os, sys
import numpy as np, cv2

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.dont_write_bytecode = True
import props as P   # noqa: E402  (the small props, drawn)
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

# ---- 7. ruins and debris (under the power lines): the old compound's outbuildings, its truck and two ore cars, cut
# from the painting and wrecked; and small props drawn in its style (props.py): drums, tyres, crates, scrap, a pipe, a
# toppled street lamp. All clear of the road, the pads, the flags and the fences. ----
def cutout(x0, y0, x1, y1, poly, label=None):
    """A prop from the painting: the crop (x0, y0)-(x1, y1), its outline traced by hand (poly, crop px), and the stencilled
    label it carries painted out (label: a box in crop px), so a copy doesn't read as the HQ's own building."""
    crop = src[y0:y1, x0:x1].copy()
    if label:
        lm = np.zeros(crop.shape[:2], np.uint8); cv2.rectangle(lm, label[:2], label[2:], 1, -1)
        crop = cv2.inpaint(crop, lm, 3, cv2.INPAINT_TELEA)
    a = np.zeros(crop.shape[:2], np.float32); cv2.fillPoly(a, [np.array(poly, np.int32)], 1, cv2.LINE_AA)
    return crop, cv2.GaussianBlur(a, (0, 0), 0.5)


SS = 4
def _p(pts): return np.round(np.array(pts, np.float32) * SS * 16).astype(np.int32)


def wreck(prop, dark=0.75, soot=0.3, hue=None, holes=(), windows=(), wheel=None, dents=0, rust=0.35, angle=0, seed=0):
    """Wreck a prop, drawn at 4x: recoloured (hue, OpenCV 0-180), darker and sooty from the top, rust patches, dents;
    holes (polygons, prop px) caved in with a dark inside, a rusty rim, bent flaps and soot rising above; smashed
    windows (polygons); a lost wheel (x0, y0, x1, y1) with the axle propped on a cinder block; then a tilt."""
    c, a = prop; h, w = a.shape
    r = np.random.default_rng(seed)
    if hue is not None:
        hsv = cv2.cvtColor(c, cv2.COLOR_BGR2HSV).astype(np.float32)
        hsv[..., 0] = hue; hsv[..., 1] = np.clip(hsv[..., 1] * 1.1 + 40, 0, 200)
        c = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
    C = cv2.resize(c, (w * SS, h * SS), interpolation=cv2.INTER_CUBIC).astype(np.float32)
    A = cv2.resize(a, (w * SS, h * SS), interpolation=cv2.INTER_LINEAR)
    H4, W4 = A.shape
    def lay(m, col, al=1.0):
        nonlocal C
        m = (m.astype(np.float32) * al)[..., None]
        C = C * (1 - m) + np.array(col, np.float32) * m
    def mpoly(pts):
        m = np.zeros((H4, W4), np.uint8); cv2.fillPoly(m, [_p(pts)], 1, cv2.LINE_AA, shift=4); return m.astype(np.float32)
    def mline(pts, wd, closed=False):
        m = np.zeros((H4, W4), np.uint8); cv2.polylines(m, [_p(pts)], closed, 1, max(1, int(wd * SS)), cv2.LINE_AA, shift=4); return m.astype(np.float32)
    C *= dark
    C *= np.linspace(1 - soot, 1, H4)[:, None, None]
    # rust: patches where a soft noise is high, streaked down a little
    n = cv2.resize(r.standard_normal((h // 4 + 2, w // 4 + 2)).astype(np.float32), (W4, H4), interpolation=cv2.INTER_CUBIC)
    n = cv2.GaussianBlur(n, (0, 0), SS * 1.2)
    lay(np.clip((n - 0.55) * 2.5, 0, 1) * A, (36, 76, 140), rust)
    for _ in range(dents):   # dents: a dark crease with a lit lip below it
        x, y = r.uniform(0.15, 0.85) * w, r.uniform(0.35, 0.8) * h
        pts = [(x - 2.5, y), (x, y - 0.8), (x + 2.5, y + 0.2)]
        lay(mline(pts, 0.6) * A, (20, 16, 18), 0.8); lay(mline([(px, py + 0.7) for px, py in pts], 0.5) * A, (210, 210, 200), 0.35)
    for wp in windows:   # smashed: dark, with cracks running out from a hit
        m = mpoly(wp) * A; lay(m, (30, 26, 28))
        xs = [q[0] for q in wp]; ys = [q[1] for q in wp]; hx, hy = r.uniform(min(xs), max(xs)), r.uniform(min(ys), max(ys))
        for k in range(6):
            t = k / 6 * 2 * np.pi + r.uniform(-.3, .3); L = r.uniform(2, 5)
            lay(mline([(hx, hy), (hx + np.cos(t) * L, hy + np.sin(t) * L * 0.6)], 0.35) * m, (200, 220, 225), 0.8)
    if wheel:   # the wheel's gone: shadow where it was, the axle on a cinder block
        x0, y0, x1, y1 = wheel
        m = np.zeros((H4, W4), np.float32); cv2.ellipse(m, (int((x0 + x1) / 2 * SS), int((y0 + y1) / 2 * SS)), (int((x1 - x0) / 2 * SS), int((y1 - y0) / 2 * SS)), 0, 0, 360, 1, -1, cv2.LINE_AA)
        lay(m * A, (28, 24, 26))
        bx = (x0 + x1) / 2
        blk = mpoly([(bx - 2.6, y1 - 4.2), (bx + 2.6, y1 - 4.2), (bx + 2.6, y1), (bx - 2.6, y1)])
        A = np.maximum(A, blk)
        lay(blk, (120, 124, 128)); lay(mpoly([(bx + 0.8, y1 - 4.2), (bx + 2.6, y1 - 4.2), (bx + 2.6, y1), (bx + 0.8, y1)]), (80, 82, 86))
        lay(mline([(bx - 2.6, y1 - 4.2), (bx + 2.6, y1 - 4.2), (bx + 2.6, y1), (bx - 2.6, y1)], 0.5, True), (18, 14, 16))
        lay(mpoly([(bx - 1.5, y1 - 3), (bx - 0.4, y1 - 3), (bx - 0.4, y1 - 1.2), (bx - 1.5, y1 - 1.2)]), (40, 40, 44))
    for hp in holes:
        pts = np.array(hp, np.float32); bx, by = pts[:, 0].min(), pts[:, 1].min(); bw, bh = np.ptp(pts[:, 0]), np.ptp(pts[:, 1])
        # soot rising above and burnt round it
        sm = np.zeros((H4, W4), np.float32)
        cv2.ellipse(sm, (int((bx + bw / 2) * SS), int((by + bh / 2) * SS)), (int((bw / 2 + 5) * SS), int((bh / 2 + 4) * SS)), 0, 0, 360, 1, -1)
        cv2.ellipse(sm, (int((bx + bw / 2) * SS), int(max(1, by - 2) * SS)), (int(bw / 3 * SS), int(5 * SS)), 0, 0, 360, 1, -1)
        lay(cv2.GaussianBlur(sm, (0, 0), SS * 2.5) * A, (16, 14, 16), 0.55)
        hole = mpoly(hp)
        g = np.linspace(0, 1, H4)[:, None] * np.ones((1, W4))
        gy = np.clip((g * H4 / SS - by) / max(bh, 1), 0, 1)
        inside = np.stack([14 + 30 * gy, 12 + 24 * gy, 14 + 26 * gy], -1)        # darker at the top: a deep hole
        C = C * (1 - hole[..., None]) + inside * hole[..., None]
        lay(mline(hp, 1.1, True) * A, (36, 78, 150), 0.95)                         # a rusty rim
        lay(mline(hp, 0.45, True) * A, (16, 12, 14))
        ring = cv2.dilate(hole, np.ones((SS * 5, SS * 5), np.uint8)) * (1 - hole) * A
        metal = (C * ring[..., None]).sum((0, 1)) / max(ring.sum(), 1)            # the wreck's own metal round the hole
        for k in r.choice(len(hp), min(3, len(hp)), replace=False):                # bent flaps, curling in
            (px, py), (qx, qy) = hp[k], hp[(k + 1) % len(hp)]
            mx, my = (px + qx) / 2, (py + qy) / 2; cx, cy = bx + bw / 2, by + bh / 2
            tip = (mx + (cx - mx) * 0.45, my + (cy - my) * 0.45)
            f = mpoly([(px * .7 + mx * .3, py * .7 + my * .3), (qx * .7 + mx * .3, qy * .7 + my * .3), tip])
            lay(f, metal * 1.15); lay(mline([(px * .7 + mx * .3, py * .7 + my * .3), tip], 0.5), np.minimum(255, metal * 1.9), 0.6)
            lay(mline([(px * .7 + mx * .3, py * .7 + my * .3), (qx * .7 + mx * .3, qy * .7 + my * .3), tip], 0.4, True), (16, 12, 14))
    c = cv2.resize(C.clip(0, 255), (w, h), interpolation=cv2.INTER_AREA).astype(np.uint8)
    a = cv2.resize(A, (w, h), interpolation=cv2.INTER_AREA)
    if angle:
        M = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1)
        c = cv2.warpAffine(c, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        a = cv2.warpAffine(a, M, (w, h), flags=cv2.INTER_LINEAR)
    return c, a


def place(im, prop, cx, cy, scale=1.0, flip=False, shadow=0.35):
    """Stand a prop with its bottom centre at (cx, cy), with a soft contact shadow to the lower right."""
    c, a = prop
    rows, cols = np.nonzero(a > 0.3)                                     # trim to what's drawn, so it stands on its feet
    c, a = c[rows.min():rows.max() + 1, cols.min():cols.max() + 1], a[rows.min():rows.max() + 1, cols.min():cols.max() + 1]
    if flip: c, a = c[:, ::-1], a[:, ::-1]
    if scale != 1:
        c = cv2.resize(c, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        a = cv2.resize(a, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    h, w = a.shape
    x0, y0 = int(round(cx - w / 2)), int(round(cy - h))
    sh = np.zeros((H, W), np.float32)
    cv2.ellipse(sh, (int(cx + w * .12), int(cy - min(4, h * .05))), (max(2, int(w * .56)), max(2, int(min(5, h * .1)))), 0, 0, 360, 1, -1)
    sh = cv2.GaussianBlur(sh, (0, 0), 1.8)[..., None]
    im = (im.astype(np.float32) * (1 - shadow * sh)).astype(np.uint8)
    im[y0:y0 + h, x0:x0 + w] = comp(im[y0:y0 + h, x0:x0 + w], c, a[..., None])
    return im


def stain(im, cx, cy, rx, ry, col, alpha, seed, gloss=False):
    """A stain on the dirt: scorch or oil (a ragged soft ellipse; oil gets a faint shine)."""
    r = np.random.default_rng(seed)
    m = np.zeros((H, W), np.float32)
    for _ in range(6):
        cv2.ellipse(m, (int(cx + r.normal(0, rx * .25)), int(cy + r.normal(0, ry * .25))), (int(rx * r.uniform(.5, .9)), int(ry * r.uniform(.5, .9))), 0, 0, 360, 1, -1)
    m = cv2.GaussianBlur(m, (0, 0), 1.6)
    im = comp(im, np.broadcast_to(np.float32(col), im.shape), m[..., None] * alpha)
    if gloss:
        g = np.zeros((H, W), np.float32); cv2.ellipse(g, (int(cx - rx * .3), int(cy - ry * .25)), (max(1, int(rx * .35)), 1), -8, 0, 360, 1, -1)
        im = comp(im, np.broadcast_to(np.float32((150, 150, 160)), im.shape), cv2.GaussianBlur(g, (0, 0), 0.8)[..., None] * 0.45)
    return im


def rubble(im, cx, cy, n, spread, seed):
    r = np.random.default_rng(seed)
    m = np.zeros((H, W), np.uint8)
    for _ in range(n):
        cv2.ellipse(m, (int(cx + r.normal(0, spread)), int(cy + r.normal(0, spread * .35))), (2, 1), 0, 0, 360, 1, -1)
    return stones(im, cv2.dilate(m, np.ones((9, 9), np.uint8)), 0.02, seed)


MESS = cutout(722, 818, 808, 882, [(1, 4), (80, 4), (78, 58), (1, 58)], label=(22, 30, 50, 44))
SHED = cutout(986, 782, 1102, 862, [(8, 8), (108, 6), (110, 30), (104, 58), (14, 58), (10, 30)], label=(13, 36, 34, 49))
TRUCK = cutout(986, 838, 1084, 898, [(8, 8), (62, 4), (88, 4), (93, 14), (94, 46), (91, 58), (8, 58), (4, 42)], label=(33, 28, 57, 35))
ORE_BLUE = cutout(1226, 274, 1306, 320, [(15, 7), (72, 5), (76, 10), (75, 36), (70, 40), (17, 40), (14, 35)])
ORE_RED = cutout(252, 284, 342, 330, [(17, 10), (79, 8), (83, 13), (82, 36), (76, 41), (19, 41), (16, 36)])

# stains first (under everything): scorch under the burnt container and shed, oil from the truck and the spilt drums
for k, (x, y, rx, ry, col, al, gl) in enumerate([
        (676, 866, 46, 12, (20, 18, 20), 0.45, False), (1112, 800, 50, 12, (20, 18, 20), 0.4, False),
        (1092, 892, 30, 8, (24, 20, 22), 0.55, True), (606, 789, 9, 3, (24, 20, 22), 0.6, True),
        (1146, 630, 8, 3, (24, 20, 22), 0.6, True), (512, 226, 7, 3, (24, 20, 22), 0.55, True)]):
    img = stain(img, x, y, rx, ry, col, al, 60 + k, gl)

ruins = [
    # left plaza: the burnt-out container, a toppled street lamp, a junk pile by the pylon
    (wreck(MESS, dark=0.8, soot=0.45, hue=12, holes=[[(6, 5), (30, 3), (52, 8), (58, 20), (40, 30), (24, 26), (10, 18)]], dents=3, seed=1, angle=-4), 676, 868, 1.0, False),
    (P.lamp_toppled(44, seed=1), 640, 800, 1.0, False),
    (P.tyres(3, seed=2), 652, 622, 1.0, False),
    (P.drum((60, 80, 150), bands=False, lying=True, seed=3), 616, 630, 1.0, False),
    (P.crate(broken=True, seed=4), 676, 628, 1.0, False),
    (P.drum(seed=5), 720, 776, 1.0, False),
    (P.scrap(seed=6), 610, 790, 1.0, False),
    # right plaza: the caved-in shed, the dead truck, an ore car on its side of the road, drums by the cliff
    (wreck(SHED, dark=0.66, soot=0.4, holes=[[(40, 8), (70, 6), (100, 12), (96, 30), (74, 38), (52, 30)]], dents=2, seed=2, angle=4), 1112, 800, 0.82, True),
    (wreck(TRUCK, dark=0.58, soot=0.5, windows=[[(61, 13), (78, 13), (78, 20), (61, 20)]], wheel=(34, 48, 48, 59), holes=[[(44, 7), (58, 6), (60, 13), (50, 16)]], dents=3, seed=7, angle=-6), 1096, 900, 0.92, True),
    (P.drum(seed=8), 1144, 626, 1.0, False),
    (P.drum((40, 170, 220), lying=True, seed=9), 1162, 634, 1.0, True),
    (P.crate(seed=10), 1062, 704, 1.0, True),
    (P.pipe(24, seed=11), 1000, 600, 1.0, False),
    # round the pad clearings, at their edges
    (P.tyres(2, seed=12), 392, 214, 0.9, False),
    (P.drum((60, 80, 150), bands=False, lying=True, seed=13), 526, 228, 0.9, False),
    (wreck(ORE_RED, dark=0.7, soot=0.3, holes=[[(30, 11), (50, 10), (56, 18), (40, 22)]], wheel=(58, 34, 70, 42), dents=2, seed=14, angle=-7), 452, 418, 0.62, False),
    (P.scrap(seed=15), 648, 396, 0.9, True),
    (P.drum(seed=16), 952, 262, 0.9, False),
    (P.tyre_lean(seed=17), 1094, 222, 0.9, False),
    (wreck(ORE_BLUE, dark=0.7, soot=0.3, holes=[[(34, 9), (52, 8), (58, 16), (44, 20)]], dents=2, seed=18, angle=8), 1268, 362, 0.62, True),
    (P.crate(broken=True, seed=19), 1126, 404, 0.9, False),
]
for prop, x, y, sc, fl in ruins:
    img = place(img, prop, x, y, sc, fl)
for k, (x, y, n, sp) in enumerate([(676, 872, 60, 16), (1112, 802, 70, 24), (1096, 904, 20, 12), (652, 630, 14, 10)]):
    img = rubble(img, x, y, n, sp, 40 + k)

# ---- 8. the power lines from the two pylons to the smaller HQ ----
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

cv2.imwrite(os.path.join(ROOT, 'prototype', 'assets', 'map.webp'), img, [cv2.IMWRITE_WEBP_QUALITY, 95])
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
cv2.imwrite(os.path.join(HERE, 'out', 'map-v3-layout.png'), img)   # a PNG copy for looking at
print('ok', img.shape, 'wire ends', {k: tuple(round(v) for v in p) for k, p in WIRE_ENDS.items()})
