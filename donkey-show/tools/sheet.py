"""Contact sheet of rendered stills: python3 sheet.py <dir> <out.png> [cols]"""
import sys, glob, os
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]; cols = int(sys.argv[3]) if len(sys.argv) > 3 else 2
fs = sorted(glob.glob(os.path.join(d, 't*.png')))
w, h = 960, 540
rows = max(1, (len(fs) + cols - 1) // cols)
S = Image.new('RGB', (cols * w, rows * h), 'white'); D = ImageDraw.Draw(S)
for i, f in enumerate(fs):
    im = Image.open(f).convert('RGB').resize((w, h)); x, y = (i % cols) * w, (i // cols) * h
    S.paste(im, (x, y)); D.rectangle([x, y, x + 120, y + 30], fill='black'); D.text((x + 8, y + 8), os.path.basename(f)[1:-4], fill='white')
S.save(out)
