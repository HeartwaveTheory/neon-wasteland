"""The game's enemies from the turnaround sheet (art/enemies/turnaround.png, 2000 x 1116): the scout, raider, enforcer
and mech, each drawn from the front, three-quarter, side and back, standing on a disc.

1. Cut: inside a box round each figure, the regions the art's black ink lines close off, minus those reaching the box's
   edge or matching the background, the grid lines, the disc or its glowing ring, plus the ink round them.
2. Rig: each figure is split into its body and its legs (polygons below), and the legs are animated: in the side and
   three-quarter views they swing from the hip (a trot for the dog, the far legs drawn from the near ones, a little
   darker), in the front and back views they step, lifting in turn while the body rocks over the planted foot.
3. Strips: every view of an enemy at one scale, facing right, feet at (160, 300) of each 320 px frame, 8 frames:
   0-5 the walk, 6-7 an attack (side view: a wind-up, then the hit).

    venv/bin/python -I art/enemies/turnaround.py   -> prototype/assets/units/<enemy>-<view>.webp,
                                                      art/enemies/cutouts/<enemy>-<view>.png, art/enemies/review.png
"""
import os, sys, zlib
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'cel'))
from celshade import cel   # noqa: E402
import numpy as np, cv2

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
UNITS = os.path.join(ROOT, 'prototype', 'assets', 'units')
src = cv2.imread(os.path.join(HERE, 'turnaround.png'))
H, W = src.shape[:2]
LAB = cv2.cvtColor(src, cv2.COLOR_BGR2LAB).astype(np.float32)
L = LAB[..., 0]
INK = 45
# background colours (LAB, measured): the sheet and its grid lines; the disc's top and its glowing ring. The figures'
# greys come close (the mech's body is (104, 126, 127)), so a region must match in a and b within 3.
BG = [(48, 129, 119, 10)]   # (the grid lines' (101, 125, 120) is the mech's own grey: only gaps of the sheet count)
DISC = [(82, 125, 120, 15), (176, 116, 118, 35), (125, 121, 119, 25)]
DISC_RY = 22   # the discs' half-height: below ground - DISC_RY is the disc zone
FEET_BELOW = 8 # the front feet reach this far below the disc's middle (three-quarter views)


def like(med, cols, tol=3):
    return any(abs(med[0] - l) <= dl and abs(med[1] - a) <= tol and abs(med[2] - b) <= tol for l, a, b, dl in cols)
VIEWS = ['front', 'quarter', 'side', 'back']

# Each figure: its box (x0, y0, x1, y1) and the y of the ground (the middle of its disc). faces: which way the drawing
# faces (+1 right, -1 left; the strips all face right).
FIG = {
    'scout':    dict(row=(78, 306, 284), front=(244, 432), quarter=(690, 920), side=(1140, 1420), back=(1640, 1840),
                     faces=dict(quarter=1, side=1)),
    'raider':   dict(row=(316, 546, 520), front=(196, 500), quarter=(650, 950), side=(1170, 1370), back=(1590, 1890),
                     faces=dict(quarter=1, side=1)),
    'enforcer': dict(row=(550, 796, 772), front=(196, 530), quarter=(650, 980), side=(1170, 1380), back=(1570, 1890),
                     faces=dict(quarter=1, side=1)),
    'mech':     dict(row=(796, 1106, 1080), front=(196, 500), quarter=(640, 980), side=(1150, 1420), back=(1590, 1910),
                     faces=dict(quarter=1, side=-1)),
}
DROP = {}      # (enemy, view): points (sheet px) inside background regions the colour test misses
KEEP = {}      # (enemy, view): points inside regions to keep though their colour matches the background
HOLES = {}     # (enemy, view): polygons (sheet px) cut away at the end
DEBUG = {}     # filled by cut(): its regions, for checking
RANGES = {}    # filled by cut(): the legs' x-ranges it used
FORCE = {      # (enemy, view): polygons (sheet px) where every pixel that isn't the sheet's background is kept
    ('raider', 'side'): [[(1184, 416), (1236, 416), (1240, 500), (1184, 500)]],
}


def box(enemy, view):
    y0, y1, g = FIG[enemy]['row']; x0, x1 = FIG[enemy][view]
    return x0, y0, x1, y1, g


# Each leg's rough centre (sheet x), read off the sheet; leg_ranges() finds its edges from the outline.
LEGS = {
    ('scout', 'front'): [317, 377], ('scout', 'quarter'): [729, 784, 835], ('scout', 'side'): [1204, 1286],
    ('scout', 'back'): [1705, 1775],
    ('raider', 'front'): [320, 377], ('raider', 'quarter'): [771, 823], ('raider', 'side'): [1261],
    ('raider', 'back'): [1712, 1768],
    ('enforcer', 'front'): [314, 384], ('enforcer', 'quarter'): [766, 830], ('enforcer', 'side'): [1256, 1288],
    ('enforcer', 'back'): [1707, 1775],
    ('mech', 'front'): [297, 395], ('mech', 'quarter'): [756, 846], ('mech', 'side'): [1275],
    ('mech', 'back'): [1697, 1789],
}


HALF = dict(scout=13, raider=18, enforcer=22, mech=30)
DARK_LEGS = {'raider'}   # at most this far (px) from a leg's centre to its edge


