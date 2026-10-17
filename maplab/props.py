"""Small props drawn in the painting's style, for the ruins and debris on the Map v3 layout (map_v3_layout.py).

Each prop is drawn at 4x (SS) and scaled down, so the ink outlines and edges come out smooth. Light comes from the upper
left like the painting's: lit faces on the left and on top, the right side in shadow. Every function returns
(BGR uint8, alpha float32) at 1x, ready for map_v3_layout.place().
"""
import numpy as np, cv2

SS = 4
INK = (18, 14, 16)           # BGR, the painting's dark outline
RUST = (34, 72, 132)


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.c = np.zeros((h * SS, w * SS, 3), np.float32)
        self.a = np.zeros((h * SS, w * SS), np.float32)

    def P(self, pts):
        return np.round(np.array(pts, np.float32) * SS * 16).astype(np.int32)

    def mask(self, draw):
        m = np.zeros(self.a.shape, np.uint8); draw(m); return m.astype(np.float32)

    def paint(self, m, col, alpha=1.0, clip=None):
        """Lay a colour through a mask (optionally clipped to another mask, e.g. a face of the prop)."""
        m = m * alpha
        if clip is not None: m = m * clip
        self.c = self.c * (1 - m[..., None]) + np.array(col, np.float32) * m[..., None]
        self.a = np.maximum(self.a, m)

    def poly(self, pts, col, alpha=1.0, clip=None):
        m = self.mask(lambda q: cv2.fillPoly(q, [self.P(pts)], 1, cv2.LINE_AA, shift=4)); self.paint(m, col, alpha, clip); return m

    def ellipse(self, cx, cy, rx, ry, col, alpha=1.0, clip=None, a0=0, a1=360, angle=0):
        m = self.mask(lambda q: cv2.ellipse(q, (int(cx * SS * 16), int(cy * SS * 16)), (int(rx * SS * 16), int(ry * SS * 16)), angle, a0, a1, 1, -1, cv2.LINE_AA, shift=4))
        self.paint(m, col, alpha, clip); return m

    def line(self, pts, col, width=1.0, alpha=1.0, clip=None, closed=False):
        m = self.mask(lambda q: cv2.polylines(q, [self.P(pts)], closed, 1, max(1, int(width * SS)), cv2.LINE_AA, shift=4))
        self.paint(m, col, alpha, clip); return m

    def outline(self, m, width=1.0):
        """An ink line round the outside of a shape (mask m)."""
        k = max(1, int(width * SS))
        ring = cv2.dilate((m > 0.5).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * k + 1, 2 * k + 1))).astype(np.float32)
        ring = np.clip(ring - (m > 0.5), 0, 1)
        self.paint(cv2.GaussianBlur(ring, (0, 0), SS * 0.3), INK)

    def done(self):
        a = cv2.resize(self.a, (self.w, self.h), interpolation=cv2.INTER_AREA)
        c = cv2.resize(self.c * self.a[..., None], (self.w, self.h), interpolation=cv2.INTER_AREA) / np.maximum(a[..., None], 1e-4)
        return c.clip(0, 255).astype(np.uint8), np.clip(a, 0, 1)


def shade(col, k): return tuple(float(min(255, v * k)) for v in col)


def speckle(cv, clip, col, n, seed, size=0.6, alpha=0.7):
    r = np.random.default_rng(seed)
    ys, xs = np.nonzero(clip > 0.5)
    if not len(xs): return
    for i in r.choice(len(xs), min(n, len(xs)), replace=False):
        cv.ellipse(xs[i] / SS, ys[i] / SS, size * r.uniform(.6, 1.6), size * r.uniform(.4, 1), col, alpha, clip)


