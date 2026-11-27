#!/usr/bin/env python3
"""
EditaDesign | "Chaos, by design." — motion study 01: fire -> wing -> wave
7.0 s, 1920x1080, 24 fps.

One drawn edge changes meaning three times. A flame filament bends, the bend
passes into a butterfly's wing root, the wing opens from its hinge into an arch
whose underside is the hollow of a wave, and the wing's upper edge rolls
forward into the lip of the supplied wave painting.

Technique (all editable, all in this file):
  * Two plates rebuilt from the screenshots at native resolution
      - FIRE: 1000158906.jpg, artwork only (phone/Pinterest UI cropped away),
        linework re-inked: soft palette re-quantisation of a cubic upscale,
        so the screen-print edges stay crisp at 5x.
      - WAVE: 1000158936.jpg, artwork only, Lanczos 2.18x + gentle unsharp.
  * One deforming strip mesh (u along the edge, v across it) carries BOTH
    textures.  Its contour is hand keyed at the same landmarks on both
    artworks: hinge/base (P1), highest point of the arch (P3), inflection (P4),
    tip/lip (P6).  The mesh moves through three poses:
        R  rest wing   (traced on the fire art)
        O  open wing   (the wave's silhouette at 0.45 scale, hinged at the
                        butterfly's real wing root: the "double reading")
        V  wave lip    (traced on the wave art)
    Texture is sampled through the mesh, so ink and paint stay anchored to the
    surface while it bends.
  * Wing->wave texture handoff travels from the shared (upper) edge inward as
    striation-shaped fingers running along u — the direction of both the wing
    veins and the wave's brush striations.
  * Everything outside the silhouette "settles": each pixel passes through a
    soft, defocused colour field from fire to wave, started by its distance to
    the moving contour (warm side first).  No picture-in-picture, no iris,
    no global dissolve.

Usage:
  python3 -I render.py --src /path/to/originals --out frames/      # all frames
  python3 -I render.py --src ... --out preview/ --frames 0,40,80   # some frames
  python3 -I render.py --src ... --out locked/ --locked            # no camera drift
"""
import argparse
import math
import os
import sys

import cv2
import numpy as np

W, H, FPS, DUR = 1920, 1080, 24, 7.0
NF = int(round(FPS * DUR))  # 168

# ---------------------------------------------------------------------------
# Framing of the two artworks (source pixel -> screen pixel)
# ---------------------------------------------------------------------------
FIRE_SRC, WAVE_SRC = "1000158906.jpg", "1000158936.jpg"
FS, FX0, FY0 = 5.0, 328.0, 730.0             # close view: butterfly + flame
WS, WX0, WY0 = 1920.0 / 882.0, 31.0, 385.0   # artwork width = frame width


def f2s(p):
    p = np.asarray(p, np.float64)
    return np.stack([(p[..., 0] - FX0) * FS, (p[..., 1] - FY0) * FS], -1)


def w2s(p):
    p = np.asarray(p, np.float64)
    return np.stack([(p[..., 0] - WX0) * WS, (p[..., 1] - WY0) * WS], -1)


# ---------------------------------------------------------------------------
# Hand-keyed contours (source pixel coordinates, read at native resolution).
# Each edge runs root -> tip.  LM gives the polyline index of landmarks P0..P6.
#   P0 base (exists only on the wave: the body below the hinge)
#   P1 hinge / wing root  <->  where the lip leaves the wave body
#   P2 shoulder           <->  crest (outer)  /  back of the tube (inner)
#   P3 highest point of the wing arch  <->  top of the hollow
#   P4 inflection
#   P5 pre-tip
#   P6 wing tip  <->  lip
# A = upper / outer edge,  B = lower / inner (hollow) edge.
# ---------------------------------------------------------------------------
WING_A = [(571.5, 873.5), (563.3, 877.5), (558.0, 879.0), (553.3, 880.0), (546.0, 882.5),
          (543.3, 883.3), (537.0, 886.5), (535.0, 887.5), (530.5, 890.5), (529.2, 891.7),
          (526.3, 895.8)]
WING_A_LM = [0, 0, 2, 4, 6, 8, 10]
WING_B = [(586.0, 910.0), (583.5, 915.0), (581.7, 917.5), (576.0, 917.3), (571.7, 917.0),
          (561.7, 915.8), (551.7, 914.2), (543.3, 911.7), (539.0, 909.0), (535.8, 906.7),
          (530.5, 903.0), (529.2, 901.7), (526.3, 895.8)]
WING_B_LM = [0, 0, 4, 6, 8, 10, 12]

WAVE_A = [(916, 884), (916, 421), (893, 413), (873, 401), (853, 396), (833, 393), (793, 389),
          (753, 390), (713, 389), (673, 390), (633, 395), (593, 402), (553, 412), (513, 426),
          (473, 442), (433, 463), (393, 490), (362, 520), (338, 550), (315, 580), (298, 610),
          (282, 640), (268, 670), (258, 700), (250, 730), (245, 760), (240, 785), (242, 792)]
