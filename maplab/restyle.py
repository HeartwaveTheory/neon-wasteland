"""Restyle the reference map into the Neon Wasteland base layer.

Borderlands: cel-shaded colour bands, bold dark ink lines on real forms (rocks,
cliffs, trees, fences, buildings), hand hatching in the shadow sides, sun-baked
ochre / rust palette. Cyberpunk: a dusk grade (warm key light from the upper
left, violet-indigo shadows) so the neon overlays pop, while the land stays
bright enough to read on a phone. Roads and sand stay clean and flat; the road
is the brightest surface on the map. Output is 2x the reference (3344 x 1882).

    ../venv/bin/python restyle.py            -> out/base.png (+ out/base-1x.png)
    RESTYLE_DEBUG=dir ../venv/bin/python restyle.py   also dumps the masks there
"""
import os
import time
import numpy as np
import cv2

SRC = 'ref/map.webp'
OUT = os.environ.get('RESTYLE_OUT', 'out/base.png')
S = 2  # working scale
DBG = os.environ.get('RESTYLE_DEBUG')
INK = np.array([0x0e, 0x14, 0x1a], np.float32) / 255.0  # BGR of P.ink #1a140e


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def blur(x, s):
    return cv2.GaussianBlur(x, (0, 0), s)


def to_lab(bgr_u8):
    """float Lab: L 0..100, a/b roughly -100..100."""
    return cv2.cvtColor(bgr_u8.astype(np.float32) / 255.0, cv2.COLOR_BGR2LAB)


def hex_lab(hx):
    r, g, b = int(hx[1:3], 16), int(hx[3:5], 16), int(hx[5:7], 16)
    return cv2.cvtColor(np.array([[[b, g, r]]], np.float32) / 255.0, cv2.COLOR_BGR2LAB)[0, 0]


def ramp(t, stops):
    """Gradient map: stops = [(t, '#hex'), ...] interpolated in Lab. Returns L, a, b."""
    ts = [s[0] for s in stops]
    labs = np.array([hex_lab(s[1]) for s in stops])
    return [np.interp(t, ts, labs[:, i]).astype(np.float32) for i in range(3)]


def up(x, size):
    return cv2.resize(x, size, interpolation=cv2.INTER_CUBIC)


def dump(name, arr):
    if not DBG:
        return
    os.makedirs(DBG, exist_ok=True)
    a = arr
    if a.dtype != np.uint8:
        a = np.clip(a * 255, 0, 255).astype(np.uint8)
    cv2.imwrite(os.path.join(DBG, name + '.png'), a)


def area_filter(binary, min_area, min_extent=0):
    """Keep connected components with area >= min_area AND bbox extent >= min_extent."""
    n, lab, st, _ = cv2.connectedComponentsWithStats(binary.astype(np.uint8), connectivity=8)
    keep = st[:, cv2.CC_STAT_AREA] >= min_area
    if min_extent:
        keep &= np.maximum(st[:, cv2.CC_STAT_WIDTH], st[:, cv2.CC_STAT_HEIGHT]) >= min_extent
    keep[0] = False
    return keep[lab]


def stair(x, n, soft=0.12):
    """Cel bands: a staircase with anti-aliased risers (x in 0..1)."""
    y = x * n
    fl = np.floor(y)
    return (fl + smoothstep(1 - soft, 1.0, y - fl)) / n


def hatch_strokes(h, w, rng, angle=-55, density=1.0, length=(10, 22), width=2, levels=10):
    """Borderlands hatching like the tower kit's K.hatch: short parallel ink strokes
    scattered at random (about one per 140 px / density). Returns (coverage, tau):
    each stroke carries a random threshold tau, and shows where shade > tau, so the
    stroke density follows the shade and strokes clip crisply at the shadow edge."""
    n = int(w * h / 140 * density)
    a = np.deg2rad(angle)
    x = rng.uniform(-20, w + 20, n)
    y = rng.uniform(-20, h + 20, n)
    L = rng.uniform(length[0], length[1], n)
    aa = a + rng.normal(0, 0.05, n)
    x2, y2 = x + np.cos(aa) * L, y + np.sin(aa) * L
    lv = rng.integers(0, levels, n)
    seg = np.stack([x, y, x2, y2], 1).round().astype(np.int32).reshape(-1, 2, 2)
    cov = np.zeros((h, w), np.uint8)
    tau = np.zeros((h, w), np.uint8)
    for i in range(levels):
        lines = [l.reshape(-1, 1, 2) for l in seg[lv == i]]
        val = int(255 * (i + 0.5) / levels)
        cv2.polylines(tau, lines, False, val, width + 1, cv2.LINE_8)
        cv2.polylines(cov, lines, False, 255, width, cv2.LINE_AA)
    return cov.astype(np.float32) / 255.0, tau.astype(np.float32) / 255.0


