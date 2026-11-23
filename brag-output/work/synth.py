"""Original soundtrack for the VESTIQ ad: 120 BPM, D minor, 62 s. Writes work/soundtrack.wav."""
from pathlib import Path

import numpy as np
from scipy.signal import butter, lfilter, sosfilt

SR, DUR, BPM = 44100, 62.0, 120
BEAT = 60 / BPM
N = int(SR * DUR)
rng = np.random.default_rng(7)
HERE = Path(__file__).resolve().parent


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(d):
    return np.arange(int(SR * d)) / SR


def add(buf, start, sig, pan=0.0, gain=1.0):
    i = int(start * SR)
    if i >= N:
        return
    sig = sig[: N - i] * gain
    l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    buf[i:i + len(sig), 0] += sig * l * 1.4142
    buf[i:i + len(sig), 1] += sig * r * 1.4142


def env(d, a=0.005, r=0.1):
    t = tt(d)
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / r)
    return e


def lp(x, fc, order=2):
    return sosfilt(butter(order, fc, 'low', fs=SR, output='sos'), x)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, 'high', fs=SR, output='sos'), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)


def saw(f, t, ph=0.0):
    return 2 * ((f * t + ph) % 1.0) - 1


# ---------------- arrangement ----------------
GROOVE = [(7.0, 54.0), (57.5, 61.0)]
in_groove = lambda s: any(a <= s < b for a, b in GROOVE)
PROG = [  # (bass root midi, pad voicing)
    (38, [50, 53, 57, 60, 64]),  # Dm9
    (34, [46, 50, 53, 57, 60]),  # Bbmaj9
    (31, [43, 46, 50, 53, 57]),  # Gm9
    (33, [45, 50, 52, 55, 57]),  # A7sus4
]
chord_at = lambda s: PROG[int(s // (4 * BEAT)) % 4]

music = np.zeros((N, 2))
drums = np.zeros((N, 2))
sfx = np.zeros((N, 2))

# pad: detuned saws per bar, wide stereo
for bar in range(int(DUR // (4 * BEAT)) + 1):
    s0 = bar * 4 * BEAT
    _, notes = chord_at(s0 + 0.01)
    d = 4 * BEAT + 0.6
    t = tt(d)
    e = np.minimum(1, t / 0.35) * np.minimum(1, np.maximum(0, (d - t) / 0.6))
    for k, m in enumerate(notes):
        f = hz(m)
        l = saw(f * 2 ** (-6 / 1200), t, 0.1 * k) + 0.5 * saw(f * 2 ** (7 / 1200), t, 0.37)
        r = saw(f * 2 ** (6 / 1200), t, 0.23 * k) + 0.5 * saw(f * 2 ** (-7 / 1200), t, 0.71)
        sig_l, sig_r = lp(l * e, 1400), lp(r * e, 1400)
        add(music, s0, sig_l, -0.6, 0.035)
        add(music, s0, sig_r, 0.6, 0.035)

# pluck arpeggio (16ths) from 1 s, with a dotted-8th echo
pl = np.zeros((N, 2))
for i in range(int((DUR - 1.0) / (BEAT / 4))):
    s = 1.0 + i * BEAT / 4
    if 54.0 <= s < 57.5 and i % 2:
        continue
    if s > 61.2:
        break
    _, notes = chord_at(s)
    seq = [notes[1] + 12, notes[2] + 12, notes[3] + 12, notes[4] + 12, notes[3] + 12, notes[2] + 12, notes[4] + 12, notes[2] + 24]
    m = seq[i % len(seq)]
    t = tt(0.4)
    tone = (np.sin(2 * np.pi * hz(m) * t) + 0.3 * np.sin(2 * np.pi * 2 * hz(m) * t)) * env(0.4, 0.002, 0.11)
    g = 0.05 if s < 7 else 0.06
    add(pl, s, tone, 0.35 if i % 2 else -0.35, g)
delay = int(SR * BEAT * 0.75)
pl[delay:] += 0.32 * pl[:-delay][:, ::-1]
music += pl

# drums
kick_t = tt(0.45)
kick = np.sin(2 * np.pi * np.cumsum(48 + 82 * np.exp(-kick_t / 0.035)) / SR) * np.exp(-kick_t / 0.28)
kick += 0.25 * np.exp(-kick_t / 0.004) * rng.standard_normal(len(kick_t))
clap_t = tt(0.3)
clap = bp(rng.standard_normal(len(clap_t)), 900, 2600) * (np.exp(-clap_t / 0.012) * 0.5 + np.exp(-np.maximum(0, clap_t - 0.012) / 0.12) * (clap_t > 0.012))
hat_t = tt(0.08)
hat = hp(rng.standard_normal(len(hat_t)), 7000) * np.exp(-hat_t / 0.025)
ohat_t = tt(0.4)
ohat = hp(rng.standard_normal(len(ohat_t)), 6500) * np.exp(-ohat_t / 0.16)
kicks = []
b = 0
while b * BEAT < DUR:
    s = b * BEAT
    if in_groove(s):
        add(drums, s, kick, 0, 0.9)
        kicks.append(s)
        if b % 2 == 1:
            add(drums, s, clap, 0.05, 0.32)
        add(drums, s + BEAT / 2, ohat if b % 8 == 7 else hat, 0.25, 0.10 if b % 8 == 7 else 0.16)
        add(drums, s + BEAT / 4, hat, -0.2, 0.05)
        add(drums, s + 3 * BEAT / 4, hat, -0.2, 0.05)
    elif 5.0 <= s < 7.0:
        add(drums, s + BEAT / 2, hat, 0.25, 0.08)
    b += 1

# bass: offbeat 8ths on the root, sub sine + a touch of drive
bass = np.zeros((N, 2))
b = 0
while b * BEAT < DUR:
    s = b * BEAT + BEAT / 2
    if in_groove(s):
        root, _ = chord_at(s)
        m = root + (12 if b % 4 == 3 else 0)
        t = tt(BEAT * 0.48)
        e = np.minimum(1, t / 0.006) * np.minimum(1, (BEAT * 0.48 - t) / 0.03)
        sig = np.tanh(1.6 * np.sin(2 * np.pi * hz(m) * t)) * e
        add(bass, s, sig, 0, 0.30)
    b += 1
music += bass

# sidechain the music to the kick
duck = np.ones(N)
for s in kicks:
    i = int(s * SR)
    t = tt(0.32)
    duck[i:i + len(t)] = np.minimum(duck[i:i + len(t)], 1 - 0.55 * np.exp(-t / 0.09))
music *= duck[:, None]

# section filters: fitting (26–30.5) and privacy breakdown (54–57.5) are low-passed
def window(a, b, ramp=0.4):
    t = np.arange(N) / SR
    return np.clip(np.minimum((t - a) / ramp, (b - t) / ramp), 0, 1)

for a, b2, fc in [(26.1, 30.5, 900), (53.9, 57.6, 700)]:
    w = window(a, b2)[:, None]
    music = music * (1 - w) + np.stack([lp(music[:, 0], fc), lp(music[:, 1], fc)], 1) * w
# intro filter opening 0–7
tline = np.arange(N) / SR
op = np.clip(tline / 7.0, 0, 1)[:, None]
music = music * (0.35 + 0.65 * op) * 1.0
mix = music + drums

# ---------------- sound effects, in key, under the music ----------------
def whoosh(d=0.55, lo=300, hi=3200):
    t = tt(d)
    noise = rng.standard_normal(len(t))
    out = np.zeros_like(t)
    steps = 24
    for k in range(steps):
        a, b2 = k * len(t) // steps, (k + 1) * len(t) // steps
        f = lo * (hi / lo) ** (k / steps)
        out[a:b2] = bp(noise, f * 0.7, min(f * 1.4, SR / 2 - 100))[a:b2]
    return out * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5

def tock(m=50):
    t = tt(0.25)
    return (np.sin(2 * np.pi * hz(m) * t) * np.exp(-t / 0.07) + 0.4 * lp(rng.standard_normal(len(t)), 2500) * np.exp(-t / 0.01))

def click(m=86):
    t = tt(0.06)
    return np.sin(2 * np.pi * hz(m) * t) * np.exp(-t / 0.012) + 0.3 * hp(rng.standard_normal(len(t)), 3000) * np.exp(-t / 0.004)

def beep(m=81, d=0.14):
    t = tt(d)
    return np.sin(2 * np.pi * hz(m) * t) * np.minimum(1, t / 0.006) * np.minimum(1, (d - t) / 0.03)

def bells(ms=(86, 89, 93, 96)):
    out = np.zeros(int(SR * 1.6))
    for k, m in enumerate(ms):
        t = tt(1.6 - k * 0.06)
        f = hz(m)
        tone = np.sin(2 * np.pi * f * t + 1.2 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t / 0.3)) * np.exp(-t / 0.45)
        i = int(k * 0.06 * SR)
        out[i:i + len(tone)] += tone
    return out

def impact():
    t = tt(1.4)
    boom = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-t / 0.08)) / SR) * np.exp(-t / 0.5)
    return boom + 0.3 * lp(rng.standard_normal(len(t)), 1800) * np.exp(-t / 0.18)

