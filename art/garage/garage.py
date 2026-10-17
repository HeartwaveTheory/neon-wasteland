"""The Garage tower, from the reference painting (art/garage/reference.png, 2000 x 1116).

1. The building: cut off the dark background (GrabCut, the walls and the disc it stands on marked as sure), without the
   four mechanics walking in front of it (they are the tower's live units) or the GARAGE label; where they stood on the
   disc, the floor is painted back in.
2. Sized as a tower layer: 512 px, the disc's centre at (256, 420) (the pad's centre: game.html draws tower layers at
   0.23x, SPR), the disc a little wider than a pad's ring. The head layer is empty: the garage doesn't turn.
   -> art/cel/raw/towers/garage-base.webp, garage-head.webp (art/cel/towers.py cel-shades them into prototype/assets)
3. The mechanics: three of the four cut out, from the painting upscaled 4x (Real-ESRGAN, cached in art/garage/out),
   graded and cel-shaded like the troops (art/enemies/turnaround.py's grade), animated (a waddle, a swing).
   -> prototype/assets/units/garage_drill.webp, garage_rivet.webp, garage_wrench.webp; art/garage/review.jpg

    venv/bin/python -I art/garage/garage.py      (then art/cel/towers.py for the building's cel shading)
"""
import os, sys
sys.dont_write_bytecode = True
import numpy as np, cv2

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
src = cv2.imread(os.path.join(HERE, 'reference.png'))
H, W = src.shape[:2]

# the four mechanics in front of the building (reference px): polygons round each, with their tools
MECHS = {
    'drill': [(452, 862), (470, 812), (520, 788), (548, 800), (592, 846), (592, 930), (540, 940), (468, 912)],
    'bigdrill': [(566, 948), (600, 896), (622, 850), (660, 846), (706, 900), (708, 990), (640, 995), (572, 965)],
    'gunner': [(672, 830), (720, 812), (740, 772), (782, 772), (800, 822), (800, 880), (760, 905), (716, 896)],
    'wrench': [(772, 880), (802, 836), (822, 820), (856, 822), (884, 880), (880, 948), (800, 952), (776, 920)],
}
# the outline's darkness (LAB lightness): the two with drills stand off the disc, on the dark background (L ~40), so
# only near-black counts there; on the lit floor the outline is lighter
MECH_INK = {'drill': 26, 'bigdrill': 26, 'gunner': 48, 'wrench': 48}
MECH_KEEP = {'gunner': [(728, 806)]}                                         # points (reference px) in regions to keep
MECH_HOLES = {'gunner': [[(768, 772), (808, 772), (808, 808), (768, 792)],    # polygons (reference px) to cut away
                         [(762, 789), (808, 805), (808, 822), (772, 808)]],
              'wrench': [[(770, 926), (842, 922), (890, 922), (890, 960), (770, 960)]]}
DISC = ((1015, 795), (512, 205))   # the disc's ellipse (centre, half-axes), roughly; building() fits it to the visible rim
FLOOR = (600, 800, 680, 840)       # a patch of plain floor plate (reference px): its texture fills where the mechanics stood
SCALE = 0.395                      # reference px -> layer px: the disc's half-width 512 -> 202 (46 map px; a pad's ring is 44)
CENTRE = (256, 420)


_GC = {}


