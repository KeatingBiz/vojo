#!/usr/bin/env python3
"""Turn a raw Omni clip (720x1280, flat #0F0F23 bg) into a transparent HEVC .mov for expo-video.
Usage: process-mojo-clip.py <in.mp4> <out.mov> [--webp out.webp]
"""
import sys, os, glob, shutil, subprocess, tempfile
import numpy as np
from PIL import ImageFilter
from scipy import ndimage
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
bg = np.array([15, 15, 35], dtype=np.float32)
opts = dict(zip(sys.argv[3::2], sys.argv[4::2]))
webp = opts.get('--webp')
crop = opts.get('--crop', '640:640:40:320')  # w:h:x:y inside the 720x1280 source
fit = opts.get('--fit')
fit_ramp = opts.get('--fit-ramp')  # 'ref0.jpg,ref1.jpg': per-frame scale ramp so BOTH ends match their references
pingpong = '--pingpong' in sys.argv[3:]  # loops: append the reversed frames so the boundary is motion-continuous  # reference jpg: rescale the clip so the character matches the reference size/base position

def _geom(img):
    a = np.array(img.convert('RGB').resize((720, 1280)), dtype=np.float32)
    border = np.concatenate([a[:12].reshape(-1, 3), a[-12:].reshape(-1, 3), a[:, :12].reshape(-1, 3), a[:, -12:].reshape(-1, 3)])
    m = np.sqrt(((a - np.median(border, axis=0)) ** 2).sum(-1)) > 30
    rows = np.where(m.sum(1) >= 14)[0]; cols = np.where(m.sum(0) >= 14)[0]
    return rows.max() - rows.min(), rows.max(), (cols.min() + cols.max()) / 2

pre = ''
if fit:
    t0 = tempfile.mkdtemp()
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vf', "select='eq(n\\,0)'", '-frames:v', '1', f'{t0}/f.png'], check=True)
    _f0 = np.array(Image.open(f'{t0}/f.png').convert('RGB'), dtype=np.float32)
    fbg0 = np.median(np.concatenate([_f0[:12].reshape(-1, 3), _f0[-12:].reshape(-1, 3)]), axis=0)
    h_ref, bot_ref, cx_ref = _geom(Image.open(fit))
    h_clip, bot_clip, cx_clip = _geom(Image.open(f'{t0}/f.png'))
    r = h_clip / h_ref
    cw, ch, cx0, cy0 = map(int, crop.split(':'))
    # After scaling by 1/r, place the character's base and center where the reference's would land in the standard crop.
    x = int(round(cx_clip / r - (cx_ref - cx0)))
    y = int(round(bot_clip / r - (bot_ref - cy0)))
    pre = f'scale=iw/{r:.4f}:ih/{r:.4f},pad=iw+1440:ih+2560:720:1280:color=0x{int(fbg0[0]):02X}{int(fbg0[1]):02X}{int(fbg0[2]):02X},'
    crop = f'{cw}:{ch}:{x + 720}:{y + 1280}'
    print(f'fit: ratio {r:.2f} -> crop {crop}')
tmp = tempfile.mkdtemp()
if fit_ramp:
    # Extract full frames, measure drift at both ends, and rescale each frame around the character's base.
    ref0, ref1 = fit_ramp.split(',')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vf', 'fps=24', f'{tmp}/r%03d.png'], check=True)
    raw = sorted(glob.glob(f'{tmp}/r*.png'))
    g0, g1 = _geom(Image.open(raw[0])), _geom(Image.open(raw[-1]))
    R0, R1 = _geom(Image.open(ref0)), _geom(Image.open(ref1))
    r0, r1 = g0[0] / R0[0], g1[0] / R1[0]
    print(f'fit-ramp: start {r0:.2f}x -> end {r1:.2f}x')
    f0 = np.array(Image.open(raw[0]).convert('RGB'), dtype=np.float32)
    bgc = tuple(int(v) for v in np.median(np.concatenate([f0[:12].reshape(-1, 3), f0[-12:].reshape(-1, 3)]), axis=0))
    cw, ch, cx0, cy0 = map(int, crop.split(':'))
    for i, f in enumerate(raw):
        t = i / max(1, len(raw) - 1)
        r = r0 + (r1 - r0) * t
        bot = R0[1] + (R1[1] - R0[1]) * t; cxr = R0[2] + (R1[2] - R0[2]) * t
        gi = _geom(Image.open(f))
        im = Image.open(f).convert('RGB'); W, H = im.size
        sw, sh = int(round(W / r)), int(round(H / r))
        im = im.resize((sw, sh), Image.LANCZOS)
        canvas = Image.new('RGB', (W, H), bgc)
        # place so the character's base and center land where the (interpolated) reference's do
        ox = int(round(cxr - gi[2] / r)); oy = int(round(bot - gi[1] / r))
        canvas.paste(im, (ox, oy))
        canvas.crop((cx0, cy0, cx0 + cw, cy0 + ch)).save(f'{tmp}/f{i:03d}.png')