def riser(d=2.0):
    t = tt(d)
    noise = rng.standard_normal(len(t))
    out = np.zeros_like(t)
    for k in range(20):
        a, b2 = k * len(t) // 20, (k + 1) * len(t) // 20
        f = 500 * (6000 / 500) ** (k / 20)
        out[a:b2] = bp(noise, f * 0.8, min(f * 1.25, SR / 2 - 100))[a:b2]
    return out * (t / d) ** 2

for s in (0.25, 0.39, 0.53, 57.75, 57.88, 58.01):
    add(sfx, s + 0.35, tock(50), 0, 0.35)
add(sfx, 5.0, riser(2.0), 0, 0.22)
for s in (7.0, 57.5):
    add(sfx, s, impact(), 0, 0.55)
for s in (6.6, 9.75, 17.3, 25.8, 30.25, 39.75, 43.2, 45.55, 49.75, 53.7, 57.25):
    add(sfx, s, whoosh(), 0, 0.10)
for s in (11.8, 20.0, 25.4, 41.2, 42.7):
    add(sfx, s, click(86), 0.1, 0.28)
for s in (12.0, 13.0, 14.0):
    add(sfx, s, beep(81), 0, 0.16)
t_sh = tt(0.12)
shutter = bp(rng.standard_normal(len(t_sh)), 1800, 7000) * np.exp(-t_sh / 0.02)
add(sfx, 15.0, shutter, 0, 0.42)
add(sfx, 15.06, shutter * 0.7, 0, 0.36)
add(sfx, 15.0, tock(38), 0, 0.3)
for s in (30.65, 45.95):
    add(sfx, s, bells(), 0.15, 0.10)