def leg_ranges(enemy, view, m=None, hip=None, cached=False):
    """The legs' x-ranges (sheet px): the figure's run round each rough centre a few rows under the hip (the median over
    those rows), at most HALF px each way, and never past half-way to the next leg."""
    if cached:
        if (enemy, view) not in RANGES: cut(enemy, view)
        return RANGES[(enemy, view)]
    x0, y0 = box(enemy, view)[:2]
    cs = LEGS[(enemy, view)]; hw = HALF[enemy]
    out = []
    for i, c in enumerate(cs):
        lo_cap = max(c - hw, (cs[i - 1] + c) // 2 + 1 if i else -10 ** 6)
        hi_cap = min(c + hw, (cs[i + 1] + c) // 2 - 1 if i + 1 < len(cs) else 10 ** 6)
        edges = []
        for r in range(hip + 2, hip + 7):
            row = m[r] > 0
            c0 = c
            for d in (0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6):   # off the outline, into the leg
                if row[c + d - x0]: c0 = c + d; break
            lo = c0
            while lo - 1 >= lo_cap and row[lo - 1 - x0]: lo -= 1
            hi = c0
            while hi + 1 <= hi_cap and row[hi + 1 - x0]: hi += 1
            edges.append((lo, hi))
        e = np.median(np.array(edges), axis=0)
        out.append((int(e[0]), int(e[1])))
    return out


_CUT = {}


def cut(enemy, view):
    """The figure's alpha over the whole sheet (computed once)."""
    if (enemy, view) not in _CUT: _CUT[(enemy, view)] = _cut(enemy, view)
    return _CUT[(enemy, view)]


def _cut(enemy, view):
    x0, y0, x1, y1, ground = box(enemy, view)
    lum = L[y0:y1, x0:x1].astype(np.float32); lab = LAB[y0:y1, x0:x1]
    ink = (lum < INK).astype(np.uint8)
    chroma = np.hypot(lab[..., 1] - 128, lab[..., 2] - 128)
    # walls: the ink, and any line clearly darker than what's round it (the outline where a glow washes over it)
    dark = ((lum < cv2.GaussianBlur(lum, (0, 0), 3) - 22) & (lum < 110)).astype(np.uint8)
    walls = cv2.dilate(ink | dark, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))   # thick: closes small gaps
    walls[RIG[enemy]['hip'][view] - y0] = 1   # cut at the hip: the shadow under the feet can't join the body's underside
    n, lbl, st, cen = cv2.connectedComponentsWithStats(1 - walls, connectivity=4)
    edge = set(np.unique(np.concatenate([lbl[0], lbl[-1], lbl[:, 0], lbl[:, -1]])))
    drop = {lbl[py - y0, px - x0] for px, py in DROP.get((enemy, view), [])}
    keepk = {lbl[py - y0, px - x0] for px, py in KEEP.get((enemy, view), [])}
    zone = ground - DISC_RY - y0          # rows below this are the disc's: there, only what isn't disc-coloured counts
    g = ground - y0
    ok = []
    for k in range(1, n):
        if k in drop: continue
        if k not in keepk:
            if k in edge or st[k, cv2.CC_STAT_AREA] < 3: continue
            in_disc = cen[k][1] > zone
            if st[k, cv2.CC_STAT_AREA] > 60 or in_disc:
                med = np.median(lab[lbl == k], axis=0)
                if like(med, BG): continue
                if in_disc:   # the disc's top is one wide flat region, its ring is bright; feet are narrow
                    wide = st[k, cv2.CC_STAT_WIDTH] > 50
                    if st[k, cv2.CC_STAT_AREA] < 8: continue
                    if med[0] > 95 and med[1] < 124 and med[2] < 124: continue            # the cyan ring
                    if wide and (like(med, DISC, 6) or like(med, BG, 6)): continue
                    w_, h_ = st[k, cv2.CC_STAT_WIDTH], st[k, cv2.CC_STAT_HEIGHT]
                    flat = w_ > 12 and h_ < 0.75 * w_ and st[k, cv2.CC_STAT_TOP] + h_ > g - 6
                    if flat and med[0] < 110 and abs(med[1] - 127) < 6 and abs(med[2] - 122) < 6: continue   # the painted shadow
        ok.append(k)
    keep = np.isin(lbl, ok).astype(np.uint8)
    DEBUG[(enemy, view)] = dict(lbl=lbl, st=st, cen=cen, ok=set(ok), x0=x0, y0=y0, ink=ink)
    keep = cv2.dilate(keep, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))) & (1 - ink)   # grow back to the ink
    ni, li, si, _ = cv2.connectedComponentsWithStats(ink, connectivity=8)
    iedge = set(np.unique(np.concatenate([li[0], li[-1], li[:, 0], li[:, -1]])))
    inner = np.isin(li, [k for k in range(1, ni) if k not in iedge]).astype(np.uint8)
    near = cv2.dilate(keep, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    gy = zone
    near[gy:] = cv2.dilate(keep, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))[gy:]
    m = keep | (ink & near) | (inner & near)
    ff = np.pad(m, 1); cv2.floodFill(ff, None, (0, 0), 2)
    filled = (ff[1:-1, 1:-1] != 2).astype(np.uint8)
    filled[gy:] = m[gy:]                  # no filling round the feet: the disc's outline closes a loop with theirs there
    m = filled
    # below the hip only the legs: their columns where they leave the body (the disc hasn't started yet there), widened
    # a little for the feet, where only the outline and the leg's own colours count (not the disc's grey round them)
    hip = RIG[enemy]['hip'][view] - y0
    legm = np.zeros_like(m)
    RANGES[(enemy, view)] = leg_ranges(enemy, view, m, hip)
    for xa, xb in RANGES[(enemy, view)]:
        xa -= x0; xb -= x0
        legm[hip:, max(0, xa):xb + 1] = 1
        for lo, hi in ((max(0, xa - 7), xa), (xb + 1, min(m.shape[1], xb + 8))):
            seg = lab[hip:, lo:hi]
            grey = (seg[..., 0] > 75) & (seg[..., 0] < 112) & (np.abs(seg[..., 1] - 127) <= 5) & (np.abs(seg[..., 2] - 122) <= 5)
            legm[hip:, lo:hi] = ~grey
    if enemy in DARK_LEGS:   # near-black legs read as ink: in their columns keep all that isn't background, disc or ring
        seg = lab[hip:]
        bgk = (np.abs(seg[..., 0] - 48) <= 10) & (np.abs(seg[..., 1] - 129) <= 3) & (np.abs(seg[..., 2] - 119) <= 3)
        disc = (seg[..., 0] > 75) & (np.abs(seg[..., 1] - 127) <= 5) & (np.abs(seg[..., 2] - 122) <= 5)
        ring = (seg[..., 0] > 95) & (seg[..., 1] < 124) & (seg[..., 2] < 124)
        m[hip:] |= (legm[hip:] & ~bgk & ~disc & ~ring).astype(np.uint8)
    m[hip:] &= legm[hip:]
    for poly in FORCE.get((enemy, view), []):
        fm = np.zeros_like(m); cv2.fillPoly(fm, [np.array(poly, np.int32) - [x0, y0]], 1)
        notbg = ~((np.abs(lab[..., 0] - 48) <= 12) & (np.abs(lab[..., 1] - 129) <= 4) & (np.abs(lab[..., 2] - 119) <= 4))
        m |= (fm & notbg).astype(np.uint8)
    m[ground + FEET_BELOW - y0:] = 0      # the feet stand on the disc's middle: below that it's all disc
    for poly in HOLES.get((enemy, view), []):
        cv2.fillPoly(m, [np.array(poly, np.int32) - [x0, y0]], 0)
    n, lbl, st, _ = cv2.connectedComponentsWithStats(m, connectivity=8)
    if n > 1:
        big = max(range(1, n), key=lambda k: st[k, cv2.CC_STAT_AREA])
        m = np.isin(lbl, [k for k in range(1, n) if st[k, cv2.CC_STAT_AREA] > 0.01 * st[big, cv2.CC_STAT_AREA]]).astype(np.uint8)
    a = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 0.6)
    # neon (the blades, the glowing eyes): no black outline, so take it by its colour, joined to the figure, with its
    # glow fading out (alpha by how colourful it is)
    neon = (chroma > 18).astype(np.uint8); neon[zone - 4:] = 0   # (the disc's ring glows too)
    nn, nl, ns, _ = cv2.connectedComponentsWithStats(neon, connectivity=8)
    touch = set(np.unique(nl[cv2.dilate(m, np.ones((7, 7), np.uint8)) > 0])) - {0}
    blade = np.isin(nl, list(touch)).astype(np.uint8)
    core = (blade & (chroma > 30)).astype(np.uint8)
    ff = np.pad(core, 1); cv2.floodFill(ff, None, (0, 0), 2); core = (ff[1:-1, 1:-1] != 2).astype(np.float32)
    glow = blade * np.clip((chroma - 14) / 26, 0, 1)
    a = np.maximum(a, np.maximum(glow, core))
    full = np.zeros((H, W), np.float32)
    full[y0:y1, x0:x1] = a
    return full


