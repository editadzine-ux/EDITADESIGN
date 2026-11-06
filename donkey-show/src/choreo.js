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
      t, x: T ? 640 : 1290, dx: 0, ground: 968, y: 0, face: T ? 1 : -1, sq: 1,
      hipDx: 0, hipDy: 6, hipRot: 0, lean: 0, puff: 0, shrug: 0,
      fBx: 0, fBy: 0, fFx: 0, fFy: 0, fBa: 0, fFa: 0,
      headRot: 0, headDx: 0, headDy: 0, neckRot: 0,
      micT: 0.55, micTilt: 0, armX: T ? -30 : -24, armY: T ? 168 : 136, armFront: 0, hand: 'open', handRot: 0,
      eyeOpen: T ? 1 : 0.62, lookX: 0, lookY: 0, brow: 0, browL: 0, browR: 0, browTilt: 0, lidTilt: 0,
      smile: T ? 0.45 : 0.05, frown: 0, jaw: 0, mouthO: 0, grin: 0, eyeHappy: 0, earDroop: 0,
      pupil: 1, bulge: 1, cross: 0, wink: 0, blush: 0, sweat: 0, tear: 0, tongueOut: 0, arcF: 0, arcE: 0,
      straw: 0, strawHand: 0, crouch: 0, pockets: 0, moth: 0,
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
    setData(data) { this.data = data; this.byId = {}; for (const c of data.cues) this.byId[c.id] = c; }
    C(id) { return this.byId[id] || { start: 1e9, end: 1e9 }; }
    M(name) { return this.data.markers[name]; }
    beat(t) { return (t - this.data.beat0) * this.data.bpm / 60; }
    tAtBeat(b) { return this.data.beat0 + (b * 60) / this.data.bpm; }
    encT() { const m = this.data.markers; return m.instr ? m.instr[0][0] : 1e9; }
    E(n) { return this.tAtBeat(Math.round(this.beat(this.encT())) + n); }
    active(who, t, pad = 0) {
      for (const c of this.data.cues) if ((c.who === who || c.who === 'both') && t >= c.start - pad && t <= c.end + pad) return c;
      return null;
    }
    anyActive(t) { for (const c of this.data.cues) if (t >= c.start && t <= c.end) return c; return null; }

    mouth(who, t) {
      const c = this.active(who, t);
      if (!c) return { jaw: 0, o: 0 };
      const local = (t - c.start) / Math.max(0.2, c.end - c.start);
      const gate = Math.min(smooth((t - c.start) / 0.06), smooth((c.end - t) / 0.08));
      const env = DS.envelope ? DS.envelope(t) : null;
      const scale = c.kind === 'speak' ? 0.75 : 1.05;
      if (env != null) {
        const v = Math.pow(clamp(env, 0, 1), 0.7);
        return { jaw: v * scale * gate, o: c.kind === 'sing' && local > 0.82 ? 0.5 : 0 };
      }
      const n = Math.max(3, c.syll || 6), long = c.kind === 'sing' ? 0.22 : 0.05;
      if (local > 1 - long) return { jaw: 0.95 * gate, o: 0.6 };
      const s = (local / (1 - long)) * n, v = Math.pow(sinp(frac(s)), 0.8);
      return { jaw: (0.35 + 0.55 * hash(Math.floor(s) + c.start)) * v * scale * gate, o: hash(Math.floor(s) * 3.1) > 0.75 ? 0.6 : 0 };
    }

    pose(id, t) {
      const T = id === 'T';
      const C = (k) => this.C(k);
      const p = basePose(id, t);
      const k = T ? 1 : 0.63;            // leg-length scale for steps
      const lag = T ? 0 : 0.25;          // the short one is a quarter beat late
      const bt = this.beat(t);
      const b = bt - lag;
      const v1 = C('v1a').start;
      const m = this.data.markers;
      const enc = m.instr ? m.instr[0][0] : 1e9, encEnd = m.instr ? m.instr[0][1] : 1e9;
      const eb = (n) => this.tAtBeat(Math.round(this.beat(enc)) + n); // encore time at beat n

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
      mix(p, V.charleston(b, k), sec(C('v3b').start + 3.2, C('v3e').start + 0.3, 0.3, 0.3));
      mix(p, V.kick(b, k, T ? 1 : 0.7), sec(C('v3e').start + 0.2, C('v3e').end + 0.2, 0.3, 0.3));
      mix(p, V.bounce(b, k, 0.3), 0.25 * sec(C('o1').start, C('o5').end));

      // mic up while singing/speaking
      const act = this.active(id, t, 0.25);
      if (t > v1 + 0.6) mix(p, { micT: act ? 1 : 0.62 }, 1);
      if (t > v1 + 0.6 && act) mix(p, { micT: 0.62 }, 1 - win(t, act.start - 0.3, act.end + 0.3, 0.2, 0.3));

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
          mix(p, Object.assign(jump(t, a.start + 0.05, 0.55, 70), { armX: -110, armY: -175 }), 1);
          mix(p, { armX: -110, armY: -175, hand: 'open', eyeOpen: 1.35, bulge: 1.2, pupil: 1.5, grin: 1, smile: 1, brow: 1, earDroop: -0.6 }, win(t, a.start - 0.1, a.end + 0.4, 0.1, 0.3));
          // freezes in jazz hands; the grin curdles; sweat
          mix(p, { armX: -110, armY: -170, eyeOpen: 1.15, grin: 1, smile: 0.5, lookX: 1, pupil: 0.6 }, win(t, bq.start, bq.end + 0.25, 0.08, 0.2));
          mix(p, { sweat: 1 }, win(t, bq.start + 0.3, c.end, 0.01, 0.01));
          // follows the moth with his eyes
          mix(p, { lookY: -1, lookX: 1, pupil: 0.6, eyeOpen: 1.2 }, win(t, bq.end + 0.3, bq.end + 1.3, 0.1, 0.1));
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
          // turns out his empty pockets… a moth flies out
          mix(p, { pockets: 1, armX: -14, armY: 120, hand: 'fist' }, win(t, bq.start + 0.1, c.end, 0.12, 0.15));
          p.moth = clamp((t - (bq.end + 0.05)) / 1.5, 0, 1) * (t < bq.end + 1.55 ? 1 : 0);
          mix(p, { lookY: -1, lookX: 0.2, eyeOpen: 0.7, headRot: -10 }, win(t, bq.end + 0.15, bq.end + 1.3, 0.1, 0.1));
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
        if (!T) mix(p, { browR: 1, lookX: 0.9, eyeOpen: 0.6, pockets: 1 }, win(t, c2.start, c2.end + 0.3, 0.1, 0.15));
        // "it went on the video" — dramatic flick away
        if (T) mix(p, { armX: -190, armY: -60, hand: 'open', handRot: -100, headRot: -14, lookX: -1, eyeOpen: 0.6, browTilt: -0.8, arcE: 1 }, win(t, d2.start, d2.end + 0.2, 0.12, 0.25));
        // long note: the tall one drops to one knee; the short one looks at him, then at us
        const kn = e5.start + 0.3;
        if (T) mix(p, { hipDy: 120, fFx: 90, fBx: -70, fBy: -8, fBa: 70, lean: -8, headRot: -18, eyeHappy: 1, armX: -160, armY: -150, puff: 0.6, arcE: 1 }, win(t, kn, e5.end + 0.3, 0.25, 0.3));
        else {
          mix(p, { lookX: 0.6, lookY: 0.6, eyeOpen: 0.9, browR: 1 }, win(t, kn + 0.6, kn + 2.2, 0.15, 0.15));
          mix(p, { lookX: -1, eyeOpen: 0.45, lidTilt: 0.3 }, win(t, kn + 2.2, e5.end + 0.3, 0.12, 0.2));
        }
      }

      // =============== SPOKEN 2: the straw ===============
      {
        const a = C('s2a'), bq = C('s2b'), c = C('s2c'), d = C('s2d');
        const word = a.start + (a.end - a.start) * 0.55;
        if (T) {
          // "the investor is here" — ears shoot up, eyes bulge, pupils pinpoints
          mix(p, { lookX: -1, eyeOpen: 1.35, bulge: 1.2, pupil: 0.4, brow: 1, earDroop: -0.7, smile: 0.1, arcE: 1, sq: 1.04 }, win(t, a.start - 0.1, word - 0.1, 0.06, 0.1));
          // whispering sideways: lean in, hand at the mouth
          mix(p, { lean: 12, headRot: 12, lookX: 1, eyeOpen: 0.7, smile: 0.1, frown: 0.4, brow: 0.2, browTilt: 0.7, armFront: 1, armX: 150, armY: -140, hand: 'open', handRot: 150 }, win(t, word - 0.1, a.end + 0.2, 0.12, 0.2));
          mix(p, { lookX: 1, eyeOpen: 0.8, brow: 0.8, smile: 0.1 }, win(t, bq.start, bq.end + 0.1));
          // tight grin to the audience
          mix(p, { lookX: -1, grin: 1, smile: 1, eyeOpen: 1.1, sweat: 1 }, win(t, c.start - 0.1, c.end + 0.1));
          // points at the short one's belly
          mix(p, { armFront: 1, armX: 200, armY: 40, hand: 'point', handRot: -80, lookX: 1, lookY: 0.6, smile: 0.7, lidTilt: -0.3, eyeOpen: 0.75 }, win(t, d.start + 0.2, d.end + 0.6, 0.12, 0.2));
        } else {
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
          mix(p, { browR: 1, lookX: 0.9, eyeOpen: 0.55, pockets: 1 }, win(t, c3.start, c3.end + 0.5, 0.1, 0.15));
          if (t > c3.end - 0.3 && t < c3.end + 0.8) p.moth = clamp((t - (c3.end - 0.3)) / 1.1, 0, 1);
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
          const J = jump(t, j0, jd, 72);
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
        // the band doesn't stop: eyes dart
        mix(p, { lookX: 1, grin: 1, smile: 1, eyeOpen: 1.2 }, win(t, enc - 2.2, enc - 1.3, 0.08, 0.08));
        mix(p, { lookX: 1, grin: 0, smile: T ? 0.9 : 0, eyeOpen: T ? 0.9 : 0.5, frown: T ? 0 : 0.4, headRot: T ? 8 : 0, wink: T ? 1 : 0 }, win(t, enc - 1.3, enc + 0.2, 0.08, 0.2));
      }

      // =============== ENCORE: the tap number ===============
      if (t > enc - 0.5) {
        const E = (n) => eb(n);
        // 0–16: charleston under the follow-spots
        mix(p, Object.assign(V.charleston(b, k), { eyeHappy: T ? 1 : 0, smile: T ? 1 : 0.3, micT: 0.62 }), win(t, E(0), E(16), 0.3, 0.2));
        // 16–32: TAP-OFF
        const tapT = (a, z) => win(t, E(a), E(z), 0.1, 0.1);
        if (T) {
          mix(p, Object.assign(V.tap(bt * 2, 1), { grin: 1, eyeHappy: 1, micT: 0.62 }), tapT(16, 20));   // fast riff
          mix(p, { lookX: 1, eyeOpen: 0.9, smile: 0.9, brow: 1, armX: -40, armY: 60 }, tapT(20, 24));     // "your turn"
          mix(p, Object.assign(V.tap(bt * 2, 1), { grin: 1, eyeOpen: 1.2, micT: 0.62 }), tapT(24, 27));
          mix(p, Object.assign(jump(t, E(27), 0.5, 110), { armX: -130, armY: -175 }), tapT(26.6, 28.3));  // heel-click jump
          if (t > E(27) && t < E(27) + 0.5) mix(p, { fBx: 70, fFx: 20, fBy: -60, fFy: -60, arcF: 1 }, sinp((t - E(27)) / 0.5));
          mix(p, { lookX: 1, eyeOpen: 1, smile: 0.9, lidTilt: -0.3, armX: -40, armY: 60 }, tapT(28.3, 32));
        } else {
          mix(p, { lookX: 1, eyeOpen: 1.2, pupil: 0.6, browR: 1 }, tapT(16, 20));
          // one sad stomp
          const st = E(21);
          mix(p, { fFy: -70, fFx: 10, lean: -4, eyeOpen: 0.9, frown: 0.2 }, win(t, st - 0.35, st, 0.25, 0.02));
          mix(p, { fFy: 0, sq: 0.94, hipDy: 22, arcF: 1, eyeOpen: 0.02, frown: 0.4 }, win(t, st, st + 0.25, 0.02, 0.12));
          mix(p, { lookX: -1, eyeOpen: 0.5, shrug: -14, armX: -90, armY: 30, hand: 'open', handRot: -60 }, win(t, st + 0.5, E(24), 0.15, 0.1));
          mix(p, { lookX: 1, eyeOpen: 1.2, pupil: 0.5, sweat: 1 }, tapT(24, 28));
          // tries the riff — trips over his own feet
          const tr = E(28.5);
          mix(p, Object.assign(V.scramble(bt * 1.5, k), { eyeOpen: 1.2, sweat: 1, tongueOut: 1 }), win(t, E(28), tr, 0.1, 0.05));
          mix(p, { lean: 22, headRot: 18, fFx: 60, fFy: -30, fBx: -30, armX: -170, armY: -100, hand: 'open', armFront: 0, eyeOpen: 1.35, bulge: 1.2, pupil: 0.4, jaw: 0.6, mouthO: 1, arcE: 1, sweat: 2 }, win(t, tr, tr + 0.6, 0.06, 0.2));
          mix(p, { lookX: -1, eyeOpen: 0.5, grin: 1, smile: 1, sweat: 1, lidTilt: 0.2 }, win(t, tr + 0.6, E(32), 0.12, 0.1));
        }
        // 32–48: kick line (short one lower and late)
        mix(p, Object.assign(V.kick(b, k, T ? 1 : 0.65), { grin: 1, smile: 1, eyeOpen: T ? 1.1 : 1.2, micT: 0.62, pupil: T ? 1 : 0.7 }), win(t, E(32), E(48), 0.2, 0.3));
        mix(p, Object.assign(V.bounce(b, k), { eyeHappy: T ? 1 : 0 }), win(t, E(48), E(54), 0.3, 0.3));
        // 54–60: the short one runs out of air
        if (!T) {
          const tw = E(54.5);
          mix(p, { armFront: 1, armX: 120, armY: -150, hand: 'open', handRot: 150, eyeOpen: 0.4, smile: 0, frown: 0.5, earDroop: 0.7, sweat: 2, tongueOut: 1, sq: 0.96 }, win(t, tw, tw + 2.4, 0.2, 0.3));
          mix(p, { lookX: -1, eyeOpen: 0.45 }, win(t, tw + 2.4, E(60), 0.1, 0.2));
        } else mix(p, Object.assign(V.bounce(b, k), { hand: 'fist', armY: -175, eyeHappy: 1, smile: 1, grin: 1 }), win(t, E(54), E(60), 0.2, 0.3));
        // 60–76: synced tap, both on the beat this time
        mix(p, Object.assign(V.tap(bt, k), { grin: 1, smile: 1, eyeHappy: T ? 1 : 0, eyeOpen: T ? 1 : 1.05, micT: 0.62 }), win(t, E(60), E(76), 0.2, 0.2));
        // 76–84: big bounce build
        mix(p, Object.assign(V.bounce(b, k), { grin: 1, eyeOpen: 1.15 }), win(t, E(76), E(84.5), 0.2, 0.1));
        // FINALE: the tall one does a split jump; the short one tries… and lands in a floor split
        const sj = E(85);
        if (T) {
          mix(p, Object.assign(jump(t, sj, 0.6, 85), {}), win(t, sj - 0.3, sj + 0.9, 0.01, 0.01));
          if (t > sj && t < sj + 0.6) mix(p, { fBx: -190, fFx: 190, fBy: -90, fFy: -90, armX: -170, armY: -170, eyeHappy: 1, grin: 1, arcF: 1 }, sinp((t - sj) / 0.6));
          mix(p, { lookX: 1, lookY: 0.7, eyeOpen: 1.3, bulge: 1.1, pupil: 0.5, jaw: 0.25, mouthO: 1 }, win(t, E(88.2), E(89.6), 0.08, 0.1));
        } else {
          const sj2 = E(87);
          mix(p, jump(t, sj2, 0.5, 70, 0.6), win(t, sj2 - 0.3, sj2 + 0.6, 0.01, 0.01));
          const split = win(t, sj2 + 0.5, 1e9, 0.08, 0.01);
          mix(p, { hipDy: 158, fBx: -125, fFx: 125, fBy: 0, fFy: 0, fBa: 10, fFa: -10, lean: 0, hipRot: 0, hipDx: 0, eyeOpen: 1.35, bulge: 1.3, pupil: 0.35, jaw: 0.5, mouthO: 1, earDroop: -0.6, arcE: 1, sq: 0.97 }, split);
          mix(p, { arcE: 0, jaw: 0, mouthO: 0, grin: 1, smile: 1, sweat: 2, eyeOpen: 1.2, pupil: 0.6, armX: -140, armY: -150, lookX: -0.6 }, win(t, sj2 + 1.3, 1e9, 0.15, 0.01));
        }
      }
      // the real final pose on the band's last hit
      {
        const fp2 = encEnd + (T ? 0 : 0.25);
        const showy = { armX: -150, armY: -175, hand: 'open', grin: 1, smile: 1, eyeOpen: 1.2, brow: 1, micT: 1 };
        if (T) Object.assign(showy, { fFx: 30, fFy: 0, fBy: 0, hipDx: 0, hipRot: 0, lean: -6, headRot: -8, hipDy: 14, lookX: -0.3 });
        mix(p, showy, win(t, fp2, 1e9, 0.2, 0.01));
      }

      // blink (not when eyes are deliberately shut or winking)
      const bp = T ? 3.7 : 4.3, bo = T ? 0.4 : 1.9;
      if ((t + bo) % bp < 0.11 && !p.eyeHappy && !p.wink && p.eyeOpen > 0.1) p.eyeOpen = 0.02;
      const mo = this.mouth(id, t);
      p.jaw = Math.max(p.jaw, mo.jaw);
      p.mouthO = Math.max(p.mouthO, mo.o);
      if (p.jaw > 0.15) p.tongueOut = 0;
      return p;
    }

    stage(t) {
      const m = this.data.markers;
      const curtain = clamp((t - m.open) / 1.3, 0, 1);
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
      // FANTASY vs REALITY: on every 'big' line the stage becomes their Vegas; the next question snaps it back
      const C = (k) => this.C(k);
      let F = 0;
      F = Math.max(F, win(t, C('s1a').start - 0.05, C('s1b').start, 0.12, 0.02));
      F = Math.max(F, win(t, C('v2e').start, C('s2a').start + 0.05, 0.3, 0.02));
      F = Math.max(F, win(t, C('o1').start - 0.05, C('o2').start, 0.12, 0.02));
      F = Math.max(F, win(t, enc, me, 0.3, 0.02));
      // the bad bulb flickers right after every snap back to reality
      for (const sn of [C('s1b').start, C('s2a').start + 0.05, C('o2').start]) if (t > sn && t < sn + 0.5) bad = hash(Math.floor(t * 16)) > 0.5 ? 1 : 0;
      const pT = this.pose('T', t), pS = this.pose('S', t);
      return { t, curtain, badBulb: bad, star, chase: F > 0.5 ? 1 : 0, spot: F, spotT: pT.x + pT.dx, spotS: pS.x + pS.dx, fantasy: F, fantasyT: t };
    }

    orchestra(t) {
      const b = this.beat(t);
      const end = this.data.musicEnd - 0.05;
      const playing = t < this.data.musicEnd ? 1 : 0;
      const o5 = this.C('o5').end, enc = this.data.markers.instr ? this.data.markers.instr[0][0] : 1e9;
      return {
        t, beat: playing ? b : Math.floor(b),
        bassBrow: win(t, this.C('v2b').start + 0.3, this.C('v2d').start + 0.3, 0.15, 0.3),
        // ba-dum-tss right after the punchline
        rim: win(t, o5 + 0.15, o5 + 0.45, 0.04, 0.15),
        finalHit: win(t, end, end + 0.35, 0.05, 0.2),
        cymbal: win(t, end + 0.05, end + 0.6, 0.02, 0.4) * Math.sin((t - end) * 30) + win(t, o5 + 0.3, o5 + 0.9, 0.02, 0.3) * Math.sin((t - o5) * 34),
        faces: this.monkeyFaces(t),
        drumBob: win(t, this.E(36), this.E(44), 0.3, 0.05),
        tss: win(t, this.E(21) + 0.3, this.E(21) + 0.55, 0.03, 0.12),
        pianoNod: 4 * win(t, end + 0.2, end + 0.7, 0.1, 0.2),
        bassNod: 3 * win(t, end + 0.4, end + 0.9, 0.1, 0.2),
      };
    }

    // the orchestra's own little story: bored → dragged in → caught enjoying it → deadpan to camera
    monkeyFaces(t) {
      const C = (k) => this.C(k), m = this.data.markers, f = { piano: {}, bass: {}, drums: {} };
      const on = (a, z) => t >= a && t <= z;
      const all = (a, z, o, per = {}) => { if (!on(a, z)) return; for (const k of ['piano', 'bass', 'drums']) Object.assign(f[k], o, per[k] || {}); };
      const one = (k, a, z, o) => { if (on(a, z)) Object.assign(f[k], o); };
      const enc = this.encT(), me = this.data.musicEnd;
      // intro: they glance at the two stars; the pianist yawns
      all(m.open + 1.0, m.open + 3.4, { lookX: 0 }, { piano: { lookX: 0.8 }, bass: { lookX: -0.4 }, drums: { lookX: -0.8 } });
      one('piano', m.open + 4.4, m.open + 5.6, { mouth: 'yawn', lid: 1, tilt: -8 });
      // the jump: heads follow it up
      all(C('s1a').start, C('s1a').end + 0.3, { lookY: -1, lid: 0.2 }, { piano: { lookX: 0.7 }, bass: { lookX: -0.7 }, drums: { lookX: -0.9 } });
      // the moth: everyone watches it fly away
      all(C('s1b').end + 0.1, C('s1b').end + 1.5, { lookY: -1, lid: 0.15, noBlink: 1 }, { piano: { lookX: 1 }, bass: { lookX: 0.7 }, drums: { lookX: -0.6 } });
      // "mom": the bassist melts a little, the drummer smirks
      one('bass', C('s1e').start, C('s1e').end + 0.4, { brow: 0.8, mouth: 'smile', lid: 0.35 });
      one('drums', C('s1e').start + 0.3, C('s1e').end + 0.4, { mouth: 'smirk', lookX: -0.6 });
      // the Vegas dream during the long note: the pianist rolls her eyes
      one('piano', C('v2e').start + 1, C('v2e').start + 3, { lookY: -1, lid: 0.4 });
      // "expense": all three look at the belly
      const d = C('s2d');
      all(d.end - 0.2, d.end + 1.1, { lookY: 0.7, lid: 0.35 }, { piano: { lookX: 1 }, bass: { lookX: 1 }, drums: { lookX: -1 } });
      // the moonwalk: the bassist and drummer follow it like a tennis match
      const mw0 = C('v3b').start;
      if (on(mw0, mw0 + 3.2)) { const sw = Math.sin((t - mw0) * 4.2); f.bass.lookX = sw; f.drums.lookX = -0.4 + 0.6 * sw; f.bass.lid = 0.3; }
      // punchline: rimshot and smirk; pianist rolls her eyes
      const o5 = C('o5').end;
      one('drums', o5 + 0.1, o5 + 1.3, { mouth: 'smirk', lid: 0.45 });
      one('piano', o5 + 0.2, o5 + 1.4, { lookY: -1, lid: 0.4 });
      // "so who's the donkey here?" — all three look straight into the camera
      all(C('o6').start + 0.2, C('o6').end + 1.0, { lookX: 0, lookY: 0.1, lid: 0.25, mouth: 'flat', tilt: 0, noBlink: 1 });
      // the encore starts: deep eye roll
      one('piano', enc - 0.5, enc + 1.6, { lookY: -1, lid: 0.35 });
      one('bass', enc - 0.2, enc + 1.2, { lid: 0.7 });
      // tap-off: the drummer answers the sad stomp with one 'tss' and a smirk
      one('drums', this.E(21) + 0.3, this.E(21) + 1.4, { mouth: 'smirk', lookX: -0.8 });
      // kick line: the drummer gets into it… then catches herself
      one('drums', this.E(36), this.E(44), { mouth: 'smile', lid: 0.25, lookX: -0.5 });
      one('drums', this.E(44), this.E(45.5), { mouth: 'o', lid: 0.1, lookX: 0, lookY: 0, noBlink: 1 });
      one('drums', this.E(45.5), this.E(48), { mouth: 'flat', lid: 0.65 });
      // the floor split: they all stare at the short one
      all(this.E(87) + 0.6, me, { lookY: 0.7, lid: 0.3 }, { piano: { lookX: 1 }, bass: { lookX: 1, brow: 0.8 }, drums: { lookX: -1 } });
      // after the last hit: deadpan to camera
      all(me + 0.5, 1e9, { lookX: 0, lookY: 0.1, lid: 0.45, mouth: 'flat', noBlink: 1 });
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
