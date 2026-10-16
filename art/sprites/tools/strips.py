"""Turn the video sprite sheets into the game's unit strips.

  python strips.py <sheets_dir> <out_dir>     e.g. python strips.py .. ../../../prototype/assets/units

Game format (prototype/game.html drawSprite, units/units.mjs): 8 frames of 320 x 320 px in one row,
facing right, feet at (160, 300); frames 0-5 walk, 6 attack wind-up, 7 attack slash. The unit's height
in the frame is 2 x units.mjs `height` (raider/mech 140, scout 112). The game draws the ground shadow.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

SHEETS, OUT = sys.argv[1:3]
os.makedirs(OUT, exist_ok=True)
F, GX, GY = 320, 160, 302  # frame size, feet point (soles sit a touch below y = 300, like the drawn units)

# unit id, sheet, height in frame px, walk frames picked from the loop, attack stand-ins:
# (source loop frame, degrees, forward shift px, vertical squash) for wind-up and slash. Positive degrees lean forward.
UNITS = [
    ('raider', 'raider-run', 280, [0, 2, 3, 5, 6, 8], [(0, -7, -4, 1.0), (3, 11, 10, 1.0)]),
    ('scout', 'scout-run', 224, [0, 2, 5, 7, 9, 12], [(0, 0, -6, 0.92), (4, 0, 8, 1.0)]),
    ('mech', 'mech-walk', 280, [0, 6, 12, 18, 24, 30], [(0, -4, -5, 1.0), (0, 5, 8, 1.0)]),
]


def cells(meta, sheet):
    w, h, c = meta['frameWidth'], meta['frameHeight'], meta['columns']
    return [sheet.crop(((k % c) * w, (k // c) * h, (k % c + 1) * w, (k // c + 1) * h)) for k in range(meta['frames'])]


def body_top(frames):
    """Highest row that is really body (ignores thin antennas and sword tips)."""
    tops = []
    for im in frames:
        a = np.asarray(im)[..., 3] > 40
        counts = a.sum(1)
        rows = np.nonzero(counts > max(12, counts.max() * 0.08))[0]
        tops.append(rows.min())
    return min(tops)


def place(cell, ax, ay, scale, deg=0.0, shift=0.0, squash=1.0):
    """Scale a cell (premultiplied, so edges don't go dark), put its anchor (ax, ay) on the feet point (GX, GY),
    lean it about the feet, and slide it back inside the frame if the lean pushed it over an edge."""
    M = F // 2
    w, h = cell.size
    sw, sh = max(1, round(w * scale)), max(1, round(h * scale * squash))
    im = cell.convert('RGBa').resize((sw, sh), Image.LANCZOS)
    big = Image.new('RGBa', (F + 2 * M, F + 2 * M), (0, 0, 0, 0))
    big.paste(im, (round(M + GX - ax * scale + shift), round(M + GY - ay * scale * squash)))
    if deg:
        big = big.rotate(-deg, resample=Image.BICUBIC, center=(M + GX + shift, M + GY))
    x0, y0, x1, y1 = big.convert('RGBA').getbbox()
    dx = max(0, (M + 2) - x0) - max(0, x1 - (M + F - 2))
    dy = max(0, (M + 2) - y0)
    return big.crop((M - dx, M - dy, M - dx + F, M - dy + F)).convert('RGBA')


def solid_ground(frames):
    """Lowest row with a real foot in it (a few solid pixels wide), over every frame of the loop.
    Ignores sparks and dust that dip lower for a frame."""
    g = 0
    for im in frames:
        al = np.asarray(im)[..., 3]
        rows = np.nonzero(((al > 200).sum(1)) >= 6)[0]
        g = max(g, rows.max())
    return g


report = []
for uid, sheet_name, height, walk, attack in UNITS:
    meta = json.load(open(os.path.join(SHEETS, f'{sheet_name}.json')))
    loop = cells(meta, Image.open(os.path.join(SHEETS, meta['image'])).convert('RGBA'))
    # feet line: the measured ground shadow's top for clips that had one, else the lowest solid foot pixel
    ay = meta['anchor']['y'] if meta['source']['video'] != 'scout' else solid_ground(loop)
    top = body_top(loop)
    scale = height / (ay - top)
    # centre the loop's full width on the feet point and keep every frame inside the 320 px cell
    lo, hi = meta['frameWidth'], 0
    for im in loop:
        cols = np.nonzero((np.asarray(im)[..., 3] > 8).any(0))[0]
        lo, hi = min(lo, cols.min()), max(hi, cols.max())
    ax = (lo + hi) / 2
    scale = min(scale, (F - 6) / (hi - lo + 1))
    frames = [place(loop[k], ax, ay, scale) for k in walk]
    frames += [place(loop[k], ax, ay, scale, d, s, q) for k, d, s, q in attack]
    strip = Image.new('RGBA', (F * 8, F), (0, 0, 0, 0))
    for k, fr in enumerate(frames):
        strip.alpha_composite(fr, (k * F, 0))
    strip.save(os.path.join(OUT, f'{uid}.webp'), quality=90, method=6)
    edges = []
    for k in range(8):
        bb = strip.crop((k * F, 0, (k + 1) * F, F)).getbbox()
        edges.append(bb)
    touching = [k for k, bb in enumerate(edges) if bb[0] == 0 or bb[2] == F or bb[1] == 0 or bb[3] == F]
    report.append(f'{uid}: scale {scale:.3f}, feet row {ay} -> {GY}, frames touching an edge: {touching or "none"}, '
                  f'lowest px per frame {[bb[3] for bb in edges]}, {os.path.getsize(os.path.join(OUT, uid + ".webp")) // 1024} KB webp')
print('\n'.join(report))