def main():
    t0 = time.time()
    src = cv2.imread(SRC, cv2.IMREAD_COLOR)
    h, w = src.shape[:2]
    H, W = h * S, w * S
    size = (W, H)
    img = cv2.resize(src, (W, H), interpolation=cv2.INTER_LANCZOS4)

    # 0. Inpaint the areas the overlay layers replace (castle, old huts ...),
    #    so nothing of the old building peeks out around the new one. The fill is
    #    plain ground: a normalized-convolution blend of the nearby ground that
    #    favours sand / dirt pixels (no streaks, no dark smears from rocks), plus
    #    a Telea pass for the thin seams.
    erased = None
    if os.path.exists('out/erase-mask.png'):
        mask = cv2.imread('out/erase-mask.png', cv2.IMREAD_GRAYSCALE)
        if mask is not None and mask.shape[:2] == img.shape[:2] and mask.max() > 0:
            mask = (mask > 127).astype(np.uint8) * 255
            small = cv2.resize(img, (w, h), interpolation=cv2.INTER_AREA)
            msmall = cv2.dilate(cv2.resize(mask, (w, h), interpolation=cv2.INTER_NEAREST), np.ones((3, 3), np.uint8))
            known = (msmall == 0).astype(np.float32)
            lab0 = to_lab(small)
            sandy = smoothstep(40, 58, lab0[..., 0]) * smoothstep(8, 18, lab0[..., 2])
            wgt = known * (0.04 + sandy)
            sf = small.astype(np.float32)
            num = np.zeros_like(sf)
            den = np.zeros((h, w), np.float32)
            for sg in (3, 8, 20, 50, 120):
                num += blur(sf * wgt[..., None], sg) * sg
                den += blur(wgt, sg) * sg
            fill = num / np.maximum(den, 1e-6)[..., None]
            tel = cv2.inpaint(small, msmall, 4, cv2.INPAINT_TELEA).astype(np.float32)
            edge = known * 0 + (1 - smoothstep(2, 6, cv2.distanceTransform(255 - known.astype(np.uint8) * 255, cv2.DIST_L2, 3)))
            fill = fill * (1 - edge[..., None] * 0.5) + tel * edge[..., None] * 0.5
            fill = np.clip(fill, 0, 255).astype(np.uint8)
            filled = cv2.resize(fill, (w * S, h * S), interpolation=cv2.INTER_CUBIC)
            soft = cv2.GaussianBlur(mask.astype(np.float32) / 255.0, (0, 0), 3)[..., None]
            img = (img * (1 - soft) + filled * soft).astype(np.uint8)
            erased = soft[..., 0]

    # ------------------------------------------------------------------ analysis at 1x
    s1 = cv2.resize(img, (w, h), interpolation=cv2.INTER_AREA)
    # mean shift flattens the painting into facets that follow the forms (cel shapes)
    sm1 = cv2.pyrMeanShiftFiltering(cv2.bilateralFilter(s1, 5, 20, 3), 8, 14)
    lab1 = to_lab(sm1)
    L1, A1, B1 = lab1[..., 0], lab1[..., 1], lab1[..., 2]
    g1 = to_lab(s1)[..., 0]
    mu = blur(g1, 3)
    tex = np.sqrt(np.maximum(blur(g1 * g1, 3) - mu * mu, 0))  # flat ground is smooth

    # dirt / road: light, warm, smooth
    dirt = smoothstep(48, 58, L1) * smoothstep(12, 18, B1) * smoothstep(0, 4, A1) * (1 - smoothstep(10, 16, tex))
    dirt = cv2.morphologyEx(dirt, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    dirt = cv2.morphologyEx(dirt, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    # only the big connected sand areas (roads, clearings); light mossy rock tops are not road
    dirt = dirt * cv2.dilate(area_filter(dirt > 0.5, 1200).astype(np.uint8), np.ones((5, 5), np.uint8))
    # forms = things that get ink and hatching (anything that is not flat ground)
    form = 1 - dirt
    dump('m-dirt', dirt); dump('m-form', form)

    # ------------------------------------------------------------------ to 2x
    labF = to_lab(img)
    Lf = labF[..., 0]
    Ls, As, Bs = up(L1, size), up(A1, size), up(B1, size)
    form2 = np.clip(up(form, size), 0, 1)
    # crisp road edge: threshold the smoothed mask at 2x (anti-aliased)
    dirt2 = smoothstep(0.3, 0.44, blur(up(dirt, size), 2.5))
    Lb = blur(Ls, 1.5)

    # ------------------------------------------------------------------ tone + bands
    x = np.clip(Lb / 100.0, 0, 1)
    # lift: the reference is dark (median L ~33); a phone needs mids around 0.5
    tone = 1 - (1 - x) ** 1.9
    tone = 0.07 + 0.9 * tone
    band = stair(tone, 5, 0.14)
    Lland = 0.82 * band + 0.18 * tone
    # the road swallows the light dusty fringe next to it (no pale halo around the sand)
    near = cv2.dilate((dirt2 > 0.5).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)))
    fringe = near * smoothstep(0.7, 0.78, blur(tone, 2.0))
    dirt2 = np.maximum(dirt2, fringe)
    # pebbles inside the road are swept away (small holes filled), the outline is simplified
    holes = area_filter(dirt2 < 0.5, 2600)
    dirt2 = np.where(holes, dirt2, np.maximum(dirt2, 1.0))
    dirt2 = smoothstep(0.4, 0.6, blur(dirt2, 3.5))
    inside = (dirt2 > 0.5).astype(np.uint8)

    # ------------------------------------------------------------------ colour of the land
    Cs = np.hypot(As, Bs)
    hdeg = np.rad2deg(np.arctan2(Bs, As))
    # vegetation: greenish hues (pines, scrub) -> dry dusty olive around ~95 deg
    greenish = smoothstep(90, 104, hdeg) * (1 - smoothstep(190, 215, hdeg)) * smoothstep(2.0, 5.0, Cs)
    hdeg2 = hdeg - greenish * np.clip(hdeg - 96, 0, 80) * 0.85
    # dead / dry trees and scrub: low-frequency blobs turn olive to burnt rust
    rng = np.random.default_rng(5)
    nz = up(blur(rng.random((h // 12 + 1, w // 12 + 1)).astype(np.float32), 0.8), size)
    nz = (nz - nz.mean()) / (nz.std() + 1e-6)
    dead = smoothstep(1.05, 1.5, nz) * greenish
    hdeg2 = hdeg2 * (1 - dead) + 55 * dead
    hue2 = np.deg2rad(hdeg2)
    chroma_gain = 1.35 + 0.25 * smoothstep(0, 25, hdeg2) * (1 - smoothstep(60, 80, hdeg2))  # reds a bit more
    chroma_gain = chroma_gain + greenish * (0.9 + 0.5 * dead) * (1 - 0.6 * smoothstep(0.55, 0.8, band))
    Cn = Cs * chroma_gain
    A2 = Cn * np.cos(hue2)
    B2 = Cn * np.sin(hue2)
    # dusk gradient map for neutrals (rock): indigo crevices, violet shadow sides,
    # warm stone fronts, sunlit cream tops
    tl, ta, tb = ramp(band, [(0.0, '#33283f'), (0.2, '#5e4866'), (0.4, '#8f6e60'), (0.6, '#b4957a'),
                             (0.8, '#d8bb94'), (1.0, '#f2deb6')])
    # small dark specks (pebbles, needles) stay warm brown; only big shadows go violet
    _, wa, wb = ramp(band, [(0.0, '#3a2a28'), (0.2, '#6a4c40'), (0.4, '#8f6e60'), (1.0, '#f2deb6')])
    big = smoothstep(0.2, 0.55, blur(1 - smoothstep(0.3, 0.5, tone), 6.0))
    ta = ta * big + wa * (1 - big)
    tb = tb * big + wb * (1 - big)
    neutral = (1 - smoothstep(5, 18, Cs)) * (1 - greenish)
    k_t = 0.3 + 0.7 * neutral
    k_t = k_t * (1 - 0.6 * greenish * smoothstep(0.15, 0.35, band))  # lit foliage keeps its olive
    A2 = A2 * (1 - 0.5 * k_t) + ta * k_t
    B2 = B2 * (1 - 0.5 * k_t) + tb * k_t
    Lout = Lland * 100

    # ------------------------------------------------------------------ the road
    # road colour in three clean bands: cast shadow, dusty fringe, sunlit sand
    xr = blur(np.clip(Ls / 100.0, 0, 1), 3.0)
    sun = smoothstep(0.42, 0.47, xr)
    big_sh = area_filter((sun < 0.5) & (inside > 0), 3000)  # only big cast shadows, not pebbles
    sun = np.where(big_sh, sun, 1.0).astype(np.float32)
    sun = blur(sun, 1.0)
    dist = blur(cv2.distanceTransform(inside, cv2.DIST_L2, 3), 2.0)
    lip = 1 - smoothstep(9.0, 11.0, dist)  # an even, darker band along the road edge
    rt = sun * (1 - 0.5 * lip)
    rl, ra, rb = ramp(rt, [(0.0, '#a27c6c'), (0.5, '#e0b06e'), (1.0, '#f2cc8b')])
    # tyre ruts and dust: the reference's tracks as faint, darker ochre strokes
    bp = blur(Lf, 1.2) - blur(Lf, 5.0)
    rut = smoothstep(-2.5, -7.0, bp) * smoothstep(0.5, 0.9, rt)
    rl = rl - rut * 4
    rb = rb + rut * 1.5
    Lout = Lout * (1 - dirt2) + rl * dirt2
    A2 = A2 * (1 - dirt2) + ra * dirt2
    B2 = B2 * (1 - dirt2) + rb * dirt2
    # faint painted texture on the land
    detail = Lf - blur(Lf, 2.0)
    Lout = Lout + detail * 0.3 * (1 - dirt2)

    lab = np.stack([np.clip(Lout, 0, 100), A2, B2], -1).astype(np.float32)
    out = np.clip(cv2.cvtColor(lab, cv2.COLOR_LAB2BGR), 0, 1)

    # ------------------------------------------------------------------ ink
    G = Lb / 100.0
    d1 = blur(G, 1.3) - blur(G, 1.3 * 1.6)
    fine = np.clip(-d1 * 42 - 0.18, 0, 1)
    d2 = blur(G, 3.0) - blur(G, 3.0 * 1.8)
    bold = np.clip(-d2 * 18 - 0.25, 0, 1)
    dark = smoothstep(0.15, 0.07, blur(Lf / 100.0, 0.8))
    ink = np.maximum(np.maximum(fine, bold), dark)
    ink = ink * smoothstep(0.15, 0.5, form2) * (1 - dirt2)
    keep = area_filter(ink > 0.35, 80, 16)
    keep = cv2.dilate(keep.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
    ink = np.clip(ink * keep * 1.3, 0, 1)
    # bold silhouette where a dark form (rock, tree) meets the sand
    outd = cv2.distanceTransform(1 - inside, cv2.DIST_L2, 3)
    sil = (1 - smoothstep(2.0, 4.0, outd)) * (1 - smoothstep(0.42, 0.56, blur(tone, 1.5))) * (1 - inside)
    ink = np.maximum(ink, sil)
    dump('ink', ink)

    # ------------------------------------------------------------------ hatching
    hrng = np.random.default_rng(11)
    cov1, tau1 = hatch_strokes(H, W, hrng, -55, density=1.5)
    shade = (1 - smoothstep(0.36, 0.52, blur(tone, 2.5))) * smoothstep(0.2, 0.5, blur(form2, 2))
    shade = shade * (1 - dirt2)
    hatch = cov1 * (shade > 0.05 + tau1 * 0.9) * 0.6
    dump('hatch', hatch)

    out = out * (1 - hatch[..., None]) + INK * hatch[..., None]
    out = out * (1 - ink[..., None] * 0.95) + INK * ink[..., None] * 0.95

    # ------------------------------------------------------------------ dusk key light
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    gx, gy = xx / W, yy / H
    diag = gx * 0.55 + gy * 0.45
    key = 1.05 - 0.1 * diag
    out = out * key[..., None]
    warm = np.array([-0.02, 0.0, 0.03], np.float32)  # BGR: warmer upper-left
    out = out + warm * (1 - diag)[..., None] * 0.5 - warm * diag[..., None] * 0.4
    vig = 1 - 0.12 * smoothstep(0.62, 1.1, np.sqrt(((gx - 0.5) * 1.1) ** 2 + ((gy - 0.5) * 1.3) ** 2) * 1.3)
    out = out * vig[..., None]

    res = np.clip(out * 255 + 0.5, 0, 255).astype(np.uint8)
    # atomic writes: other processes may be reading the base while we work
    for path, data in ((OUT, res), (OUT.replace('.png', '-1x.png'), cv2.resize(res, (w, h), interpolation=cv2.INTER_AREA))):
        tmp = path.replace('.png', f'.{os.getpid()}.tmp.png')
        cv2.imwrite(tmp, data)
        os.replace(tmp, path)
    print('ok', OUT, res.shape, f'{time.time() - t0:.1f}s')


if __name__ == '__main__':
    main()