else:
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vf', f'{pre}crop={crop},fps=24', f'{tmp}/f%03d.png'], check=True)
frames = []
for i, f in enumerate(sorted(glob.glob(f'{tmp}/f*.png'))):
    a = np.array(Image.open(f).convert('RGB'), dtype=np.float32)
    # Per-frame background: median of the frame border. The model sometimes blooms the whole
    # backdrop in bright frames, which a fixed navy would misread as character.
    border = np.concatenate([a[:12].reshape(-1, 3), a[-12:].reshape(-1, 3), a[:, :12].reshape(-1, 3), a[:, -12:].reshape(-1, 3)])
    fbg = np.median(border, axis=0)
    dist = np.sqrt(((a - fbg) ** 2).sum(-1))
    alpha = np.clip((dist - 12) / 40.0, 0, 1)
    alpha = alpha * alpha * (3 - 2 * alpha)  # smoothstep
    # Soft edge may only extend a few px beyond solidly-foreground pixels, so lit halos can't ride along.
    hard = dist > 60
    near = ndimage.binary_dilation(hard, iterations=5)
    alpha = np.where(near, alpha, 0)
    # Spill suppression for bright keys (magenta/green): pull the key hue out of edge pixels.
    if fbg.max() > 200 and fbg.min() < 60:
        key_is_magenta = fbg[0] > 200 and fbg[2] > 200
        if key_is_magenta:
            spill = np.clip(np.minimum(a[..., 0], a[..., 2]) - a[..., 1], 0, None)
            a = a.copy(); a[..., 0] -= spill * 0.85; a[..., 2] -= spill * 0.85
        else:  # green
            spill = np.clip(a[..., 1] - np.maximum(a[..., 0], a[..., 2]), 0, None)
            a = a.copy(); a[..., 1] -= spill * 0.85
    # Premultiply so fully transparent pixels carry no color at all (otherwise the compositor can
    # show a faint tinted box the size of the video).
    rgb = a if os.environ.get('STRAIGHT_ALPHA') else a * alpha[..., None]
    # Drop floating sparks/embers: keep only connected blobs at least 2% the size of the biggest one.
    lab, n = ndimage.label(alpha > 0.5)
    if n > 1:
        sizes = ndimage.sum(np.ones_like(alpha), lab, range(1, n + 1))
        keep = np.isin(lab, [i + 1 for i, sz in enumerate(sizes) if sz >= 0.08 * sizes.max()])
        alpha = np.where(ndimage.binary_dilation(keep, iterations=3), alpha, 0)
    alpha = np.array(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8)), dtype=np.float32) / 255
    # Spill suppression for bright keys (magenta/green): pull the key hue out of edge pixels.
    if fbg.max() > 200 and fbg.min() < 60:
        key_is_magenta = fbg[0] > 200 and fbg[2] > 200
        if key_is_magenta:
            spill = np.clip(np.minimum(a[..., 0], a[..., 2]) - a[..., 1], 0, None)
            a = a.copy(); a[..., 0] -= spill * 0.85; a[..., 2] -= spill * 0.85
        else:  # green
            spill = np.clip(a[..., 1] - np.maximum(a[..., 0], a[..., 2]), 0, None)
            a = a.copy(); a[..., 1] -= spill * 0.85
    # Premultiply so fully transparent pixels carry no color at all (otherwise the compositor can
    # show a faint tinted box the size of the video).
    rgb = a if os.environ.get('STRAIGHT_ALPHA') else a * alpha[..., None]
    im = Image.fromarray(np.dstack([rgb, alpha * 255]).astype(np.uint8), 'RGBA')
    im.save(f'{tmp}/a{i:03d}.png')
    frames.append(im)
if pingpong:
    n = len(frames)
    for j, i in enumerate(range(n - 2, 0, -1)):  # skip duplicate endpoints
        frames[i].save(f'{tmp}/a{n + j:03d}.png')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '24', '-i', f'{tmp}/a%03d.png', '-c:v', 'hevc_videotoolbox',
                '-alpha_quality', '1.0', '-q:v', '70', '-tag:v', 'hvc1', '-pix_fmt', 'bgra', '-movflags', '+faststart', '-an', out], check=True)
if webp:
    small = [f.resize((448, 448), Image.LANCZOS) for f in frames]
    small[0].save(webp, save_all=True, append_images=small[1:], duration=int(1000 / 24), loop=0, quality=80, method=4)
shutil.rmtree(tmp)
print(f'{os.path.basename(out)}: {len(frames) * (2 if pingpong else 1) - (2 if pingpong else 0)} frames, {os.path.getsize(out)//1024} KB')