WAVE_A_LM = [0, 1, 7, 14, 18, 24, 27]
WAVE_B = [(657, 884), (651, 850), (645, 825), (636, 800), (623, 775), (611, 750), (593, 725),
          (570, 700), (550, 682), (525, 668), (500, 660), (475, 654), (450, 652), (425, 653),
          (400, 657), (375, 662), (350, 671), (325, 686), (303, 705), (283, 728), (266, 752),
          (252, 775), (242, 792)]
WAVE_B_LM = [0, 4, 7, 12, 17, 20, 22]

# samples per landmark segment (P0-P1, P1-P2, ..., P5-P6)
SEG_N = [60, 70, 70, 60, 40, 30]
NV = 48

# flame filament the bend travels along (fire source px): the yellow line of
# the flame band under the butterfly, rising into the flame that touches the
# wing at its root
FLAME_PATH = [(480, 944.4), (508, 941.6), (528, 939.2), (548, 936.8), (564, 934.4), (578, 930.8),
              (588, 926.4), (594, 921.0), (595, 916.0), (591, 912.4)]

# ---------------------------------------------------------------------------
# Timing (seconds)
# ---------------------------------------------------------------------------
T_BEND0, T_BEND1 = 0.25, 1.70        # bend travels up the filament
T_VEIN0, T_VEIN1 = 1.62, 2.10        # same bend runs root -> tip along the wing
T_OPEN0, T_OPEN_DUR, T_OPEN_LAG = 1.80, 0.95, 0.38   # root leads, edge follows
T_ROLL0, T_ROLL_DUR = 3.45, 1.35     # wing -> wave silhouette
T_TEX0, T_TEX_DUR = 3.62, 1.10       # striations travel in from the shared edge
T_BG_WARM, T_BG_SKY = 3.60, 3.95     # settle of the negative space
T_FOAM = 4.86                        # foam strand breaks free
K_OPEN = 0.50                        # open-wing scale of the wave silhouette
O_WING_TURN = 42.0                   # degrees the wing turns up on its hinge
O_WING_BLEND = 0.30                  # how much of the wing's own shape the open pose keeps


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def ease_io(x):
    x = np.clip(x, 0.0, 1.0)
    return np.where(x < 0.5, 4 * x ** 3, 1 - (-2 * x + 2) ** 3 / 2)


def spring(x, zeta=0.42, omega=9.0):
    """Damped step response, 0 -> 1 with a small overshoot that settles."""
    x = np.clip(x, 0.0, None)
    wd = omega * math.sqrt(1 - zeta ** 2)
    y = 1 - np.exp(-zeta * omega * x) * (np.cos(wd * x) + zeta / math.sqrt(1 - zeta ** 2) * np.sin(wd * x))
    return y


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------
def resample_edge(pts, lms, seg_n):
    pts = np.asarray(pts, np.float64)
    out = []
    for k in range(len(lms) - 1):
        a, b = lms[k], lms[k + 1]
        n = seg_n[k]
        if a == b:
            out.append(np.repeat(pts[a][None], n, 0))
            continue
        seg = pts[a:b + 1]
        d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(seg, axis=0), axis=1))]
        s = np.linspace(0, d[-1], n, endpoint=False)
        out.append(np.stack([np.interp(s, d, seg[:, 0]), np.interp(s, d, seg[:, 1])], -1))
    out.append(pts[lms[-1]][None])
    return np.concatenate(out, 0)


def offset_edge(e, amount, sign_y):
    """push an edge outward (normal chosen by sign of its y component)."""
    d = np.gradient(e, axis=0)
    n = np.stack([d[:, 1], -d[:, 0]], -1)
    n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-9
    flip = np.sign(n[:, 1]) != sign_y
    n[flip] *= -1
    return e + n * amount


def mesh_from_edges(A, B, nv=NV):
    v = np.linspace(0, 1, nv)
    return B[:, None, :] + v[None, :, None] * (A - B)[:, None, :]   # (Nu, Nv, 2)


NU = sum(SEG_N) + 1
U_LM = np.r_[0, np.cumsum(SEG_N)] / (NU - 1)       # u value of P0..P6
U = np.linspace(0, 1, NU)

# rest wing (screen); edges pushed out 1.4 src px so the ink outline is inside
R_A = offset_edge(f2s(resample_edge(WING_A, WING_A_LM, SEG_N)), 1.4 * FS, -1)
R_B = offset_edge(f2s(resample_edge(WING_B, WING_B_LM, SEG_N)), 1.4 * FS, +1)
# root segment (P0..P1) is collapsed on the hinge: keep exact hinge points there
n01 = SEG_N[0]
R_A[:n01 + 1] = f2s(WING_A[0]); R_B[:n01 + 1] = f2s(WING_B[0])
MESH_R = mesh_from_edges(R_A, R_B)

V_A = w2s(resample_edge(WAVE_A, WAVE_A_LM, SEG_N))
V_B = w2s(resample_edge(WAVE_B, WAVE_B_LM, SEG_N))
MESH_V = mesh_from_edges(V_A, V_B)

HINGE_B = f2s(WING_B[0])          # anatomical hinge, lower root (pivot)
HINGE_A = f2s(WING_A[0])
V_ANCHOR = V_B[n01]               # where the wave's inner wall leaves the body