# ---------------------------------------------------------------- the rig
# hip: the y (sheet px) where the legs leave the body; A: how far a leg swings (degrees); lift: how high a foot lifts
# (sheet px); bob: how far the body rises at mid-stance; rock: the body's roll in the front and back views (degrees);
# stride: map px per walk cycle (the game's ENEMIES[].stride, so the feet don't slide); over: how far (px) a leg reaches up
# behind the body, so no gap opens at the hip when it swings.
RIG = {
    'scout':    dict(hip=dict(front=258, quarter=254, side=250, back=252), A=26, lift=6, bob=2.5, rock=2.5, over=8),
    'raider':   dict(hip=dict(front=504, quarter=504, side=500, back=504), A=26, lift=5, bob=2.5, rock=3.0, over=8),
    'enforcer': dict(hip=dict(front=748, quarter=748, side=748, back=750), A=18, lift=6, bob=3.0, rock=2.5, over=10),
    'mech':     dict(hip=dict(front=1036, quarter=1032, side=1042, back=1036), A=13, lift=8, bob=4.0, rock=1.8, over=12),
}
SWING = ('quarter', 'side')       # legs swing from the hip; front and back: they step (lift in turn, shortening)
WALK_N, FRAME, FEET = 8, 320, (160, 300)


# The player's troops wear the raider's rig, re-skinned: its purples, pinks and reds (helmet, visor, blade, boots) and
# its cyan blade turned to the troop's colour, its near-black jacket tinted; skin left alone. Hues are OpenCV's (0-180).
SKINS = {
    'trooper': dict(base='raider', hue=(88, 112), jacket=(110, 60), cyan=96, arms='blasters'),   # the Garrison: AEGIS blue, a cyan visor, laser pistols
    'merc':    dict(base='raider', hue=(8, 22), jacket=(18, 70), cyan=14),       # the Drop Squad: orange
    # the Garage's mechanics, each in the colours of his figure in the garage painting (art/garage/reference.png), with
    # his tool: palette parts -> (hue, saturation, brightness x) (OpenCV hues, 0-180; red is 0)
    'garage_drill':  dict(base='raider', arms='drill', palette=dict(helmet=(10, 22, 0.9), visor=(4, 225, 1.0), trim=(0, 200, 1.0), suit=(10, 30, 1.0))),
    'garage_rivet':  dict(base='raider', arms='rivet', palette=dict(helmet=(0, 195, 0.95), visor=(104, 28, 0.98), trim=(0, 200, 1.0), suit=(10, 30, 1.0))),
    'garage_wrench': dict(base='raider', arms='wrench', palette=dict(helmet=(10, 16, 0.62), visor=(0, 230, 1.0), trim=(0, 200, 1.0), suit=(0, 120, 0.95))),
}


# The Garrison's troopers carry laser pistols instead of the raider's two blades. Each blade is cut away (BLADES: a
# polygon round it, sheet px; the hand and anything skin-coloured stays), the new edge inked, and a pistol drawn in
# the sheet's style (thick black outline, flat gunmetal, a glowing cell) in each hand (PISTOLS: the hand, sheet px, and
# where the barrel points, degrees: 0 right, -90 up). Drawn before the reskin, so the gunmetal takes the troop's tint.
BLADES = {
    'front':   [[(190, 396), (230, 397), (272, 468), (263, 482), (250, 490), (240, 493), (190, 440)],
                [(474, 400), (510, 400), (510, 440), (462, 492), (452, 492), (437, 482), (434, 470)]],
    'quarter': [[(648, 396), (688, 397), (730, 468), (721, 482), (708, 490), (698, 493), (648, 440)],
                [(914, 400), (950, 400), (950, 440), (902, 492), (892, 492), (877, 482), (874, 470)]],
    'side':    [[(1290, 468), (1350, 392), (1378, 392), (1378, 424), (1316, 490), (1294, 490)]],
    'back':    [[(1584, 396), (1624, 397), (1666, 468), (1657, 482), (1644, 490), (1634, 493), (1584, 440)],
                [(1860, 400), (1896, 400), (1896, 440), (1848, 492), (1838, 492), (1823, 482), (1820, 470)]],
}
PISTOLS = {
    'front':   [((268, 488), -125), ((431, 488), -55)],
    'quarter': [((726, 491), -125), ((871, 486), -12)],
    'side':    [((1277, 488), -8)],
    'back':    [((1662, 488), -125), ((1817, 483), -55)],
}