def drum(col=(40, 170, 220), bands=True, lying=False, rust=0.4, seed=0):
    """An oil drum, standing or knocked over (lying on its side, its open end towards the lower left)."""
    r = np.random.default_rng(seed)
    if not lying:
        w, h = 11, 15
        cv = Canvas(w + 4, h + 5)
        cx, ry, top, bot = 2 + w / 2, 2.6, 3.5, 2 + h
        body = cv.poly([(cx - w / 2, top), (cx + w / 2, top), (cx + w / 2, bot)] + [(cx + w / 2 * np.cos(t), bot + ry * np.sin(t)) for t in np.linspace(0, np.pi, 12)] + [(cx - w / 2, bot)], col)
        if bands:
            for y in (top + 3.5, top + 8):
                cv.poly([(cx - w / 2, y)] + [(cx + w / 2 * np.cos(t), y + ry * np.sin(t)) for t in np.linspace(np.pi, 0, 12)] +
                        [(cx + w / 2, y + 2.2)] + [(cx + w / 2 * np.cos(t), y + 2.2 + ry * np.sin(t)) for t in np.linspace(0, np.pi, 12)], (24, 22, 24), clip=body)
        cv.poly([(cx + w * 0.16, top - 1), (cx + w / 2 + 1, top - 1), (cx + w / 2 + 1, bot + ry + 1), (cx + w * 0.16, bot + ry + 1)], shade(col, 0.55), 0.55, clip=body)   # shadow side
        cv.poly([(cx - w / 2 + 0.8, top), (cx - w / 2 + 2.2, top), (cx - w / 2 + 2.2, bot + 1.5), (cx - w / 2 + 0.8, bot + 1.5)], (230, 240, 250), 0.35, clip=body)     # lit edge
        for y in (top + 3, top + 8.5):
            cv.line([(cx + w / 2 * np.cos(t), y + ry * np.sin(t)) for t in np.linspace(np.pi, 0, 14)], shade(col, 0.45), 0.7, clip=body)
        speckle(cv, body, RUST, int(14 * rust), seed, 0.9, 0.6)
        lid = cv.ellipse(cx, top, w / 2, ry, shade(col, 1.18))
        cv.ellipse(cx, top, w / 2 - 1.3, ry - 0.8, shade(col, 0.8), 0.6)
        cv.ellipse(cx + 2, top - 0.3, 0.9, 0.5, INK)
        cv.outline(np.maximum(body, lid), 0.8)
        return cv.done()
    # lying: the barrel along x, its round end facing the lower left
    L, R = 14, 5.4
    cv = Canvas(L + 9, int(2 * R) + 6)
    y0, x0 = 2 + R, 3.5 + R * 0.45
    body = cv.poly([(x0, y0 - R), (x0 + L, y0 - R), (x0 + L, y0 + R), (x0, y0 + R)], col)
    tail = cv.ellipse(x0 + L, y0, R * 0.45, R, col)
    body = np.maximum(body, tail)
    cv.poly([(x0, y0 + R * 0.25), (x0 + L + 3, y0 + R * 0.25), (x0 + L + 3, y0 + R + 1), (x0, y0 + R + 1)], shade(col, 0.55), 0.55, clip=body)
    cv.poly([(x0, y0 - R + 0.7), (x0 + L + 3, y0 - R + 0.7), (x0 + L + 3, y0 - R + 2), (x0, y0 - R + 2)], (230, 240, 250), 0.3, clip=body)
    if bands:
        for x in (x0 + 4, x0 + 9):
            cv.poly([(x, y0 - R), (x + 2.2, y0 - R), (x + 2.2, y0 + R), (x, y0 + R)], (24, 22, 24), clip=body)
    speckle(cv, body, RUST, int(14 * rust), seed, 0.9, 0.6)
    end = cv.ellipse(x0, y0, R * 0.45, R, shade(col, 1.1))
    cv.ellipse(x0, y0, R * 0.3, R * 0.75, (26, 22, 26))                 # open: dark inside
    cv.outline(np.maximum(body, end), 0.8)
    return cv.done()


def tyres(n=3, seed=0):
    """A stack of n tyres seen from above at 3/4."""
    rx, ry, t = 7, 3.2, 2.6
    cv = Canvas(int(2 * rx) + 5, int(n * t + 2 * ry) + 5)
    cx = 2.5 + rx
    r = np.random.default_rng(seed)
    allm = np.zeros(cv.a.shape, np.float32)
    for k in range(n):
        y = cv.h - 2.5 - ry - k * t
        dx = r.uniform(-0.8, 0.8)
        side = cv.poly([(cx + dx - rx, y - t)] + [(cx + dx + rx * np.cos(a), y + ry * np.sin(a)) for a in np.linspace(np.pi, 0, 16)] + [(cx + dx + rx, y - t)], (34, 32, 34))
        cv.poly([(cx + dx + rx * 0.2, y - t), (cx + dx + rx + 1, y - t), (cx + dx + rx + 1, y + ry + 1), (cx + dx + rx * 0.2, y + ry + 1)], (16, 14, 16), 0.6, clip=side)
        for a in np.linspace(np.pi * 0.95, np.pi * 0.05, 7):     # tread blocks on the side
            x = cx + dx + rx * np.cos(a)
            cv.line([(x, y - t + 0.5 + ry * np.sin(a) * 0.6), (x, y - 0.3 + ry * np.sin(a))], (70, 66, 66), 0.5, clip=side)
        top = cv.ellipse(cx + dx, y - t, rx, ry, (52, 50, 52))
        cv.ellipse(cx + dx - 1.2, y - t - 0.6, rx - 1.6, ry - 0.9, (78, 74, 74), 0.6)
        cv.ellipse(cx + dx, y - t, rx * 0.5, ry * 0.5, (14, 12, 14))      # the hole
        allm = np.maximum(allm, np.maximum(side, top))
    cv.outline(allm, 0.8)
    return cv.done()


