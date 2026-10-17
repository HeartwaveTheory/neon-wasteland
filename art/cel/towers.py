"""Cel-shade the tower layers: art/cel/raw/towers/<tower>-<base|head>.webp (the unshaded originals, from towers2) ->
prototype/assets/<tower>-<base|head>.webp. The game draws the 512 px layers at 0.23x (SPR), so 1 map px is about 4.3
of their pixels.

    venv/bin/python -I art/cel/towers.py
"""
import os, sys
sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np, cv2
from celshade import cel

ROOT = os.path.dirname(os.path.dirname(HERE))
PX = 1 / 0.23
# lighter than the map: the towers are already drawn inked and banded (towers2), so this mostly sets their light in
# the same flat steps and hatches their shadows
TUNE = dict(bands=0.7, detail=0.9, hatch=0.3, outline=False, ink=0.6)
for t in ['sniper', 'plasma', 'railgun', 'garrison', 'dragon', 'garage']:
    for layer in ['base', 'head']:
        im = cv2.imread(os.path.join(HERE, 'raw', 'towers', f'{t}-{layer}.webp'), cv2.IMREAD_UNCHANGED)
        a = im[..., 3].astype(np.float32) / 255
        out = cel(im[..., :3].astype(np.float32), alpha=a, px=PX, seed=len(t), **TUNE)
        cv2.imwrite(os.path.join(ROOT, 'prototype', 'assets', f'{t}-{layer}.webp'), np.dstack([out.astype(np.uint8), im[..., 3]]), [cv2.IMWRITE_WEBP_QUALITY, 90])
        print('ok', t, layer)
