#!/usr/bin/env python3
"""Key a magenta-background icon render to a trimmed, transparent 512px PNG. Usage: key-icon.py in.png out.png"""
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
src, out = sys.argv[1], sys.argv[2]
a = np.array(Image.open(src).convert('RGB'), dtype=np.float32)
border = np.concatenate([a[:12].reshape(-1, 3), a[-12:].reshape(-1, 3), a[:, :12].reshape(-1, 3), a[:, -12:].reshape(-1, 3)])
bg = np.median(border, axis=0)
dist = np.sqrt(((a - bg) ** 2).sum(-1))
alpha = np.clip((dist - 14) / 50.0, 0, 1); alpha = alpha * alpha * (3 - 2 * alpha)
hard = dist > 70
near = ndimage.binary_dilation(hard, iterations=6)
alpha = np.where(near, alpha, 0)
lab, n = ndimage.label(alpha > 0.5)
if n > 1:
    sizes = ndimage.sum(np.ones_like(alpha), lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i, sz in enumerate(sizes) if sz >= 0.03 * sizes.max()])
    alpha = np.where(ndimage.binary_dilation(keep, iterations=4), alpha, 0)
alpha = np.array(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7)), dtype=np.float32) / 255
# magenta spill suppression
spill = np.clip(np.minimum(a[..., 0], a[..., 2]) - a[..., 1], 0, None)
a[..., 0] -= spill * 0.9; a[..., 2] -= spill * 0.9
rgba = np.dstack([np.clip(a, 0, 255), alpha * 255]).astype(np.uint8)
im = Image.fromarray(rgba, 'RGBA')
ys, xs = np.where(alpha > 0.05)
if len(ys):
    pad = 24
    im = im.crop((max(0, xs.min() - pad), max(0, ys.min() - pad), min(im.width, xs.max() + pad), min(im.height, ys.max() + pad)))
# square canvas, content centered
s = max(im.width, im.height)
canvas = Image.new('RGBA', (s, s), (0, 0, 0, 0)); canvas.alpha_composite(im, ((s - im.width) // 2, (s - im.height) // 2))
canvas.resize((512, 512), Image.LANCZOS).save(out)
print(out, 'ok')