def building():
    if 'img' in _GC: return _GC['img'], _GC['a']
    mask = np.full((H, W), cv2.GC_BGD, np.uint8)
    cv2.rectangle(mask, (330, 30), (1580, 1015), cv2.GC_PR_FGD, -1)
    cv2.ellipse(mask, DISC[0], (460, 180), 0, 0, 360, cv2.GC_FGD, -1)
    cv2.rectangle(mask, (660, 420), (1400, 700), cv2.GC_FGD, -1)
    cv2.rectangle(mask, (330, 1010), (W, H), cv2.GC_BGD, -1)                    # the label
    lab = cv2.cvtColor(src, cv2.COLOR_BGR2LAB).astype(np.float32)
    bgcol = np.median(lab[50:200, 100:300].reshape(-1, 3), 0)
    mask[(mask == cv2.GC_PR_FGD) & (np.linalg.norm(lab - bgcol, axis=2) < 6)] = cv2.GC_PR_BGD
    bg = np.zeros((1, 65), np.float64); fg = np.zeros((1, 65), np.float64)
    cv2.grabCut(src, mask, None, bg, fg, 6, cv2.GC_INIT_WITH_MASK)
    m = ((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)).astype(np.uint8)
    n, lbl, st, _ = cv2.connectedComponentsWithStats(m)
    m = (lbl == 1 + np.argmax(st[1:, 4])).astype(np.uint8)
    _GC['fg'] = m.copy()
    # the mechanics: off the disc they go; on it, the floor is painted back in
    figs = np.zeros((H, W), np.uint8)
    for poly in MECHS.values(): cv2.fillPoly(figs, [np.array(poly, np.int32)], 1)
    figs = cv2.dilate(figs, np.ones((7, 7), np.uint8))
    # the disc's front rim, fitted to where it shows (its lower half, away from the mechanics)
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    pts = max(cs, key=len)[:, 0]
    far = cv2.dilate(figs, np.ones((41, 41), np.uint8))
    rim = np.array([p for p in pts if p[1] > 840 and not far[p[1], p[0]]], np.float32)
    (cx, cy), (dw, dh), ang = cv2.fitEllipse(rim)
    disc = np.zeros((H, W), np.uint8)
    cv2.ellipse(disc, ((cx, cy), (dw, dh), ang), 1, -1, cv2.LINE_AA)
    m[(figs > 0) & (disc == 0)] = 0
    m[(figs > 0) & (disc > 0)] = 1
    hole = (figs & disc).astype(np.uint8)
    # the floor: the colours round the hole carried in smoothly, the floor plate's texture over them, and the disc's
    # dark rim along its edge
    k = 4
    sm = cv2.resize(src, (W // k, H // k), interpolation=cv2.INTER_AREA)
    hk = cv2.dilate(cv2.resize(hole, (W // k, H // k), interpolation=cv2.INTER_NEAREST), np.ones((3, 3), np.uint8))
    fill = cv2.resize(cv2.inpaint(sm, hk, 5, cv2.INPAINT_TELEA), (W, H), interpolation=cv2.INTER_CUBIC).astype(np.float32)
    fill = cv2.GaussianBlur(fill, (0, 0), 4)
    x0, y0, x1, y1 = FLOOR
    ex = src[y0:y1, x0:x1].astype(np.float32); det = np.clip(ex - cv2.GaussianBlur(ex, (0, 0), 3), -10, 10) * 0.7   # grain only, no lines
    th, tw = det.shape[:2]
    tiled = np.tile(det, (H // th + 1, W // tw + 1, 1))[:H, :W]
    fill += tiled
    ring = np.zeros((H, W), np.float32)
    cv2.ellipse(ring, ((cx, cy), (dw, dh), ang), 1, 22, cv2.LINE_AA)
    lower = (np.arange(H)[:, None] > cy).astype(np.float32)
    rimcol = np.median(src[(cv2.dilate(m, np.ones((3, 3), np.uint8)) > 0) & (disc > 0) & (ring > 0.5) & (far == 0)].reshape(-1, 3), 0)
    rb = cv2.GaussianBlur(ring * lower, (0, 0), 2)[..., None]
    fill = fill * (1 - rb) + rimcol * rb
    hb = cv2.GaussianBlur(hole.astype(np.float32), (0, 0), 2)[..., None] * (hole[..., None] > 0)
    img = (src.astype(np.float32) * (1 - hb) + fill * hb).clip(0, 255).astype(np.uint8)
    a = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 0.8)
    _GC['img'], _GC['a'] = img, a
    return img, a


def layer(img, a):
    """Scale and place: the disc's centre at CENTRE of a 512 px layer."""
    M = np.float32([[SCALE, 0, CENTRE[0] - SCALE * DISC[0][0]], [0, SCALE, CENTRE[1] - SCALE * DISC[0][1]]])
    pre = np.dstack([img.astype(np.float32) * a[..., None], a])
    out = cv2.warpAffine(pre, M, (512, 512), flags=cv2.INTER_AREA)
    al = out[..., 3:4]
    rgb = np.where(al > 1e-3, out[..., :3] / np.maximum(al, 1e-3), 0)
    return np.dstack([rgb, al * 255]).clip(0, 255).astype(np.uint8)


if __name__ == '__main__':
    img, a = building()
    base = layer(img, a)
    out = os.path.join(ROOT, 'art', 'cel', 'raw', 'towers')
    cv2.imwrite(os.path.join(out, 'garage-base.webp'), base, [cv2.IMWRITE_WEBP_QUALITY, 95])
    cv2.imwrite(os.path.join(out, 'garage-head.webp'), np.zeros((512, 512, 4), np.uint8), [cv2.IMWRITE_WEBP_QUALITY, 95])
    ys, xs = np.nonzero(base[..., 3] > 40)
    print('ok garage: layer bbox', xs.min(), ys.min(), xs.max(), ys.max())


def mechanic(name):
    """One mechanic cut out (the reference crop round it as BGR, alpha): inside its polygon, what the ink lines close
    off from the polygon's edge, plus that ink."""
    poly = np.array(MECHS[name], np.int32)
    x, y, w, h = cv2.boundingRect(poly); x -= 4; y -= 4; w += 8; h += 8
    crop = src[y:y + h, x:x + w]
    lab = cv2.cvtColor(crop, cv2.COLOR_BGR2LAB).astype(np.float32)
    ink = (lab[..., 0] < MECH_INK[name]).astype(np.uint8)
    inside = np.zeros((h, w), np.uint8); cv2.fillPoly(inside, [poly - [x, y]], 1)
    walls = cv2.dilate(ink, np.ones((2, 2), np.uint8))
    free = ((1 - walls) | (1 - inside)).astype(np.uint8)          # outside the polygon is all open floor
    free[inside == 0] = 1
    n, lbl = cv2.connectedComponents(free, connectivity=4)
    outside = set(np.unique(lbl[inside == 0])) - {0}
    fig = (~np.isin(lbl, list(outside)) & (inside > 0)).astype(np.uint8)
    for px, py in MECH_KEEP.get(name, []):                         # regions the outline leaves open (a visor)
        k = lbl[py - y, px - x]
        if k: fig[lbl == k] = 1
    for hp in MECH_HOLES.get(name, []):
        cv2.fillPoly(fig, [np.array(hp, np.int32) - [x, y]], 0)
    fig = cv2.morphologyEx(fig, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    n, lbl, st, _ = cv2.connectedComponentsWithStats(fig, connectivity=8)
    big = 1 + np.argmax(st[1:, 4])
    fig = np.isin(lbl, [k for k in range(1, n) if st[k, 4] > 0.02 * st[big, 4]]).astype(np.uint8)
    return (x, y), crop.copy(), cv2.GaussianBlur(fig.astype(np.float32), (0, 0), 0.5)


# ---------------------------------------------------------------- the mechanics' sprite sheets
# Three of the four mechanics are the tower's units (the grey drill, the riveter and the wrench). Each has one view, as
# painted, turned to face right (the game flips it to face left). They don't have separate legs to swing, so they walk
# with a heavy waddle: rocking from foot to foot about the feet, a bob, a little squash as each foot lands. Then two
# attack frames, the same wind-up and lunge as the troopers. One row: WALK_N walk frames then 2 attack frames, drawn at
# 320 px and saved at 192, the feet at (160, 300) (game.html SHEETS).
UNITS = {'drill': 'garage_drill', 'gunner': 'garage_rivet', 'wrench': 'garage_wrench'}
FACES = {'drill': -1, 'gunner': -1, 'wrench': -1}   # which way each faces in the painting (-1: left)
UP = 1.6        # reference px -> sheet px: the tallest fills most of its frame (about 8 sheet px a map px, as the troopers)
HIRES = (430, 760, 910, 1000)   # the mechanics' corner of the painting (reference px), upscaled 4x for crisp sheets


def hires():
    """The mechanics' corner of the painting upscaled 4x (Real-ESRGAN, like the map: art/upscale/upscale.py), cached in
    art/garage/out."""
    import hashlib, subprocess
    x0, y0, x1, y1 = HIRES
    im = src[y0:y1, x0:x1]
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    cache = os.path.join(HERE, 'out', f'up4-{hashlib.md5(im.tobytes()).hexdigest()[:16]}.png')
    if not os.path.exists(cache):
        py = os.environ.get('UPSCALE_PY', os.path.join(ROOT, 'venv-upscale', 'bin', 'python'))
        if not os.path.exists(py):
            print('WARNING: no upscaler (venv-upscale): a plain resize; see art/upscale/upscale.py')
            return cv2.resize(im, None, fx=4, fy=4, interpolation=cv2.INTER_LANCZOS4)
        tmp = os.path.join(HERE, 'out', 'up4-in.png'); cv2.imwrite(tmp, im)
        subprocess.run([py, '-I', os.path.join(ROOT, 'art', 'upscale', 'upscale.py'), tmp, cache], check=True)
    return cv2.imread(cache)
WALK_N = 6
WADDLE = dict(rock=4.0, bob=5.0, squash=0.04)
LIFT = 0.72     # a gamma on the graded figure (below 1: lighter mid-tones, the ink stays dark)


def mech_pieces(name):
    import zlib
    sys.path.insert(0, os.path.join(ROOT, 'art', 'enemies'))
    import turnaround as T
    (x, y), c, a = mechanic(name)
    h, w = a.shape
    # the colours from the upscaled painting; round the edge, the figure's own colours carried out over the floor's,
    # so its soft edge doesn't pick up the floor's red glow
    big = hires()[(y - HIRES[1]) * 4:(y - HIRES[1] + h) * 4, (x - HIRES[0]) * 4:(x - HIRES[0] + w) * 4]
    c = cv2.resize(big, (round(w * UP), round(h * UP)), interpolation=cv2.INTER_AREA)
    a = np.clip(cv2.resize(a, (c.shape[1], c.shape[0]), interpolation=cv2.INTER_LINEAR), 0, 1)
    a = cv2.erode(a, np.ones((2, 2), np.uint8))
    out = (a < 0.6).astype(np.uint8)
    c = np.where(out[..., None] > 0, cv2.inpaint(c, cv2.dilate(out, np.ones((3, 3), np.uint8)) & (a < 0.98).astype(np.uint8), 3, cv2.INPAINT_TELEA), c).astype(np.float32)
    if FACES[name] < 0: c, a = c[:, ::-1].copy(), a[:, ::-1].copy()
    c = T.grade(c, a, seed=zlib.crc32(name.encode()) % 1000)
    c = 255 * (c / 255) ** LIFT   # the painting's mechanics are dark red on near-black: lifted, so they read on the road
    ys, xs = np.nonzero(a > 0.5)
    g = ys.max(); fx = xs[ys > g - 10].mean()
    return T, dict(body=np.dstack([c * a[..., None], a]).astype(np.float32), anchor=(fx, g))


def mech_strip(name, scale):
    T, P = mech_pieces(name)
    fr = []
    for i in range(WALK_N):
        p = 2 * np.pi * i / WALK_N
        land = abs(np.cos(p))                                   # a foot comes down
        M = T.affine(WADDLE['rock'] * np.sin(p), P['anchor'], dy=-WADDLE['bob'] * abs(np.sin(p)), sy=1 - WADDLE['squash'] * land)
        fr.append(T.render(P, [(P['body'], M)], scale))
    for rot, dx in T.ATTACK:
        fr.append(T.render(P, [(P['body'], T.affine(-rot, P['anchor'], dx=dx / scale))], scale))
    return T, cv2.hconcat(fr)


if __name__ == '__main__':
    review = []
    for name, unit in UNITS.items():
        s = 1.0
        while True:   # the largest scale (at most 1) at which no frame is cut off at its edges
            T, st = mech_strip(name, s)
            a = st[..., 3]; F = T.FRAME
            if all(max(a[:, i * F:i * F + 3].max(), a[:, (i + 1) * F - 3:(i + 1) * F].max(), a[:3, i * F:(i + 1) * F].max()) <= 10 for i in range(a.shape[1] // F)): break
            s *= 0.95
        ys = np.nonzero(st[:, :T.FRAME, 3].max(1) > 40)[0]
        out = cv2.resize(st, None, fx=T.OUT_PX / T.FRAME, fy=T.OUT_PX / T.FRAME, interpolation=cv2.INTER_AREA)
        path = os.path.join(ROOT, 'prototype', 'assets', 'units', unit + '.webp')
        cv2.imwrite(path, out, [cv2.IMWRITE_WEBP_QUALITY, 75])
        print(f'ok {unit}: scale {s:.3f}, sh {(T.FEET[1] - ys.min()) / 2:.0f} (game.html SHEETS.{unit}.sh), {os.path.getsize(path) // 1024} KB')
        bg = np.full(st.shape[:2] + (3,), (52, 44, 40), np.float32); al = st[..., 3:4] / 255
        review.append((bg * (1 - al) + st[..., :3] * al).astype(np.uint8))
    cv2.imwrite(os.path.join(HERE, 'review.jpg'), cv2.resize(cv2.vconcat(review), None, fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 85])
