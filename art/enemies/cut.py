"""The game's enemy sprites, cut from the enemy concept sheet (art/enemies/concept.png, 2000 x 1116: scout, raider,
enforcer, mech, each on a pedestal in a gold frame), so in the game they look exactly like the concepts.

1. Cut: inside a rough box round each enemy, the regions the art's black ink lines close off, minus those reaching the
   box's edge (the wall and the pedestal), plus the ink round them; then any gaps the box missed are cut by hand (HOLES).
2. Strip: the cut-out faces right, scaled so its height is the game's `sh` (2x frame px), feet at (160, 300) of each
   320 px frame. Frames 0-5 walk (a bob, a sway and a squash on each step), 6-7 attack (wind-up, then the hit).

    venv/bin/python -I art/enemies/cut.py      -> prototype/assets/units/{scout,raider,enforcer,mech}.webp,
                                                  art/enemies/cutouts/*.png, art/enemies/review.png
"""
import os
import numpy as np, cv2

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
UNITS = os.path.join(ROOT, 'prototype', 'assets', 'units')
src = cv2.imread(os.path.join(HERE, 'concept.png'))
H, W = src.shape[:2]
L = cv2.cvtColor(src, cv2.COLOR_BGR2LAB)[..., 0]

# x0, y0, x1, y1 round each enemy (the bottom edge runs through the pedestal, under the feet); flip: the concept faces left.
# sh: the sprite's height in the game's 160-unit frame (game.html ENEMIES[].sh); the frame is 320 px at 2x.
ENEMY = {
    'scout':    dict(box=(66, 455, 404, 852), ground=770, flip=True, sh=112, walk=dict(bob=0.05, sway=4.5, squash=0.04), attack='bite'),
    'raider':   dict(box=(458, 378, 902, 850), ground=780, flip=True, sh=140, walk=dict(bob=0.035, sway=3.5, squash=0.03), attack='slash'),
    'enforcer': dict(box=(924, 360, 1452, 846), ground=780, flip=False, sh=140, walk=dict(bob=0.025, sway=3.0, squash=0.03), attack='punch'),
    'mech':     dict(box=(1420, 228, 1992, 852), ground=790, flip=True, sh=140, walk=dict(bob=0.018, sway=2.0, squash=0.02), attack='stomp'),
}
# Patches of each frame's wall and pedestal (concept px): a region of the same colour as one of these is background
# showing through a gap (between the legs, under an arm), not part of the enemy.
BACK = {
    'scout': [(100, 300, 200, 400), (160, 828, 260, 846), (300, 470, 340, 500)],
    'raider': [(540, 300, 600, 360), (520, 820, 560, 840), (800, 400, 850, 430)],
    'enforcer': [(1000, 280, 1100, 340), (1050, 805, 1150, 830), (1300, 300, 1380, 340)],
    'mech': [(1500, 280, 1560, 330), (1600, 822, 1700, 840)],
}
# per enemy: background regions the colour test misses (wall panels between the ears, ...), named by the centre of
# their bounding box (concept px, as REGIONS lists them); dropped
DROP = {
    'scout': [(113, 508), (107, 551), (104, 592), (110, 707), (194, 526), (272, 540), (306, 538)],
    'raider': [(879, 723), (850, 723)],
    'enforcer': [(988, 717), (1177, 724)],
    'mech': [(1512, 535), (1512, 706), (1922, 520), (1923, 743), (1686, 784)],
}
DROP_AT = {  # per enemy: points (concept px) inside background regions to drop (the pedestal seen between the legs)
    'raider': [(708, 830)],
}
WALLS = {    # per enemy: lines (concept px) drawn into the ink where the art leaves a gap (pants fading into the shadow)
    'raider': [[(676, 692), (672, 712), (668, 740), (663, 790)], [(746, 760), (755, 776), (757, 800)]],
}
KEEP = {     # per enemy: regions (by bounding-box centre) kept though their colour matches the wall or the pedestal
    'mech': [(1923, 662)],
}
# per enemy: polygons (concept px) whose ink is always kept (thin lines that touch the wall's own lines, like antennae)
KEEP_INK = {
    'scout': [[(268, 566), (296, 462), (316, 466), (296, 570)], [(286, 568), (316, 516), (330, 522), (302, 572)]],
    'mech': [[(1722, 312), (1726, 246), (1746, 246), (1740, 312)]],
}
HOLES = {   # per enemy: polygons (concept px) cut away at the end (frame bars and pedestal bits joined to the enemy)
    'scout': [[(334, 760), (366, 760), (366, 812), (340, 812)]],
    'raider': [[(556, 396), (584, 396), (584, 504), (556, 504)], [(598, 801), (620, 801), (620, 850), (598, 850)]],
}
REGIONS = {} # filled by cut(): the kept regions' centres and sizes, for choosing DROP points
INK = 42     # LAB lightness below this is the ink line
LAB = cv2.cvtColor(src, cv2.COLOR_BGR2LAB).astype(np.float32)


