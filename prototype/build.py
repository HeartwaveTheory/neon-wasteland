"""Embed assets into game.html -> dist/neon-wasteland.html (one self-contained file)."""
import base64, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
def uri(path, mime):
    with open(path, 'rb') as f:
        return f'data:{mime};base64,' + base64.b64encode(f.read()).decode()
src = open(os.path.join(HERE, 'game.html'), encoding='utf-8').read()
A = os.path.join(HERE, 'assets')
F = os.path.join(HERE, '..', 'fonts')
rep = {
    '__MAP__': uri(os.path.join(A, 'map.webp'), 'image/webp'),
    '__FONT_BUNGEE__': uri(os.path.join(F, 'bungee.woff2'), 'font/woff2'),
    '__FONT_CHAKRA__': uri(os.path.join(F, 'chakra700.woff2'), 'font/woff2'),
}
for t in ['sniper', 'plasma', 'railgun', 'garrison']:
    for l in ['base', 'head']:
        rep[f'__{t.upper()}_{l.upper()}__'] = uri(os.path.join(A, f'{t}-{l}.webp'), 'image/webp')
for u in ['raider', 'scout', 'enforcer', 'mech', 'drone', 'trooper', 'merc']:
    rep[f'__UNIT_{u.upper()}__'] = uri(os.path.join(A, 'units', f'{u}.webp'), 'image/webp')
for k, v in rep.items():
    if k not in src: sys.exit(f'missing placeholder {k}')
    src = src.replace(k, v)
os.makedirs(os.path.join(HERE, 'dist'), exist_ok=True)
out = os.path.join(HERE, 'dist', 'neon-wasteland.html')
open(out, 'w', encoding='utf-8').write(src)
print('ok', out, round(os.path.getsize(out) / 1e6, 2), 'MB')
# local test page: the same content inside an artifact-like skeleton
open(os.path.join(HERE, 'dist', '_test.html'), 'w', encoding='utf-8').write(
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    '<style>:root{padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0}[hidden]{display:none!important}</style></head><body>'
    + src + '</body></html>')
