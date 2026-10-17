"""The game's cel-shaded look, one filter for the map, the towers and the characters (Borderlands-style):

1. Split: an edge-preserving smooth gives the broad light and shade of each surface; what it smooths away is the
   painted detail (texture, small marks).
2. Bands: that broad light snapped to a few flat tones with narrow soft steps between them (the hard-edged shadow of
   cel shading); part of the detail laid back on top, so surfaces stay hand-painted; the colour a little richer.
3. Ink: dark lines where the flattened image has a real edge (a difference of Gaussians, thresholded), in a warm
   near-black.
4. Hatching: short diagonal strokes in the darkest band (they run lower-left to upper-right, across the light that
   comes from the upper left), broken up so they read as drawn.

    cel(bgr, alpha=None, px=1.0, **tune) -> bgr (float32)

px is how many of the image's pixels make one pixel of the 1x map, so line widths and hatch spacing come out the same
size on screen for every asset (the map: 1; a tower layer drawn at 0.23x: about 4; a character's sheet crop: about 7).
"""
import numpy as np, cv2

INK = np.float32([14, 18, 26])   # BGR: the map's warm near-black


def _fill_transparent(bgr, alpha):
    """Spread the opaque colours into the transparent area, so filters don't drag black in at the edges."""
    if alpha is None: return bgr
    hole = (alpha < 0.5).astype(np.uint8)
    if not hole.any(): return bgr
    small = cv2.resize(bgr, None, fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA)
    hs = cv2.resize(hole, (small.shape[1], small.shape[0]), interpolation=cv2.INTER_NEAREST)
    f = cv2.inpaint(np.clip(small, 0, 255).astype(np.uint8), hs, 3, cv2.INPAINT_TELEA)
    f = cv2.resize(f, (bgr.shape[1], bgr.shape[0]), interpolation=cv2.INTER_LINEAR).astype(np.float32)
    return np.where(hole[..., None] > 0, f, bgr)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)


def cel(bgr, alpha=None, px=1.0, levels=5, bands=1.0, soft=0.06, detail=0.75, chroma=1.12, ink=0.8, ink_k=1.0,
        ink_min=10, hatch=0.5, flat=0.35, outline=True, seed=0):
    bgr = _fill_transparent(bgr.astype(np.float32), alpha)
    h, w = bgr.shape[:2]
    # 1. split: the broad light and shade, and the painted detail
    lab0 = cv2.cvtColor(np.clip(bgr, 0, 255).astype(np.uint8), cv2.COLOR_BGR2LAB).astype(np.float32)
    f = cv2.edgePreservingFilter(np.clip(bgr, 0, 255).astype(np.uint8), flags=cv2.RECURS_FILTER, sigma_s=max(6, 16 * px), sigma_r=flat)
    labf = cv2.cvtColor(f, cv2.COLOR_BGR2LAB).astype(np.float32)
    L, A, B = labf[..., 0], lab0[..., 1] - 128, lab0[..., 2] - 128
    det = lab0[..., 0] - L
    # 2. bands: flat tones with narrow soft steps, the detail back on top
    step = 255 / levels
    t = L / step; base = np.floor(t); fr = t - base
    Lq = (base + smoothstep(0.5 - soft, 0.5 + soft, fr)) * step
    Lc = L * (1 - bands) + Lq * bands + det * detail
    out = cv2.cvtColor(np.clip(np.dstack([Lc, A * chroma + 128, B * chroma + 128]), 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR).astype(np.float32)
    # 3. ink: the dark side of real edges
    s1 = max(0.6, 0.7 * px)
    dog = cv2.GaussianBlur(L, (0, 0), s1) - cv2.GaussianBlur(L, (0, 0), s1 * 1.8)
    line = smoothstep(4 * ink_k, 11 * ink_k, -dog)
    # only lines long enough to be real edges: drop the specks
    n, lbl, st, _ = cv2.connectedComponentsWithStats((line > 0.4).astype(np.uint8), connectivity=8)
    big = np.zeros(n, bool); big[1:] = np.maximum(st[1:, cv2.CC_STAT_WIDTH], st[1:, cv2.CC_STAT_HEIGHT]) >= ink_min * px
    line = line * cv2.dilate(big[lbl].astype(np.uint8), np.ones((3, 3), np.uint8))
    if alpha is not None and outline:   # and round the silhouette
        a = (alpha > 0.5).astype(np.float32)
        k = max(1, int(round(0.9 * px)))
        edge = a - cv2.erode(a, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * k + 1, 2 * k + 1)))
        line = np.maximum(line, cv2.GaussianBlur(edge, (0, 0), 0.5 * px + 0.3))
    out = out * (1 - ink * line[..., None]) + INK * ink * line[..., None]
    # 4. hatching in the darkest band
    if hatch > 0:
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        period = 3.2 * px
        stroke = np.clip((np.cos(2 * np.pi * (xx + yy) / period) - 0.35) * 2.2, 0, 1)
        r = np.random.default_rng(seed)
        breaks = cv2.resize(r.random((h // max(2, int(3 * px)) + 2, w // max(2, int(3 * px)) + 2)).astype(np.float32), (w, h), interpolation=cv2.INTER_NEAREST)
        breaks = cv2.GaussianBlur(breaks, (0, 0), 0.6 * px)
        dark = 1 - smoothstep(step * 1.1, step * 1.7, Lc)
        hm = stroke * dark * smoothstep(0.35, 0.55, breaks)
        out = out * (1 - hatch * hm[..., None]) + INK * hatch * hm[..., None]
    return np.clip(out, 0, 255)