def pistol(angle):
    """A laser pistol as straight BGRA float on a 160 px canvas, its grip at the centre, the barrel pointing at angle
    (degrees, image coordinates). Pointing left, it is mirrored top to bottom so the grip still hangs below."""
    n, o = 160, 80
    P = lambda pts: np.array([(o + x, o + y) for x, y in pts], np.int32)
    body = P([(-12, -25), (34, -25), (40, -20), (40, -9), (-12, -9)])
    barrel = P([(40, -21), (52, -21), (52, -13), (40, -13)])
    tip = P([(52, -24), (58, -24), (58, -10), (52, -10)])
    grip = P([(-10, -10), (5, -10), (2, 9), (-13, 7)])
    guard = P([(5, -10), (15, -10), (13, -2), (5, -2)])
    cell = P([(2, -21), (30, -21), (30, -15), (2, -15)])
    top = P([(-10, -24), (33, -24), (36, -21), (-10, -21)])
    c = np.zeros((n, n, 3), np.uint8); a = np.zeros((n, n), np.uint8)
    for poly in (body, barrel, tip, grip, guard):   # the outline: everything, thick and black
        cv2.fillPoly(a, [poly], 255); cv2.polylines(a, [poly], True, 255, 9)
    cv2.fillPoly(c, [grip], (52, 48, 46)); cv2.fillPoly(c, [body], (66, 60, 58)); cv2.fillPoly(c, [barrel], (44, 40, 40))
    cv2.fillPoly(c, [top], (128, 122, 118))                         # the light along the top of the slide
    cv2.fillPoly(c, [cell], (255, 236, 70)); cv2.fillPoly(c, [tip], (255, 246, 160))   # the glowing cell and emitter
    cv2.line(c, (o + 4, o - 18), (o + 28, o - 18), (255, 255, 235), 2)
    for poly in (body, barrel, tip, grip, guard): cv2.polylines(c, [poly], True, (10, 10, 14), 4)
    cv2.fillPoly(c, [P([(7, -8), (12, -8), (11, -4), (7, -4)])], (10, 10, 14))   # through the trigger guard
    if np.cos(np.radians(angle)) < 0: c, a = c[::-1].copy(), a[::-1].copy()   # mirrored, so the turn leaves the grip below
    M = cv2.getRotationMatrix2D((o, o), -angle, 1.0)
    c = cv2.warpAffine(c, M, (n, n), flags=cv2.INTER_LINEAR); a = cv2.warpAffine(a, M, (n, n), flags=cv2.INTER_LINEAR)
    return np.dstack([c.astype(np.float32), a.astype(np.float32) / 255])


def unblade(c, a, view, x0, y0):
    """The raider's blades cut away (in a crop at (x0, y0) of the sheet); returns the crop, its alpha and the alpha before."""
    c, a = c.copy(), a.copy()
    h, w = a.shape
    hsv = cv2.cvtColor(np.clip(c, 0, 255).astype(np.uint8), cv2.COLOR_BGR2HSV)
    skinpx = ((hsv[..., 0] <= 22) & (hsv[..., 1] < 170) & (hsv[..., 2] > 120)).astype(np.uint8)
    zone = np.zeros((h, w), np.uint8)
    for poly in BLADES[view]: cv2.fillPoly(zone, [np.array(poly, np.int32) - [x0, y0]], 1)
    zone &= 1 - cv2.dilate(skinpx, np.ones((5, 5), np.uint8))
    a0 = a.copy()
    a[zone > 0] = 0
    n, lbl, st, _ = cv2.connectedComponentsWithStats((a > 0.02).astype(np.uint8), connectivity=8)   # the blades' loose ends
    if n > 2:
        big = 1 + np.argmax(st[1:, 4])
        a[np.isin(lbl, [k for k in range(1, n) if st[k, 4] < 0.04 * st[big, 4]])] = 0
    # ink the new edge, where the cut opened the body
    solid = (a > 0.5).astype(np.uint8)
    edge = solid - cv2.erode(solid, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    edge &= cv2.dilate(zone, np.ones((9, 9), np.uint8))
    c[edge > 0] = (12, 12, 16)
    return c, a, a0, skinpx


def hold(c, a, a0, skinpx, x0, y0, grips, draw):
    """Paste a tool (draw(angle) -> BGRA float, its grip at the centre) into each hand of grips [((x, y), angle)], then
    the hand (skinpx: the skin, found before any recolour) back over its grip."""
    c, a = c.copy(), a.copy()
    h, w = a.shape
    for (hx, hy), ang in grips:
        g = draw(ang); n = g.shape[0]; px, py = hx - x0 - n // 2, hy - y0 - n // 2
        ya, yb, xa, xb = max(0, py), min(h, py + n), max(0, px), min(w, px + n)
        gg = g[ya - py:yb - py, xa - px:xb - px]; ga = gg[..., 3:4]
        c[ya:yb, xa:xb] = c[ya:yb, xa:xb] * (1 - ga) + gg[..., :3] * ga
        a[ya:yb, xa:xb] = np.maximum(a[ya:yb, xa:xb], ga[..., 0])
        hand = np.zeros((h, w), np.uint8); cv2.circle(hand, (hx - x0, hy - y0), 13, 1, -1)
        hand &= skinpx
        hand = cv2.dilate(hand, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))) & (a0 > 0.5)
        c[hand > 0] = np.where(skinpx[hand > 0][:, None] > 0, c[hand > 0], np.float32([12, 12, 16]))
    return c, a


def blasters(c, a, view, x0, y0):
    """The raider's blades swapped for laser pistols."""
    c, a, a0, skinpx = unblade(c, a, view, x0, y0)
    return hold(c, a, a0, skinpx, x0, y0, PISTOLS[view], pistol)


# The mechanics' tools, in the same style as the pistols (and the sheet: flat colours, a light band, thick black
# outline), each held in one hand: in the side and three-quarter views the front hand, from the front and the back the
# right-hand one. Drawn after the recolour, so they keep their own colours: grey metal, as in the painting, with red
# bands and grips.
RED, RED_HI, STEEL, STEEL_HI, GUN, GUN_HI, DARK, BLACK = ((40, 44, 196), (92, 98, 240), (196, 192, 188), (238, 236, 232),
                                                          (112, 106, 104), (160, 154, 150), (58, 54, 54), (10, 10, 14))
