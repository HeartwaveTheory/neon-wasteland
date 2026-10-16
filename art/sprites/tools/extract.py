"""Cut each enemy out of its video and pack one clean walk/run loop into a transparent sprite sheet.

  python extract.py <videos_dir> <out_dir> [--previews]

The videos are the Hailuo animations of the Forge concepts (see ../README.md). Their backgrounds are flat grey, so
the cut-out is a colour key with the edges un-mixed from the grey; the drawn ground shadow / ink ground line is
removed (the game draws its own). Writes <out_dir>/<sheet>.webp and <sheet>.json (frame size, frames, fps, feet
anchor), and with --previews a GIF of each loop on a dark ground.
Loop starts and lengths below were found by comparing frames for the closest repeat (raider and mech videos show
every frame twice, so they are 12 fps clips; duplicates are dropped first).
"""
import json
import math
import os
import sys

import cv2
import numpy as np
from PIL import Image

VIDEOS = {
    'raider': 'hailuo-03_make_this_guy_just_keep_walking_right_quickly-0.mp4',
    'mech': 'hailuo-03_make_this_guy_walk_slowly_to_the_right-0.mp4',
    'scout': 'hailuo-03_make_this_robotic_dog_keep_running_and_hopping-0.mp4',
}
VID_DIR = sys.argv[1]
OUT = sys.argv[2]
PREVIEWS = '--previews' in sys.argv
os.makedirs(OUT, exist_ok=True)


def read_video(name):
    c = cv2.VideoCapture(os.path.join(VID_DIR, VIDEOS[name]))
    frames = []
    while True:
        ok, fr = c.read()
        if not ok:
            break
        frames.append(fr)
    return frames


def unique(frames):
    """Indices of frames that differ from the last kept one (drops the doubled frames)."""
    s = [cv2.resize(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), (192, 192), interpolation=cv2.INTER_AREA).astype(np.float32) for f in frames]
    keep = [0]
    for i in range(1, len(s)):
        if np.abs(s[i] - s[keep[-1]]).mean() > 1.5:
            keep.append(i)
    return keep


# name, sheet name, loop start (index into unique frames), loop length, fps,
# ground shadow rows (measured from the clip's median frame, or None), what it is
CLIPS = [
    ('raider', 'raider-run', 52, 9, 12, (684, 704), 'Raider running right'),
    ('mech', 'mech-walk', 25, 36, 12, (663, 672), 'Mech walking right'),
    ('scout', 'scout-run', 62, 14, 24, None, 'Scout (robot dog) galloping right'),
]
LO, HI = 14.0, 52.0  # colour distance from the background: fully clear below LO, fully opaque above HI


def bg_colour(fr):
    b = np.concatenate([fr[:8].reshape(-1, 3), fr[-8:].reshape(-1, 3), fr[:, :8].reshape(-1, 3), fr[:, -8:].reshape(-1, 3)])
    return np.median(b, 0).astype(np.float32)


def matte(fr):
    """Alpha from distance to the flat background, with enclosed non-background regions filled solid."""
    B = bg_colour(fr)
    I = fr.astype(np.float32)
    d = np.linalg.norm(I - B, axis=2)
    a = np.clip((d - LO) / (HI - LO), 0, 1)
    hard = (d > HI * 0.8).astype(np.uint8)
    # holes: background-side regions not connected to the frame border
    n, lab = cv2.connectedComponents(1 - hard, connectivity=4)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
    for k in range(1, n):
        if k in border:
            continue
        m = lab == k
        if np.median(d[m]) > LO:  # paint inside an outline (light grey metal etc.), not a gap between limbs
            a[m] = 1.0
    return I, B, a, d


def drop_shadow(a, band, fr):
    """Clear the ground shadow / ink ground line inside the band rows. The shadow is neutral near-black; the
    feet that stand in it are coloured. In each column keep the coloured, solid pixels, plus a few dark pixels
    right under a foot (its ink outline), and clear the rest."""
    y0, y1 = band
    b, g, r = [fr[..., k].astype(np.int16) for k in range(3)]
    chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    KEEP = 4
    for x in range(a.shape[1]):
        foot = a[max(0, y0 - 3):y0, x].mean() > 0.5
        run = 0 if foot else KEEP
        for y in range(y0, y1 + 1):
            if chroma[y, x] > 20 and a[y, x] > 0.9:
                run = 0
            elif a[y, x] > 0.12 and run < KEEP:
                run += 1
            else:
                a[y, x] = 0
                run = KEEP
    a[y1 + 1:, :] = 0  # below the ground: only shadow fringe
    # loose bits of ground line: band pieces that don't hang from the body above the band
    n, lab = cv2.connectedComponents((a[y0:y1 + 1] > 0.12).astype(np.uint8), connectivity=8)
    attached = set(lab[0][a[y0 - 1] > 0.5].tolist()) - {0}
    for k in range(1, n):
        if k not in attached:
            a[y0:y1 + 1][lab == k] = 0
    return a


