"""Normalize any upload to 16 kHz mono WAV and reject clips we cannot grade."""
from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
import wave
from dataclasses import dataclass

import numpy as np

from vojo_speech import config


class AudioError(ValueError):
    """User-facing audio problem (too short, silent, undecodable)."""


@dataclass
class NormalizedAudio:
    path: str
    duration_s: float
    samples: np.ndarray  # float32, -1..1, mono @ 16k
    sample_rate: int = config.SAMPLE_RATE


def ffmpeg_bin() -> str:
    found = shutil.which("ffmpeg")
    if found:
        return found
    import imageio_ffmpeg  # bundled static binary (works on Vercel)

    return imageio_ffmpeg.get_ffmpeg_exe()


def normalize(src_path: str, out_dir: str | None = None) -> NormalizedAudio:
    out_dir = out_dir or tempfile.mkdtemp(prefix="vojo-")
    out = os.path.join(out_dir, "normalized.wav")
    cmd = [ffmpeg_bin(), "-y", "-loglevel", "error", "-i", src_path, "-ac", "1", "-ar", str(config.SAMPLE_RATE), "-c:a", "pcm_s16le", out]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0 or not os.path.exists(out):
        raise AudioError(f"Could not decode audio: {proc.stderr.strip()[:200] or 'ffmpeg failed'}")
    with wave.open(out, "rb") as w:
        n = w.getnframes()
        sr = w.getframerate()
        raw = w.readframes(n)
    samples = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    duration = n / sr
    if duration < config.MIN_CLIP_SECONDS:
        raise AudioError(f"Clip is {duration:.1f}s. Speak for at least {config.MIN_CLIP_SECONDS:.0f} seconds.")
    if duration > config.MAX_CLIP_SECONDS:
        raise AudioError(f"Clip is {duration:.0f}s. Maximum is {config.MAX_CLIP_SECONDS:.0f} seconds.")
    rms = float(np.sqrt(np.mean(samples**2))) if n else 0.0
    if rms < config.SILENT_RMS:
        raise AudioError("The recording is silent. Check the microphone and try again.")
    return NormalizedAudio(path=out, duration_s=duration, samples=samples, sample_rate=sr)
