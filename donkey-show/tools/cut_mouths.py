"""Cut the 12 gaze/mouth states (kit v3, images 16/17) and register them so the head and ears
stay put when states are swapped; the six-expression sheets (04/05) are registered onto the same
canvas with a scale search. Output: assets/sprites/{T,S}_m01..m12.png, {T,S}_<expr>.png and src/sprites.js.
Usage: python3 -I cut_mouths.py <kit images dir> <out dir> <src/sprites.js>"""
import sys, os, json
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

src, out, js = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
UP = 3


def matte(rgb, tol=26):
    a = rgb.astype(int)
    bg = np.median(np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]), axis=0)
    dist = np.sqrt(((a - bg) ** 2).sum(-1))
    lab, _ = ndimage.label(dist < tol)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bgm = np.isin(lab, list(border))
    ring = ndimage.binary_dilation(bgm, iterations=2) & ~bgm
    alpha = np.where(bgm, 0.0, 1.0)
    alpha[ring] = np.clip((dist[ring] - 6) / 60, 0, 1)
    return alpha, bg


def suit_top(rgb, box, suit):
    x0, y0, x1, y1 = box
    d = np.sqrt(((rgb[y0:y1, x0:x1].astype(int) - np.array(suit)) ** 2).sum(-1)) < 70
    rows = np.where(d.sum(1) > 20)[0]
    rows = rows[rows > (y1 - y0) * 0.55]
    return y0 + (rows[0] if len(rows) else (y1 - y0))


def cut_cell(rgb, alpha, box, suit):
    """returns RGBA float image of head+neck (largest component above the collar), cropped to the cell"""
    cut = suit_top(rgb, box, suit) + 12
    sub = alpha[box[1]:cut, box[0]:box[2]] > 0.5
    lab, n = ndimage.label(sub)
    sizes = ndimage.sum(sub, lab, range(1, n + 1))
    keep = ndimage.binary_dilation(lab == (np.argmax(sizes) + 1), iterations=2)
    a = alpha[box[1]:cut, box[0]:box[2]] * keep
    c = rgb[box[1]:cut, box[0]:box[2]].astype(float)
    return c, a


def unblend(c, a, bg):
    soft = (a > 0.02) & (a < 0.98)
    a3 = np.clip(a[..., None], 0.05, 1)
    un = (c - (1 - a3) * np.asarray(bg, float)) / a3
    c = np.where(soft[..., None], np.clip(un, 0, 255) * 0.55, c)
    return c


def ink(c, a, rows=None):
    m = ((c.max(-1) < 90) & (a > 0.5)).astype(float)
    if rows is not None: m[rows:] = 0
    return ndimage.gaussian_filter(m, 1.5)


def shift_by_xcorr(ref, mov):
    """integer translation that best aligns mov onto ref (FFT cross-correlation)"""
    H = max(ref.shape[0], mov.shape[0]) * 2; W = max(ref.shape[1], mov.shape[1]) * 2
    A = np.zeros((H, W)); B = np.zeros((H, W))
    A[:ref.shape[0], :ref.shape[1]] = ref; B[:mov.shape[0], :mov.shape[1]] = mov
    R = np.fft.irfft2(np.fft.rfft2(A) * np.conj(np.fft.rfft2(B)), s=(H, W))
    iy, ix = np.unravel_index(np.argmax(R), R.shape)
    if iy > H // 2: iy -= H
    if ix > W // 2: ix -= W
    return iy, ix, R.max()


def place(c, a, canvas_hw, dy, dx):
    H, W = canvas_hw
    C = np.zeros((H, W, 3)); A = np.zeros((H, W))
    y0, x0 = max(0, dy), max(0, dx)
    y1, x1 = min(H, dy + c.shape[0]), min(W, dx + c.shape[1])
    C[y0:y1, x0:x1] = c[y0 - dy:y1 - dy, x0 - dx:x1 - dx]
    A[y0:y1, x0:x1] = a[y0 - dy:y1 - dy, x0 - dx:x1 - dx]
    return C, A


def save(C, A, path, flip):
    img = Image.fromarray(np.dstack([np.clip(C, 0, 255).astype(np.uint8), (np.clip(A, 0, 1) * 255).astype(np.uint8)]), 'RGBA')
    if flip: img = img.transpose(Image.FLIP_LEFT_RIGHT)
    W, H = img.width * UP, img.height * UP
    rgbp = img.convert('RGB').resize((W, H), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.6, percent=70, threshold=2))
    ap = img.getchannel('A').resize((W, H), Image.LANCZOS).point(lambda v: max(0, min(255, int((v - 90) * 255 / 165))))
    rgbp.putalpha(ap)
    rgbp.save(path, optimize=True)