# open pose: the wave silhouette at K_OPEN, pinned at the wing's hinge, blended
# with the real wing lifted (x1.3, toward the lens) and turned up on its hinge,
# so the open wing still has a wing's broad outer margin
MESH_O = HINGE_B + K_OPEN * (MESH_V - V_ANCHOR)
_ang = math.radians(O_WING_TURN)
_rot = np.array([[math.cos(_ang), -math.sin(_ang)], [math.sin(_ang), math.cos(_ang)]])
_wing_lift = HINGE_B + 1.3 * (MESH_R - HINGE_B) @ _rot.T
_wb = O_WING_BLEND * smoothstep(U_LM[1], U_LM[2], U)[:, None, None]
MESH_O = MESH_O * (1 - _wb) + _wing_lift * _wb
# the root cross-line stays a rigid hinge (same length as the real one),
# rotated to the direction the wave body will grow in
_hl = np.linalg.norm(HINGE_A - HINGE_B)
_vd = V_A[n01] - V_B[n01]; _vd /= np.linalg.norm(_vd)
O_ROOT_A = HINGE_B + _vd * _hl
for i in range(n01 + 1):
    MESH_O[i] = mesh_from_edges(O_ROOT_A[None], HINGE_B[None])[0]

# polar description of R and O about the hinge, for the opening rotation
def _polar(m):
    d = m - HINGE_B
    return np.hypot(d[..., 0], d[..., 1]), np.arctan2(d[..., 1], d[..., 0])


_rR, _thR = _polar(MESH_R)
_rO, _thO = _polar(MESH_O)
_dth = (_thO - _thR + np.pi) % (2 * np.pi) - np.pi
# (no unwrap: points next to the pivot have arbitrary angles)
_rO = np.where(_rO < 1e-6, _rR, _rO)