TOOL_GRIPS = {   # (hand, angle) per view, for a tool held out level (drill, rivet gun) or raised (wrench)
    'level':  dict(front=[((431, 488), -55)], quarter=[((871, 486), -12)], side=[((1277, 488), -8)], back=[((1817, 483), -55)]),
    'raised': dict(front=[((431, 488), -70)], quarter=[((871, 486), -45)], side=[((1277, 488), -42)], back=[((1817, 483), -70)]),
}


TOOL_SCALE = 1.2


def tool(shapes, angle, n=220):
    """Draw shapes [(polygon in tool coordinates: grip at 0,0, pointing +x), BGR fill, or None for a line set] on an n px
    canvas, outlined, and turn it to angle like pistol()."""
    o = n // 2
    P = lambda pts: np.array([(o + x * TOOL_SCALE, o + y * TOOL_SCALE) for x, y in pts], np.int32)
    c = np.zeros((n, n, 3), np.uint8); a = np.zeros((n, n), np.uint8)
    for poly, col in shapes:
        if col is None: continue
        cv2.fillPoly(a, [P(poly)], 255); cv2.polylines(a, [P(poly)], True, 255, 9)
    c[a > 0] = BLACK   # the thick outline round the silhouette; thin lines between the parts
    for poly, col in shapes:
        if col is not None: cv2.fillPoly(c, [P(poly)], col)
    for poly, col in shapes:
        if col is None:   # detail lines
            for l in poly: cv2.line(c, tuple(int(v) for v in P([l[0]])[0]), tuple(int(v) for v in P([l[1]])[0]), (60, 58, 58), 2)
        else: cv2.polylines(c, [P(poly)], True, BLACK, 2)
    if np.cos(np.radians(angle)) < 0: c, a = c[::-1].copy(), a[::-1].copy()
    M = cv2.getRotationMatrix2D((o, o), -angle, 1.0)
    c = cv2.warpAffine(c, M, (n, n), flags=cv2.INTER_LINEAR); a = cv2.warpAffine(a, M, (n, n), flags=cv2.INTER_LINEAR)
    return np.dstack([c.astype(np.float32), a.astype(np.float32) / 255])


def drill(angle):
    bit = [(36, -27), (76, -17), (36, -7)]
    spiral = [((44 + 10 * k, -25 + 2.2 * k), (49 + 10 * k, -9 - 2.2 * k)) for k in range(3)]
    return tool([
        ([(-10, -8), (6, -8), (3, 11), (-13, 9)], DARK),                       # the grip
        ([(-24, -33), (26, -33), (30, -29), (30, -5), (-24, -5)], GUN),        # the motor housing
        ([(-22, -32), (26, -32), (28, -28), (-22, -28)], GUN_HI),              # its light band
        ([(4, -33), (14, -33), (14, -5), (4, -5)], RED),                       # a red band
        ([(-18, -24), (-6, -24), (-6, -12), (-18, -12)], DARK),                # the vents
        ([(30, -26), (38, -26), (38, -8), (30, -8)], STEEL),                   # the chuck
        (bit, STEEL),                                                          # the bit
        ([(38, -25), (70, -18), (38, -20)], STEEL_HI),
        (spiral, None),
        ([((-15, -21), (-9, -21)), ((-15, -16), (-9, -16))], None),          # the vents' slots
    ], angle)


def rivet(angle):
    return tool([
        ([(-10, -10), (5, -10), (2, 10), (-13, 8)], DARK),                     # the grip
        ([(-14, -28), (36, -28), (40, -23), (40, -8), (-14, -8)], GUN),        # the body
        ([(-12, -27), (35, -27), (38, -24), (-12, -24)], GUN_HI),
        ([(-14, -18), (40, -18), (40, -13), (-14, -13)], RED),                 # a red stripe
        ([(2, -40), (24, -40), (24, -28), (2, -28)], STEEL),                   # the rivet magazine
        ([(40, -22), (52, -20), (52, -12), (40, -10)], STEEL),                 # the nose
        ([(52, -19), (58, -19), (58, -13), (52, -13)], STEEL_HI),              # a rivet
        ([((7, -40), (7, -28)), ((13, -40), (13, -28)), ((19, -40), (19, -28))], None),
        ([(5, -10), (15, -10), (13, -2), (5, -2)], DARK),                      # the trigger guard
    ], angle)


def wrench(angle):
    head = [(54, -16), (66, -20), (78, -14), (80, -8), (70, -8), (66, -4), (70, 0), (80, 0), (78, 6), (66, 12), (54, 8), (50, -4)]
    return tool([
        ([(-12, -6), (52, -6), (52, 4), (-12, 4)], STEEL),                     # the handle
        ([(-10, -5), (50, -5), (50, -2), (-10, -2)], STEEL_HI),
        (head, STEEL),                                                         # the open jaw
        ([(-16, -8), (10, -8), (10, 6), (-16, 6)], RED),                       # the rubber grip
    ], angle)


TOOLS = {'drill': (drill, 'level'), 'rivet': (rivet, 'level'), 'wrench': (wrench, 'raised')}


def mechskin(c, pal):
    """Recolour the raider's rig by part (helmet, visor and its lights, trim and boots, suit), keeping each pixel's
    shading; the ink and the skin stay."""
    hsv = cv2.cvtColor(np.clip(c, 0, 255).astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32)
    h, sat, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    skin_px = (h <= 22) & (sat < 170) & (v > 120)
    ink = v < 55
    free = ~skin_px & ~ink
    shine = (sat < 70) & (v > 215)   # the visor's glints: plain white
    sat = np.where(shine, 0, sat); free &= ~shine
    visor = free & (sat > 170) & (v > 140)
    trim = free & (sat > 150) & ~visor
    helmet = free & (v > 110) & ~visor & ~trim
    suit = free & ~visor & ~trim & ~helmet
    for part, m in (('helmet', helmet), ('visor', visor), ('trim', trim), ('suit', suit)):
        th, ts, tv = pal[part]
        h = np.where(m, th, h); sat = np.where(m, ts, sat); v = np.where(m, np.clip(v * tv, 0, 255), v)
    return cv2.cvtColor(np.dstack([h, sat, v]).astype(np.uint8), cv2.COLOR_HSV2BGR).astype(np.float32)


