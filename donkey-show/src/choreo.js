/* Choreography v2 — a pure function of time. Every acting beat is anchored to a lyric cue (by id)
   or a named marker, so retiming a line in the timeline editor moves its acting with it.
   Vocabulary: bounce, tap (heel-toe shuffle), charleston, kick line, moonwalk, scramble,
   jumps with anticipation + squash/stretch, kneel, split. No mirror flips. */
(function () {
  const DS = window.DS;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const win = (t, a, b, fi = 0.18, fo = 0.18) => Math.min(smooth((t - a) / fi), smooth((b - t) / fo));
  const ramp = (t, a, d = 0.2) => smooth((t - a) / d);
  const sinp = (x) => Math.sin(Math.PI * x);
  const frac = (x) => x - Math.floor(x);
  const mod2 = (x) => ((Math.floor(x) % 2) + 2) % 2;
  function mix(p, o, w) {
    if (w <= 0) return p;
    for (const k in o) {
      const v = o[k];
      if (typeof v === 'number' && typeof p[k] === 'number') p[k] += (v - p[k]) * Math.min(1, w);
      else if (w >= 0.5) p[k] = v;
    }
    return p;
  }
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  function basePose(id, t) {
    const T = id === 'T';
    return {
      t, x: T ? 680 : 1265, dx: 0, ground: 968, y: 0, face: T ? 1 : -1, sq: 1,
      hipDx: 0, hipDy: 6, hipRot: 0, lean: 0, puff: 0, shrug: 0,
      fBx: 0, fBy: 0, fFx: 0, fFy: 0, fBa: 0, fFa: 0,
      headRot: 0, headDx: 0, headDy: 0, neckRot: 0,
      micT: 0.55, micTilt: 0, armX: T ? -30 : -24, armY: T ? 168 : 136, armFront: 0, hand: 'open', handRot: 0,
      eyeOpen: T ? 1 : 0.62, lookX: 0, lookY: 0, brow: 0, browL: 0, browR: 0, browTilt: 0, lidTilt: 0,
      smile: T ? 0.45 : 0.05, frown: 0, jaw: 0, mouthO: 0, grin: 0, eyeHappy: 0, earDroop: 0,
      pupil: 1, bulge: 1, cross: 0, wink: 0, blush: 0, sweat: 0, tear: 0, tongueOut: 0, arcF: 0, arcE: 0,
      straw: 0, strawHand: 0, crouch: 0, pockets: 0, moth: 0, mouthState: null, blinkPh: null, kneeFlipB: 0, kneeFlipF: 0, bubble: 0, rip: 0, micOut: 0,
    };
  }

  // ---------------- dance vocabulary (k = leg-length scale: tall 1, short ~0.63) ----------------
  const V = {
    bounce(b, k, wave = 1) {
      const fr = frac(b), lift = Math.pow(sinp(fr), 1.3), bob = 0.5 + 0.5 * Math.cos(2 * Math.PI * b), sw = Math.sin(Math.PI * b);
      const o = { hipDy: 6 + 20 * bob, hipDx: 14 * sw, hipRot: 6 * sw, lean: -3 * sw, headRot: 5 * Math.sin(Math.PI * b + 0.7), headDy: 5 * bob,
        fBx: 0, fBy: 0, fFx: 0, fFy: 0, fBa: 0, fFa: 0, sq: 1 - 0.03 * bob };
      if (!mod2(b)) { o.fBy = -50 * lift * k; o.fBx = 18 * lift; o.fBa = -14 * lift; } else { o.fFy = -50 * lift * k; o.fFx = 18 * lift; o.fFa = -14 * lift; }
      if (wave) { o.armX = -126 + 26 * sw * wave; o.armY = -100 + 24 * Math.cos(2 * Math.PI * b) * wave; o.handRot = 12 * sw; }
      return o;
    },
    // heel-toe tap on eighth notes: brush, strike, toe up; knees pump; jazz-hand low
    tap(b, k) {
      const e8 = b * 2, i = Math.floor(e8), fr = frac(e8), lift = Math.pow(sinp(fr), 1.6), right = mod2(i);
      const brush = 26 * Math.sin(2 * Math.PI * fr) * k;
      const o = { hipDy: 18 + 10 * Math.abs(Math.sin(Math.PI * b)), hipDx: 8 * Math.sin(Math.PI * b), hipRot: 4 * Math.sin(Math.PI * e8), lean: 5,
        headRot: 4 * Math.sin(Math.PI * e8), headDy: 4 * lift, fBx: 0, fBy: 0, fFx: 0, fFy: 0, fBa: 0, fFa: 0, arcF: 1,
        armX: -110 + 20 * Math.sin(Math.PI * b), armY: 30 - 20 * Math.abs(Math.sin(Math.PI * b)), hand: 'open', handRot: -40 + 30 * Math.sin(Math.PI * e8), sq: 1 - 0.02 * lift };
      if (right) { o.fFx = brush; o.fFy = -24 * lift * k; o.fFa = -22 * Math.sin(Math.PI * fr * 2); } else { o.fBx = brush; o.fBy = -24 * lift * k; o.fBa = -22 * Math.sin(Math.PI * fr * 2); }
      return o;
    },
    // Charleston: front foot kicks forward then back on a 2-beat cycle, knees swivel, arms swing opposite
    charleston(b, k) {
      const ph = frac(b / 2), c = Math.sin(2 * Math.PI * ph);
      return { fFx: 80 * c * k, fFy: -46 * Math.abs(c) * k, fFa: -20 * c, fBx: 0, fBy: 0, fBa: 0, hipRot: 8 * c, hipDx: -10 * c, hipDy: 14 + 8 * Math.abs(Math.cos(2 * Math.PI * ph)),
        lean: -4 * c, headRot: -5 * c, armX: -120 - 50 * c, armY: -60 + 30 * Math.abs(c), hand: 'open', handRot: 30 * c, arcF: Math.abs(c) > 0.85 ? 1 : 0, sq: 1 };
    },
    // kick line: high kick on every beat, alternating legs
    kick(b, k, height = 1) {
      const fr = frac(b), kk = Math.pow(sinp(fr), 1.2) * height;
      const o = { hipDy: 8 + 10 * (1 - kk), lean: -5 * kk, headRot: -2 * kk, fBx: 0, fBy: 0, fFx: 0, fFy: 0, fBa: 0, fFa: 0, armX: -140, armY: -160, hand: 'open', sq: 1 + 0.03 * kk, arcF: kk > 0.8 ? 1 : 0 };
      if (!mod2(b)) { o.fFx = 230 * kk * k; o.fFy = -230 * kk * k; o.fFa = -30 * kk; } else { o.fBx = 220 * kk * k; o.fBy = -200 * kk * k; o.fBa = -30 * kk; }
      return o;
    },
    // moonwalk: feet alternately slide back flat while the other is on its toe
    moonwalk(b, k) {
      const fr = frac(b), s = mod2(b);
      const a = { fBx: 0, fBy: 0, fFx: 0, fFy: 0, fBa: 0, fFa: 0, hipDy: 12, lean: 6, headRot: 3 * Math.sin(Math.PI * b * 2) };
      const slide = (fr - 0.5) * -40 * k, toe = 1 - fr;
      if (s) { a.fFx = slide; a.fBy = -10 * toe; a.fBa = 26 * toe; } else { a.fBx = slide; a.fFy = -10 * toe; a.fFa = 26 * toe; }
      return a;
    },
    // rubber legs: knees flip direction every eighth note, hips swing
    noodle(b, k) {
      const e8 = b * 2, i = Math.floor(e8);
      return { hipDy: 40 + 12 * Math.abs(Math.sin(Math.PI * e8)), hipDx: 18 * Math.sin(Math.PI * b), hipRot: 8 * Math.sin(Math.PI * e8), lean: 4 * Math.sin(Math.PI * b),
        fBx: -18, fFx: 18, fBy: 0, fFy: 0, fBa: 0, fFa: 0, kneeFlipB: mod2(i), kneeFlipF: 1 - mod2(i), headRot: 6 * Math.sin(Math.PI * e8), headDx: 10 * Math.sin(Math.PI * b),
        armX: -80 + 30 * Math.sin(Math.PI * e8), armY: 90 + 30 * Math.cos(Math.PI * e8), hand: 'open', handRot: 40 * Math.sin(Math.PI * e8), arcF: 1 };
    },
    // the chicken: head pecks, wing flaps, bottom out
    chicken(b, k) {
      const peck = Math.sin(Math.PI * b * 2), fr = frac(b), l = Math.pow(sinp(fr), 1.5);
      return { headDx: 28 * peck * k, headRot: 8 * peck, hipDx: -18, lean: 10, hipDy: 26, fBy: !mod2(b) ? -26 * k * l : 0, fFy: mod2(b) ? -26 * k * l : 0, fBx: 0, fFx: 0, fBa: 0, fFa: 0,
        armX: -70, armY: 30 + 45 * Math.abs(Math.sin(Math.PI * b * 4)), hand: 'fist', handRot: 0, shrug: -6 * Math.abs(Math.sin(Math.PI * b * 4)), earDroop: 0.2 * peck };
    },
    // the robot: snaps between angular poses twice a beat; 'broken' glitches
    robot(b, k, broken) {
      const bb = broken ? b + 0.18 * Math.sin(b * 7.3) : b;
      const st = ((Math.floor(bb * 2) % 4) + 4) % 4;
      const P = [{ armX: -110, armY: -10, handRot: -90, headRot: -8, lean: 0 }, { armX: -20, armY: -125, handRot: 0, headRot: 8, lean: 2 },
        { armX: -110, armY: 60, handRot: 90, headRot: -8, lean: -2 }, { armX: -60, armY: -60, handRot: -45, headRot: 0, lean: 0 }][st];
      const o = Object.assign({ hipDy: 10, hipDx: 0, hipRot: 0, fBy: 0, fFy: 0, fBx: 0, fFx: 0, fBa: 0, fFa: 0, hand: 'open', eyeOpen: 1.1, smile: 0, frown: 0.1, kneeFlipB: 0, kneeFlipF: 0 }, P);
      if (broken && Math.sin(b * 31) > 0.85) { o.headRot += 14; o.arcE = 1; }
      return o;
    },
    // dad at a wedding: alternating finger-points, belly out, side step, tongue out
    dad(b, k) {
      const s2 = mod2(b), fr = frac(b), bob = Math.abs(Math.sin(Math.PI * b));
      return { dx: 22 * Math.sin(Math.PI * b * 0.5), hipDy: 12 + 14 * bob, lean: -8, puff: 0.6, hipRot: 6 * Math.sin(Math.PI * b), fBy: s2 ? 0 : -18 * sinp(fr) * k, fFy: s2 ? -18 * sinp(fr) * k : 0, fBx: 0, fFx: 0,
        armX: s2 ? -60 : -40, armY: s2 ? -170 : 40, hand: 'point', handRot: 0, eyeHappy: 1, smile: 1, tongueOut: 1, headRot: -6 + 6 * Math.sin(Math.PI * b) };
    },
    // the Egyptian walk: flat hand forward, head slides on the beat
    egypt(b, k) {
      const slide = Math.sin(Math.PI * b * 2);
      return { headDx: 22 * slide, headRot: 0, lean: 0, hipDy: 10, armFront: 1, armX: 140, armY: -70, hand: 'open', handRot: -90, fBy: !mod2(b) ? -14 : 0, fFy: mod2(b) ? -14 : 0, fBx: 0, fFx: 0, eyeOpen: 0.7, lidTilt: -0.3, smile: 0.6 };
    },
    // running man: the planted foot slides back while the other knee pumps up; fists pump
    runningMan(b, k) {
      const fr = frac(b), s2 = mod2(b), lift = sinp(fr), slide = (0.5 - fr) * 70 * k;
      const o = { hipDy: 22 + 8 * lift, lean: 4, headRot: 4 * Math.sin(Math.PI * b * 2), fBx: 0, fBy: 0, fFx: 0, fFy: 0, fBa: 0, fFa: 0, arcF: 1,
        armX: -70 + 50 * Math.sin(Math.PI * b), armY: 10 - 50 * Math.cos(Math.PI * b), hand: 'fist', handRot: 0 };
      if (s2) { o.fFy = -60 * lift * k; o.fFx = 30 * lift; o.fBx = slide; } else { o.fBy = -60 * lift * k; o.fBx = 30 * lift; o.fFx = slide; }
      return o;
    },
    // windmill: the free arm spins in big circles, knees bounce
    windmill(b, k) {
      const th = b * Math.PI; const bob = 0.5 + 0.5 * Math.cos(2 * Math.PI * b);
      return { armX: -10 - 150 * Math.cos(th), armY: -60 - 150 * Math.sin(th), hand: 'open', handRot: th * 57.3 % 360, hipDy: 16 + 16 * bob, lean: -4, fBy: 0, fFy: 0, fBx: -20, fFx: 20, arcE: 1 };
    },
    // belly shake: hips shimmy 4x per beat, belly puffs, fists out
    shake(b, k) {
      const q = Math.sin(Math.PI * b * 4);
      return { hipDx: 16 * q, hipRot: 6 * q, puff: 0.55 + 0.2 * Math.abs(q), lean: -6, hipDy: 20, fBx: -26, fFx: 26, fBy: 0, fFy: 0, armX: -110, armY: 30 + 10 * q, hand: 'fist', headRot: -3 * q, arcF: 1 };
    },
    // frantic tiny steps (4 per beat)
    scramble(b, k) {
      const e = b * 4, fr = frac(e), lift = sinp(fr), s = mod2(e);
      return { fBy: s ? 0 : -26 * lift * k, fFy: s ? -26 * lift * k : 0, fBx: 0, fFx: 0, fBa: 0, fFa: 0, lean: 12, hipDy: 10, headRot: 6, arcF: 1, armX: -60, armY: 40 + 40 * Math.sin(Math.PI * e), hand: 'fist' };
    },
  };
  // jump with anticipation crouch, stretch in the air, squash on landing
  function jump(t, t0, dur, h, k = 1) {
    const out = {};
    if (t > t0 - 0.2 && t < t0) { const a = sinp((t - (t0 - 0.2)) / 0.4); Object.assign(out, { hipDy: 6 + 34 * a * k, sq: 1 - 0.1 * a, lean: 6 * a, arcF: 0 }); }
    else if (t >= t0 && t <= t0 + dur) { const j = (t - t0) / dur; Object.assign(out, { y: -h * sinp(j), sq: 1 + 0.035 * sinp(j), hipDy: 6, arcE: 1 }); }
    else if (t > t0 + dur && t < t0 + dur + 0.2) { const a = sinp((t - t0 - dur) / 0.4); Object.assign(out, { hipDy: 6 + 28 * a * k, sq: 1 - 0.09 * a, arcF: 1 }); }
    return out;
  }

  class Choreo {
    constructor(data) { this.setData(data); }
    setData(data) { this.data = data; this.byId = {}; for (const c of data.cues) this.byId[c.id] = c; this._pc = new Map(); }
    C(id) { return this.byId[id] || { start: 1e9, end: 1e9 }; }
    M(name) { return this.data.markers[name]; }
    beat(t) { return (t - this.data.beat0) * this.data.bpm / 60; }
    tAtBeat(b) { return this.data.beat0 + (b * 60) / this.data.bpm; }
    encT() { const m = this.data.markers; return m.instr ? m.instr[0][0] : 1e9; }
    E(n) { return this.tAtBeat(Math.round(this.beat(this.encT())) + n); }
    ripT() { return this.E(78) + 0.45 + 0.3; }
    fixes() { const C = (k) => this.C(k); return [C('v1b').start + 1.2, C('v2b').start + 1.0, this.E(4), this.E(36)]; }
    active(who, t, pad = 0) {
      for (const c of this.data.cues) if ((c.who === who || c.who === 'both') && t >= c.start - pad && t <= c.end + pad) return c;
      return null;
    }
    anyActive(t) { for (const c of this.data.cues) if (t >= c.start && t <= c.end) return c; return null; }

    mouth(who, t) {
      const c = this.active(who, t);
      if (!c) return { jaw: 0, o: 0, state: null };
      const tq = Math.floor(t * 15) / 15;                    // mouth drawings change on twos (15 per second)
      const env = (x) => (DS.envelope ? DS.envelope(x) : null);
      const E = (x) => { const a = env(x - 0.033), b = env(x), d = env(x + 0.033); return a == null ? null : (a + 2 * b + d) / 4; };
      const v = E(tq);
      const inside = tq >= c.start - 0.02 && tq <= c.end + 0.04;
      if (v == null || !inside) return { jaw: 0, o: 0, state: inside ? 'closed' : null };
      // articulation: compare with the local peak (±0.22 s) so loud passages still open and close per syllable
      let pk = 0.05;
      for (let dt = -0.22; dt <= 0.22; dt += 0.033) pk = Math.max(pk, env(tq + dt) || 0);
      const prev = E(tq - 1 / 15);
      const rel = v / pk, level = v < 0.12 ? 0 : rel < 0.42 ? 0.1 : rel < 0.86 ? 0.4 : 0.9;
      const rising = v >= prev;
      // vowels: if the line ends on o/u (…וֹן, …וֹת, …וֹר, …וּר) the last stretch is sung on an O
      const local = (tq - c.start) / Math.max(0.3, c.end - c.start);
      const oEnd = c.oEnd && local > 0.72;
      let state;
      if (level < 0.2) state = (E(tq - 0.15) > 0.3) ? 'closing' : 'closed';
      else if (level < 0.52) state = rising ? 'half' : 'halfdown';
      else state = 'wide';
      if (oEnd && level >= 0.3) state = 'o';
      const jaw = level * (c.kind === 'speak' ? 0.8 : 1.0);
      // the eyes-shut 'big note' drawing only on held notes at the end of a sung line
      const held = c.kind === 'sing' && local > 0.66 && state === 'wide' && E(tq - 0.3) > 0.45 && v > 0.45;
      return { jaw, o: oEnd ? 1 : 0, state, held };
    }

    // smoothed pose: a short Gaussian over neighbouring frames for body/limb channels (no pops, natural ease),
    // with the hands sampled a touch later than the body (follow-through). Face/mouth channels are never blurred.
    pose(id, t) {
      const OFF = [-0.133, -0.1, -0.067, -0.033, 0, 0.033, 0.067, 0.1, 0.133];
      const G = (o, sg) => Math.exp(-(o * o) / (2 * sg * sg));
      const c = this.rawPoseCached(id, t), out = Object.assign({}, c);
      const BODY = ['x', 'dx', 'y', 'sq', 'hipDx', 'hipDy', 'hipRot', 'lean', 'puff', 'shrug', 'fBx', 'fBy', 'fFx', 'fFy', 'fBa', 'fFa', 'headRot', 'headDx', 'headDy', 'neckRot', 'micT', 'micTilt', 'micOut', 'crouch'];
      const HAND = ['armX', 'armY', 'handRot'];
      const acc = {}, wsum = { b: 0, h: 0 };
      for (const o of OFF) {
        const q = this.rawPoseCached(id, t + o);
        const wb = G(o, 0.055), wh = G(o + 0.03, 0.065);
        wsum.b += wb; wsum.h += wh;
        for (const k of BODY) acc[k] = (acc[k] || 0) + q[k] * wb;
        for (const k of HAND) acc[k] = (acc[k] || 0) + q[k] * wh;
      }
      for (const k of BODY) out[k] = acc[k] / wsum.b;
      for (const k of HAND) out[k] = acc[k] / wsum.h;
      return out;
    }
    rawPoseCached(id, t) {
      const key = id + Math.round(t * 1000);
      this._pc = this._pc || new Map();
      let v = this._pc.get(key);
      if (!v) { v = this.rawPose(id, t); this._pc.set(key, v); if (this._pc.size > 600) this._pc.delete(this._pc.keys().next().value); }
      return v;
    }
    setDataHook() { this._pc = new Map(); }

    rawPose(id, t) {
      const T = id === 'T';
      const C = (k) => this.C(k);
      const p = basePose(id, t);
      const k = T ? 1 : 0.63;            // leg-length scale for steps
      // the short one is a quarter beat late… notices, hops back in sync, smiles as if it was planned, drifts late again
      let lag = T ? 0 : 0.25;
      if (!T) for (const fx of this.fixes()) lag *= 1 - win(t, fx + 0.25, fx + 2.6, 0.12, 0.6);
      const bt = this.beat(t);
      const b = bt - lag;
      const v1 = C('v1a').start;
      const m = this.data.markers;
      const enc = m.instr ? m.instr[0][0] : 1e9, encEnd = m.instr ? m.instr[0][1] : 1e9;
      const eb = (n) => this.tAtBeat(Math.round(this.beat(enc)) + n); // encore time at beat n

      // the listener keeps the mouth shut and looks at whoever is talking
      { const oc = this.active(T ? 'S' : 'T', t), mine = this.active(id, t);
        if (oc && !mine && oc.who !== 'both') mix(p, { lookX: 1 }, win(t, oc.start + 0.15, oc.end + 0.2, 0.12, 0.2)); }
      // =============== OPENING ===============
      mix(p, { lean: -2, headRot: -5, eyeOpen: T ? 1.12 : 0.9, smile: T ? 0.15 : 0, armX: T ? -8 : -6, armY: T ? 172 : 140, micT: 0.25, puff: T ? 0.25 : 0 }, win(t, m.open, v1 - 0.2, 0.3, 0.3));
      if (T) {
        const tp = Math.pow(Math.max(0, Math.cos(Math.PI * bt)), 8);
        mix(p, { fFa: -18 * tp, fFx: 4 * tp, arcF: tp > 0.5 ? 1 : 0 }, win(t, m.open + 2.6, m.inhale - 0.2, 0.2, 0.2));
        mix(p, { headRot: 6, headDy: 6, smile: 0.8, wink: 1 }, win(t, m.open + 3.6, m.open + 4.3, 0.1, 0.12));
      } else {
        mix(p, { lookX: 0.9, eyeOpen: 0.7, browR: 0.8 }, win(t, m.open + 4.2, m.open + 5.6, 0.1, 0.12));
        mix(p, { lookX: -1, eyeOpen: 0.5, lidTilt: 0.25, frown: 0.2 }, win(t, m.open + 5.7, m.inhale + 0.1, 0.1, 0.2));
      }
      if (T) mix(p, { puff: 0.9, shrug: -12, headDy: -8, headRot: -10, micT: 1, eyeOpen: 1.2, sq: 1.03 }, win(t, m.inhale, v1 + 0.25, 0.35, 0.25));
      else {
        mix(p, { puff: 0.7, shrug: -10, headDy: -4, eyeOpen: 1.15, bulge: 1.1 }, win(t, m.inhale + 0.35, v1 + 0.5, 0.35, 0.3));
        mix(p, { micT: 1, micTilt: 16 * Math.sin(t * 30) * win(t, v1 + 0.05, v1 + 0.45, 0.05, 0.1), sweat: 1, pupil: 0.7 }, ramp(t, v1 + 0.05, 0.35));
        mix(p, { sweat: 0 }, ramp(t, v1 + 1.2, 0.05));
      }

      // =============== DANCE LAYERS ===============
      const sec = (a, z, fi = 0.4, fo = 0.4) => win(t, a, z, fi, fo);
      mix(p, V.bounce(b, k), sec(v1 + (T ? 0.1 : 0.5), C('v1e').end + 0.3, 0.5, 0.5));
      mix(p, V.bounce(b, k, 0.4), 0.35 * sec(C('s1a').start - 0.2, C('s1e').end + 0.2));
      mix(p, V.bounce(b * 0.5, k, 0.6), 0.85 * sec(C('v2a').start - 0.2, C('v2e').end + 0.3));
      mix(p, V.bounce(b, k, 0.3), 0.3 * sec(C('s2a').start - 0.3, C('s2d').end));
      // verse 3: perfectly synced tap (even the short one is on the beat), then the moonwalk gag, charleston, kick line
      mix(p, V.tap(bt, k), sec(C('v3a').start - 0.1, C('v3b').start - 0.05, 0.2, 0.1));
      // verse 3: the robot (the short one's is broken), then kicks vs. dad-at-a-wedding
      mix(p, V.robot(b, k, !T), sec(C('v3b').start + 3.2, C('v3e').start + 0.3, 0.2, 0.3));
      if (T) mix(p, V.kick(b, k, 1), sec(C('v3e').start + 0.2, C('v3e').end + 0.2, 0.3, 0.3));
      else mix(p, V.dad(b, k), sec(C('v3e').start + 0.2, C('v3e').end + 0.2, 0.3, 0.3));
      // end of verse 1: rubber legs (the short one does a feeble copy)
      mix(p, V.noodle(b, k), (T ? 1 : 0.45) * sec(C('v1d').start + 0.8, C('v1e').end + 0.1, 0.3, 0.3));
      // start of verse 2: the chicken
      mix(p, V.chicken(b, k), sec(C('v2a').start, C('v2b').start + 0.1, 0.3, 0.3));
      mix(p, V.bounce(b, k, 0.3), 0.25 * sec(C('o1').start, C('o5').end));

      // mic up while singing/speaking
      const act = this.active(id, t, 0.25);
      if (t > v1 + 0.6) mix(p, { micT: act ? 1 : (t < C('o7').end + 0.3 ? 0.88 : 0.62) }, 1);
      if (t > v1 + 0.6 && act) mix(p, { micT: 0.62 }, 1 - win(t, act.start - 0.3, act.end + 0.3, 0.2, 0.3));

      if (!T) for (const fx of this.fixes()) {
        mix(p, { lookX: 1, eyeOpen: 1.1, brow: 0.6 }, win(t, fx - 0.5, fx + 0.05, 0.08, 0.05));
        mix(p, jump(t, fx + 0.05, 0.22, 22, 0.6), win(t, fx - 0.2, fx + 0.5, 0.01, 0.01));
        mix(p, { lookX: -1, smile: 1, grin: 1, eyeOpen: 0.6, lidTilt: -0.2 }, win(t, fx + 0.35, fx + 1.6, 0.1, 0.25));
      }
      // =============== VERSE 1: selling air ===============
      {
        const a = C('v1a'), bq = C('v1b');
        const air = a.start + (a.end - a.start) * 0.5;
        if (T) {
          // presents the empty space like the invention of the century
          mix(p, { armX: -160, armY: -20, hand: 'open', handRot: -70, eyeHappy: 1, brow: 1, smile: 1, lean: -6, headRot: -10, puff: 0.6 }, win(t, air - 0.15, bq.end - 0.4, 0.2, 0.35));
        } else {
          const st = air + 0.25, en = bq.end + 0.4;
          mix(p, { fBy: 0, fFy: 0, hipDy: 8, hipDx: 0, hipRot: 0, lean: 6, headRot: 8, lookX: 0.6, lookY: 0.4, eyeOpen: 0.85, brow: 0.6, smile: 0, frown: 0.6 }, win(t, st, en, 0.25, 0.3));
          const swipe = Math.sin((t - st) * 8);
          mix(p, { armFront: 1, armX: 150 + 45 * swipe, armY: 40, hand: 'open', handRot: -60, arcE: 0 }, win(t, st + 0.2, st + 1.2, 0.2, 0.2));
          // checks his empty palm — goes cross-eyed
          mix(p, { armFront: 1, armX: 110, armY: 0, hand: 'open', handRot: -150, cross: 0.85, lookY: 0.7, headRot: 14, eyeOpen: 1.1, pupil: 0.85 }, win(t, st + 1.2, st + 1.85, 0.12, 0.12));
          // deadpan to the audience, one brow up
          mix(p, { lookX: -1, lookY: 0, headRot: -4, eyeOpen: 0.5, lidTilt: 0.3, frown: 0.25, browR: 1, armFront: 0, armX: -20, armY: 132, hand: 'open', handRot: 0 }, win(t, st + 1.85, en, 0.1, 0.2));
        }
        const c3 = C('v1c');
        if (!T) mix(p, { browR: 1, lookX: 0.9, eyeOpen: 0.6, lidTilt: 0.2 }, win(t, c3.start - 0.1, c3.end + 0.1));
        else mix(p, { lookX: 0.8, pupil: 0.75, smile: 0.4, brow: 0.5 }, win(t, c3.start, c3.end));
        // "we'll say: it's there" — points into nowhere and winks at the audience; the short one rolls his eyes
        const d = C('v1d');
        if (T) {
          mix(p, { armX: -175, armY: -150, hand: 'point', handRot: -10, lookX: -0.6, lookY: -0.6, smile: 0.9, brow: 0.7 }, win(t, d.start - 0.05, d.end + 0.2, 0.12, 0.25));
          mix(p, { wink: 1, lookX: -1, lookY: 0, headRot: -6, grin: 1 }, win(t, d.end - 0.35, d.end + 0.35, 0.06, 0.1));
        } else mix(p, { lookY: -1, lookX: 0.2, eyeOpen: 0.55, headRot: -8, frown: 0.4, earDroop: 0.3 }, win(t, d.start + 0.3, d.end + 0.35, 0.15, 0.2));
        // long final note: head back; the short one strains with bulging eyes
        const ee = C('v1e'), ln = ee.start + (ee.end - ee.start) * 0.55;
        if (T) mix(p, { headRot: -16, eyeHappy: 1, puff: 0.7, armX: -160, armY: -170, arcE: 1 }, win(t, ln, ee.end + 0.15, 0.25, 0.2));
        else mix(p, { headRot: -10, eyeOpen: 1.3, bulge: 1.15, pupil: 0.55, puff: 0.5, armX: -110, armY: -150, sq: 1.04 }, win(t, ln + 0.15, ee.end + 0.15, 0.25, 0.2));
      }

      // =============== SPOKEN 1: the million ===============
      {
        const a = C('s1a'), bq = C('s1b'), c = C('s1c'), d = C('s1d'), e5 = C('s1e');
        if (T) {
          mix(p, Object.assign(jump(t, a.start + 0.05, 0.55, 45), { armX: -110, armY: -175 }), 1);
          mix(p, { armX: -110, armY: -175, hand: 'open', eyeOpen: 1.35, bulge: 1.2, pupil: 1.5, grin: 1, smile: 1, brow: 1, earDroop: -0.6 }, win(t, a.start - 0.1, a.end + 0.4, 0.1, 0.3));
          // freezes in jazz hands; the grin curdles; sweat
          mix(p, { armX: -110, armY: -170, eyeOpen: 1.15, grin: 1, smile: 0.5, lookX: 1, pupil: 0.6 }, win(t, bq.start, bq.end + 0.25, 0.08, 0.2));
          mix(p, { sweat: 1 }, win(t, bq.start + 0.3, c.end, 0.01, 0.01));

          // "no, but there's an interview" — forced cheerful shrug
          mix(p, { armX: -150, armY: 10, hand: 'open', handRot: -60, smile: 0.85, brow: 1, browTilt: -0.7, eyeOpen: 1.05, shrug: -18 }, win(t, c.start - 0.1, c.end + 0.1, 0.15, 0.2));
          // the money question: pupils shrink
          mix(p, { lookX: 1, pupil: 0.45, eyeOpen: 1.2, smile: 0.2, frown: 0.2, sweat: 2, earDroop: 0.3 }, win(t, d.start + 0.3, d.end + 0.05, 0.1, 0.1));
          // pause: floor… then "mom" with blush and a proud tear
          mix(p, { headRot: 18, lookY: 1, lookX: 0.2, eyeOpen: 0.7, smile: 0.1, earDroop: 0.8, pupil: 1 }, win(t, e5.start - 0.45, e5.start - 0.08, 0.08, 0.08));
          mix(p, { headRot: 6, lookY: 0.3, eyeOpen: 0.75, smile: 0.8, browTilt: -0.9, brow: 0.5, earDroop: 0.4, armX: -40, armY: 120, blush: 1, tear: 1 }, win(t, e5.start - 0.1, e5.end + 0.4, 0.1, 0.3));
        } else {
          mix(p, { lookX: 0.9, eyeOpen: 0.85, brow: 0.5, lookY: -0.6 }, win(t, a.start, a.end + 0.2));
          mix(p, { fBy: 0, fFy: 0, fBx: 0, fFx: 0, hipDx: 0, hipRot: 0, hipDy: 6, lean: 0, eyeOpen: 0.5, smile: 0, frown: 0.3, lookX: 0.8, browR: 0.6 }, win(t, bq.start - 0.15, d.end + 0.2, 0.1, 0.2));
          // the take: after "but there's an interview" he turns to us, deadpan
          mix(p, { lookX: -1, lookY: 0, eyeOpen: 0.5, headRot: -4, frown: 0.2 }, win(t, c.end + 0.05, d.start - 0.02, 0.06, 0.06));
          // slow unimpressed blink at "interview"; ears droop
          mix(p, { lookX: 1, eyeOpen: 0.4, earDroop: 0.6 }, win(t, c.start, c.end));
          if (t > c.start + 0.5 && t < c.start + 0.9) p.eyeOpen = 0.02;
          // leans in with a squint for the food question
          mix(p, { lean: 10, headRot: 6, lookX: 1, eyeOpen: 0.4, lidTilt: 0.4, browTilt: 0.6 }, win(t, d.start - 0.1, d.end + 0.1));
          mix(p, { lookX: 0.9, eyeOpen: 0.6, brow: 0.3 }, win(t, e5.start - 0.4, e5.start + 0.5));
          // facepalm
          mix(p, { armFront: 1, armX: 120, armY: -150, hand: 'open', handRot: 160, lean: 12, headRot: 26, headDy: 18, eyeOpen: 0.02, frown: 0.5, earDroop: 0.8 }, win(t, e5.start + 0.6, e5.end + 0.6, 0.15, 0.3));
        }
      }

      // =============== VERSE 2: overdramatic ===============
      {
        const a = C('v2a'), b2 = C('v2b'), c2 = C('v2c'), d2 = C('v2d'), e5 = C('v2e');
        const late = T ? 0 : 0.4;
        mix(p, { armFront: 1, armX: T ? 92 : 80, armY: T ? 70 : 60, hand: 'open', handRot: 80, eyeHappy: 1, headRot: -12, smile: 0.6, puff: 0.4, brow: 0.8, browTilt: -0.8, tear: T ? 1 : 0 }, win(t, b2.start + late, c2.start, 0.3, 0.25));
        if (!T) mix(p, { straw: 1 }, win(t, a.start - 0.6, C('s2a').start + (C('s2a').end - C('s2a').start) * 0.55, 0.01, 0.01));
        if (!T) mix(p, { browR: 1, lookX: 0.9, eyeOpen: 0.6 }, win(t, c2.start, c2.end + 0.3, 0.1, 0.15));
        // "it went on the video" — dramatic flick away
        if (T) mix(p, { armX: -190, armY: -60, hand: 'open', handRot: -100, headRot: -14, lookX: -1, eyeOpen: 0.6, browTilt: -0.8, arcE: 1 }, win(t, d2.start, d2.end + 0.2, 0.12, 0.25));
        // long note: the tall one drops to one knee; the short one looks at him, then at us
        const kn = e5.start + 0.3, up = e5.end - 1.4, nudge = up + 0.6, wake = nudge + 0.15;
        if (T) {
          mix(p, { hipDy: 120, fFx: 90, fBx: -70, fBy: -8, fBa: 70, lean: -8, headRot: -18, eyeHappy: 1, armX: -160, armY: -150, puff: 0.6, arcE: 1 }, win(t, kn, up, 0.25, 0.25));
          // still holding the note, notices his partner asleep, slides over and elbows him
          mix(p, { lookX: 1, eyeOpen: 1.2, brow: 1, browTilt: 0.6 }, win(t, up, up + 0.4, 0.08, 0.1));
          p.dx += 330 * win(t, up + 0.3, e5.end + 0.35, 0.3, 0.35);
          mix(p, V.scramble(bt, k), Math.max(win(t, up + 0.3, up + 0.6, 0.05, 0.05), win(t, e5.end - 0.05, e5.end + 0.35, 0.05, 0.05)));
          mix(p, { armFront: 1, armX: 160, armY: 30, hand: 'fist', lean: 10, frown: 0.5, lookX: 1, arcE: 1 }, win(t, nudge - 0.1, nudge + 0.3, 0.06, 0.1));
        } else {
          // dozes off standing: head drops, ears droop, snore bubble breathes
          const zz = win(t, kn + 0.4, wake, 0.6, 0.02);
          mix(p, { eyeOpen: 0.02, headRot: 22, headDy: 16, earDroop: 0.9, micT: 0.2, lean: 6, hipDx: 6 * Math.sin(t * 1.5), smile: 0.2, armX: -10, armY: 140 }, zz);
          p.bubble = zz > 0.6 ? 0.5 + 0.5 * Math.sin(t * 2.6) : 0;
          // jolts awake
          mix(p, { eyeOpen: 1.35, bulge: 1.2, pupil: 0.45, earDroop: -0.8, arcE: 1, sq: 1.06, lookX: -1, jaw: 0.25, mouthO: 1, headRot: -6 }, win(t, wake, wake + 0.55, 0.03, 0.2));
          mix(p, { lookX: 1, eyeOpen: 0.6, frown: 0.4, browR: 1 }, win(t, wake + 0.55, e5.end + 0.5, 0.1, 0.2));
        }
      }

      // =============== SPOKEN 2: the straw ===============
      {
        const a = C('s2a'), bq = C('s2b'), c = C('s2c'), d = C('s2d');
        const word = a.start + (a.end - a.start) * 0.55;
        if (T) {
          // "the investor is here" — ears shoot up, eyes bulge, pupils pinpoints
          mix(p, { lookX: -1, eyeOpen: 1.35, bulge: 1.2, pupil: 0.4, brow: 1, earDroop: -0.7, smile: 0.1, arcE: 1, sq: 1.04 }, win(t, a.start - 0.1, word - 0.1, 0.06, 0.1));
          // searches the auditorium: hand over the eyes, leans out over the edge of the stage
          mix(p, { lean: -6, headRot: -8, lookX: -1, eyeOpen: 1.2, armFront: 1, armX: 70, armY: -190, hand: 'flat', handRot: 95, smile: 0.4, brow: 1 }, win(t, a.start + 0.35, word - 0.15, 0.12, 0.12));
          // whispering sideways: lean in, hand at the mouth
          mix(p, { lean: 12, headRot: 12, lookX: 1, eyeOpen: 0.7, smile: 0.1, frown: 0.4, brow: 0.2, browTilt: 0.7, armFront: 1, armX: 150, armY: -140, hand: 'open', handRot: 150 }, win(t, word - 0.1, a.end + 0.2, 0.12, 0.2));
          mix(p, { lookX: 1, eyeOpen: 0.8, brow: 0.8, smile: 0.1 }, win(t, bq.start, bq.end + 0.1));
          // tight grin to the audience
          mix(p, { lookX: -1, grin: 1, smile: 1, eyeOpen: 1.1, sweat: 1 }, win(t, c.start - 0.1, c.end + 0.1));
          // points at the short one's belly
          mix(p, { armFront: 1, armX: 200, armY: 40, hand: 'point', handRot: -80, lookX: 1, lookY: 0.6, smile: 0.7, lidTilt: -0.3, eyeOpen: 0.75 }, win(t, d.start + 0.2, d.end + 0.6, 0.12, 0.2));
        } else {
          // also scans the hall, hand over the eyes
          mix(p, { lean: -4, headRot: -6, lookX: -1, eyeOpen: 1.15, armFront: 1, armX: 60, armY: -150, hand: 'flat', handRot: 95, fBy: 0, fFy: 0 }, win(t, a.start + 0.4, word - 0.1, 0.12, 0.1));
          // super-fast hide behind the back, then an innocent whistle face
          const h0 = word + 0.05;
          mix(p, { armFront: 1, armX: 150, armY: -60, hand: 'fist', arcE: 1 }, win(t, h0, h0 + 0.18, 0.05, 0.04));
          mix(p, { strawHand: 1 }, win(t, h0 + 0.14, C('v3a').start - 0.5, 0.01, 0.01));
          mix(p, { armFront: 0, armX: -40, armY: 120, hand: 'fist', handRot: 30, eyeOpen: 1.05, lookY: -0.8, lookX: -0.3, jaw: 0.14, mouthO: 1, brow: 0.7 }, win(t, h0 + 0.18, bq.start - 0.05, 0.08, 0.1));
          mix(p, { armFront: 0, armX: -40, armY: 120, hand: 'fist', handRot: 30 }, win(t, h0 + 0.18, C('v3a').start - 0.4, 0.08, 0.3));
          mix(p, { fBy: 0, fFy: 0, hipDx: 0, hipRot: 0, lean: -2 }, win(t, h0, d.end + 1.6, 0.05, 0.3));
          // offended: chin up
          mix(p, { lookX: 0.7, eyeOpen: 0.6, browTilt: 0.8, headRot: -10, frown: 0.3 }, win(t, bq.start - 0.1, bq.end + 0.1));
          mix(p, { lookX: 0.8, eyeOpen: 0.6 }, win(t, c.start, d.end));
          // stop on "expense": looks down at his belly… then at the camera
          mix(p, { lookY: 1, lookX: 0.3, headRot: 18, eyeOpen: 0.9, pupil: 0.8, frown: 0.2 }, win(t, d.end - 0.15, d.end + 0.4, 0.08, 0.08));
          mix(p, { lookX: -0.35, lookY: 0.05, eyeOpen: 0.45, smile: 0, frown: 0.15, headRot: -3, brow: 0 }, win(t, d.end + 0.4, d.end + 1.4, 0.06, 0.2));
        }
        mix(p, { hipDy: 6, fBy: 0, fFy: 0, hipDx: 0, hipRot: 0 }, win(t, d.end - 0.1, d.end + 0.45, 0.05, 0.1));
      }

      // =============== VERSE 3: peak ===============
      {
        const a = C('v3a'), bq = C('v3b'), c3 = C('v3c'), d = C('v3d'), e5 = C('v3e');
        if (T) mix(p, { eyeHappy: 1, smile: 1, grin: 1 }, win(t, a.start, bq.start, 0.2, 0.1));
        else mix(p, { eyeOpen: 1.1, pupil: 0.8, smile: 0.6, tongueOut: 1 }, win(t, a.start + 0.6, bq.start, 0.2, 0.1));
        // MOONWALK GAG: both slide backwards — away from each other — without noticing
        const mw0 = bq.start, mw1 = mw0 + 1.7, look = mw1 + 0.7, back = look + 0.75;
        const away = 170 * smooth((t - mw0) / (mw1 - mw0));
        const ret = smooth((t - look) / (back - look));
        const dist = away * (1 - ret);
        p.dx = (T ? -1 : 1) * dist;
        mix(p, Object.assign(V.moonwalk(bt * 2, k), { eyeHappy: 1, smile: 1, armX: -110, armY: -40, hand: 'open', handRot: 40 }), win(t, mw0, mw1, 0.1, 0.1));
        // realise: freeze at opposite edges, stare across the gap
        mix(p, { lookX: 1, eyeOpen: 1.35, bulge: 1.2, pupil: 0.5, jaw: 0.3, mouthO: 1, earDroop: -0.6, arcE: 1, fBy: 0, fFy: 0 }, win(t, mw1, look, 0.06, 0.06));
        // scramble back with tiny frantic steps
        mix(p, Object.assign(V.scramble(bt, k), { sweat: 1, eyeOpen: 1.1, lookX: 1 }), win(t, look, back, 0.05, 0.08));
        // ta-da, as if it was planned
        mix(p, { armX: -140, armY: -175, hand: 'open', grin: 1, smile: 1, eyeOpen: 1.1, lookX: -1, brow: 1, sq: 1.03 }, win(t, back, back + 0.9, 0.08, 0.3));
        if (!T) {
          mix(p, { browR: 1, lookX: 0.9, eyeOpen: 0.55 }, win(t, c3.start, c3.end + 0.5, 0.1, 0.15));
        }
        // "look at the presentations" — callback: presents the air again, wink
        if (T) {
          mix(p, { armX: -175, armY: -40, hand: 'open', handRot: -70, smile: 1, brow: 0.8 }, win(t, d.start - 0.05, d.end + 0.2));
          mix(p, { wink: 1, lookX: -1, grin: 1 }, win(t, d.end - 0.4, d.end + 0.2, 0.06, 0.1));
        } else mix(p, { lookY: -1, eyeOpen: 0.55, headRot: -8 }, win(t, d.start + 0.3, d.end + 0.2));
        mix(p, { headRot: T ? -6 : -12, eyeHappy: T ? 1 : 0, eyeOpen: T ? 1 : 1.25, pupil: T ? 1 : 0.55, puff: 0.6, brow: 1 }, win(t, e5.start + (e5.end - e5.start) * 0.5, e5.end + 0.2, 0.25, 0.2));
      }

      // =============== OUTRO: air for air ===============
      {
        const o1 = C('o1'), o2 = C('o2'), o3 = C('o3'), o4 = C('o4'), o5 = C('o5'), o6 = C('o6'), o7 = C('o7');
        if (T) {
          // jump with a heel click
          const j0 = o1.start + 0.1, jd = 0.6;
          const J = jump(t, j0, jd, 48);
          mix(p, J, 1);
          if (t > j0 && t < j0 + jd) { const q = sinp((t - j0) / jd); mix(p, { fBx: 70, fFx: 20, fBy: -60, fFy: -60, fBa: -20, fFa: 20, arcF: 1 }, q); }
          mix(p, { armX: -120, armY: -175, eyeHappy: 1, smile: 1, grin: 1 }, win(t, o1.start, o1.end + 0.2));
          // smug, eyebrows wiggling
          mix(p, { lookX: 1, smile: 0.95, eyeOpen: 0.7, lidTilt: -0.3, armX: -60, armY: 60, brow: 0.5 + 0.5 * Math.sin(t * 22), puff: 0.5 }, win(t, o3.start - 0.1, o3.end + 0.2));
          mix(p, { lookX: 1, smile: 0.8, armX: -160, armY: -20, hand: 'open', handRot: -70, eyeHappy: 1 }, win(t, o5.start, o5.end - 0.5, 0.15, 0.1));
          // realisation at the end of "in different packaging": jaw drops, pinpoint pupils
          mix(p, { jaw: 0.9, mouthO: 0.4, eyeOpen: 1.35, bulge: 1.25, pupil: 0.35, eyeHappy: 0, earDroop: -0.5, armX: -60, armY: 120 }, win(t, o5.end - 0.35, o5.end + 0.4, 0.08, 0.15));
        } else {
          mix(p, { lookX: 0.9, eyeOpen: 0.7 }, win(t, o1.start, o1.end + 0.2));
          // for once he's hopeful: ears up, big eyes
          mix(p, { lookX: 1, eyeOpen: 1.3, bulge: 1.1, pupil: 1.5, earDroop: -0.6, smile: 0.7, brow: 1 }, win(t, o2.start - 0.1, o2.end + 0.1));
          // deflates: "shares"
          mix(p, { lookX: 1, eyeOpen: 0.45, smile: 0, frown: 0.5, earDroop: 1, sq: 0.95, hipDy: 20, shrug: 12 }, win(t, o3.start + 0.5, o4.start, 0.15, 0.15));
          mix(p, { lookX: 1, eyeOpen: 0.4, lidTilt: 0.4, browTilt: 0.6, lean: 6 }, win(t, o4.start - 0.1, o4.end + 0.1));
          mix(p, { lookX: 1, eyeOpen: 0.55, smile: 0 }, win(t, o5.start, o5.end));
        }
        // ba-dum-tss… freeze, look at each other, then at the audience
        const fz = o5.end + 0.05;
        mix(p, { fBy: 0, fFy: 0, hipDx: 0, hipRot: 0, lean: 0, hipDy: 6, armX: -20, armY: T ? 166 : 134, hand: 'open', micT: 0.62, smile: 0, eyeOpen: 1.05, eyeHappy: 0, earDroop: 0.6 }, win(t, fz + 0.3, o7.start, 0.06, 0.15));
        mix(p, { lookX: 1, brow: 0.6 }, win(t, fz + 0.6, fz + 1.4, 0.12, 0.1));
        mix(p, { lookX: -1, brow: 0.2, eyeOpen: 0.9 }, win(t, fz + 1.45, o7.start, 0.08, 0.1));
        if (!T) mix(p, { lookX: -1, eyeOpen: 0.5, micT: 1, browR: 1 }, win(t, o6.start - 0.2, o6.end + 0.2));
        // "smile, we're on air": whispered through the teeth… then the giant fake smile
        if (T) mix(p, { grin: 1, smile: 1, lookX: 1, eyeOpen: 1.1, lean: 8, sweat: 1 }, win(t, o7.start, o7.start + (o7.end - o7.start) * 0.5, 0.08, 0.1));
        mix(p, { grin: 1, smile: 1, eyeOpen: 1.3, bulge: 1.12, pupil: 0.7, brow: 1, lookX: -0.4, puff: 0.3, sweat: T ? 1 : 2 }, win(t, o7.start + (o7.end - o7.start) * 0.5, enc - 1.4, 0.12, 0.2));
        const fp = o7.end + 0.25 + (T ? 0 : 0.3);
        const showy = { armX: -150, armY: -175, hand: 'open', fFx: 30, fFy: 0, fBy: 0, hipDx: 0, hipRot: 0, lean: -6, headRot: -8, micT: 1, hipDy: 14 };
        mix(p, showy, win(t, fp, enc - 0.3, 0.2, 0.35));
        // "everybody!" — the tall one offers the mic to the audience… silence… pulls it back with a smile
        const ma = o7.end + 0.8, mz = ma + 1.6;
        if (T) {
          mix(p, { micOut: 1, micT: 0, lean: 10, armX: -150, armY: -160, hand: 'open', brow: 1, eyeOpen: 1.15, grin: 1, smile: 1, lookX: -1, arcE: 1 }, win(t, ma, ma + 0.6, 0.12, 0.12));
          mix(p, { micOut: 1, micT: 0, lean: 14, armX: -60, armY: 60, brow: 0.8, eyeOpen: 1.1, smile: 0.7, lookX: -1, headRot: 6 }, win(t, ma + 0.6, mz, 0.12, 0.15));
          mix(p, { grin: 1, smile: 1, sweat: 1, eyeOpen: 0.75, lidTilt: -0.3, lookX: -0.5, micT: 1 }, win(t, mz, enc - 0.2, 0.15, 0.2));
        } else {
          mix(p, { lookX: 1, eyeOpen: 0.7, browR: 1 }, win(t, ma, ma + 0.8, 0.1, 0.1));
          mix(p, { lookY: -1, eyeOpen: 0.5, headRot: -8 }, win(t, ma + 0.9, enc - 0.2, 0.15, 0.2));
        }
      }

      // =============== ENCORE: dance, then the guitarist hogs the finale while they bow ===============
      if (t > enc - 0.5) {
        const E = (n) => eb(n);
        const hit = E(10);
        mix(p, Object.assign(V.egypt(b, k), { micT: 0.62 }), win(t, E(0), hit, 0.3, 0.05));
        p.dx += (T ? 1 : -1) * 152 * smooth((t - E(0.5)) / (hit - E(0.5))) * (1 - smooth((t - (hit + 0.15)) / 0.5));
        // bonk: bounce back, squash, ears flop, cross-eyed
        mix(p, { sq: 0.9, lean: -14, headRot: -16, arcE: 1, cross: 0.9, eyeOpen: 1.2, pupil: 0.6, jaw: 0.2, mouthO: 1, earDroop: 0.7, fBy: 0, fFy: 0 }, win(t, hit, hit + 0.35, 0.03, 0.15));
        mix(p, { cross: 0.9, eyeOpen: 1.1, headRot: 10 * Math.sin(t * 9), lean: 4 * Math.sin(t * 7), earDroop: 0.6, smile: 0.2 }, win(t, hit + 0.35, E(13), 0.1, 0.3));
        mix(p, Object.assign(V.charleston(b, k), { eyeHappy: T ? 1 : 0, smile: T ? 1 : 0.3, micT: 0.62 }), win(t, E(13), E(16), 0.3, 0.2));
        // SOLOS: each one gets the spotlight while the other steps back into the dark
        const so = (a, z) => win(t, E(a), E(z), 0.15, 0.15);
        if (T) {
          mix(p, Object.assign(V.runningMan(bt, 1), { grin: 1, smile: 1, eyeOpen: 1.1, micT: 0.62 }), so(16, 18));
          mix(p, Object.assign(V.noodle(bt, 1), V.windmill(bt, 1), { eyeHappy: 1, grin: 1, micT: 0.62 }), so(18, 20));
          // knee slide toward the audience: deep drop, lean back, arms flung open
          const ks = E(20);
          p.dx += 150 * smooth((t - ks) / (E(21.5) - ks)) * (1 - smooth((t - E(23.6)) / (E(24.6) - E(23.6))));
          mix(p, { hipDy: 128, fFx: 95, fBx: -75, fBy: -8, fBa: 70, lean: -24, headRot: -22, armX: -150, armY: -150, hand: 'open', eyeHappy: 1, grin: 1, arcF: 1, micT: 0.62 }, so(20, 22));
          // star jump, then the 'nailed it' wink to camera
          mix(p, Object.assign(jump(t, E(22.2), 0.55, 80), {}), win(t, E(22.2) - 0.3, E(22.2) + 0.8, 0.01, 0.01));
          if (t > E(22.2) && t < E(22.2) + 0.55) mix(p, { fBx: -150, fFx: 150, fBy: -70, fFy: -70, armX: -150, armY: -190, hand: 'open', arcF: 1, eyeHappy: 1 }, sinp((t - E(22.2)) / 0.55));
          mix(p, { lookX: -1, wink: 1, grin: 1, smile: 1, armX: -40, armY: 120, hand: 'point', micT: 0.62 }, win(t, E(23), E(24), 0.1, 0.15));
          // Shuki's turn: step back, arms folded-ish, side-eye
          p.dx -= 90 * win(t, E(24), E(32), 0.5, 0.5);
          mix(p, { lookX: 1, eyeOpen: 0.75, smile: 0.5, lidTilt: -0.2, armFront: 1, armX: 92, armY: 70, hand: 'flat', handRot: 80, micT: 0.62, fBy: 0, fFy: 0 }, win(t, E(24.2), E(31.8), 0.3, 0.3));
          mix(p, { lookX: -1, eyeOpen: 1.1, brow: 1, frown: 0.2 }, win(t, E(29.6), E(30.6), 0.08, 0.15));   // watches the trip, looks at us
        } else {
          // Hezi's turn: steps back into the dark, deadpan, one eyebrow
          p.dx += 90 * win(t, E(16), E(24), 0.5, 0.5);
          mix(p, { lookX: 1, eyeOpen: 0.5, browR: 1, frown: 0.2, fBy: 0, fFy: 0, micT: 0.62 }, win(t, E(16.2), E(23.8), 0.3, 0.3));
          mix(p, { lookX: -1, eyeOpen: 0.45, lidTilt: 0.3 }, win(t, E(22.4), E(23.4), 0.08, 0.15));          // unimpressed take during the star jump
          // his own solo: shrug to camera, belly shake, broken robot, then the running man… trips
          mix(p, { lookX: -1, shrug: -16, armX: -90, armY: 30, hand: 'open', handRot: -60, eyeOpen: 0.7, smile: 0.3, micT: 0.62 }, so(24, 25));
          mix(p, Object.assign(V.shake(bt, k), { eyeHappy: 1, grin: 1, smile: 1, micT: 0.62 }), so(25, 27));
          mix(p, Object.assign(V.robot(bt, k, true), { micT: 0.62 }), so(27, 28.6));
          const tr = E(29.6);
          mix(p, Object.assign(V.runningMan(bt * 1.4, k), { eyeOpen: 1.2, sweat: 1, tongueOut: 1, micT: 0.62 }), win(t, E(28.6), tr, 0.1, 0.05));
          mix(p, { lean: 22, headRot: 18, fFx: 60, fFy: -30, fBx: -30, armX: -170, armY: -100, hand: 'open', eyeOpen: 1.35, bulge: 1.2, pupil: 0.4, jaw: 0.6, mouthO: 1, arcE: 1, sweat: 2 }, win(t, tr, tr + 0.6, 0.06, 0.2));
          mix(p, { lookX: -1, eyeOpen: 0.5, grin: 1, smile: 1, sweat: 1, lidTilt: 0.2, armX: -150, armY: -170, hand: 'open' }, win(t, tr + 0.6, E(32), 0.12, 0.1));
        }
        // small kicks side by side
        mix(p, Object.assign(V.kick(b, k, T ? 0.6 : 0.45), { grin: 1, smile: 1, eyeOpen: T ? 1.05 : 1.15, micT: 0.62 }), win(t, E(32), E(48), 0.2, 0.3));
        // GUITAR SOLO: upstaged. The tall one side-eyes the guitarist, tries jazz hands, gives up; the short one nods along
        const g0 = E(48), bow0 = E(78);
        if (T) {
          mix(p, Object.assign(V.bounce(b, k, 0.3), { lookX: 1, lookY: 0.2, frown: 0.4, browTilt: 0.7, eyeOpen: 0.7, smile: 0, micT: 0.62 }), win(t, g0, E(60), 0.3, 0.2));
          mix(p, { armX: -160, armY: -150, hand: 'open', handRot: 20 * Math.sin(t * 18), grin: 1, smile: 1, eyeOpen: 1.2, lookX: -1, puff: 0.5, micT: 0.62 }, win(t, E(60), E(66), 0.2, 0.2));
          mix(p, { lookX: 1, eyeOpen: 0.5, frown: 0.5, armX: -20, armY: 160, micT: 0.62 }, win(t, E(66), bow0, 0.2, 0.2));
        } else {
          mix(p, { lookX: -1, eyeOpen: 0.75, smile: 0.5, micT: 0.62, headRot: 6 * Math.sin(Math.PI * bt), headDy: 6 * Math.abs(Math.sin(Math.PI * bt)) }, win(t, g0, bow0, 0.3, 0.2));
        }
        // the solo pushes them aside (tiny shuffling steps), they come back for the bows
        const aside = smooth((t - g0) / 0.9) * (1 - smooth((t - (bow0 - 1.0)) / 0.9));
        p.dx += (T ? -120 : -215) * aside;
        mix(p, V.scramble(bt, k), Math.max(win(t, g0, g0 + 0.9, 0.1, 0.1), win(t, bow0 - 1.0, bow0 - 0.1, 0.1, 0.1)));
        // BOWS: the tall one bows deep, hand on heart; the short one bows late and shallow
        const bw = bow0 + (T ? 0 : 0.45);
        const bowP = { lean: T ? 48 : 34, headRot: T ? 30 : 22, hipDx: T ? -30 : -20, hipDy: 14, armFront: 1, armX: T ? 92 : 80, armY: T ? 70 : 60, hand: 'open', handRot: 80, micT: 0.15, eyeHappy: 1, smile: 0.6, fBy: 0, fFy: 0, fBx: 0, fFx: 0 };
        // spread out for the bows so they don't bump heads
        p.dx += (T ? -130 : 70) * win(t, bow0 - 0.9, encEnd - 0.2, 0.8, 0.6);
        mix(p, V.scramble(bt, k), win(t, bow0 - 0.9, bow0 - 0.1, 0.1, 0.1));
        mix(p, bowP, win(t, bw, E(84), 0.45, 0.45));
        mix(p, bowP, win(t, E(86) + (T ? 0 : 0.4), encEnd - 0.4, 0.45, 0.4));
        const rip = bw + 0.3 + (T ? 0.45 : 0);
        if (!T) {
          if (t > rip) p.rip = 1;
          mix(p, { eyeOpen: 1.35, bulge: 1.25, pupil: 0.35, blush: 1, sweat: 2, eyeHappy: 0, earDroop: -0.6, arcE: 1 }, win(t, rip, rip + 1.2, 0.03, 0.2));
          mix(p, { armFront: 0, armX: -16, armY: 160, hand: 'open', handRot: 20, blush: 1 }, win(t, rip + 1.2, 1e9, 0.2, 0.01));
        } else mix(p, { lookX: 1, eyeOpen: 1.25, eyeHappy: 0, brow: 1, smile: 0 }, win(t, rip + 0.2, rip + 1.3, 0.08, 0.2));
      }
      // up from the bow into a final showy pose on the band's last hit… then they notice the turtle's clock
      {
        const fp2 = encEnd + (T ? 0 : 0.25);
        const showy = { armX: -150, armY: -175, hand: 'open', grin: 1, smile: 1, eyeOpen: 1.2, brow: 1, micT: 1, lean: -6, headRot: -8, hipDy: 14, fFx: 30, fFy: 0, fBy: 0, hipDx: 0, hipRot: 0, lookX: -0.3 };
        mix(p, showy, win(t, fp2, 1e9, 0.2, 0.01));
        const me2 = this.data.musicEnd;
        mix(p, { lookX: 1, grin: 0, smile: 0.2, eyeOpen: 1.1, frown: 0.3, sweat: 1 }, win(t, me2 + 0.4, me2 + 0.85, 0.12, 0.1));
        // greedy third bow… the curtain closes on them
        const b3 = me2 + 0.9 + (T ? 0 : 0.3);
        mix(p, { lean: T ? 48 : 34, headRot: T ? 30 : 22, hipDx: T ? -30 : -20, hipDy: 14, armFront: 1, armX: T ? 92 : 80, armY: T ? 70 : 60, hand: 'open', handRot: 80, micT: 0.15, eyeHappy: 1, smile: 0.8, grin: 1, fBy: 0, fFy: 0, fBx: 0, fFx: 0 }, win(t, b3, 1e9, 0.35, 0.01));
        if (!T && t > b3) mix(p, { armFront: 0, armX: -16, armY: 160 }, 1);
      }

      // blink (not when eyes are deliberately shut or winking)
      // life when standing: breathing, a lazy weight shift, a drifting head (additive, tiny)
      { const ph = T ? 0 : 1.7;
        p.hipDy += 2.6 * Math.sin(t * 2 * Math.PI / 3.1 + ph);
        p.puff += 0.035 * Math.sin(t * 2 * Math.PI / 3.1 + ph + 0.6);
        p.hipDx += 4 * Math.sin(t * 2 * Math.PI / 7.3 + ph * 2);
        p.headRot += 1.4 * Math.sin(t * 2 * Math.PI / 4.7 + ph) + 0.8 * Math.sin(t * 2 * Math.PI / 2.3 + ph * 3);
        p.armY += 5 * Math.sin(t * 2 * Math.PI / 3.1 + ph + 0.9);
        p.armX += 3 * Math.sin(t * 2 * Math.PI / 5.9 + ph); }
      // irregular blinks: 2.4–6 s apart, 0.2 s long (half-lid → shut → half-lid)
      { const seed = T ? 3 : 11; let tt = 1.0 + seed * 0.13, k2 = 0;
        while (tt < t - 0.25 && k2 < 400) { tt += 2.4 + 3.6 * hash(seed * 31 + k2); k2++; }
        const ph = (t - tt) / 0.2;
        if (ph >= 0 && ph <= 1 && !p.eyeHappy && !p.wink && p.eyeOpen > 0.1) p.blinkPh = ph; }
      const mo = this.mouth(id, t);
      p.jaw = Math.max(p.jaw, mo.jaw);
      p.mouthO = Math.max(p.mouthO, mo.o);
      p.mouthState = mo.state;
      p.held = mo.held ? 1 : 0;
      if (mo.state) p.blinkPh = null;
      if (p.jaw > 0.15) p.tongueOut = 0;
      return p;
    }

    stage(t) {
      const m = this.data.markers;
      const closeT = this.data.musicEnd + 1.45;
      const curtain = clamp((t - m.open) / 1.3, 0, 1) * (1 - clamp((t - closeT) / 1.3, 0, 1));
      let bad = 1;
      const fl = (a, z) => t > a && t < z && hash(Math.floor(t * 14)) > 0.45;
      if (t < m.open + 0.6) bad = fl(0, m.open + 0.6) ? 0 : 1;
      const mom = this.C('s1e').start;
      if (t > mom - 0.5 && t < mom + 0.4) bad = fl(mom - 0.5, mom + 0.4) ? 0 : 1;
      const ex = this.C('s2d').end;
      if (t > ex + 0.2) bad = 0;
      const enc = m.instr ? m.instr[0][0] : 1e9, me = this.data.musicEnd;
      if (t > enc) bad = 1;
      if (t > enc - 0.3 && t < enc + 0.5) bad = hash(Math.floor(t * 14)) > 0.5 ? 1 : 0;
      if (t > me - 0.4) bad = t < me + 0.5 && hash(Math.floor(t * 14)) > 0.5 ? 1 : 0;
      let star = 4 * Math.sin(t * 0.9);
      const s1 = this.C('s1a').start;
      star += 18 * Math.sin((t - s1) * 6) * win(t, s1, s1 + 1.6, 0.05, 0.8);
      star += 25 * Math.sin((t - me) * 3) * win(t, me + 0.1, me + 4, 0.2, 1.2);
      const pT = this.rawPoseCached('T', t), pS = this.rawPoseCached('S', t);
      // spotlight beams: on whoever sings/speaks; on each soloist; on the guitarist in his solo
      let bT = 0, bS = 0;
      for (const c of this.data.cues) {
        const w = win(t, c.start - 0.25, c.end + 0.35, 0.25, 0.45);
        if (c.who === 'T' || c.who === 'both') bT = Math.max(bT, w * (c.who === 'both' ? 0.7 : 1));
        if (c.who === 'S' || c.who === 'both') bS = Math.max(bS, w * (c.who === 'both' ? 0.7 : 1));
      }
      bT = Math.max(bT, win(t, this.E(16), this.E(24), 0.2, 0.25)); bS = Math.max(bS, win(t, this.E(24), this.E(32), 0.2, 0.25));
      bT *= 1 - win(t, this.E(24), this.E(32), 0.2, 0.25); bS *= 1 - win(t, this.E(16), this.E(24), 0.2, 0.25);
      const bG = win(t, this.E(48), this.data.musicEnd, 0.4, 0.1);
      if (bG > 0) { bT *= 1 - bG; bS *= 1 - bG; }
      const off = 1 - smooth((t - this.data.musicEnd) / 0.3);
      // the investor: a follow spot searches the dark hall and lands on the empty reserved seat
      const a2 = this.C('s2a').start, enc2 = enc;
      const sweep = (t0, t1) => -700 + 700 * smooth((t - t0) / (t1 - t0));
      const oe = this.C('o7').end;
      let audX = 0; if (t < a2 + 1.6) audX = sweep(a2 + 0.76, a2 + 1.2); else if (t < oe + 2.6) audX = sweep(oe + 1.45, oe + 1.85);
      const signFall = smooth((t - (oe + 1.95)) / 0.35);
      const audSpot = t > me + 3.45 ? 0 : 1;
      return { t, curtain, beamT: bT * off, beamS: bS * off, beamG: bG, xT: pT.x + pT.dx, xS: pS.x + pS.dx, audX, signFall, audSpot, poolT: pT.x + pT.dx, poolS: pS.x + pS.dx, glow: 0.5 };
    }

    orchestra(t) {
      const C = (k) => this.C(k), m = this.data.markers;
      const b = this.beat(t);
      const me = this.data.musicEnd, end = me - 0.05;
      const playing = t < me && t > m.open ? 1 : 0;
      const enc = this.encT(), g0 = this.E(48);
      const mw1 = C('v3b').start + 1.7;
      // the turtle's clock: four looks across the show; the hands advance each time
      const looks = [[m.open + 0.6, m.open + 2.4], [C('s2d').end + 0.2, C('s2d').end + 1.8], [enc - 1.6, enc + 1.0], [me + 0.3, me + 1.1]];
      let tLook = 0, tRaise = 0, clock = 0;
      looks.forEach(([a, z], i) => {
        tLook = Math.max(tLook, win(t, a, z, 0.25, 0.3));
        if (i === 1 || i === 3) tRaise = Math.max(tRaise, win(t, a + 0.1, z, 0.2, 0.3));
        clock += smooth((t - a) / 0.6) * 0.22;
      });
      return {
        t, beat: playing ? b : Math.floor(b), playing,
        bassBrow: win(t, C('v2b').start + 1.6, C('v2b').start + 3.6, 0.15, 0.3),
        dry: win(t, mw1, mw1 + 0.18, 0.02, 0.12),
        rim: win(t, C('o5').end + 0.15, C('o5').end + 0.45, 0.04, 0.15),
        finalHit: win(t, end, end + 0.35, 0.05, 0.2),
        cymbal: win(t, mw1, mw1 + 0.5, 0.02, 0.3) * Math.sin((t - mw1) * 34) + win(t, end + 0.05, end + 0.6, 0.02, 0.4) * Math.sin((t - end) * 30),
        solo: win(t, g0, me, 0.4, 0.05), soloBeat: b, gt: this.beat(t) - this.beat(g0), gRaise: win(t, end, 1e9, 0.15, 0.01),
        gStop: win(t, this.ripT(), this.ripT() + 1.3, 0.05, 0.2), tGo: win(t, this.ripT() + 0.7, this.ripT() + 1.6, 0.15, 0.2),
        tPull: win(t, me + 1.1, me + 2.4, 0.25, 0.4),
        tLook, tRaise, clock, tSigh: win(t, enc - 0.8, enc + 0.6, 0.2, 0.3), tLid: 0.5 - 0.15 * tRaise, tBlink: ((t * 0.29) % 5.3) < 0.13,
        faces: this.monkeyFaces(t),
        pianoNod: 4 * win(t, end + 0.2, end + 0.7, 0.1, 0.2),
        bassNod: 3 * win(t, end + 0.4, end + 0.9, 0.1, 0.2),
      };
    }

    // the band stays indifferent: a yawn, one raised eyebrow, a deadpan stare at the very end
    monkeyFaces(t) {
      const C = (k) => this.C(k), m = this.data.markers, f = { piano: {}, bass: {}, drums: {}, guitar: {} };
      const on = (a, z) => t >= a && t <= z;
      const me = this.data.musicEnd;
      if (on(m.open + 4.4, m.open + 5.6)) Object.assign(f.piano, { mouth: 'yawn', lid: 1 });
      const o5 = C('o5').end;
      if (on(o5 + 0.15, o5 + 1.3)) Object.assign(f.drums, { mouth: 'smirk', lookX: -0.6 });
      if (on(this.E(36), this.E(44))) Object.assign(f.drums, { mouth: 'smile', lookX: -0.5 });
      if (on(this.E(44), this.E(45.5))) Object.assign(f.drums, { mouth: 'o', lookX: 0 });
      if (on(C('v2b').start + 1.6, C('v2b').start + 3.6)) Object.assign(f.bass, { lookX: 0.6 });
      const rp = this.ripT();
      if (on(rp + 0.1, rp + 1.5)) { Object.assign(f.piano, { lookX: 1, lid: 0.2, mouth: 'o' }); Object.assign(f.bass, { lookX: 1, lid: 0.2, brow: 1 }); Object.assign(f.drums, { lookX: 1, lid: 0.2 }); }
      if (on(me + 0.5, 1e9)) for (const k of ['piano', 'bass', 'drums']) Object.assign(f[k], { lookX: 0, lookY: 0.1, lid: 0.5, noBlink: 1 });
      return f;
    }

    shot(t) {
      const shots = this.data.shots;
      let cur = shots[0];
      for (const s of shots) if (t >= s.t) cur = s;
      return cur;
    }
  }

  DS.Choreo = Choreo;
  DS.basePose = basePose;
  DS.win = win;
})();
