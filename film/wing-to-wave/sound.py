#!/usr/bin/env python3
"""
Three-note motif for the fire -> wing -> wave study (original, synthesised).

  D4  at 0.28 s  dry, close: a muted wooden pluck, no room at all   (fire)
  A4  at 1.95 s  carried on a breath of filtered air as the wing lifts (air)
  E5  at 3.55 s  starts dark, its filter and its room open into the wave (water)

Rising fifths (D-A-E): each element is the previous one, opened a little.
Silence is left around the wing's movement; the picture works without sound.

  python3 -I sound.py out.wav
"""
import sys
import wave

import numpy as np
from scipy import signal

SR = 48000
DUR = 7.0
N = int(SR * DUR)
rng = np.random.default_rng(1)
t = np.arange(N) / SR


def env_adsr(n, a, d, s, r, hold):
    a, d, r, hold = (int(x * SR) for x in (a, d, r, hold))
    e = np.concatenate([np.linspace(0, 1, max(a, 1)), np.linspace(1, s, max(d, 1)),
                        np.full(max(hold, 1), s), np.linspace(s, 0, max(r, 1))])
    out = np.zeros(n)
    out[:min(n, len(e))] = e[:n]
    return out


def place(buf, x, at):
    i = int(at * SR)
    m = min(len(x), len(buf) - i)
    buf[i:i + m] += x[:m]


def pluck(freq, dur, damp=0.55):
    """Karplus-Strong with heavy damping: a muted, woody note."""
    n = int(dur * SR)
    p = int(SR / freq)
    buf = rng.uniform(-1, 1, p) * np.hanning(p)
    out = np.zeros(n)
    for i in range(n):
        v = buf[i % p]
        out[i] = v
        buf[i % p] = damp * 0.5 * (v + buf[(i + 1) % p]) + (1 - damp) * 0.5 * v
    b, a = signal.butter(2, [90, 3800], 'bandpass', fs=SR)
    out = signal.lfilter(b, a, out)
    click = np.zeros(n)
    click[:180] = rng.normal(0, 1, 180) * np.exp(-np.arange(180) / 25)
    return (out / np.abs(out).max() + 0.25 * click) * np.exp(-np.arange(n) / (0.11 * SR))