def reskin(c, skin):
    """Recolour a BGR float crop for a troop skin."""
    k = SKINS[skin]
    if 'palette' in k: return mechskin(c, k['palette'])
    hsv = cv2.cvtColor(np.clip(c, 0, 255).astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32)
    h, sat, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    skin_px = (h <= 22) & (sat < 170) & (v > 120)
    warm = ((h >= 118) | (h <= 8)) & (sat > 60) & ~skin_px                 # purple through pink to red
    t = np.where(h >= 118, (h - 118) / 62, 1.0)                              # along that run: 0 purple .. 1 red
    lo, hi = k['hue']
    h2 = np.where(warm, hi - (hi - lo) * t, h)                               # purple -> the deep end, red -> the bright end
    cyan = (h >= 80) & (h <= 100) & (sat > 60)
    h2 = np.where(cyan, k['cyan'], h2)
    dark = (sat <= 60) & (v < 110) & ~skin_px                                # the jacket and pants
    jh, js = k['jacket']
    h2 = np.where(dark, jh, h2); sat = np.where(dark, np.maximum(sat, js), sat)
    out = cv2.cvtColor(np.dstack([h2, sat, v]).astype(np.uint8), cv2.COLOR_HSV2BGR).astype(np.float32)
    return out


# ---------------------------------------------------------------- the grade: fit the characters to the map
# The map (prototype/assets/map.webp) is a soft, grainy painting in a warm dusk light: greys tinted warm, shadows leaning
# violet, highlights orange, its ink a warm near-black. The sheet is clean and flat with pure black lines and cool greys.
# grade() moves a figure's crop into the map's look, before it is rigged (so the texture moves with the body):
# its light (a warm key from the upper left, violet in the shadow), its colour (calmer chroma, softer highlights), its
# lines, the map's own painted grain over it, grime, and road dust on its feet. GRADE=0 turns it off.
GRADE = 1.0
MAP = cv2.imread(os.path.join(ROOT, 'prototype', 'assets', 'map.webp'))
_MAPDET = None


