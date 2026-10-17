"""The Garage tower, from the reference painting (art/garage/reference.png, 2000 x 1116).

1. The building: cut off the dark background (GrabCut, the walls and the disc it stands on marked as sure), without the
   four mechanics walking in front of it (they are the tower's live units) or the GARAGE label; where they stood on the
   disc, the floor is painted back in.
2. Sized as a tower layer: 512 px, the disc's centre at (256, 420) (the pad's centre: game.html draws tower layers at
   0.23x, SPR), the disc a little wider than a pad's ring. The head layer is empty: the garage doesn't turn.
   -> art/cel/raw/towers/garage-base.webp, garage-head.webp (art/cel/towers.py cel-shades them into prototype/assets)
   The mechanics themselves are drawn like the game's other troops: the raider's rig from the turnaround sheet in
   their colours, with their tools (art/enemies/turnaround.py, SKINS garage_*).

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

