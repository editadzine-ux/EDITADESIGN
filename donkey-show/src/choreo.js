/* Choreography: a pure function of time. Every acting beat is anchored to a lyric cue (by id)
   or a named marker, so retiming a line in the timeline editor moves its acting with it. */
(function () {
  const DS = window.DS;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  // envelope: 0 before a, rises over fi, holds, falls over fo, 0 after b
  const win = (t, a, b, fi = 0.18, fo = 0.18) => Math.min(smooth((t - a) / fi), smooth((b - t) / fo));
  const ramp = (t, a, d = 0.2) => smooth((t - a) / d);
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
      t, x: T ? 640 : 1290, ground: 968, y: 0, face: T ? 1 : -1,
      hipDx: 0, hipDy: 6, hipRot: 0, lean: 0, puff: 0, shrug: 0,
      fBx: 0, fBy: 0, fFx: 0, fFy: 0, fBa: 0, fFa: 0,
      headRot: 0, headDx: 0, headDy: 0, neckRot: 0,
      micT: 0.55, micTilt: 0, armX: T ? -30 : -24, armY: T ? 168 : 136, armFront: 0, hand: 'open', handRot: 0,
      eyeOpen: T ? 1 : 0.62, lookX: 0, lookY: 0, brow: 0, browL: 0, browR: 0, browTilt: 0, lidTilt: 0,
      smile: T ? 0.45 : 0.05, frown: 0, jaw: 0, mouthO: 0, grin: 0, eyeHappy: 0, earDroop: 0,
      straw: 0, strawHand: 0, crouch: 0,
    };
  }

  // simple dance: knee bounce on the beat, weight shift, alternating foot lift, pelvis tilt, free-hand wave
  function dance(b, e, wave = 1) {
    const fr = b - Math.floor(b), odd = ((Math.floor(b) % 2) + 2) % 2;
    const lift = Math.pow(Math.sin(Math.PI * fr), 1.3);
    const bob = 0.5 + 0.5 * Math.cos(2 * Math.PI * b);
    const sw = Math.sin(Math.PI * b);
    const o = {
      hipDy: 6 + 18 * bob * e, hipDx: 13 * sw * e, hipRot: 5 * sw * e, lean: -2.5 * sw * e,
      headRot: 4 * Math.sin(Math.PI * b + 0.7) * e, headDy: 4 * bob * e,
      fBx: 0, fBy: 0, fFx: 0, fFy: 0, fBa: 0, fFa: 0,
    };
    if (!odd) { o.fBy = -46 * lift * e; o.fBx = 16 * lift * e; o.fBa = -12 * lift * e; }
    else { o.fFy = -46 * lift * e; o.fFx = 16 * lift * e; o.fFa = -12 * lift * e; }
    if (wave) {
      o.armX = -126 + 24 * Math.sin(Math.PI * b) * wave;
      o.armY = -100 + 22 * Math.cos(2 * Math.PI * b) * wave;
      o.handRot = 10 * Math.sin(Math.PI * b);
    }
    return o;
  }

  class Choreo {
    constructor(data) { this.setData(data); }
    setData(data) {
      this.data = data;
      this.byId = {};
      for (const c of data.cues) this.byId[c.id] = c;
    }
    C(id) { return this.byId[id] || { start: 1e9, end: 1e9 }; }
    M(name) { return this.data.markers[name]; }
    beat(t) { return (t - this.data.beat0) * this.data.bpm / 60; }
    active(who, t, pad = 0) {
      for (const c of this.data.cues) if ((c.who === who || c.who === 'both') && t >= c.start - pad && t <= c.end + pad) return c;
      return null;
    }
    anyActive(t) { for (const c of this.data.cues) if (t >= c.start && t <= c.end) return c; return null; }

    // mouth openness for a character at time t (real vocal envelope if present, otherwise a mock syllable flap)
    mouth(who, t) {
      const c = this.active(who, t);
      if (!c) return { jaw: 0, o: 0 };
      const local = (t - c.start) / Math.max(0.2, c.end - c.start);
      const gate = Math.min(smooth((t - c.start) / 0.06), smooth((c.end - t) / 0.08));
      const env = DS.envelope ? DS.envelope(t) : null;
      const scale = c.kind === 'speak' ? 0.72 : 1.0;
      if (env != null) {
        const v = Math.pow(clamp(env, 0, 1), 0.75);
        return { jaw: v * scale * gate, o: c.kind === 'sing' && local > 0.82 ? 0.5 : 0 };
      }
      // mock: syllables from the vowel marks of the pointed text
      const n = Math.max(3, c.syll || 6);
      const long = c.kind === 'sing' ? 0.22 : 0.05;
      if (local > 1 - long) return { jaw: 0.95 * gate, o: 0.6 };
      const s = (local / (1 - long)) * n;
      const v = Math.pow(Math.sin(Math.PI * (s - Math.floor(s))), 0.8);
      return { jaw: (0.35 + 0.55 * hash(Math.floor(s) + c.start)) * v * scale * gate, o: hash(Math.floor(s) * 3.1) > 0.75 ? 0.6 : 0 };
    }

    pose(id, t) {
      const T = id === 'T', other = T ? 'S' : 'T';
      const C = (k) => this.C(k);
      const p = basePose(id, t);
      const lag = T ? 0 : 0.25; // the short one dances a quarter beat late
      const b = this.beat(t) - lag;
      const v1 = C('v1a').start;
      const m = this.data.markers;

      // ---------- opening ----------
      // stand at attention once the curtain is open, then inhale; only the tall one is ready on time
      mix(p, { lean: -2, headRot: -5, eyeOpen: T ? 1.12 : 0.9, smile: T ? 0.15 : 0, armX: T ? -8 : -6, armY: T ? 172 : 140, micT: 0.25 }, win(t, m.open, v1 - 0.2, 0.3, 0.3));
      if (T) {
        const tap = Math.pow(Math.max(0, Math.cos(Math.PI * this.beat(t))), 8);
        mix(p, { fFa: -14 * tap, fFx: 4 * tap }, win(t, m.open + 2.6, m.inhale - 0.2, 0.2, 0.2));
        mix(p, { headRot: 6, headDy: 6, smile: 0.7 }, win(t, m.open + 3.6, m.open + 4.2, 0.12, 0.15));
      } else {
        mix(p, { lookX: 0.9, eyeOpen: 0.7 }, win(t, m.open + 4.2, m.open + 5.6, 0.1, 0.12));
        mix(p, { lookX: -1, eyeOpen: 0.55, lidTilt: 0.2 }, win(t, m.open + 5.7, m.inhale + 0.1, 0.1, 0.2));
      }
      const inhaleA = m.inhale, inhaleB = v1 - 0.12;
      if (T) mix(p, { puff: 0.7, shrug: -10, headDy: -6, headRot: -9, micT: 1, eyeOpen: 1.15 }, win(t, inhaleA, v1 + 0.25, 0.35, 0.25));
      else {
        mix(p, { puff: 0.55, shrug: -8, headDy: -4, eyeOpen: 1.0 }, win(t, inhaleA + 0.35, v1 + 0.5, 0.35, 0.3));
        // late: the mic comes up after the first word has started, with a little fumble
        mix(p, { micT: 1, micTilt: 14 * Math.sin(t * 30) * win(t, v1 + 0.05, v1 + 0.45, 0.05, 0.1) }, ramp(t, v1 + 0.05, 0.35));
      }

      // ---------- dancing (energy envelope per section) ----------
      let e = 0;
      e += win(t, v1 + (T ? 0.1 : 0.5), C('v1e').end + 0.3, 0.5, 0.5);
      e += 0.35 * win(t, C('s1a').start - 0.2, C('s1e').end + 0.2, 0.3, 0.3);
      e += 0.8 * win(t, C('v2a').start - 0.2, C('v2e').end + 0.3, 0.4, 0.4);
      e += 0.3 * win(t, C('s2a').start - 0.3, C('s2d').end, 0.3, 0.3);
      e += 1.0 * win(t, C('v3a').start - 0.2, C('v3e').end + 0.3, 0.4, 0.4);
      e += 0.25 * win(t, C('o1').start, C('o5').end, 0.4, 0.3);
      if (m.instr) for (const [a, z] of m.instr) e += 1.0 * win(t, a, z, 0.4, 0.4);
      e = clamp(e, 0, 1);
      if (e > 0) mix(p, dance(b, 1, 1), e);

      // mic to the mouth while this character sings/speaks
      const act = this.active(id, t, 0.25);
      const micUp = act ? 1 : 0;
      if (t > v1 + 0.6) mix(p, { micT: 1 }, act ? win(t, act.start - 0.3, act.end + 0.3, 0.2, 0.3) : 0);
      if (t > v1 + 0.6 && !act) mix(p, { micT: 0.62 }, 1 - micUp);

      // ---------- verse 1: selling air ----------
      {
        const a = C('v1a'), bq = C('v1b');
        const air = a.start + (a.end - a.start) * 0.5; // around the word "air"
        if (T) mix(p, { armX: -150, armY: -10, hand: 'open', handRot: -70, eyeHappy: 1, brow: 1, smile: 0.9, lean: -4, headRot: -6 }, win(t, air - 0.15, bq.end - 0.4, 0.25, 0.35));
        else {
          // stops, waves a hand through the "air" in front of him, checks the palm, side-glance to the audience
          const st = air + 0.25, en = bq.end + 0.4;
          mix(p, { fBy: 0, fFy: 0, hipDy: 8, hipDx: 0, hipRot: 0, lean: 6, headRot: 8, lookX: 0.6, lookY: 0.4, eyeOpen: 0.75, brow: 0.6, smile: 0, frown: 0.6 }, win(t, st, en, 0.25, 0.3));
          const swipe = Math.sin((t - st) * 7);
          mix(p, { armFront: 1, armX: 150 + 40 * swipe, armY: 40, hand: 'open', handRot: -60 }, win(t, st + 0.2, st + 1.2, 0.2, 0.2));
          mix(p, { armFront: 1, armX: 120, armY: 20, hand: 'open', handRot: -150, lookX: 0.4, lookY: 0.8, headRot: 14 }, win(t, st + 1.2, st + 1.8, 0.15, 0.15));
          mix(p, { lookX: -1, lookY: 0, headRot: -4, eyeOpen: 0.5, lidTilt: 0.3, frown: 0.2, armFront: 0, armX: -20, armY: 132, hand: 'open', handRot: 0 }, win(t, st + 1.8, en, 0.12, 0.2));
        }
        // "we'll say: it's there" — the tall one points into the distance
        const d = C('v1d');
        if (T) mix(p, { armX: -170, armY: -150, hand: 'point', handRot: -10, lookX: -0.6, lookY: -0.6, smile: 0.9, brow: 0.7 }, win(t, d.start - 0.05, d.end + 0.2, 0.15, 0.25));
        else mix(p, { lookX: 0.9, lookY: -0.5, eyeOpen: 0.7 }, win(t, d.start + 0.2, d.end + 0.1, 0.15, 0.2));
        // long final note of verse 1
        const ee = C('v1e');
        mix(p, { headRot: -12, eyeHappy: T ? 1 : 0, eyeOpen: T ? 1 : 0.35, puff: 0.4, armX: -150, armY: -150 }, win(t, ee.start + (ee.end - ee.start) * 0.6, ee.end + 0.15, 0.25, 0.2));
      }

      // ---------- spoken 1: the million ----------
      {
        const a = C('s1a'), bq = C('s1b'), c = C('s1c'), d = C('s1d'), e5 = C('s1e');
        if (T) {
          // jump for joy
          const j = clamp((t - a.start) / 0.55, 0, 1);
          if (t > a.start && t < a.start + 0.55) { p.y = -75 * Math.sin(Math.PI * j); p.fBy = -40 * Math.sin(Math.PI * j); p.fFy = -60 * Math.sin(Math.PI * j); }
          mix(p, { armX: -120, armY: -170, hand: 'open', eyeHappy: 1, smile: 1, brow: 1 }, win(t, a.start - 0.1, a.end + 0.4, 0.12, 0.3));
          // freezes mid-celebration when the money question comes
          mix(p, { armX: -120, armY: -150, eyeOpen: 1.1, eyeHappy: 0, smile: 0.5, lookX: 1 }, win(t, bq.start, bq.end + 0.2, 0.08, 0.2));
          mix(p, { armX: -150, armY: 10, hand: 'open', handRot: -60, smile: 0.85, brow: 0.6, eyeOpen: 0.85 }, win(t, c.start - 0.1, c.end + 0.1, 0.2, 0.2));
          // pause before "mom": eyes to the floor, then an embarrassed smile
          mix(p, { headRot: 16, lookY: 1, lookX: 0.2, eyeOpen: 0.7, smile: 0.1, earDroop: 0.6 }, win(t, e5.start - 0.42, e5.start - 0.08, 0.08, 0.08));
          mix(p, { headRot: 6, lookY: 0.4, eyeOpen: 0.75, smile: 0.7, browTilt: -0.8, brow: 0.5, earDroop: 0.4, armX: -40, armY: 120 }, win(t, e5.start - 0.1, e5.end + 0.3, 0.1, 0.3));
        } else {
          mix(p, { lookX: 0.9, eyeOpen: 0.9, brow: 0.5 }, win(t, a.start, a.end + 0.2));
          // stops dead and asks
          mix(p, { fBy: 0, fFy: 0, fBx: 0, fFx: 0, hipDx: 0, hipRot: 0, hipDy: 6, lean: 0, eyeOpen: 0.55, smile: 0, frown: 0.3, lookX: 0.8 }, win(t, bq.start - 0.15, d.end + 0.2, 0.1, 0.2));
          mix(p, { lookX: 1, lookY: 0.2, eyeOpen: 0.5 }, win(t, c.start, c.end));
          mix(p, { lookX: 0.9, eyeOpen: 0.6, brow: 0.3 }, win(t, e5.start - 0.4, e5.start + 0.5));
          mix(p, { lookX: -1, eyeOpen: 0.45, lidTilt: 0.2 }, win(t, e5.start + 0.6, e5.end + 0.5));
        }
      }

      // ---------- verse 2: overdramatic ----------
      {
        const a = C('v2a'), e5 = C('v2e');
        const lateness = T ? 0 : 0.4;
        mix(p, { armFront: 1, armX: T ? 92 : 80, armY: T ? 70 : 60, hand: 'open', handRot: 80, eyeHappy: 1, headRot: -10, smile: 0.6, puff: 0.3, brow: 0.8, browTilt: -0.6 }, win(t, C('v2b').start + lateness, C('v2c').end, 0.3, 0.25));
        // ear swing during the dramatic bit
        if (!T) mix(p, { straw: 1 }, win(t, a.start - 0.6, C('s2a').start + (C('s2a').end - C('s2a').start) * 0.55, 0.01, 0.01));
        mix(p, { headRot: -14, eyeHappy: 1, armX: -150, armY: -160, puff: 0.5 }, win(t, e5.start + (e5.end - e5.start) * 0.55, e5.end + 0.15, 0.25, 0.2));
      }

      // ---------- spoken 2: the straw ----------
      {
        const a = C('s2a'), bq = C('s2b'), c = C('s2c'), d = C('s2d');
        const word = a.start + (a.end - a.start) * 0.55; // "take the straw out"
        if (T) {
          mix(p, { lookX: -1, eyeOpen: 1.15, brow: 1, smile: 0.2 }, win(t, a.start - 0.2, word - 0.1, 0.1, 0.1));
          mix(p, { lean: 8, headRot: 10, lookX: 1, eyeOpen: 0.7, smile: 0.1, frown: 0.4, brow: 0.2, browTilt: 0.6 }, win(t, word - 0.1, a.end + 0.2, 0.12, 0.2));
          mix(p, { lookX: 1, eyeOpen: 0.8, brow: 0.8, smile: 0.1 }, win(t, bq.start, bq.end + 0.1));
          mix(p, { lookX: 1, smile: 0.6, eyeOpen: 0.7, lidTilt: -0.3 }, win(t, c.start - 0.1, d.end + 0.6));
        } else {
          // quick hide: grabs the straw out of his mouth and hides it behind his back
          const h0 = word + 0.05;
          mix(p, { armFront: 1, armX: 150, armY: -60, hand: 'fist' }, win(t, h0, h0 + 0.18, 0.06, 0.04));
          mix(p, { strawHand: 1 }, win(t, h0 + 0.14, C('v3a').start - 0.5, 0.01, 0.01));
          mix(p, { armFront: 0, armX: -40, armY: 120, hand: 'fist', handRot: 30, eyeOpen: 1.05, lookX: -0.3, smile: 0.4, brow: 0.6 }, win(t, h0 + 0.18, C('v3a').start - 0.4, 0.1, 0.3));
          mix(p, { fBy: 0, fFy: 0, hipDx: 0, hipRot: 0, lean: -2 }, win(t, h0, d.end + 1.6, 0.05, 0.3));
          mix(p, { lookX: 0.7, eyeOpen: 0.7, brow: 0.4, frown: 0.2 }, win(t, bq.start - 0.1, bq.end + 0.1));
          mix(p, { lookX: 0.8, eyeOpen: 0.6 }, win(t, c.start, d.end));
          // short stop on "expense", then a look to camera
          mix(p, { lookX: -0.35, lookY: 0.05, eyeOpen: 0.48, smile: 0, frown: 0.1, headRot: -3, brow: 0 }, win(t, d.end + 0.3, d.end + 1.3, 0.08, 0.2));
        }
        // everybody holds still a beat on "expense"
        mix(p, { hipDy: 6, fBy: 0, fFy: 0, hipDx: 0, hipRot: 0 }, win(t, d.end - 0.1, d.end + 0.45, 0.05, 0.1));
      }

      // ---------- verse 3: peak; synced two beats, then opposite turns, then "as planned" ----------
      {
        const a = C('v3a'), bq = C('v3b');
        // synchronized dancing: the short one is exactly on the beat here
        if (!T) mix(p, dance(this.beat(t), 1, 1), win(t, a.start, bq.start, 0.2, 0.05));
        const turn = bq.start; // both turn — in opposite directions
        const tf = (x) => clamp(x, 0, 1);
        const k1 = tf((t - turn) / 0.18), k2 = tf((t - (turn + 1.25)) / 0.18);
        const face0 = T ? 1 : -1;
        if (t > turn && t < turn + 1.6) p.face = face0 * (1 - 2 * smooth(k1)) * (1 - smooth(k2)) + face0 * smooth(k2) * 1;
        mix(p, { lookX: -1, eyeOpen: 1.1, brow: 0.8, smile: 0.2 }, win(t, turn + 0.55, turn + 1.2, 0.1, 0.1));
        mix(p, { armX: -130, armY: -170, hand: 'open', smile: 0.95, eyeHappy: 1, grin: 1 }, win(t, turn + 1.4, turn + 2.2, 0.12, 0.3));
        const d = C('v3d');
        if (T) mix(p, { armX: -170, armY: -40, hand: 'open', handRot: -70, smile: 0.9, brow: 0.8, eyeHappy: 1 }, win(t, d.start - 0.05, d.end + 0.2));
        const e5 = C('v3e');
        mix(p, { headRot: -14, eyeHappy: 1, armX: -150, armY: -170, puff: 0.6, brow: 1 }, win(t, e5.start + (e5.end - e5.start) * 0.5, e5.end + 0.2, 0.25, 0.2));
      }

      // ---------- outro: air for air ----------
      {
        const o1 = C('o1'), o2 = C('o2'), o3 = C('o3'), o4 = C('o4'), o5 = C('o5'), o6 = C('o6'), o7 = C('o7');
        if (T) {
          const j = clamp((t - o1.start) / 0.5, 0, 1);
          if (t > o1.start && t < o1.start + 0.5) { p.y = -70 * Math.sin(Math.PI * j); p.fFy = -40 * Math.sin(Math.PI * j); }
          mix(p, { armX: -120, armY: -170, eyeHappy: 1, smile: 1 }, win(t, o1.start, o1.end + 0.2));
          mix(p, { lookX: 1, smile: 0.9, eyeOpen: 0.75, lidTilt: -0.3, armX: -60, armY: 60 }, win(t, o3.start - 0.1, o3.end + 0.2));
          mix(p, { lookX: 1, smile: 0.7, armX: -150, armY: -10, hand: 'open', handRot: -70 }, win(t, o5.start, o5.end + 0.1));
        } else {
          mix(p, { lookX: 0.9, eyeOpen: 0.7 }, win(t, o1.start, o1.end + 0.2));
          mix(p, { lookX: 1, eyeOpen: 0.55, smile: 0 }, win(t, o2.start - 0.1, o5.end));
        }
        // freeze, look at each other, then at the audience
        const fz = o5.end + 0.05;
        mix(p, { fBy: 0, fFy: 0, hipDx: 0, hipRot: 0, lean: 0, hipDy: 6, armX: T ? -20 : -20, armY: T ? 166 : 134, hand: 'open', micT: 0.62, smile: 0, eyeOpen: 1.05, eyeHappy: 0 }, win(t, fz, o7.start, 0.06, 0.15));
        mix(p, { lookX: 1, brow: 0.6 }, win(t, fz + 0.5, fz + 1.4, 0.1, 0.1));
        mix(p, { lookX: -1, brow: 0.2, eyeOpen: 0.9 }, win(t, fz + 1.45, o7.start, 0.08, 0.1));
        if (!T) mix(p, { lookX: -1, eyeOpen: 0.5, micT: 1 }, win(t, o6.start - 0.2, o6.end + 0.2));
        // "smile, we're on air" — huge fake smile
        const enc = m.instr ? m.instr[0][0] : 1e9, encEnd = m.instr ? m.instr[0][1] : 1e9;
        mix(p, { grin: 1, smile: 1, eyeOpen: 1.2, brow: 1, lookX: -0.4, puff: 0.3 }, win(t, o7.start + (o7.end - o7.start) * 0.45, enc - 1.4, 0.15, 0.2));
        // showy pose (the short one late again)… but the band doesn't stop
        const fp = o7.end + 0.25 + (T ? 0 : 0.3);
        const showy = { armX: -150, armY: -175, hand: 'open', fFx: 30, fFy: 0, fBy: 0, hipDx: 0, hipRot: 0, lean: -6, headRot: -8, micT: 1, hipDy: 14 };
        mix(p, showy, win(t, fp, enc - 0.3, 0.25, 0.35));
        // still holding the pose; eyes dart to each other, the tall one nods "encore"
        mix(p, { lookX: 1, grin: 1, smile: 1, eyeOpen: 1.1 }, win(t, enc - 2.2, enc - 1.3, 0.08, 0.08));
        mix(p, { lookX: 1, grin: 0, smile: T ? 0.8 : 0, eyeOpen: T ? 0.9 : 0.5, frown: T ? 0 : 0.3, headRot: T ? 8 : 0 }, win(t, enc - 1.3, enc + 0.2, 0.08, 0.2));
        // encore: the short one gets tired in the quieter bar and wipes his brow; the tall one keeps pumping
        if (!T) {
          const tw = 136.4;
          mix(p, { armFront: 1, armX: 120, armY: -150, hand: 'open', handRot: 150, eyeOpen: 0.4, smile: 0, frown: 0.5, earDroop: 0.5 }, win(t, tw, tw + 2.1, 0.2, 0.3));
          mix(p, { lookX: -1, eyeOpen: 0.45 }, win(t, tw + 2.1, tw + 3.3, 0.1, 0.2));
        } else mix(p, { hand: 'fist', armY: -170, eyeHappy: 1, smile: 1 }, win(t, 136.4, 139.6, 0.2, 0.3));
        // the real final pose, on the band's last hit
        const fp2 = encEnd + (T ? 0 : 0.25);
        mix(p, Object.assign({}, showy, { grin: 1, smile: 1, eyeOpen: 1.15, brow: 1 }), win(t, fp2, 9999, 0.2, 0.1));
      }

      // blink
      const bp = T ? 3.7 : 4.3, bo = T ? 0.4 : 1.9;
      const ph = (t + bo) % bp;
      if (ph < 0.11 && !p.eyeHappy) p.eyeOpen = 0.02;
      // mouth
      const mo = this.mouth(id, t);
      p.jaw = Math.max(p.jaw, mo.jaw);
      p.mouthO = Math.max(p.mouthO, mo.o);
      return p;
    }

    stage(t) {
      const m = this.data.markers, v1 = this.C('v1a').start;
      // curtain
      const curtain = clamp((t - m.open) / 1.3, 0, 1);
      // the bad bulb: flickers in the intro, flickers at "mom", dies at "expense", pops back for the bow
      let bad = 1;
      const fl = (a, z) => t > a && t < z && hash(Math.floor(t * 14)) > 0.45;
      if (t < m.open + 0.6) bad = fl(0, m.open + 0.6) ? 0 : 1;
      const mom = this.C('s1e').start;
      if (t > mom - 0.5 && t < mom + 0.4) bad = fl(mom - 0.5, mom + 0.4) ? 0 : 1;
      const ex = this.C('s2d').end;
      if (t > ex + 0.2) bad = 0;
      const o7 = this.C('o7');
      const enc = m.instr ? m.instr[0][0] : 1e9, me = this.data.musicEnd;
      if (t > enc) bad = 1; // it comes back for the encore…
      if (t > enc - 0.3 && t < enc + 0.5) bad = hash(Math.floor(t * 14)) > 0.5 ? 1 : 0;
      if (t > me - 0.4) bad = t < me + 0.5 && hash(Math.floor(t * 14)) > 0.5 ? 1 : 0; // …and dies on the last hit
      // the star turns a little (more at the jump and at the end)
      let star = 4 * Math.sin(t * 0.9);
      star += 18 * Math.sin((t - this.C('s1a').start) * 6) * win(t, this.C('s1a').start, this.C('s1a').start + 1.6, 0.05, 0.8);
      star += 25 * Math.sin((t - me) * 3) * win(t, me + 0.1, me + 4, 0.2, 1.2);
      return { curtain, badBulb: bad, star };
    }

    orchestra(t) {
      const b = this.beat(t);
      const end = this.data.musicEnd - 0.05;
      const playing = t < this.data.musicEnd ? 1 : 0;
      return {
        t, beat: playing ? b : Math.floor(b),
        bassBrow: win(t, this.C('v2b').start + 0.3, this.C('v2d').start + 0.3, 0.15, 0.3),
        finalHit: win(t, end, end + 0.35, 0.05, 0.2),
        cymbal: win(t, end + 0.05, end + 0.6, 0.02, 0.4) * Math.sin((t - end) * 30),
        pianoNod: 4 * win(t, end + 0.2, end + 0.7, 0.1, 0.2),
        bassNod: 3 * win(t, end + 0.4, end + 0.9, 0.1, 0.2),
      };
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
