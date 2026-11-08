#!/usr/bin/env python3
"""Print character height ratio of a clip's first and last frame vs reference frames.
Usage: measure-clip.py clip.mp4 first_ref.jpg last_ref.jpg -> prints 'r0 r1'. Ignores sparks/smoke by requiring >=14 px per row."""
import sys, subprocess, tempfile, os
import numpy as np
from PIL import Image
clip, r0, r1 = sys.argv[1:4]
bg = np.array([15, 15, 35], dtype=np.float32)
def height(img):
    a = np.array(img.convert('RGB').resize((720, 1280)), dtype=np.float32)
    border = np.concatenate([a[:12].reshape(-1, 3), a[-12:].reshape(-1, 3), a[:, :12].reshape(-1, 3), a[:, -12:].reshape(-1, 3)])
    m = np.sqrt(((a - np.median(border, axis=0)) ** 2).sum(-1)) > 30
    rows = np.where(m.sum(1) >= 14)[0]
    return rows.max() - rows.min()
tmp = tempfile.mkdtemp()
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', clip, '-vf', "select='eq(n\\,0)'", '-frames:v', '1', f'{tmp}/a.png'], check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-sseof', '-0.1', '-i', clip, '-frames:v', '1', f'{tmp}/b.png'], check=True)
h0, h1 = height(Image.open(f'{tmp}/a.png')), height(Image.open(f'{tmp}/b.png'))
print(f'{h0/height(Image.open(r0)):.2f} {h1/height(Image.open(r1)):.2f}')