def tyre_lean(seed=0):
    """A single tyre on its edge, leaning."""
    cv = Canvas(12, 17)
    m = cv.ellipse(6, 8.5, 4.2, 7.2, (36, 34, 36), angle=-12)
    cv.ellipse(4.8, 7.5, 3.0, 6.0, (64, 62, 62), 0.5, clip=m, angle=-12)
    cv.ellipse(6.4, 8.5, 1.8, 3.6, (128, 130, 136), angle=-12)           # the wheel's hub
    cv.ellipse(6.6, 8.6, 0.8, 1.6, (40, 40, 44), angle=-12)
    cv.outline(m, 0.8)
    return cv.done()


def crate(w=12, h=9, d=5, wood=(56, 112, 168), broken=False, seed=0):
    """A wooden crate at 3/4: front, top and right faces, planks and a cross brace; broken: its lid smashed in."""
    cv = Canvas(w + d + 4, h + d + 4)
    x0, y0 = 2, 2 + d
    front = cv.poly([(x0, y0), (x0 + w, y0), (x0 + w, y0 + h), (x0, y0 + h)], wood)
    top = cv.poly([(x0, y0), (x0 + d * 0.8, y0 - d * 0.7), (x0 + w + d * 0.8, y0 - d * 0.7), (x0 + w, y0)], shade(wood, 1.22))
    side = cv.poly([(x0 + w, y0), (x0 + w + d * 0.8, y0 - d * 0.7), (x0 + w + d * 0.8, y0 + h - d * 0.7), (x0 + w, y0 + h)], shade(wood, 0.62))
    for k in range(1, 3):
        y = y0 + h * k / 3
        cv.line([(x0, y), (x0 + w, y)], shade(wood, 0.55), 0.6, clip=front)
    cv.line([(x0 + 1, y0 + 1), (x0 + w - 1, y0 + h - 1)], shade(wood, 0.7), 1.0, clip=front)
    cv.line([(x0 + 1, y0 + 1), (x0 + w - 1, y0 + h - 1)], shade(wood, 1.15), 0.4, clip=front)
    for x in (x0 + 0.6, x0 + w - 0.6):
        cv.line([(x, y0), (x, y0 + h)], shade(wood, 0.6), 0.8, clip=front)
    if broken:
        hole = cv.poly([(x0 + 2.5, y0 - 0.6), (x0 + 4, y0 - d * 0.55), (x0 + w * 0.7, y0 - d * 0.62), (x0 + w * 0.85, y0 - 1.2), (x0 + w * 0.5, y0 - 0.2)], (22, 26, 34))
        for x in (x0 + 4.5, x0 + 7.5):                                    # splintered planks
            cv.line([(x, y0 - d * 0.6), (x + 1.2, y0 - 1.5)], shade(wood, 1.3), 0.6)
    speckle(cv, front, shade(wood, 0.5), 5, seed, 0.5, 0.5)
    cv.outline(np.maximum(np.maximum(front, top), side), 0.8)
    return cv.done()