def cut(name, full=False):
    """The enemy as an RGBA crop (full=True: its alpha over the whole concept sheet, for checking)."""
    x0, y0, x1, y1 = ENEMY[name]['box']
    lum = L[y0:y1, x0:x1]
    ink = (lum < INK).astype(np.uint8)
    h, w = ink.shape
    # regions: the ink grown by a pixel walls them off (anti-aliased gaps in a line would let them leak)
    walls = cv2.dilate(ink, np.ones((3, 3), np.uint8))
    for line in WALLS.get(name, []):
        cv2.polylines(walls, [(np.array(line) - [x0, y0]).astype(np.int32)], False, 1, 4)
    n, lbl, st, _ = cv2.connectedComponentsWithStats(1 - walls, connectivity=4)
    edge = set(np.unique(np.concatenate([lbl[0], lbl[-1], lbl[:, 0], lbl[:, -1]])))
    back = [np.median(LAB[by0:by1, bx0:bx1].reshape(-1, 3), axis=0) for bx0, by0, bx1, by1 in BACK[name]]
    lab = LAB[y0:y1, x0:x1]
    ok = []
    for k in range(1, n):
        if k in edge or st[k, cv2.CC_STAT_AREA] < 3: continue
        if st[k, cv2.CC_STAT_AREA] > 120:
            med = np.median(lab[lbl == k], axis=0)
            c = (st[k, 0] + st[k, 2] / 2 + x0, st[k, 1] + st[k, 3] / 2 + y0)
            kept = any(abs(c[0] - px) <= 4 and abs(c[1] - py) <= 4 for px, py in KEEP.get(name, []))
            if not kept and min(np.linalg.norm(med - b) for b in back) < 7: continue   # the wall or the pedestal, seen through a gap
        ok.append(k)
    centre = lambda k: (st[k, 0] + st[k, 2] / 2 + x0, st[k, 1] + st[k, 3] / 2 + y0)
    at = {lbl[py - y0, px - x0] for px, py in DROP_AT.get(name, [])}
    ok = [k for k in ok if k not in at]
    ok = [k for k in ok if not any(abs(centre(k)[0] - px) <= 4 and abs(centre(k)[1] - py) <= 4 for px, py in DROP.get(name, []))]
    REGIONS[name] = [(int(st[k, 0] + st[k, 2] / 2 + x0), int(st[k, 1] + st[k, 3] / 2 + y0), int(st[k, 4]), k) for k in ok]
    keep = np.isin(lbl, ok).astype(np.uint8)
    keep = cv2.dilate(keep, np.ones((3, 3), np.uint8)) & (1 - ink)          # back out to the ink
    # the ink: its pieces that never reach the box's edge (lines inside the enemy, thin bits like antennae), and the
    # outline round the kept regions (it is shared with the wall and the pedestal, so take it by distance)
    ni, li, si, _ = cv2.connectedComponentsWithStats(ink, connectivity=8)
    iedge = set(np.unique(np.concatenate([li[0], li[-1], li[:, 0], li[:, -1]])))
    inner_ink = np.isin(li, [k for k in range(1, ni) if k not in iedge]).astype(np.uint8)
    near = cv2.dilate(keep, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)))
    # round the feet (below `ground`) only the feet's own outline: the pedestal's lines run close by there
    gy = ENEMY[name]['ground'] - y0
    near[gy:] = cv2.dilate(keep, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)))[gy:]
    force = np.zeros_like(ink)
    for poly in KEEP_INK.get(name, []):
        cv2.fillPoly(force, [np.array(poly, np.int32) - [x0, y0]], 1)
    m = keep | inner_ink | (ink & near) | (ink & force)
    ff = np.pad(m, 1); cv2.floodFill(ff, None, (0, 0), 2); m = (ff[1:-1, 1:-1] != 2).astype(np.uint8)   # fill holes
    for poly in HOLES.get(name, []):
        cv2.fillPoly(m, [np.array(poly, np.int32) - [x0, y0]], 0)
    # drop specks, keep the enemy (and anything joined to it)
    n, lbl, st, _ = cv2.connectedComponentsWithStats(m, connectivity=8)
    big = max(range(1, n), key=lambda k: st[k, cv2.CC_STAT_AREA])
    m = np.isin(lbl, [k for k in range(1, n) if st[k, cv2.CC_STAT_AREA] > 0.004 * st[big, cv2.CC_STAT_AREA]]).astype(np.uint8)
    a = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 0.7)
    rgba = np.dstack([src[y0:y1, x0:x1], (a * 255).astype(np.uint8)])
    if full:
        f = np.zeros((H, W), np.float32); f[y0:y1, x0:x1] = a; return f
    ys, xs = np.nonzero(a > 0.05)
    return rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