def breath(dur, f0, f1):
    n = int(dur * SR)
    x = rng.normal(0, 1, n)
    out = np.zeros(n)
    blk = 1024
    fc = np.geomspace(f0, f1, n // blk + 1)
    zi = None
    for k in range(0, n, blk):
        c = fc[k // blk]
        b, a = signal.butter(2, [c * 0.6, c * 1.6], 'bandpass', fs=SR)
        if zi is None:
            zi = signal.lfilter_zi(b, a) * 0
        seg, zi = signal.lfilter(b, a, x[k:k + blk], zi=zi)
        out[k:k + blk] = seg
    shape = np.sin(np.pi * np.linspace(0, 1, n)) ** 1.6
    return out / np.abs(out).max() * shape


def airy_tone(freq, dur):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    vib = 1 + 0.003 * np.sin(2 * np.pi * 4.6 * tt) * np.clip(tt / 0.6, 0, 1)
    ph = 2 * np.pi * freq * np.cumsum(vib) / SR
    tone = np.sin(ph) + 0.18 * np.sin(2 * ph) + 0.05 * np.sin(3 * ph)
    b, a = signal.butter(2, [freq * 0.8, freq * 3.5], 'bandpass', fs=SR)
    air = signal.lfilter(b, a, rng.normal(0, 1, n))
    air /= np.abs(air).max()
    e = env_adsr(n, 0.22, 0.4, 0.55, 0.9, max(dur - 1.52, 0.01))
    return (0.8 * tone + 0.35 * air) * e


def opening_bell(freq, dur):
    """glassy note whose low-pass opens over ~1.4 s"""
    n = int(dur * SR)
    tt = np.arange(n) / SR
    partials = [(1, 1.0, 1.9), (2.0, 0.30, 1.2), (2.76, 0.16, 0.8), (4.07, 0.07, 0.5), (0.5, 0.10, 2.2)]
    x = sum(a * np.sin(2 * np.pi * freq * r * tt + rng.uniform(0, 6)) * np.exp(-tt / d) for r, a, d in partials)
    out = np.zeros(n)
    blk = 512
    zi = None
    for k in range(0, n, blk):
        c = 500 * (1 + 14 * min(k / SR / 1.4, 1.0) ** 1.5)
        b, a = signal.butter(2, min(c, 18000), 'lowpass', fs=SR)
        if zi is None:
            zi = np.zeros(max(len(a), len(b)) - 1)
        seg, zi = signal.lfilter(b, a, x[k:k + blk], zi=zi)
        out[k:k + blk] = seg
    att = np.clip(tt / 0.035, 0, 1)
    return out * att


def reverb_ir(t60, seed):
    r = np.random.default_rng(seed)
    n = int(t60 * SR)
    tt = np.arange(n) / SR
    ir = r.normal(0, 1, n) * np.exp(-6.9 * tt / t60)
    b, a = signal.butter(1, 5200, 'lowpass', fs=SR)
    ir = signal.lfilter(b, a, ir)
    ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    return ir / np.sqrt((ir ** 2).sum())


def main(path):
    dry = np.zeros((N, 2))
    wet_send = np.zeros(N)

    # 1. fire: dry, close, centred
    p = pluck(293.66, 0.9) * 0.40
    for ch in range(2):
        place(dry[:, ch], p, 0.28)

    # 2. air: breath carries the wing (1.72-3.30), a soft A4 rides on it
    br = breath(1.6, 650, 1900) * 0.10
    place(dry[:, 0], br * 0.9, 1.72); place(dry[:, 1], br * 1.1, 1.74)
    place(wet_send, br * 0.6, 1.72)
    a4 = airy_tone(440.0, 1.9) * 0.24
    place(dry[:, 0], a4 * 0.8, 1.95); place(dry[:, 1], a4, 1.95)
    place(wet_send, a4 * 0.9, 1.95)

    # 3. water: E5 opens into the room, with a low sea-wash under it
    e5 = opening_bell(659.26, 3.45) * 0.12
    place(dry[:, 0], e5, 3.55); place(dry[:, 1], e5 * 0.9, 3.56)
    place(wet_send, e5 * 1.6, 3.55)
    wash_n = int(3.4 * SR)
    b, a = signal.butter(2, [120, 900], 'bandpass', fs=SR)
    wash = signal.lfilter(b, a, rng.normal(0, 1, wash_n))
    wt = np.arange(wash_n) / SR
    wash *= (np.clip(wt / 1.3, 0, 1) ** 2) * np.exp(-np.clip(wt - 1.3, 0, None) / 1.1)
    wash = wash / np.abs(wash).max() * 0.07
    place(dry[:, 0], wash, 3.6); place(dry[:, 1], np.roll(wash, 900), 3.6)
    place(wet_send, wash, 3.6)
    # the foam strand: a few grains of high noise
    gn = int(0.5 * SR)
    b, a = signal.butter(2, 6500, 'highpass', fs=SR)
    grains = signal.lfilter(b, a, rng.normal(0, 1, gn) * (rng.random(gn) < 0.004))
    grains *= np.exp(-np.arange(gn) / (0.18 * SR))
    grains = grains / np.abs(grains).max() * 0.05
    place(dry[:, 0], grains, 4.88); place(dry[:, 1], grains * 0.6, 4.90)

    # room (only the air and water notes are sent)
    wet = np.stack([signal.fftconvolve(wet_send, reverb_ir(2.8, s))[:N] for s in (11, 12)], -1) * 0.55
    mix = dry + wet
    fade = int(0.12 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
    mix = mix / np.abs(mix).max() * 10 ** (-6 / 20)   # restrained: ~-18 LUFS, peaks -6 dBFS
    pcm = (mix * 32767).astype(np.int16)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print('wrote', path)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'motif.wav')