def pose_at(t):
    """Mesh positions (Nu, Nv, 2) at time t."""
    uu = U[:, None] * np.ones((1, NV))
    vv = np.linspace(0, 1, NV)[None, :] * np.ones((NU, 1))
    # --- Air: rotate about the hinge; root leads, outer edge follows, settles
    x = (t - T_OPEN0 - T_OPEN_LAG * uu) / T_OPEN_DUR
    zeta = 0.62 - 0.22 * uu            # outer edge carries more weight -> more overshoot
    p = np.zeros_like(x)
    for zz in np.unique(np.round(zeta, 3)):
        sel = np.isclose(np.round(zeta, 3), zz)
        p[sel] = spring(np.clip(x[sel], 0, None) * 1.0, zeta=float(zz), omega=7.5)
    p = np.where(x <= 0, 0.0, p)
    r = _rR + (_rO - _rR) * np.clip(p, 0, 1.15)
    th = _thR + _dth * p
    pos = HINGE_B + np.stack([r * np.cos(th), r * np.sin(th)], -1)
    # tiny bend riding root->tip along the wing (the flame's bend, carried on)
    vf = (t - T_VEIN0) / (T_VEIN1 - T_VEIN0)
    if 0 < vf < 1.3:
        u0 = U_LM[1] + vf * (1 - U_LM[1])
        g = np.exp(-0.5 * ((uu - u0) / 0.045) ** 2) * math.sin(math.pi * min(vf, 1.0))
        d = np.gradient(pos, axis=0)
        n = np.stack([d[..., 1], -d[..., 0]], -1)
        n /= np.linalg.norm(n, axis=-1, keepdims=True) + 1e-9
        pos = pos + n * (g * 9.0)[..., None]
    # --- Water: O -> V.  Body first, lip last, outer edge ahead of inner (roll)
    if t > T_ROLL0:
        lam = (t - T_ROLL0 - 0.30 * uu - 0.12 * (1 - vv)) / T_ROLL_DUR
        lam = ease_io(lam)
        posV = MESH_O + (MESH_V - MESH_O) * lam[..., None]
        # the lip pitches over: extra rotation of the outer third about P4
        piv = MESH_O[int(U_LM[4] * (NU - 1)), NV // 2] * (1 - lam[int(U_LM[4] * (NU - 1)), NV // 2]) + \
            MESH_V[int(U_LM[4] * (NU - 1)), NV // 2] * lam[int(U_LM[4] * (NU - 1)), NV // 2]
        w_lip = smoothstep(U_LM[4], 1.0, uu)
        ang = -0.30 * np.sin(np.pi * np.clip(lam, 0, 1)) ** 1.5 * w_lip
        d = posV - piv
        ca, sa = np.cos(ang), np.sin(ang)
        posV = piv + np.stack([d[..., 0] * ca - d[..., 1] * sa, d[..., 0] * sa + d[..., 1] * ca], -1)
        pos = posV
    return pos


# ---------------------------------------------------------------------------
# Plates
# ---------------------------------------------------------------------------
def build_fire_plate(src):
    a = cv2.imread(os.path.join(src, FIRE_SRC)).astype(np.float32) / 255.0
    # screen -> source map
    xs = FX0 + (np.arange(W) + 0.5) / FS - 0.5
    ys = FY0 + (np.arange(H) + 0.5) / FS - 0.5
    mx, my = np.meshgrid(xs.astype(np.float32), ys.astype(np.float32))
    up = cv2.remap(a, mx, my, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
    up = np.clip(up, 0, 1)
    # palette from the art's own colours (artwork only, no UI)
    crop = a[700:1000, 300:760].reshape(-1, 3)
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 60, 1e-4)
    cv2.setRNGSeed(7)
    _, _, cent = cv2.kmeans(crop, 12, None, crit, 6, cv2.KMEANS_PP_CENTERS)
    d = np.stack([((up - c) ** 2).sum(2) for c in cent], -1)
    wgt = np.exp(-(d - d.min(-1, keepdims=True)) / 0.0025)
    wgt /= wgt.sum(-1, keepdims=True)
    ink = np.einsum('hwk,kc->hwc', wgt, cent)
    sharp = up + 0.8 * (up - cv2.GaussianBlur(up, (0, 0), 2.2))
    plate = 0.68 * ink + 0.32 * np.clip(sharp, 0, 1)
    # printed grain, anchored to the paper
    rng = np.random.default_rng(11)
    g = cv2.GaussianBlur(rng.standard_normal((H, W)).astype(np.float32), (0, 0), 0.8)
    plate = plate * (1 + 0.035 * g[..., None])
    return np.clip(plate, 0, 1).astype(np.float32)


def build_wave_plate(src):
    b = cv2.imread(os.path.join(src, WAVE_SRC)).astype(np.float32) / 255.0
    xs = WX0 + (np.arange(W) + 0.5) / WS - 0.5
    ys = WY0 + (np.arange(H) + 0.5) / WS - 0.5
    mx, my = np.meshgrid(xs.astype(np.float32), ys.astype(np.float32))
    up = cv2.remap(b, mx, my, cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
    up = up + 0.45 * (up - cv2.GaussianBlur(up, (0, 0), 1.6))
    rng = np.random.default_rng(12)
    g = cv2.GaussianBlur(rng.standard_normal((H, W)).astype(np.float32), (0, 0), 0.7)
    up = up * (1 + 0.02 * g[..., None])
    return np.clip(up, 0, 1).astype(np.float32)


def poly_mask(mesh, scale=1.0):
    mesh = mesh[SEG_N[0]:]
    A = mesh[:, -1]; B = mesh[:, 0]
    poly = np.concatenate([A, B[::-1]], 0)
    m = np.zeros((H, W), np.uint8)
    cv2.fillPoly(m, [np.round(poly * 16).astype(np.int32)], 255, cv2.LINE_AA, shift=4)
    return m.astype(np.float32) / 255.0


def fill_sky(plate, mask8):
    """Replace the wing's rest area with the art's own night sky: its navy,
    its grain, and a few of its pale star dots (no smeared ink)."""
    hsv_lum = plate.mean(2)
    ring = cv2.dilate(mask8, np.ones((41, 41), np.uint8)) & ~mask8
    sky = (ring > 0) & (hsv_lum < 0.25) & (plate[..., 0] > plate[..., 2])
    navy = np.median(plate[sky], axis=0)
    rng = np.random.default_rng(21)
    fill = np.ones_like(plate) * navy
    g = cv2.GaussianBlur(rng.standard_normal((H, W)).astype(np.float32), (0, 0), 1.2)
    fill *= (1 + 0.05 * g[..., None])
    stars = np.zeros((H, W), np.uint8)
    ys, xs = np.where(mask8 > 0)
    for k in rng.choice(len(xs), 9, replace=False):
        cv2.circle(stars, (int(xs[k] * 16), int(ys[k] * 16)), int(rng.uniform(4, 8) * 16), 255, -1, cv2.LINE_AA, shift=4)
    stars = cv2.GaussianBlur(stars.astype(np.float32) / 255.0, (0, 0), 1.0)[..., None]
    fill = fill * (1 - stars) + np.array([0.78, 0.86, 0.82], np.float32) * stars
    a = cv2.GaussianBlur(mask8.astype(np.float32) / 255.0, (0, 0), 4)[..., None]
    return (plate * (1 - a) + fill * a).astype(np.float32)


def fit_similarity(src, dst):
    """least-squares similarity src->dst (Umeyama, no reflection)."""
    ms, md = src.mean(0), dst.mean(0)
    a, b = src - ms, dst - md
    cov = b.T @ a / len(src)
    U_, S_, Vt = np.linalg.svd(cov)
    D = np.eye(2)
    if np.linalg.det(U_ @ Vt) < 0:
        D[1, 1] = -1
    R = U_ @ D @ Vt
    k = np.trace(np.diag(S_) @ D) / (a ** 2).sum(1).mean()
    t = md - k * R @ ms
    return np.c_[k * R, t]


BLUR_LEVELS = [0, 2, 5, 10, 20]


def blur_stack(img):
    return np.stack([img if s == 0 else cv2.GaussianBlur(img, (0, 0), s) for s in BLUR_LEVELS], 0)


def sample_stack(stack, b):
    """per-pixel blur amount b in [0,1] -> interpolate between levels"""
    f = np.clip(b, 0, 1) * (len(BLUR_LEVELS) - 1)
    i0 = np.floor(f).astype(np.int32); i1 = np.minimum(i0 + 1, len(BLUR_LEVELS) - 1)
    w = (f - i0)[..., None]
    out = np.empty(stack.shape[1:], np.float32)
    for k in range(len(BLUR_LEVELS)):
        s0 = i0 == k; s1 = i1 == k
        if s0.any():
            out[s0] = stack[k][s0] * (1 - w[s0])
    for k in range(len(BLUR_LEVELS)):
        s1 = i1 == k
        if s1.any():
            out[s1] += stack[k][s1] * w[s1]
    return out


# ---------------------------------------------------------------------------
# Flame bend (displacement field along a single filament)
# ---------------------------------------------------------------------------
def build_flame_field():
    P = f2s(FLAME_PATH)
    d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]
    s = np.linspace(0, d[-1], 400)
    path = np.stack([np.interp(s, d, P[:, 0]), np.interp(s, d, P[:, 1])], -1)
    tang = np.gradient(path, axis=0); tang /= np.linalg.norm(tang, axis=1, keepdims=True)
    x0, y0 = int(path[:, 0].min() - 160), int(path[:, 1].min() - 160)
    x1, y1 = int(path[:, 0].max() + 160), int(path[:, 1].max() + 160)
    x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, W), min(y1, H)
    gx, gy = np.meshgrid(np.arange(x0, x1), np.arange(y0, y1))
    pts = np.stack([gx, gy], -1).reshape(-1, 2).astype(np.float32)
    best = np.full(len(pts), 1e9, np.float32); idx = np.zeros(len(pts), np.int32)
    for i in range(0, len(path), 4):
        dd = ((pts - path[i]) ** 2).sum(1)
        m = dd < best; best[m] = dd[m]; idx[m] = i
    dist = np.sqrt(best).reshape(gy.shape)
    sarc = s[idx].reshape(gy.shape)
    tg = tang[idx].reshape(gy.shape + (2,))
    nrm = np.stack([-tg[..., 1], tg[..., 0]], -1)
    return dict(box=(x0, y0, x1, y1), dist=dist, s=sarc, n=nrm, L=d[-1])


def flame_displace(img, ff, t):
    if not (T_BEND0 - 0.05 < t < T_BEND1 + 0.35):
        return img
    x0, y0, x1, y1 = ff['box']

    def pulse(tt, amp, sig_d, ring=False):
        f = (tt - T_BEND0) / (T_BEND1 - T_BEND0)
        if f <= -0.1 or f >= 1.25:
            return 0.0
        s0 = ease_io(np.clip(f, 0, 1)) * ff['L'] * 1.08
        env = math.sin(math.pi * min(max(f, 0) / 1.05, 1.0)) ** 0.7
        g = np.exp(-0.5 * ((ff['s'] - s0) / 42.0) ** 2)
        fall = np.exp(-0.5 * (ff['dist'] / sig_d) ** 2)
        if ring:
            fall = np.exp(-0.5 * (ff['dist'] / (sig_d * 3.2)) ** 2) - fall
            fall = np.clip(fall, 0, None)
        return amp * env * g * fall

    a = pulse(t, 13.0, 13.0) + pulse(t - 0.12, 6.0, 13.0, ring=True)
    if np.isscalar(a):
        return img
    gx, gy = np.meshgrid(np.arange(x0, x1, dtype=np.float32), np.arange(y0, y1, dtype=np.float32))
    mx = gx - (a * ff['n'][..., 0]).astype(np.float32)
    my = gy - (a * ff['n'][..., 1]).astype(np.float32)
    out = img.copy()
    out[y0:y1, x0:x1] = cv2.remap(img, mx, my, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
    return out


# ---------------------------------------------------------------------------
# Strip rasterisation: splat densely-interpolated mesh attributes into maps
# ---------------------------------------------------------------------------
def upsample_grid(arr, fu, fv):
    nu, nv = arr.shape[:2]
    iu = np.linspace(0, nu - 1, (nu - 1) * fu + 1)
    iv = np.linspace(0, nv - 1, (nv - 1) * fv + 1)
    u0 = np.minimum(np.floor(iu).astype(int), nu - 2); wu = (iu - u0)[:, None, None]
    v0 = np.minimum(np.floor(iv).astype(int), nv - 2); wv = (iv - v0)[None, :, None]
    a00 = arr[u0][:, v0]; a10 = arr[u0 + 1][:, v0]; a01 = arr[u0][:, v0 + 1]; a11 = arr[u0 + 1][:, v0 + 1]
    wu = wu.astype(np.float32); wv = wv.astype(np.float32)
    return (a00 * (1 - wu) * (1 - wv) + a10 * wu * (1 - wv) + a01 * (1 - wu) * wv + a11 * wu * wv)


def rasterize(pos):
    uu = U[:, None] * np.ones((1, NV)); vv = np.linspace(0, 1, NV)[None, :] * np.ones((NU, 1))
    attr = np.concatenate([pos, MESH_R, MESH_V, uu[..., None], vv[..., None]], -1).astype(np.float32)
    du = np.linalg.norm(np.diff(pos, axis=0), axis=-1).max()
    dv = np.linalg.norm(np.diff(pos, axis=1), axis=-1).max()
    fu = int(min(max(math.ceil(du / 1.6), 1), 16)); fv = int(min(max(math.ceil(dv / 1.6), 1), 24))
    fine = upsample_grid(attr, fu, fv).reshape(-1, attr.shape[-1])
    ix = np.round(fine[:, 0]).astype(np.int64); iy = np.round(fine[:, 1]).astype(np.int64)
    ok = (ix >= 0) & (ix < W) & (iy >= 0) & (iy < H)
    fine = fine[ok]; lin = iy[ok] * W + ix[ok]
    maps = np.zeros((H * W, 6), np.float32); cnt = np.zeros(H * W, np.float32)
    maps[lin] = fine[:, 2:]; cnt[lin] = 1
    maps = maps.reshape(H, W, 6); cnt = cnt.reshape(H, W)
    alpha = poly_mask(pos)
    # fill tiny holes with normalised box filtering
    for k in (3, 5, 9):
        holes = (cnt == 0) & (alpha > 0)
        if not holes.any():
            break
        num = cv2.boxFilter(maps * cnt[..., None], -1, (k, k), normalize=False)
        den = cv2.boxFilter(cnt, -1, (k, k), normalize=False)
        fill = holes & (den > 0)
        maps[fill] = num[fill] / den[fill][:, None]; cnt[fill] = 1
    alpha = alpha * (cnt > 0)
    return maps, alpha


def root_feather(t, u):
    """while the lip grows into the wave body, its root dissolves into it"""
    k = smoothstep(T_ROLL0, T_ROLL0 + 0.5, t)
    if k <= 0:
        return 1.0
    return smoothstep(U_LM[1], U_LM[1] + 0.07 * k + 1e-4, u)


# ---------------------------------------------------------------------------
# Foam: one strand breaks free from the lip as it tips over
# ---------------------------------------------------------------------------
FOAM_N = 64
_frng = np.random.default_rng(5)
FOAM_S = np.linspace(0, 1, FOAM_N)                    # 0 tail ... 1 head
FOAM_BIRTH = T_FOAM + (1 - FOAM_S) * 0.34             # head leaves the lip first
FOAM_SPD = 280 + 330 * FOAM_S + _frng.normal(0, 8, FOAM_N)
FOAM_JIT = 0.65 * np.sin(2 * np.pi * 1.4 * FOAM_S + 0.7) + 0.35 * np.sin(2 * np.pi * 3.3 * FOAM_S + 2.1)  # smooth along the strand
FOAM_DRIFT = _frng.normal(0, 1.0, (FOAM_N, 2))
FOAM_DROP = _frng.uniform(0.7, 1.5, FOAM_N)
FOAM_ORIGIN = None


def foam_layer(t, lip_dir):
    """a thin strand of foam peels off the lip as it tips over, stretches,
    then beads into droplets as it slows"""
    global FOAM_ORIGIN
    if t < T_FOAM:
        return np.zeros((H, W), np.float32)
    if FOAM_ORIGIN is None:
        FOAM_ORIGIN = np.array([pose_at(b)[-1, NV // 2] for b in FOAM_BIRTH])
    ang = math.atan2(lip_dir[1], lip_dir[0]) - 0.10 * FOAM_S
    vx, vy = FOAM_SPD * np.cos(ang), FOAM_SPD * np.sin(ang)
    age = np.clip(t - FOAM_BIRTH, 0, None)
    drag = 1.9
    k = (1 - np.exp(-drag * age)) / drag
    nx, ny = -np.sin(ang), np.cos(ang)
    spread = FOAM_JIT * (1.0 + 7.0 * age)
    x = FOAM_ORIGIN[:, 0] + vx * k + nx * spread + FOAM_DRIFT[:, 0] * 4 * smoothstep(0.6, 1.8, age) * age
    y = FOAM_ORIGIN[:, 1] + vy * k + ny * spread + 38 * age ** 2 + FOAM_DRIFT[:, 1] * 4 * smoothstep(0.6, 1.8, age) * age
    alive = t >= FOAM_BIRTH
    S = 4  # supersample
    img = np.zeros((H * S, W * S), np.uint8)
    pts = np.round(np.stack([x, y], -1) * S * 16).astype(np.int32)
    taper = np.sin(np.pi * np.clip(FOAM_S * 0.92 + 0.04, 0, 1)) ** 0.6
    bead = smoothstep(T_FOAM + 0.55, T_FOAM + 1.5, t)          # strand -> droplets
    for i in range(FOAM_N - 1):
        if alive[i] and alive[i + 1] and bead < 1:
            th = max(1, int(round(S * (1.0 + 1.8 * taper[i]))))
            cv2.line(img, tuple(pts[i]), tuple(pts[i + 1]), int(235 * (1 - bead)), th, cv2.LINE_AA, shift=4)
    for i in range(0, FOAM_N, 2):
        if alive[i]:
            r = S * (0.8 + 1.4 * taper[i]) * (0.55 + 0.6 * bead) * FOAM_DROP[i]
            cv2.circle(img, tuple(pts[i]), int(r * 16), 245, -1, cv2.LINE_AA, shift=4)
    lay = cv2.resize(img, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
    lay = cv2.GaussianBlur(lay, (0, 0), 0.55)
    return lay * (1 - 0.25 * smoothstep(5.8, 7.0, t))


# ---------------------------------------------------------------------------
# Frame
# ---------------------------------------------------------------------------
class Film:
    def __init__(self, src, locked=False):
        self.locked = locked
        self.F = build_fire_plate(src)
        self.Wp = build_wave_plate(src)
        # inpaint the wing out of the background fire plate
        m = (poly_mask(MESH_R) > 0).astype(np.uint8) * 255
        m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
        self.Fbg = fill_sky(self.F, m)
        self.ff = build_flame_field()
        self.Fst = blur_stack(self.Fbg)
        # wave plate with its lip removed (the moving silhouette supplies the lip),
        # so the backdrop never shows a second, static wave behind the moving one
        j = int((U_LM[1] + 0.08) * (NU - 1))
        lip = np.zeros((H, W), np.uint8)
        cv2.fillPoly(lip, [np.round(np.concatenate([MESH_V[j:, -1], MESH_V[j:, 0][::-1]])).astype(np.int32)], 255)
        lip = cv2.dilate(lip, np.ones((15, 15), np.uint8))
        small = cv2.resize(np.clip(self.Wp * 255, 0, 255).astype(np.uint8), (W // 4, H // 4), interpolation=cv2.INTER_AREA)
        lips = cv2.resize(lip, (W // 4, H // 4), interpolation=cv2.INTER_NEAREST)
        filled = cv2.inpaint(small, lips, 12, cv2.INPAINT_TELEA)
        filled = cv2.resize(filled, (W, H), interpolation=cv2.INTER_CUBIC).astype(np.float32) / 255.0
        la = cv2.GaussianBlur(lip.astype(np.float32) / 255.0, (0, 0), 6)[..., None]
        self.Wbg = self.Wp * (1 - la) + filled * la
        self.Wst = blur_stack(self.Wbg)
        # the wave body below/right of the lip's root settles early, like the hollow
        body = np.zeros((H, W), np.uint8)
        n01 = SEG_N[0]
        cv2.fillPoly(body, [np.round(np.concatenate([MESH_V[:n01 + 1, -1], MESH_V[:n01 + 1, 0][::-1]])).astype(np.int32)], 1)
        self.body = cv2.GaussianBlur(body.astype(np.float32), (0, 0), 40)
        # foam band of the painting (for the residual motion at the end)
        lum = self.Wp.mean(2)
        warm = self.Wp[..., 2] - self.Wp[..., 0]
        yy, xx = np.mgrid[0:H, 0:W]
        self.foam_mask = cv2.GaussianBlur(((lum > 0.5) & (yy > 820) & (xx < 1420)).astype(np.float32), (0, 0), 9)
        rng = np.random.default_rng(3)
        self.noise = [cv2.GaussianBlur(rng.standard_normal((H // 8, W // 8)).astype(np.float32), (0, 0), 2) for _ in range(4)]
        self.stripe = (np.sin(np.linspace(0, 1, NV) * 2 * np.pi * 7.0 + 0.0))
        self.tip_dir = None

    def background(self, t, pos, alpha):
        fire = flame_displace(self.Fbg, self.ff, t)
        if t < T_BG_WARM:
            return fire
        # distance to the moving contour
        inside = (alpha > 0.5).astype(np.uint8)
        dist = cv2.distanceTransform(1 - inside, cv2.DIST_L2, 5)
        # warm side: region under the inner edge (B) and left of/below the lip
        B = pos[:, 0]
        tip = B[-1]
        poly = np.concatenate([B, [[-50, tip[1]], [-50, H + 50], [B[0][0], H + 50]]], 0)
        warm = np.zeros((H, W), np.uint8)
        cv2.fillPoly(warm, [np.round(poly).astype(np.int32)], 1)
        warm = cv2.GaussianBlur(warm.astype(np.float32), (0, 0), 70)
        warm = np.maximum(warm, self.body)
        n = cv2.resize(self.noise[0], (W, H), interpolation=cv2.INTER_CUBIC)
        t_start = (T_BG_SKY + (T_BG_WARM - T_BG_SKY) * warm) + dist / 1150.0 + 0.10 * n
        a = np.clip((t - t_start) / 1.05, 0, 1)
        a = np.where(t > 5.75, np.maximum(a, (t - 5.75) / 0.25), a)
        a = np.clip(a, 0, 1)
        bump = np.clip(np.sin(np.pi * a), 0, 1)
        blur = bump ** 0.85 * (0.35 + 0.65 * warm)
        c = smoothstep(0.32, 0.68, a)[..., None]
        burn = (1 - 0.72 * bump ** 0.7 * (1 - warm))[..., None]   # flames die back on the sky side
        Fb = sample_stack(self.Fst, blur)
        j = int(U_LM[1] * (NU - 1)) + 1
        M = fit_similarity(MESH_V[j:].reshape(-1, 2), pos[j:].reshape(-1, 2)).astype(np.float32)
        Wst = np.stack([cv2.warpAffine(l, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
                        for l in self.Wst], 0)
        Wb = sample_stack(Wst, blur)
        return (Fb * (1 - c) + Wb * c) * burn

    def wave_alive(self, t):
        """residual motion in the finished painting: foam + a few lines at the lip"""
        if t < 4.9:
            return self.Wp
        k = smoothstep(4.9, 5.6, t)
        n1 = cv2.resize(self.noise[1], (W, H), interpolation=cv2.INTER_CUBIC)
        n2 = cv2.resize(self.noise[2], (W, H), interpolation=cv2.INTER_CUBIC)
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        ph = 2 * np.pi * 0.55 * t
        fx = (-1.5 - 3.2 * (t - 4.9)) * self.foam_mask + 1.2 * np.sin(ph + xx * 0.011 + 3 * n1) * self.foam_mask
        fy = 0.9 * np.sin(ph * 0.8 + xx * 0.017 + 3 * n2) * self.foam_mask
        # lines nearest the lip breathe
        tip = MESH_V[-1, 0]
        dl = np.hypot(xx - tip[0] - 120, yy - tip[1] + 180)
        lipm = np.exp(-0.5 * (dl / 170) ** 2) * (1 - self.foam_mask)
        fx += 1.0 * np.sin(ph * 1.3 + yy * 0.05) * lipm
        fy += 0.8 * np.sin(ph * 1.1 + xx * 0.045) * lipm
        mx = (xx - k * fx).astype(np.float32); my = (yy - k * fy).astype(np.float32)
        return cv2.remap(self.Wp, mx, my, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

    def frame(self, i):
        t = i / FPS
        pos = pose_at(t)
        maps, alpha = rasterize(pos)
        bg = self.background(t, pos, alpha)
        Wcur = self.wave_alive(t)
        if t >= 5.75:
            k = smoothstep(5.75, 6.0, t)
            bg = bg * (1 - k) + Wcur * k
        # strip textures
        wing = cv2.remap(self.F, maps[..., 0], maps[..., 1], cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
        wave = cv2.remap(Wcur, maps[..., 2], maps[..., 3], cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        u, v = maps[..., 4], maps[..., 5]
        # handoff: from the shared (outer) edge inward, as striation fingers along u
        front = (t - T_TEX0 - 0.25 * u) / T_TEX_DUR * 1.25     # 0..~1.25
        stripes = 0.5 + 0.5 * np.sin(v * 2 * np.pi * 11.0 + 2.2 * np.sin(u * 9.0))
        thr = (1 - v) + 0.16 * stripes
        m = smoothstep(-0.06, 0.06, front - thr)
        m = np.where(t < T_TEX0, 0.0, m)
        m = m[..., None]
        strip = wing * (1 - m) + wave * m
        a = (alpha * root_feather(t, u))[..., None]
        out = bg * (1 - a) + strip * a
        # foam strand
        if t >= T_FOAM:
            if self.tip_dir is None:
                p0 = pose_at(T_FOAM); p1 = pose_at(T_FOAM + 1 / FPS)
                self.tip0 = p0[-1, 0].copy()
                dvec = p1[-1, 0] - p0[-1, 0]
                dvec = dvec / (np.linalg.norm(dvec) + 1e-6)
                self.tip_dir = 0.35 * dvec + 0.65 * np.array([-0.96, -0.12])
            fl = foam_layer(t, self.tip_dir)
            col = np.array([0.96, 0.95, 0.92], np.float32)
            out = out * (1 - fl[..., None]) + col * fl[..., None]
        # restrained drift (a slow settle toward the painting's true framing)
        if not self.locked:
            z = 1.0 + 0.028 * (1 - ease_io(np.array(t / DUR)))
            cx, cy = 1060.0, 620.0
            M = np.array([[z, 0, cx * (1 - z)], [0, z, cy * (1 - z)]], np.float32)
            out = cv2.warpAffine(out, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
        return np.clip(out, 0, 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True, help='folder with the original JPGs')
    ap.add_argument('--out', required=True)
    ap.add_argument('--frames', default='', help='comma list, default all')
    ap.add_argument('--locked', action='store_true', help='no camera drift')
    ap.add_argument('--jobs', type=int, default=os.cpu_count())
    ap.add_argument('--debug', action='store_true', help='draw landmarks/contours')
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    frames = [int(x) for x in args.frames.split(',')] if args.frames else list(range(NF))
    global FILM, DEBUG
    DEBUG = args.debug
    FILM = Film(args.src, args.locked)
    if args.jobs > 1 and len(frames) > 1:
        import multiprocessing as mp
        with mp.get_context('fork').Pool(args.jobs) as pool:
            for name in pool.imap_unordered(_render_one, [(i, args.out) for i in frames]):
                print(name, flush=True)
    else:
        for i in frames:
            print(_render_one((i, args.out)), flush=True)


def _render_one(job):
    i, out = job
    img = FILM.frame(i)
    img8 = np.clip(img * 255 + 0.5, 0, 255).astype(np.uint8)
    if DEBUG:
        pos = pose_at(i / FPS)
        for e in (pos[:, 0], pos[:, -1]):
            cv2.polylines(img8, [np.round(e).astype(np.int32)], False, (0, 255, 0), 2, cv2.LINE_AA)
        for k in range(7):
            j = int(round(U_LM[k] * (NU - 1)))
            cv2.line(img8, tuple(np.round(pos[j, 0]).astype(int)), tuple(np.round(pos[j, -1]).astype(int)), (255, 0, 255), 2)
        cv2.putText(img8, 't=%.2f' % (i / FPS), (20, 50), 0, 1.4, (255, 255, 255), 3)
    name = os.path.join(out, 'f%04d.png' % i)
    cv2.imwrite(name, img8)
    return name


if __name__ == '__main__':
    main()