FRAME, FEET = 320, (160, 300)


def frames(name, rgba, fit=1.0):
    e = ENEMY[name]
    if e['flip']: rgba = rgba[:, ::-1]
    s = e['sh'] * 2 / rgba.shape[0] * fit
    img = cv2.resize(rgba, None, fx=s, fy=s, interpolation=cv2.INTER_AREA).astype(np.float32)
    h, w = img.shape[:2]
    anchor_x = w / 2                                                          # the game's shadow sits under the middle
    pre = img.copy(); pre[..., :3] *= pre[..., 3:4] / 255                     # premultiplied: no dark fringes when warped
    wk = e['walk']
    poses = []
    for k in range(6):                                                        # the walk: two steps
        p = k / 6 * 2 * np.pi
        poses.append(dict(dy=-abs(np.sin(p)) * wk['bob'] * h, rot=np.sin(p) * wk['sway'], sx=1 + wk['squash'] * np.cos(2 * p) * 0.6,
                          sy=1 - wk['squash'] * np.cos(2 * p), dx=0))
    att = dict(bite=[(-7, 0.96, 1.03, -4), (11, 1.06, 0.95, 7)], slash=[(-7, 0.97, 1.03, -3), (8, 1.05, 0.96, 6)],
               punch=[(-5, 0.98, 1.02, -4), (8, 1.05, 0.97, 7)], stomp=[(-4, 0.99, 1.04, -2), (5, 1.04, 0.94, 4)])[e['attack']]
    for rot, sx, sy, dx in att:                                               # wind-up (leaning back), then the hit (lunging forward)
        poses.append(dict(dy=0, rot=rot, sx=sx, sy=sy, dx=dx))
    out = np.zeros((FRAME, FRAME * 8, 4), np.float32)
    for i, q in enumerate(poses):
        # about the feet: scale, then rotate (a positive angle leans forward, to the right), then move to (160, 300)
        R = cv2.getRotationMatrix2D((0, 0), -q['rot'], 1)[:, :2]
        M = R @ np.diag([q['sx'], q['sy']])
        t = np.array([FEET[0] + q['dx'], FEET[1] + q['dy']]) - M @ np.array([anchor_x, h])
        f = cv2.warpAffine(pre, np.hstack([M, t[:, None]]).astype(np.float32), (FRAME, FRAME), flags=cv2.INTER_LINEAR)
        if max(f[:, :2, 3].max(), f[:, -2:, 3].max(), f[:2, :, 3].max()) > 8:   # it would be cut off at the frame's edge
            return frames(name, rgba[:, ::-1] if e['flip'] else rgba, fit * 0.96)
        out[:, i * FRAME:(i + 1) * FRAME] = f
    al = out[..., 3:4]
    out[..., :3] = np.where(al > 0, out[..., :3] * 255 / np.maximum(al, 1e-3), 0)
    return out.clip(0, 255).astype(np.uint8), s


if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'cutouts'), exist_ok=True)
    rows = []
    for name in ENEMY:
        rgba = cut(name)
        cv2.imwrite(os.path.join(HERE, 'cutouts', name + '.png'), rgba)
        strip, s = frames(name, rgba)
        cv2.imwrite(os.path.join(UNITS, name + '.webp'), strip, [cv2.IMWRITE_WEBP_QUALITY, 100])
        print(f'ok {name}: cut {rgba.shape[1]}x{rgba.shape[0]}, scale {s:.3f}, sh {rgba.shape[0] * s / 2:.1f} (game.html ENEMIES.{name}.sh)')
        bg = np.full((FRAME, FRAME * 8, 3), (52, 44, 40), np.float32)
        al = strip[..., 3:4] / 255
        rows.append((bg * (1 - al) + strip[..., :3] * al).astype(np.uint8))
    cv2.imwrite(os.path.join(HERE, 'review.png'), cv2.resize(cv2.vconcat(rows), None, fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA))