meta = {}
CH = {
    'T': ('16_teal_gaze_and_mouth_states.png', '04_gray_expressions.png', ['smug', 'sing', 'surprised', 'sly', 'worried', 'embarrassed'], (28, 160, 152), False),
    'S': ('17_mustard_gaze_and_mouth_states.png', '05_brown_expressions.png', ['grumpy', 'sing', 'surprised', 'sly', 'scared', 'smuggrin'], (242, 184, 38), True),
}
for who, (fn, fx, xnames, suit, flip) in CH.items():
    rgb = np.asarray(Image.open(os.path.join(src, fn)).convert('RGB'))
    alpha, bg = matte(rgb)
    H, W = alpha.shape
    cells = []
    for i in range(12):
        cx, cy = i % 3, i // 3
        box = (cx * W // 3, cy * H // 4, (cx + 1) * W // 3, (cy + 1) * H // 4)
        c, a = cut_cell(rgb, alpha, box, suit)
        cells.append((unblend(c, a, bg), a))
    # common canvas = cell 1 padded; register the ears/hair/top of the head (stable region)
    pad = 40
    c0, a0 = cells[0]
    CH_, CW_ = c0.shape[0] + 2 * pad, c0.shape[1] + 2 * pad
    top = int(c0.shape[0] * 0.42)
    ref = np.zeros((CH_, CW_)); ref[pad:pad + c0.shape[0], pad:pad + c0.shape[1]] = ink(c0, a0, top)
    shifts = []
    for i, (c, a) in enumerate(cells):
        dy, dx, _ = shift_by_xcorr(ref, ink(c, a, top))
        C, A = place(c, a, (CH_, CW_), dy, dx)
        save(C, A, os.path.join(out, f'{who}_m{i + 1:02d}.png'), flip)
        shifts.append((int(dy), int(dx)))
    # neck anchor from cell 1 (bottom row centre)
    _, A1 = place(c0, a0, (CH_, CW_), pad, pad)
    rowy = pad + c0.shape[0] - 3
    row = np.where(A1[rowy] > 0.5)[0]
    ax = float((row.min() + row.max()) / 2); ay = float(rowy + 3)
    ax0, ay0 = ax, ay
    if flip: ax = CW_ - ax
    for i in range(12):
        meta[f'{who}_m{i + 1:02d}'] = {'w': CW_, 'h': CH_, 'ax': round(ax, 1), 'ay': round(ay, 1)}
    print(who, 'cell shifts', shifts)
    # six-expression sheet: scale search + translation onto the same canvas
    rgb2 = np.asarray(Image.open(os.path.join(src, fx)).convert('RGB'))
    alpha2, bg2 = matte(rgb2)
    H2, W2 = alpha2.shape
    for j, name in enumerate(xnames):
        cx, cy = j % 3, j // 3
        box = (cx * W2 // 3, cy * H2 // 2, (cx + 1) * W2 // 3, (cy + 1) * H2 // 2)
        c, a = cut_cell(rgb2, alpha2, box, suit)
        c = unblend(c, a, bg2)
        # fixed per-character scale (from a silhouette search) and the neck base pinned to the same spot
        sc = {'T': 0.67, 'S': 0.76}[who]
        hh, ww = int(c.shape[0] * sc), int(c.shape[1] * sc)
        cs = np.asarray(Image.fromarray(np.clip(c, 0, 255).astype(np.uint8)).resize((ww, hh), Image.LANCZOS)).astype(float)
        as_ = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).resize((ww, hh), Image.LANCZOS)).astype(float) / 255
        r2 = np.where(as_[hh - 3] > 0.5)[0]
        nx = (r2.min() + r2.max()) / 2
        dy, dx = int(round(ay0 - hh)), int(round(ax0 - nx))
        s, score = sc, 0
        C, A = place(cs, as_, (CH_, CW_), dy, dx)
        save(C, A, os.path.join(out, f'{who}_{name}.png'), flip)
        meta[f'{who}_{name}'] = {'w': CW_, 'h': CH_, 'ax': round(ax, 1), 'ay': round(ay, 1)}
        print(who, name, 'scale', round(float(s), 2), 'shift', dy, dx, 'score', round(float(score), 3))

# keep the band / guitarist / stage entries from the previous cut
old = {}
if os.path.exists(os.path.join(out, 'sprites.json')):
    old = json.load(open(os.path.join(out, 'sprites.json')))
for k, v in old.items():
    if k.startswith(('band_', 'G_', 'stage')): meta[k] = v
meta['_up'] = UP
json.dump(meta, open(os.path.join(out, 'sprites.json'), 'w'), indent=1)
with open(js, 'w') as f:
    f.write('/* generated by tools/cut_mouths.py — sizes in source pixels; head PNGs are ' + str(UP) + 'x */\nwindow.DS = window.DS || {};\nDS.SPRITES = ' + json.dumps(meta) + ';\n')