add(sfx, 36.6, beep(86, 0.09), 0, 0.14)
add(sfx, 36.75, beep(86, 0.09), 0, 0.14)
# final hit and tail
add(sfx, 61.0, impact(), 0, 0.5)
_, final = chord_at(60.99)
stab_t = tt(1.0)
stab = sum(lp(saw(hz(m), stab_t), 2200) for m in final) * np.exp(-stab_t / 0.35)
add(sfx, 61.0, stab, 0, 0.05)

sfx = lp(sfx[:, 0], 9000)[:, None] * np.array([[1, 0]]) + lp(sfx[:, 1], 9000)[:, None] * np.array([[0, 1]])
mix = mix + sfx * 0.85

# ---------------- master ----------------
mix = hp(mix[:, 0], 28)[:, None] * np.array([[1, 0]]) + hp(mix[:, 1], 28)[:, None] * np.array([[0, 1]])
mix = mix / np.max(np.abs(mix)) * 1.2
mix = np.tanh(mix) / np.tanh(1.2)
fade = np.clip((DUR - tline) / 0.6, 0, 1)[:, None]
mix = mix * fade * 0.89
pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
import wave
with wave.open(str(HERE / 'soundtrack.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
rms = 20 * np.log10(np.sqrt(np.mean(mix ** 2)) + 1e-9)
print(f"soundtrack.wav  {DUR:.0f}s  peak {20*np.log10(np.max(np.abs(mix))):.1f} dBFS  rms {rms:.1f} dBFS")