def map_grain(h, w, seed):
    """The map's fine painted detail (it minus its blur), from its sand, tiled over (h, w) in soft patches."""
    global _MAPDET
    if _MAPDET is None:
        m = MAP.astype(np.float32); _MAPDET = m - cv2.GaussianBlur(m, (0, 0), 2.5)
    r = np.random.default_rng(seed); p = 48
    out = np.zeros((h, w, 3), np.float32); ws = np.zeros((h, w, 1), np.float32)
    win = cv2.getGaussianKernel(p, p / 3.5); win = (win @ win.T)[..., None].astype(np.float32)
    for y in range(-p // 2, h, p // 3):
        for x in range(-p // 2, w, p // 3):
            sx, sy = int(r.integers(560, 1200 - p)), int(r.integers(600, 900 - p))   # the plaza and road sand
            pt = _MAPDET[sy:sy + p, sx:sx + p]
            a0, b0, a1, b1 = max(0, y), max(0, x), min(h, y + p), min(w, x + p)
            out[a0:a1, b0:b1] += pt[a0 - y:a1 - y, b0 - x:b1 - x] * win[a0 - y:a1 - y, b0 - x:b1 - x]
            ws[a0:a1, b0:b1] += win[a0 - y:a1 - y, b0 - x:b1 - x]
    return out / np.maximum(ws, 1e-3) * 1.7


def grade(c, a, seed=0):
    """Grade a BGR float crop (alpha a) into the map's look."""
    if not GRADE: return c
    h, w = a.shape
    lab = cv2.cvtColor(np.clip(c, 0, 255).astype(np.uint8), cv2.COLOR_BGR2LAB).astype(np.float32)
    L, A, B = lab[..., 0], lab[..., 1] - 128, lab[..., 2] - 128
    chroma = np.hypot(A, B)
    neon = np.clip((chroma - 35) / 20, 0, 1) * np.clip((L - 90) / 40, 0, 1)   # glowing blades, visors, eyes: keep them bright
    ink = np.clip((50 - L) / 20, 0, 1)
    # the figure's own coordinates: 0 at its top/left to 1 at its bottom/right
    ys, xs = np.nonzero(a > 0.3)
    ty = np.clip((np.arange(h)[:, None] - ys.min()) / max(1, np.ptp(ys)), 0, 1)
    tx = np.clip((np.arange(w)[None, :] - xs.min()) / max(1, np.ptp(xs)), 0, 1)
    light = 1 - 0.65 * ty - 0.35 * tx                                        # the key light from the upper left
    # colour: calmer chroma, warm greys, softer highlights
    k = 1 - 0.22 * (1 - neon)
    A, B = A * k, B * k
    hi = np.clip((L - 95) / 110, 0, 1); lo = 1 - np.clip((L - 25) / 85, 0, 1)
    shade = np.clip(0.6 - light, 0, 1) / 0.6                                 # the side turned away from the light
    A = A + (4 + 4 * hi + 6 * lo + 5 * shade) * (1 - neon)                   # warm overall, violet in the shadow
    B = B + (2 + 12 * hi - 8 * lo - 9 * shade) * (1 - neon)                  # orange in the light, blue-violet in the shadow
    L = L * (1 - 0.1 * (1 - neon)) + 4                                       # highlights down a notch, blacks up a touch
    L = L + (light - 0.45) * 22 * (1 - neon)                                 # shaded from the upper left
    # the lines: a warm near-black
    L = L * (1 - ink) + 12 * ink; A = A * (1 - ink) + 3 * ink; B = B * (1 - ink) + 5 * ink
    out = cv2.cvtColor(np.clip(np.dstack([L, A + 128, B + 128]), 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR).astype(np.float32)
    # grime: soft dark patches, more low down; road dust on the feet and legs
    r = np.random.default_rng(seed + 7)
    n = cv2.resize(r.standard_normal((h // 10 + 2, w // 10 + 2)).astype(np.float32), (w, h), interpolation=cv2.INTER_CUBIC)
    grime = np.clip(n * 0.5 + 0.2, 0, 1) * (0.35 + 0.65 * ty) * (1 - neon) * (1 - ink)
    out *= (1 - 0.18 * grime)[..., None]
    dust = np.clip((ty - 0.72) / 0.28, 0, 1) ** 1.5 * (1 - neon) * (1 - ink * 0.6)
    out = out * (1 - 0.35 * dust[..., None]) + np.float32([118, 150, 182]) * 0.35 * dust[..., None]   # the road's sand (BGR)
    # the painting's grain, and a warm rim of key light on the upper-left edges
    out += map_grain(h, w, seed) * (1 - neon * 0.7)[..., None] * (1 - ink * 0.5)[..., None]
    sh = np.zeros_like(a); sh[3:, 3:] = a[:-3, :-3]                          # the figure moved down-right
    rim = np.clip(a - sh, 0, 1) * (1 - ink) * (1 - neon)
    rim = cv2.GaussianBlur(rim, (0, 0), 0.8)
    out = out * (1 - 0.4 * rim[..., None]) + np.float32([110, 190, 255]) * 0.4 * rim[..., None]
    # the game's cel-shaded look (art/cel/celshade.py); 1 map px is about 7 of the sheet's px. The sheet is already
    # inked, so no extra outline.
    out = cel(out, alpha=a, px=7.0, outline=False, detail=0.85, seed=seed)
    return np.clip(out, 0, 255)


def pieces(enemy, view, skin=None):
    """The figure split into its body and legs, in its own crop (facing right): premultiplied float RGBA pieces, each
    leg with its pivot (top centre at the hip) and its phase, plus the feet's anchor."""
    x0, y0, x1, y1, ground = box(enemy, view)
    a = cut(enemy, view)[y0:y1, x0:x1]
    c = src[y0:y1, x0:x1].astype(np.float32)
    arms = skin and SKINS[skin].get('arms')
    if arms == 'blasters': c, a = blasters(c, a, view, x0, y0)
    if arms in TOOLS: c, a, a0, skinpx = unblade(c, a, view, x0, y0)
    if skin: c = reskin(c, skin)
    if arms in TOOLS:   # a mechanic's tool, after the recolour (it keeps its own colours)
        draw, grip = TOOLS[arms]
        c, a = hold(c, a, a0, skinpx, x0, y0, TOOL_GRIPS[grip][view], draw)
    if FIG[enemy].get('faces', {}).get(view, 1) < 0:
        a, c = a[:, ::-1].copy(), c[:, ::-1].copy()
    c = grade(c, a, seed=zlib.crc32(f"{enemy}{view}".encode()) % 1000)   # after the flip: the light comes from the upper left in every view
    r = RIG[enemy]; hip = r['hip'][view] - y0; g = ground - y0
    flip = FIG[enemy].get('faces', {}).get(view, 1) < 0
    rng = sorted([(x1 - 1 - xb, x1 - 1 - xa) if flip else (xa - x0, xb - x0) for xa, xb in leg_ranges(enemy, view, None, None, cached=True)])
    rgba = lambda al: np.dstack([c * al[..., None], al])
    legs, used = [], np.zeros_like(a)
    for i, (xa, xb) in enumerate(rng):
        lo = max(0, xa - 7, (rng[i - 1][1] + xa) // 2 + 1 if i else 0)
        hi = min(a.shape[1], xb + 8, (rng[i + 1][0] + xb) // 2 if i + 1 < len(rng) else a.shape[1])
        m = np.zeros_like(a); m[hip:, lo:hi] = 1
        top = np.zeros_like(a); top[max(0, hip - r['over']):hip, xa:xb + 1] = 1
        used = np.maximum(used, m * a)
        rows = np.nonzero((m * a).max(1) > 0.3)[0]
        legs.append(dict(img=rgba(np.maximum(m, top) * a), pivot=((xa + xb) / 2, hip), length=(rows.max() - hip) if len(rows) else 10))
    n = len(legs)
    if view in SWING:
        ph = [0, np.pi, np.pi, 0][:n] if n == 4 else [np.pi * (i % 2) for i in range(n)]
    else:
        ph = [np.pi * (i % 2) for i in range(n)]
    for leg, p in zip(legs, ph): leg['phase'] = p
    if view == 'side' and (enemy == 'scout' or n == 1):   # the far legs, hidden behind the near ones: copies, darker, half a stride out
        far = []
        for leg in legs:
            f = dict(leg); im = leg['img'].copy(); im[..., :3] *= 0.55
            f['img'] = im; f['phase'] = leg['phase'] + np.pi; f['far'] = True
            f['pivot'] = (leg['pivot'][0] - 3, leg['pivot'][1] - 1.5)
            far.append(f)
        legs = far + legs
    body = rgba(a * (1 - used))
    fx = np.mean([l['pivot'][0] for l in legs]) if legs else a.shape[1] / 2
    return dict(body=body, legs=legs, anchor=(fx, g), hip=hip, shape=a.shape)


def affine(rot, pivot, dx=0, dy=0, sy=1.0):
    """About pivot: scale y by sy, rotate by rot degrees (positive swings the bottom forward, to the right), move (dx, dy)."""
    t = np.radians(rot); c, s = np.cos(t), np.sin(t)
    R = np.array([[c, s], [-s, c]]) @ np.diag([1, sy])
    px, py = pivot
    return np.hstack([R, (np.array([px + dx, py + dy]) - R @ np.array([px, py]))[:, None]])


def compose(*Ms):
    out = np.eye(3)
    for M in Ms: out = out @ np.vstack([M, [0, 0, 1]])
    return out[:2]


def pose(P, enemy, view, p, attack=None):
    """The figure at walk phase p (radians), or an attack pose: a list of (piece image, affine) back to front."""
    r = RIG[enemy]; out = []
    swing = view in SWING
    A = r['A'] * (1 if view == 'side' else 0.75)
    hipc = (P['anchor'][0], P['hip'])
    for leg in P['legs']:
        q = p + leg['phase']
        if attack is not None:   # planted wide: the front leg forward, the back one back
            out.append((leg['img'], affine(A * 0.55 * (1 if np.cos(leg['phase']) > 0 else -1), leg['pivot'])))
        elif swing:
            lift = r['lift'] * max(0.0, np.cos(q))
            out.append((leg['img'], affine(A * np.sin(q), leg['pivot'], dy=-lift)))
        else:
            k = max(0.0, np.sin(q))
            sy = 1 - min(0.45, 0.7 * r['lift'] * k / max(leg['length'], 1))
            out.append((leg['img'], affine(0, leg['pivot'], dy=-0.35 * r['lift'] * k, sy=sy)))
    if attack is not None:
        body = affine(0, hipc)
    elif swing:
        body = affine(1.5 * np.sin(2 * p), hipc, dy=-r['bob'] * abs(np.cos(p)))
    else:
        body = affine(-r['rock'] * np.sin(p), hipc, dy=-r['bob'] * abs(np.sin(p)))
    out.append((P['body'], body))
    if attack is not None:   # the whole figure leans about its feet
        rot, dx = attack
        lean = affine(-rot, P['anchor'], dx=dx)
        out = [(im, compose(lean, M)) for im, M in out]
    return out


def render(P, layers, scale, size=FRAME):
    """Draw posed pieces into a frame: the feet's anchor at FEET, scaled. Returns straight RGBA uint8."""
    G = np.array([[scale, 0, FEET[0] - scale * P['anchor'][0]], [0, scale, FEET[1] - scale * P['anchor'][1]]])
    acc = np.zeros((size, size, 4), np.float32)
    for im, M in layers:
        f = cv2.warpAffine(im, compose(G, M), (size, size), flags=cv2.INTER_AREA if scale < 1 else cv2.INTER_LINEAR)
        acc = f + acc * (1 - f[..., 3:4])
    al = acc[..., 3:4]
    rgb = np.where(al > 1e-3, acc[..., :3] / np.maximum(al, 1e-3), 0)
    return np.dstack([rgb, al * 255]).clip(0, 255).astype(np.uint8)


ATTACK = [(-7, -4), (9, 7)]   # wind-up (leaning back), the hit (lunging forward): (degrees, frame px)


def strip(enemy, scale, skin=None):
    """The enemy's sheet: one row per view (front, quarter, side, back), WALK_N walk frames then 2 attack frames."""
    rows = []
    for v in VIEWS:
        P = pieces(enemy, v, skin)
        fr = [render(P, pose(P, enemy, v, 2 * np.pi * i / WALK_N), scale) for i in range(WALK_N)]
        Pa = pieces(enemy, 'side', skin) if v != 'side' else P
        fr += [render(Pa, pose(Pa, enemy, 'side', 0, attack=(rot, dx / scale)), scale) for rot, dx in ATTACK]
        rows.append(cv2.hconcat(fr))
    return cv2.vconcat(rows)


def fit(enemy, skin=None):
    """The largest scale (at most 1) at which no frame of the enemy is cut off at the frame's edge."""
    s = 1.0
    while True:
        st = strip(enemy, s, skin)
        a = st[..., 3]
        clipped = False
        for i in range(a.shape[1] // FRAME):
            for j in range(a.shape[0] // FRAME):
                f = a[j * FRAME:(j + 1) * FRAME, i * FRAME:(i + 1) * FRAME]
                if max(f[:, :3].max(), f[:, -3:].max(), f[:3].max()) > 10: clipped = True
        if not clipped: return s, st
        s *= 0.95


if __name__ == '__main__' and 'check' in sys.argv:
    # every figure over magenta (what was cut away), on a grid of sheet coordinates
    out = src.astype(np.float32).copy()
    tint = out * 0.35 + np.array([255, 0, 255]) * 0.65
    a = np.zeros((H, W), np.float32)
    for e in FIG:
        for v in VIEWS: a = np.maximum(a, cut(e, v))
    v = (out * a[..., None] + tint * (1 - a[..., None])).astype(np.uint8)
    for x in range(0, W, 20): cv2.line(v, (x, 0), (x, H), (0, 160, 160) if x % 100 == 0 else (0, 70, 70), 1)
    for y in range(0, H, 20): cv2.line(v, (0, y), (W, y), (0, 160, 160) if y % 100 == 0 else (0, 70, 70), 1)
    cv2.imwrite(sys.argv[2], v)


if __name__ == '__main__' and 'sheet' in sys.argv:
    # every cut-out on a plain sand background, in the sheet's layout
    tiles = []
    for e in FIG:
        row = []
        for v in VIEWS:
            x0, y0, x1, y1, g = box(e, v)
            a = cut(e, v)[y0:y1, x0:x1, None]
            bg = np.full((y1 - y0, x1 - x0, 3), (90, 150, 200), np.float32)
            row.append(cv2.resize((bg * (1 - a) + src[y0:y1, x0:x1] * a).astype(np.uint8), (360, 300)))
        tiles.append(cv2.hconcat(row))
    cv2.imwrite(sys.argv[2], cv2.vconcat(tiles))


if __name__ == '__main__' and 'legs' in sys.argv:
    for e in FIG:
        for v in VIEWS:
            P = pieces(e, v)
            print(e, v, 'legs', len(P['legs']), [(round(l['pivot'][0]), round(l['pivot'][1]), round(l['length']), round(l['phase'], 2)) for l in P['legs']])


OUT_PX = 192   # the frames are drawn at 320 px and saved at this size: sharp at the closest zoom (a 29 px raider
#                is ~100 screen px there; 192 px frames give it 115), and small enough to draw fast


if __name__ == '__main__' and len(sys.argv) == 1:
    review = []
    for name in list(FIG) + list(SKINS):
        base, skin = (SKINS[name]['base'], name) if name in SKINS else (name, None)
        s, st = fit(base, skin)
        tallest = 0
        for j in range(len(VIEWS)):
            a = st[j * FRAME:(j + 1) * FRAME, :FRAME, 3]
            ys = np.nonzero(a.max(1) > 40)[0]; tallest = max(tallest, FEET[1] - ys.min())
        out = cv2.resize(st, None, fx=OUT_PX / FRAME, fy=OUT_PX / FRAME, interpolation=cv2.INTER_AREA)
        path = os.path.join(UNITS, name + '.webp')
        cv2.imwrite(path, out, [cv2.IMWRITE_WEBP_QUALITY, 75])
        print(f'ok {name}: scale {s:.3f}, sh {tallest / 2:.0f} (game.html SHEETS.{name}.sh), {os.path.getsize(path) // 1024} KB')
        bg = np.full(st.shape[:2] + (3,), (52, 44, 40), np.float32); al = st[..., 3:4] / 255
        review.append(cv2.resize((bg * (1 - al) + st[..., :3] * al).astype(np.uint8), None, fx=0.18, fy=0.18, interpolation=cv2.INTER_AREA))
    cv2.imwrite(os.path.join(HERE, 'review.jpg'), cv2.vconcat(review), [cv2.IMWRITE_JPEG_QUALITY, 85])
