"""Cut character sprites out of the approved reference illustrations (kit v2).
The plain ivory background is removed by flood-filling from the image border (the black outline
keeps interior whites such as eyes, shirts and teeth intact); edge pixels get soft alpha.
Usage: python3 -I cut_sprites.py <kit/images dir> <out dir> [--sheet]"""
import sys, os, json
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)


def matte(rgb, tol=26):
    a = rgb.astype(int)
    bg = np.median(np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]), axis=0)
    dist = np.sqrt(((a - bg) ** 2).sum(-1))
    near = dist < tol
    lab, _ = ndimage.label(near)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bgmask = np.isin(lab, list(border))
    # soft edge: one-pixel ring gets alpha from colour distance
    ring = ndimage.binary_dilation(bgmask, iterations=2) & ~bgmask
    alpha = np.where(bgmask, 0.0, 1.0)
    alpha[ring] = np.clip((dist[ring] - 6) / 60, 0, 1)
    alpha = ndimage.binary_opening(alpha > 0.5, iterations=1) * 1.0 * 0 + alpha  # keep soft values
    return alpha, bg


def save_rgba(rgb, alpha, box, path, flip=False, up=2, bg=None):
    x0, y0, x1, y1 = box
    c = rgb[y0:y1, x0:x1].astype(float); al = alpha[y0:y1, x0:x1]
    if bg is None: bg = np.median(np.concatenate([rgb[0], rgb[-1]]), axis=0)
    soft = (al > 0.02) & (al < 0.98)
    a3 = np.clip(al[..., None], 0.05, 1)
    un = (c - (1 - a3) * np.asarray(bg, float)) / a3
    c = np.where(soft[..., None], np.clip(un, 0, 255), c)
    # pull edge pixels toward the ink line so no light halo survives
    c = np.where(soft[..., None], c * 0.55, c)
    im = np.dstack([c.astype(np.uint8), (al * 255).astype(np.uint8)])
    img = Image.fromarray(im, 'RGBA')
    if flip:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    if up != 1:
        rgbp = img.convert('RGB').resize((img.width * up, img.height * up), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
        ap = img.getchannel('A').resize((img.width * up, img.height * up), Image.LANCZOS)
        ap = ap.point(lambda v: max(0, min(255, int((v - 90) * 255 / 165))))   # tighten the edge: no light rim
        img = rgbp.copy(); img.putalpha(ap)
    img.save(path, optimize=True)
    return img.size


def suit_top(rgb, alpha, box, suit):
    """first row (from top) inside box where a sizeable run of suit colour appears"""
    x0, y0, x1, y1 = box
    a = rgb[y0:y1, x0:x1].astype(int)
    d = np.sqrt(((a - np.array(suit)) ** 2).sum(-1)) < 70
    rows = np.where(d.sum(1) > 25)[0]
    rows = rows[rows > (y1 - y0) * 0.55]   # the collar is in the lower part of the cell
    return y0 + (rows[0] if len(rows) else (y1 - y0))


meta = {}
# ---------------- expression sheets → head sprites (head + neck, cut above the collar) ----------------
SHEETS = {
    'T': ('04_gray_expressions.png', ['smug', 'sing', 'surprised', 'sly', 'worried', 'embarrassed'], (28, 160, 152), False),
    'S': ('05_brown_expressions.png', ['grumpy', 'sing', 'surprised', 'sly', 'scared', 'smuggrin'], (242, 184, 38), True),
}
for who, (fn, names, suit, flip) in SHEETS.items():
    rgb = np.asarray(Image.open(os.path.join(src, fn)).convert('RGB'))
    alpha, bg = matte(rgb)
    H, W = alpha.shape
    for idx, name in enumerate(names):
        cx, cy = idx % 3, idx // 3
        box = (cx * W // 3, cy * H // 2, (cx + 1) * W // 3, (cy + 1) * H // 2)
        cut = suit_top(rgb, alpha, box, suit) + 14     # keep a little neck under the collar
        sub = alpha[box[1]:cut, box[0]:box[2]] > 0.5
        lab, n = ndimage.label(sub)
        sizes = ndimage.sum(sub, lab, range(1, n + 1))
        keep = lab == (np.argmax(sizes) + 1)
        a2 = np.zeros_like(alpha); a2[box[1]:cut, box[0]:box[2]] = alpha[box[1]:cut, box[0]:box[2]] * ndimage.binary_dilation(keep, iterations=2)
        ys, xs = np.where(a2[box[1]:cut, box[0]:box[2]] > 0.02)
        bb = (box[0] + xs.min() - 2, box[1] + ys.min() - 2, box[0] + xs.max() + 3, cut)
        # neck anchor: centre of the neck on the bottom row
        row = np.where(a2[cut - 2, bb[0]:bb[2]] > 0.5)[0]
        ax = (row.min() + row.max()) / 2 if len(row) else (bb[2] - bb[0]) / 2
        w, h = bb[2] - bb[0], bb[3] - bb[1]
        if flip: ax = w - ax
        size = save_rgba(rgb, a2, bb, os.path.join(out, f'{who}_{name}.png'), flip)
        # mouth point: lowest-front tooth pixels (white blocks under the snout) → where the mic aims
        sub_rgb = rgb[bb[1]:bb[3], bb[0]:bb[2]].astype(int); sub_a = a2[bb[1]:bb[3], bb[0]:bb[2]]
        white = (sub_rgb.min(-1) > 238) & (sub_a > 0.9)
        wl, wn = ndimage.label(white)
        best = None
        for i in range(1, wn + 1):
            ys2, xs2 = np.where(wl == i)
            if len(ys2) < 120: continue
            cx2 = xs2.mean() if not flip else w - xs2.mean()
            if best is None or cx2 > best[0]: best = (cx2, ys2.mean())
        mxy = best or (w * 0.8, h * 0.35)
        meta[f'{who}_{name}'] = {'w': int(w), 'h': int(h), 'ax': round(float(ax), 1), 'ay': int(h), 'mx': round(float(mxy[0]), 1), 'my': round(float(mxy[1]), 1)}
        print(who, name, 'box', bb, 'anchor', round(float(ax)), h)

# ---------------- whole-figure sprites (band, turtle) ----------------
FIG = {'pianist': '13_pianist_reference.png', 'bassist': '14_bassist_reference.png', 'drummer': '15_drummer_reference.png', 'turtle': '08_turtle_stage_manager.png'}
for name, fn in FIG.items():
    rgb = np.asarray(Image.open(os.path.join(src, fn)).convert('RGB'))
    alpha, bg = matte(rgb)
    sub = alpha > 0.5
    lab, n = ndimage.label(sub)
    sizes = ndimage.sum(sub, lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i, sz in enumerate(sizes) if sz > 400])
    a2 = alpha * ndimage.binary_dilation(keep, iterations=2)
    ys, xs = np.where(a2 > 0.02)
    bb = (xs.min() - 2, ys.min() - 2, xs.max() + 3, ys.max() + 3)
    save_rgba(rgb, a2, bb, os.path.join(out, f'band_{name}.png'), up=1)
    meta[f'band_{name}'] = {'w': int(bb[2] - bb[0]), 'h': int(bb[3] - bb[1])}
    print(name, bb)

# ---------------- guitarist head (from the solo illustration, navy background) ----------------
rgb = np.asarray(Image.open(os.path.join(src, '07_guitarist_solo.png')).convert('RGB'))
alpha, bg = matte(rgb, tol=40)
bb = (560, 4, 900, 334)
sub = alpha[bb[1]:bb[3], bb[0]:bb[2]] > 0.5
lab, n = ndimage.label(sub)
sizes = ndimage.sum(sub, lab, range(1, n + 1))
keep = lab == (np.argmax(sizes) + 1)
a2 = np.zeros_like(alpha); a2[bb[1]:bb[3], bb[0]:bb[2]] = alpha[bb[1]:bb[3], bb[0]:bb[2]] * ndimage.binary_dilation(keep, iterations=2)
save_rgba(rgb, a2, bb, os.path.join(out, 'G_head.png'))
meta['G_head'] = {'w': bb[2] - bb[0], 'h': bb[3] - bb[1], 'ax': 205, 'ay': 330}
# ---------------- the empty stage plate (background), upscaled for zooms ----------------
Image.open(os.path.join(src, '01_empty_stage.png')).convert('RGB').resize((3344, 1882), Image.LANCZOS).save(os.path.join(out, 'stage.jpg'), quality=90)
meta['stage'] = {'w': 1920, 'h': 1080}
json.dump(meta, open(os.path.join(out, 'sprites.json'), 'w'), indent=1)
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'sprites.js'), 'w') as f:
    f.write('/* generated by tools/cut_sprites.py — sizes in source pixels (PNG files are 2x for heads) */\nwindow.DS = window.DS || {};\nDS.SPRITES = ' + json.dumps(meta) + ';\n')