def scrap(w=16, h=6, col=(118, 124, 132), seed=0):
    """A bent sheet of corrugated scrap lying on the ground, rusty and riveted."""
    r = np.random.default_rng(seed)
    cv = Canvas(w + 4, h + 6)
    pts = [(2, 3 + r.uniform(0, 1.5)), (w * 0.55, 2), (w + 2, 3 + r.uniform(0, 2)), (w + 1, h + 3), (w * 0.45, h + 2 + r.uniform(0, 1.5)), (2.5, h + 3)]
    m = cv.poly(pts, col)
    for k in range(1, 6):                                               # corrugation
        x = 2 + w * k / 6
        cv.line([(x, 2), (x - 1, h + 4)], shade(col, 0.6), 0.7, clip=m)
        cv.line([(x + 0.8, 2), (x - 0.2, h + 4)], shade(col, 1.25), 0.4, clip=m)
    speckle(cv, m, RUST, 10, seed, 1.0, 0.7)
    cv.poly([(w * 0.55, 2), (w + 2, 3), (w + 1, h + 3), (w * 0.6, h + 2.5)], shade(col, 0.6), 0.4, clip=m)   # bent down: in shade
    cv.outline(m, 0.8)
    return cv.done()


def pipe(L=22, R=2.6, col=(58, 92, 140), seed=0):
    """A length of rusty pipe lying on the ground, open end to the lower left."""
    cv = Canvas(L + 6, int(2 * R) + 5)
    y0, x0 = 2.5 + R, 3
    body = cv.poly([(x0, y0 - R), (x0 + L, y0 - R), (x0 + L, y0 + R), (x0, y0 + R)], col)
    body = np.maximum(body, cv.ellipse(x0 + L, y0, R * 0.45, R, col))
    cv.poly([(x0, y0 + R * 0.2), (x0 + L + 2, y0 + R * 0.2), (x0 + L + 2, y0 + R + 1), (x0, y0 + R + 1)], shade(col, 0.55), 0.6, clip=body)
    cv.line([(x0 + 1, y0 - R * 0.55), (x0 + L - 1, y0 - R * 0.55)], shade(col, 1.4), 0.6, clip=body)
    for x in (x0 + L * 0.35, x0 + L * 0.7):
        cv.line([(x, y0 - R), (x, y0 + R)], shade(col, 0.5), 0.8, clip=body)   # flanges
    speckle(cv, body, RUST, 8, seed, 0.9, 0.6)
    end = cv.ellipse(x0, y0, R * 0.45, R, shade(col, 1.1))
    cv.ellipse(x0, y0, R * 0.28, R * 0.7, (20, 18, 20))
    cv.outline(np.maximum(body, end), 0.8)
    return cv.done()


def lamp_toppled(L=44, seed=0):
    """A street lamp knocked flat: the broken stub still standing, the pole lying along the ground, its head smashed."""
    cv = Canvas(L + 14, 22)
    metal, dark = (62, 58, 60), (36, 34, 36)
    # the stub: a short post with a jagged top
    stub = cv.poly([(4, 20), (4, 9), (5.2, 7.6), (6.2, 9.2), (7.2, 8), (7.2, 20)], metal)
    cv.poly([(6, 8), (7.4, 8), (7.4, 20.5), (6, 20.5)], dark, 0.7, clip=stub)
    base = cv.poly([(2.5, 18.5), (8.7, 18.5), (8.7, 20.5), (2.5, 20.5)], dark)
    # the pole on the ground, from the stub out to the right
    pole = cv.poly([(8, 18.2), (8 + L, 14.6), (8 + L, 17.0), (8, 20.4)], metal)
    cv.line([(8, 18.6), (8 + L, 15.1)], shade(metal, 1.7), 0.6, clip=pole)
    cv.poly([(8, 19.6), (8 + L, 16.3), (8 + L, 17.0), (8, 20.4)], dark, 0.8, clip=pole)
    # the lamp head: a box with its glass smashed
    head = cv.poly([(L + 4, 12.5), (L + 12, 11.5), (L + 12.5, 16.5), (L + 4.5, 17.5)], (44, 46, 52))
    cv.poly([(L + 5.5, 13.3), (L + 11, 12.6), (L + 11.3, 15.4), (L + 6, 16)], (90, 170, 230), 0.85)   # amber glass, like the painting's lamps
    for (a, b) in [((L + 6, 13.6), (L + 9, 15.5)), ((L + 8, 12.9), (L + 7, 15.8)), ((L + 10.5, 13), (L + 8.5, 15.2))]:
        cv.line([a, b], (230, 240, 240), 0.45)                                                      # cracks
    for k in range(5):                                                                              # glass on the ground
        x = L + 2 + k * 2.6 + (seed % 3) * 0.3
        cv.ellipse(x, 19 + (k % 2), 0.6, 0.35, (150, 210, 220), 0.9)
    cv.outline(np.maximum.reduce([stub, base, pole, head]), 0.8)
    return cv.done()