def clean(a):
    """Drop specks: components that are tiny, or faint (dust puffs), far from the main body."""
    m = (a > 0.08).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, connectivity=8)
    if n <= 1:
        return a
    main = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    body = cv2.dilate((lab == main).astype(np.uint8), np.ones((41, 41), np.uint8))
    for k in range(1, n):
        if k == main:
            continue
        comp = lab == k
        area = st[k, cv2.CC_STAT_AREA]
        near = body[comp].any()
        if area < 60 or a[comp].max() < 0.6 or not near:
            a[comp] = 0
    return a


def decontaminate(I, B, a):
    """Un-mix the grey background from semi-transparent edges and glows."""
    aa = np.maximum(a, 1e-3)[..., None]
    F = (I - (1 - a[..., None]) * B) / aa
    F = np.where(a[..., None] > 0.02, F, 0)
    return np.clip(F, 0, 255)


def pack(n, w, h):
    """Columns x rows with no empty cells if possible, about twice as wide as tall."""
    best = None
    for cols in range(1, min(n, 12) + 1):
        rows = math.ceil(n / cols)
        score = (cols * rows - n) * 100000 + abs(cols * w - 2 * rows * h)
        if best is None or score < best[0]:
            best = (score, cols, rows)
    return best[1], best[2]


summary = []
for name, sheet, start, L, fps, band, what in CLIPS:
    allf = read_video(name)
    uniq = unique(allf) if name != 'scout' else list(range(len(allf)))
    idx = [int(i) for i in uniq[start:start + L]]
    frames = [allf[i] for i in idx]
    rgba = []
    for fr in frames:
        I, B, a, _ = matte(fr)
        if band:
            a = drop_shadow(a, band, fr)
        a = clean(a)
        F = decontaminate(I, B, a)
        rgba.append(np.dstack([F[..., ::-1], a * 255]).astype(np.uint8))  # BGR -> RGB, + alpha
    # one crop for every frame, so the character keeps its own bob and stride inside the cell
    ys, xs = [], []
    for im in rgba:
        yy, xx = np.nonzero(im[..., 3] > 8)
        ys += [yy.min(), yy.max()]
        xs += [xx.min(), xx.max()]
    pad = 8
    x0, x1 = max(0, min(xs) - pad), min(768, max(xs) + pad + 1)
    y0, y1 = max(0, min(ys) - pad), min(768, max(ys) + pad + 1)
    # feet line: the ground band's top, else the lowest opaque pixel
    ground = (band[0] if band else max(ys)) - y0
    x0, x1, y0, y1 = int(x0), int(x1), int(y0), int(y1)
    w, h = x1 - x0, y1 - y0
    w += w % 2
    h += h % 2
    cells = []
    for im in rgba:
        c = np.zeros((h, w, 4), np.uint8)
        part = im[y0:y1, x0:x1]
        c[:part.shape[0], :part.shape[1]] = part
        cells.append(c)
    cols, rows = pack(len(cells), w, h)
    out = np.zeros((rows * h, cols * w, 4), np.uint8)
    for k, c in enumerate(cells):
        r, q = divmod(k, cols)
        out[r * h:(r + 1) * h, q * w:(q + 1) * w] = c
    Image.fromarray(out).save(os.path.join(OUT, f'{sheet}.webp'), quality=95, alpha_quality=100, method=6)
    meta = {
        'name': sheet, 'what': what, 'image': f'{sheet}.webp',
        'frameWidth': w, 'frameHeight': h, 'frames': len(cells), 'columns': cols, 'rows': rows, 'fps': fps,
        'loop': True, 'facing': 'right',
        'anchor': {'x': w // 2, 'y': int(ground), 'note': 'feet on the ground, horizontal centre of the cell'},
        'source': {'video': name, 'videoFrames': idx},
    }
    with open(os.path.join(OUT, f'{sheet}.json'), 'w') as fh:
        json.dump(meta, fh, indent=2)
    if PREVIEWS:  # preview GIF on a dusty ground colour (GIF has no soft alpha)
        gif = []
        for c in cells:
            bgc = np.zeros((h, w, 3), np.float32) + np.array([58, 50, 46], np.float32)
            al = c[..., 3:4].astype(np.float32) / 255
            comp = c[..., :3].astype(np.float32) * al + bgc * (1 - al)
            gif.append(Image.fromarray(comp.astype(np.uint8)).resize((w // 2, h // 2), Image.LANCZOS))
        gif[0].save(os.path.join(OUT, f'{sheet}-preview.gif'), save_all=True, append_images=gif[1:], duration=round(1000 / fps), loop=0)
    summary.append((sheet, len(cells), f'{w}x{h}', f'{cols}x{rows}', band, out.shape[1], out.shape[0]))

for s in summary:
    print(*s)
