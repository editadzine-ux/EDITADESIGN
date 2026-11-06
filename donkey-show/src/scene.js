/* Stage: cream backdrop, reddish curtains, string lights, crooked hanging star, pink floor,
   and the bored three-monkey orchestra (piano/red, double bass/blue, drums/pink). */
(function () {
  const DS = window.DS;
  const el = DS.el, INK = DS.INK;
  const f1 = (n) => Math.round(n * 10) / 10;

  const C = {
    bg: '#f8eddb', curtain: '#d9776b', curtainDark: '#bf5f55', floor: '#f2bdb2', bulb: '#f4cf5a', bulbOff: '#e6dccb',
    star: '#f4cd55', fur: '#a57650', face: '#f1d2b4', wood: '#9a6544', woodDark: '#7d4f33',
  };
  DS.COLORS = C;

  function buildBackground(world) {
    const g = el('g', { class: 'bg' }, world);
    el('rect', { x: -600, y: -400, width: 3120, height: 1900, fill: C.bg }, g);
    // 'Vegas' fantasy: flat golden sunburst (hidden unless they're dreaming)
    const rays = el('g', { opacity: 0 }, g);
    const raysIn = el('g', {}, rays);
    for (let i = 0; i < 28; i++) {
      const a0 = (i / 28) * Math.PI * 2, a1 = a0 + Math.PI / 28;
      el('path', { d: `M0,0 L${f1(Math.cos(a0) * 1900)},${f1(Math.sin(a0) * 1900)} L${f1(Math.cos(a1) * 1900)},${f1(Math.sin(a1) * 1900)} Z`, fill: '#f6dc93' }, raysIn);
    }
    // floor
    el('ellipse', { cx: 960, cy: 975, rx: 800, ry: 72, fill: C.floor, stroke: INK, 'stroke-width': 4 }, g);
    // soft follow-spots on the floor (only in the delusional 'Vegas' moments)
    const spots = [0, 1].map(() => el('ellipse', { cx: 0, cy: 972, rx: 190, ry: 40, fill: '#fff4dc', opacity: 0 }, g));
    // string of lights (catenary-ish), slightly crooked
    const lights = el('g', {}, g);
    const front = el('g', { class: 'lights' });
    const P = (u) => { const x = 150 + u * 1620; const y = 34 + 4 * Math.sin(u * 9) + 78 * (1 - Math.pow(2 * u - 1, 2)); return [x, y]; };
    let d = '';
    for (let i = 0; i <= 40; i++) { const [x, y] = P(i / 40); d += (i ? ' L' : 'M') + f1(x) + ',' + f1(y); }
    el('path', { d: `M-200,20 L${f1(P(0)[0])},${f1(P(0)[1])} ` + d.slice(1).replace(/^/, 'L') + ' L2120,22', fill: 'none', stroke: INK, 'stroke-width': 4 }, lights);
    const bulbs = [];
    for (let i = 0; i < 11; i++) {
      const u = 0.05 + i * 0.09;
      const [x, y] = P(u);
      el('rect', { x: x - 6, y: y - 2, width: 12, height: 16, rx: 2, fill: INK }, lights);
      const b = el('circle', { cx: x, cy: y + 30, r: 17, fill: C.bulb, stroke: INK, 'stroke-width': 4 }, lights);
      bulbs.push({ b, x, y });
    }
    // hanging star (crooked string from the middle bulb)
    const mid = bulbs[5];
    const starG = el('g', {}, front);
    const starInner = el('g', {}, starG);
    el('path', { d: `M0,0 C6,40 -6,70 4,96 C8,108 -2,118 0,128`, fill: 'none', stroke: INK, 'stroke-width': 3 }, starInner);
    let sd = '';
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 26 : 60, a = -Math.PI / 2 + (i * Math.PI) / 5 + (i === 3 ? 0.06 : 0);
      sd += (i ? ' L' : 'M') + f1(Math.cos(a) * r) + ',' + f1(Math.sin(a) * r + 186);
    }
    el('path', { d: sd + ' Z', fill: C.star, stroke: INK, 'stroke-width': 4.5, 'stroke-linejoin': 'round', transform: 'rotate(-7 0 186)' }, starInner);
    starG.setAttribute('transform', `translate(${f1(mid.x)},${f1(mid.y + 46)})`);
    front.appendChild(lights);
    return { g, bulbs, starInner, front, spots, rays, raysIn };
  }

  function curtainPanel(parent, w, h, folds, flip) {
    const g = el('g', {}, parent);
    el('rect', { x: 0, y: -400, width: w, height: h + 400, fill: C.curtain }, g);
    for (let i = 1; i <= folds; i++) {
      const x = (i * w) / (folds + 1);
      el('path', { d: `M${f1(x)},-400 C${f1(x - 10)},${h * 0.3} ${f1(x + 12)},${h * 0.65} ${f1(x - 4)},${h}`, fill: 'none', stroke: INK, 'stroke-width': 3 }, g);
    }
    el('path', { d: `M${flip ? 0 : w},-400 L${flip ? 0 : w},${h}`, stroke: INK, 'stroke-width': 4.5 }, g);
    return g;
  }

  function buildCurtains(world) {
    const g = el('g', { class: 'curtains' }, world);
    // side drapes (always visible), tied back
    const side = (k) => {
      const sg = el('g', {}, g);
      const x0 = k < 0 ? -600 : 1730, w = 790;
      const edge = k < 0 ? 190 : 1730;
      const d = k < 0
        ? `M-600,-400 L${edge},-400 C${edge - 10},120 ${edge + 6},380 ${edge - 130},520 C${edge - 60},620 ${edge - 20},820 ${edge - 70},1500 L-600,1500 Z`
        : `M2520,-400 L${edge},-400 C${edge + 10},120 ${edge - 6},380 ${edge + 130},520 C${edge + 60},620 ${edge + 20},820 ${edge + 70},1500 L2520,1500 Z`;
      el('path', { d, fill: C.curtain, stroke: INK, 'stroke-width': 4.5, 'stroke-linejoin': 'round' }, sg);
      for (let i = 0; i < 3; i++) {
        const x = k < 0 ? edge - 50 - i * 45 : edge + 50 + i * 45;
        el('path', { d: `M${x},-400 C${x - 6 * k},150 ${x + 10 * k},400 ${x + 30 * k},520 M${x + 20 * k},560 C${x},800 ${x - 12 * k},1000 ${x + 6 * k},1500`, fill: 'none', stroke: INK, 'stroke-width': 3 }, sg);
      }
      el('ellipse', { cx: k < 0 ? edge - 122 : edge + 122, cy: 522, rx: 26, ry: 16, fill: C.curtainDark, stroke: INK, 'stroke-width': 4 }, sg);
      return sg;
    };
    side(-1); side(1);
    // main closed curtain (two halves) used for the opening
    const main = el('g', {}, g);
    const L = el('g', {}, main), R = el('g', {}, main);
    curtainPanel(L, 1000, 1500, 7, false);
    curtainPanel(R, 1000, 1500, 7, true);
    return { g, L, R, main };
  }

  // ---------- monkeys ----------
  function monkeyHead(parent, dress, bow) {
    const g = el('g', {}, parent);
    // ears
    el('circle', { cx: -40, cy: 0, r: 15, fill: C.fur, stroke: INK, 'stroke-width': 3.5 }, g);
    el('circle', { cx: -40, cy: 0, r: 8, fill: C.face }, g);
    el('circle', { cx: 40, cy: 0, r: 15, fill: C.fur, stroke: INK, 'stroke-width': 3.5 }, g);
    el('circle', { cx: 40, cy: 0, r: 8, fill: C.face }, g);
    el('circle', { cx: 0, cy: -4, r: 38, fill: C.fur, stroke: INK, 'stroke-width': 3.5 }, g);
    el('path', { d: 'M-26,-10 C-28,-30 -6,-30 0,-18 C6,-30 28,-30 26,-10 C30,14 18,30 0,30 C-18,30 -30,14 -26,-10 Z', fill: C.face, stroke: INK, 'stroke-width': 3 }, g);
    // bored eyes: half-closed lids
    const eyes = [];
    for (const ex of [-12, 12]) {
      const eg = el('g', { transform: `translate(${ex},-8)` }, g);
      el('ellipse', { rx: 7, ry: 8, fill: '#fffdf8', stroke: INK, 'stroke-width': 2.5 }, eg);
      el('circle', { cx: 0, cy: 3, r: 3.2, fill: INK }, eg);
      const lid = el('path', { d: 'M-8,-9 L8,-9 L8,0 L-8,0 Z', fill: C.face, stroke: 'none' }, eg);
      const line = el('path', { d: 'M-7.5,0 L7.5,0', stroke: INK, 'stroke-width': 2.5 }, eg);
      const brow = el('path', { d: 'M-7,-13 L7,-13', stroke: INK, 'stroke-width': 3, 'stroke-linecap': 'round' }, eg);
      eyes.push({ eg, lid, line, brow });
    }
    el('path', { d: 'M-5,6 L-3,8 M5,6 L3,8', stroke: INK, 'stroke-width': 2 }, g);
    const mouth = el('path', { d: 'M-9,18 Q0,15 9,18', fill: 'none', stroke: INK, 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
    // bow
    el('path', { d: 'M8,-40 L-14,-54 L-12,-30 Z M8,-40 L30,-54 L28,-30 Z', fill: bow, stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }, g);
    el('circle', { cx: 8, cy: -41, r: 6, fill: bow, stroke: INK, 'stroke-width': 3 }, g);
    return { g, eyes, mouth };
  }

  function monkeyBody(parent, dress) {
    const g = el('g', {}, parent);
    // stool
    el('path', { d: 'M-34,-58 L34,-58 L34,-48 L-34,-48 Z M-28,-48 L-34,0 M28,-48 L34,0', fill: C.wood, stroke: INK, 'stroke-width': 3.5 }, g);
    // tail
    el('path', { d: 'M-24,-64 C-70,-60 -80,-20 -56,-14 C-40,-10 -40,-30 -52,-30', fill: 'none', stroke: INK, 'stroke-width': 9, 'stroke-linecap': 'round' }, g);
    el('path', { d: 'M-24,-64 C-70,-60 -80,-20 -56,-14 C-40,-10 -40,-30 -52,-30', fill: 'none', stroke: C.fur, 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    // legs
    el('path', { d: 'M-14,-60 L-18,-8 M14,-60 L18,-8', stroke: INK, 'stroke-width': 13, 'stroke-linecap': 'round' }, g);
    el('path', { d: 'M-14,-60 L-18,-8 M14,-60 L18,-8', stroke: C.fur, 'stroke-width': 7, 'stroke-linecap': 'round' }, g);
    el('ellipse', { cx: -22, cy: -4, rx: 12, ry: 6, fill: C.fur, stroke: INK, 'stroke-width': 3 }, g);
    el('ellipse', { cx: 22, cy: -4, rx: 12, ry: 6, fill: C.fur, stroke: INK, 'stroke-width': 3 }, g);
    // dress
    el('path', { d: 'M-22,-150 C-30,-120 -44,-80 -48,-54 C-20,-46 20,-46 48,-54 C44,-80 30,-120 22,-150 C10,-156 -10,-156 -22,-150 Z', fill: dress, stroke: INK, 'stroke-width': 3.5, 'stroke-linejoin': 'round' }, g);
    el('path', { d: 'M-12,-152 L0,-140 L12,-152', fill: 'none', stroke: INK, 'stroke-width': 3 }, g);
    return g;
  }

  function arm(parent, sx, sy, len1, len2) {
    // simple two-segment arm drawn as thick strokes (fur colored)
    const g = el('g', { transform: `translate(${sx},${sy})` }, parent);
    const up = el('g', {}, g);
    el('path', { d: `M0,0 L0,${len1}`, stroke: INK, 'stroke-width': 13, 'stroke-linecap': 'round' }, up);
    el('path', { d: `M0,0 L0,${len1}`, stroke: C.fur, 'stroke-width': 7, 'stroke-linecap': 'round' }, up);
    const lo = el('g', { transform: `translate(0,${len1})` }, up);
    el('path', { d: `M0,0 L0,${len2}`, stroke: INK, 'stroke-width': 12, 'stroke-linecap': 'round' }, lo);
    el('path', { d: `M0,0 L0,${len2}`, stroke: C.fur, 'stroke-width': 6, 'stroke-linecap': 'round' }, lo);
    const hand = el('g', { transform: `translate(0,${len2})` }, lo);
    el('circle', { r: 8, fill: C.face, stroke: INK, 'stroke-width': 3 }, hand);
    return { g, up, lo, hand };
  }

  function buildOrchestra(world) {
    const g = el('g', { class: 'orchestra' }, world);
    const M = {};
    // pianist (red) — upright piano on her left
    {
      const root = el('g', { transform: 'translate(360,905) scale(0.95)' }, g);
      const piano = el('g', {}, root);
      el('path', { d: 'M-230,-200 L-70,-200 L-70,0 L-230,0 Z', fill: C.wood, stroke: INK, 'stroke-width': 4 }, piano);
      el('path', { d: 'M-224,-110 L-64,-110 L-58,-96 L-224,-96 Z', fill: '#fffdf6', stroke: INK, 'stroke-width': 3 }, piano);
      for (let i = 0; i < 8; i++) el('path', { d: `M${-218 + i * 19},-110 L${-218 + i * 19},-102`, stroke: INK, 'stroke-width': 4 }, piano);
      el('path', { d: 'M-216,-186 L-84,-186 L-84,-130 L-216,-130 Z', fill: 'none', stroke: C.woodDark, 'stroke-width': 3 }, piano);
      const body = monkeyBody(root, '#d9584e');
      const head = monkeyHead(el('g', { transform: 'translate(-6,-196)' }, root), '#d9584e', '#d9584e');
      const a1 = arm(root, -18, -142, 40, 40), a2 = arm(root, 14, -142, 40, 44);
      M.piano = { root, head, arms: [a1, a2] };
    }
    // bassist (blue) — double bass upright on her right
    {
      const root = el('g', { transform: 'translate(960,880) scale(0.9)' }, g);
      const body = monkeyBody(root, '#3f5f9e');
      const head = monkeyHead(el('g', { transform: 'translate(-8,-196)' }, root), '#3f5f9e', '#2f4f8e');
      const bass = el('g', { transform: 'translate(56,-14) rotate(-8)' }, root);
      el('path', { d: 'M0,-300 L0,-150', stroke: INK, 'stroke-width': 14, 'stroke-linecap': 'round' }, bass);
      el('path', { d: 'M0,-300 L0,-150', stroke: C.woodDark, 'stroke-width': 8, 'stroke-linecap': 'round' }, bass);
      el('path', { d: 'M0,-160 C-40,-160 -48,-120 -32,-96 C-58,-80 -64,-20 -36,0 L36,0 C64,-20 58,-80 32,-96 C48,-120 40,-160 0,-160 Z', fill: C.wood, stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, bass);
      el('path', { d: 'M-12,-110 C-18,-100 -18,-84 -12,-74 M12,-110 C18,-100 18,-84 12,-74 M0,-150 L0,-14', fill: 'none', stroke: INK, 'stroke-width': 2.5 }, bass);
      el('circle', { cx: 0, cy: -306, r: 9, fill: C.woodDark, stroke: INK, 'stroke-width': 3 }, bass);
      const aNeck = arm(root, 14, -142, 46, 40), aPluck = arm(root, -16, -140, 44, 46);
      M.bass = { root, head, arms: [aNeck, aPluck], bass };
    }
    // drummer (pink) — small kit in front
    {
      const root = el('g', { transform: 'translate(1590,900) scale(0.92)' }, g);
      const body = monkeyBody(root, '#f2a7b6');
      const head = monkeyHead(el('g', { transform: 'translate(-4,-196)' }, root), '#f2a7b6', '#ef8fa3');
      const aL = arm(root, -18, -142, 40, 42), aR = arm(root, 16, -142, 40, 42);
      for (const a of [aL, aR]) el('path', { d: 'M0,0 L0,48', stroke: '#e9d6b0', 'stroke-width': 6, 'stroke-linecap': 'round' }, a.hand).parentNode.insertBefore(el('path', { d: 'M0,0 L0,48', stroke: INK, 'stroke-width': 10, 'stroke-linecap': 'round' }), a.hand.lastChild);
      const kit = el('g', {}, root);
      // cymbal on a stand
      el('path', { d: 'M110,0 L110,-190', stroke: INK, 'stroke-width': 4 }, kit);
      const cym = el('g', { transform: 'translate(110,-192)' }, kit);
      el('ellipse', { rx: 44, ry: 8, fill: '#ecc85a', stroke: INK, 'stroke-width': 3.5 }, cym);
      // snare
      el('path', { d: 'M-110,-60 L-110,0 M-96,-60 L-120,0', stroke: INK, 'stroke-width': 3.5 }, kit);
      el('path', { d: 'M-150,-104 L-70,-104 L-70,-74 L-150,-74 Z', fill: '#f7f1e6', stroke: INK, 'stroke-width': 3.5 }, kit);
      el('ellipse', { cx: -110, cy: -104, rx: 40, ry: 9, fill: '#fffdf6', stroke: INK, 'stroke-width': 3.5 }, kit);
      // bass drum in front of her legs
      el('circle', { cx: 0, cy: -58, r: 58, fill: '#fffdf6', stroke: INK, 'stroke-width': 4 }, kit);
      el('circle', { cx: 0, cy: -58, r: 44, fill: 'none', stroke: '#ef8fa3', 'stroke-width': 4 }, kit);
      M.drums = { root, head, arms: [aL, aR], cym };
    }
    return M;
  }

  // pose the orchestra from a small parameter set (bored, minimal motion)
  function poseOrchestra(M, o) {
    const sinb = (k) => Math.sin(o.beat * Math.PI * k);
    // pianist: alternating small key presses, slight head bob
    {
      const a = M.piano.arms;
      a[0].up.setAttribute('transform', `rotate(${50 + 3 * sinb(2)})`);
      a[0].lo.setAttribute('transform', `translate(0,40) rotate(${30 + 6 * Math.max(0, sinb(2))})`);
      a[1].up.setAttribute('transform', `rotate(${62 - 3 * sinb(2)})`);
      a[1].lo.setAttribute('transform', `translate(0,40) rotate(${36 + 6 * Math.max(0, -sinb(2))})`);
      M.piano.head.g.setAttribute('transform', `rotate(${-4 + 1.5 * sinb(1)}) translate(0,${f1(o.pianoNod || 0)})`);
    }
    // bassist: plucking hand moves a little
    {
      const a = M.bass.arms;
      a[0].up.setAttribute('transform', `rotate(-140)`);
      a[0].lo.setAttribute('transform', `translate(0,46) rotate(30)`);
      a[1].up.setAttribute('transform', `rotate(${-38 + 4 * Math.abs(sinb(2))})`);
      a[1].lo.setAttribute('transform', `translate(0,44) rotate(${-74 + 10 * Math.abs(sinb(2))})`);
      M.bass.head.g.setAttribute('transform', `rotate(${3 + 1.2 * sinb(0.5)}) translate(0,${f1(o.bassNod || 0)})`);
    }
    // drummer: stick taps on the beat
    {
      const a = M.drums.arms;
      const tap = Math.pow(Math.abs(Math.cos(o.beat * Math.PI)), 6);
      a[0].up.setAttribute('transform', `rotate(${36})`);
      a[0].lo.setAttribute('transform', `translate(0,40) rotate(${60 - 16 * tap})`);
      const tap2 = Math.max(o.finalHit || 0, o.rim || 0, o.tss || 0);
      a[1].up.setAttribute('transform', `rotate(${-42 - 10 * tap2})`);
      a[1].lo.setAttribute('transform', `translate(0,40) rotate(${-52 + 12 * Math.pow(Math.abs(Math.sin(o.beat * Math.PI)), 6) - 20 * tap2})`);
      M.drums.cym.setAttribute('transform', `translate(110,-192) rotate(${f1(4 * (o.cymbal || 0))})`);
    }
    // faces: bored by default; o.faces[name] can override gaze, lids, brows, mouth and head tilt
    const MOUTH = {
      flat: 'M-9,18 Q0,15 9,18', smile: 'M-11,14 Q0,27 11,14', smirk: 'M-9,19 Q2,20 11,12',
      o: 'M-5,18 a5,6 0 1 0 10,0 a5,6 0 1 0 -10,0', yawn: 'M-8,16 a8,10 0 1 0 16,0 a8,10 0 1 0 -16,0',
    };
    const blink = (seed) => ((o.t * 0.37 + seed) % 4.1) < 0.12;
    const face = (name, H, base, seed) => {
      const f = Object.assign({ lid: base.lid, lookX: 0, lookY: 0, brow: 0, browR: base.browR || 0, mouth: 'flat', tilt: 0, dy: 0 }, (o.faces || {})[name] || {});
      const shut = f.lid >= 0.98 || (blink(seed) && f.lid < 0.9 && !f.noBlink);
      H.eyes.forEach((E, i) => {
        const l = shut ? 1 : f.lid;
        E.eg.children[1].setAttribute('cx', f1(f.lookX * 3.2));
        E.eg.children[1].setAttribute('cy', f1(3 + f.lookY * 3.6));
        const y = -9 + l * 16;
        E.lid.setAttribute('d', `M-8,-10 L8,-10 L8,${f1(y)} L-8,${f1(y)} Z`);
        E.line.setAttribute('d', `M-7.5,${f1(y)} L7.5,${f1(y)}`);
        const up = f.brow + (i === 1 ? f.browR : 0);
        E.brow.setAttribute('d', `M-7,${f1(-13 - up * 8)} L7,${f1(-13 - up * 11)}`);
      });
      H.mouth.setAttribute('d', MOUTH[f.mouth] || MOUTH.flat);
      H.mouth.setAttribute('fill', f.mouth === 'o' || f.mouth === 'yawn' ? '#8f3a35' : 'none');
      return f;
    };
    const fp = face('piano', M.piano.head, { lid: 0.55 }, 0.3);
    const fb = face('bass', M.bass.head, { lid: 0.5, browR: o.bassBrow || 0 }, 1.7);
    const fd = face('drums', M.drums.head, { lid: 0.6 }, 2.9);
    M.piano.head.g.setAttribute('transform', `rotate(${f1(-4 + 1.5 * sinb(1) + fp.tilt)}) translate(0,${f1((o.pianoNod || 0) + fp.dy)})`);
    M.bass.head.g.setAttribute('transform', `rotate(${f1(3 + 1.2 * sinb(0.5) + fb.tilt)}) translate(0,${f1((o.bassNod || 0) + fb.dy)})`);
    M.drums.head.g.setAttribute('transform', `rotate(${f1(fd.tilt + (o.drumBob || 0) * 6 * sinb(1))}) translate(0,${f1(fd.dy + (o.drumBob || 0) * 4 * Math.abs(sinb(1)))})`);
  }

  function poseStage(S, st) {
    // curtain opening: 0 closed, 1 fully open (halves slide out and gather)
    const k = st.curtain;
    const ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    S.curtains.L.setAttribute('transform', `translate(${f1(-40 - ease * 1100)},0) scale(${(1 - ease * 0.55).toFixed(3)},1)`);
    S.curtains.R.setAttribute('transform', `translate(${f1(960 + ease * 1100 + ease * 450)},0) scale(${(1 - ease * 0.55).toFixed(3)},1)`);
    S.curtains.main.setAttribute('display', k >= 1 ? 'none' : 'inline');
    // bulbs (one of them misbehaves)
    const ch = st.chase || 0, step = Math.floor((st.t || 0) * 7.5);
    S.bg.spots.forEach((e, i) => { e.setAttribute('opacity', ((st.spot || 0) * 0.9).toFixed(2)); e.setAttribute('cx', f1(i ? st.spotS : st.spotT)); });
    S.bg.bulbs.forEach((B, i) => {
      let on = 1;
      if (ch > 0.5) on = (i + step) % 3 === 0 ? 0 : 1;
      if (i === 7) on = st.badBulb;
      B.b.setAttribute('fill', on > 0.5 ? C.bulb : C.bulbOff);
    });
    S.bg.starInner.setAttribute('transform', `rotate(${f1(st.star)})`);
    // fantasy
    const F = st.fantasy || 0, t = st.t || 0;
    S.bg.rays.setAttribute('opacity', (F * 0.85).toFixed(2));
    S.bg.raysIn.setAttribute('transform', `translate(960,560) rotate(${f1(t * 6)})`);
    S.fx.setAttribute('display', F > 0.02 ? 'inline' : 'none');
    if (F > 0.02) {
      const hs = (n) => { const x = Math.sin(n * 91.7 + 13.1) * 43758.5; return x - Math.floor(x); };
      const ft = st.fantasyT || 0;
      S.bills.forEach((b, i) => {
        const x = 120 + hs(i) * 1680, sp = 140 + hs(i + 50) * 120, y = -80 + ((hs(i + 9) * 1100 + ft * sp) % 1200);
        const r = Math.sin(ft * (1.5 + hs(i + 3) * 2) + i) * 40, sx = Math.cos(ft * (2 + hs(i + 7) * 3) + i);
        b.setAttribute('transform', `translate(${f1(x + Math.sin(ft * 1.3 + i) * 40)},${f1(y)}) rotate(${f1(r)}) scale(${sx.toFixed(2)},1)`);
        b.setAttribute('opacity', F.toFixed(2));
      });
      S.sparks.forEach((e, i) => {
        const x = 160 + hs(i + 31) * 1600, y = 160 + hs(i + 61) * 520, pulse = Math.max(0, Math.sin(ft * 5 + i * 1.7));
        e.setAttribute('transform', `translate(${f1(x)},${f1(y)}) scale(${(pulse * 0.9 + 0.1).toFixed(2)})`);
        e.setAttribute('opacity', F.toFixed(2));
      });
    }
  }

  DS.buildStage = function (svg) {
    const world = el('g', { id: 'world' }, svg);
    const bg = buildBackground(world);
    const orch = buildOrchestra(world);
    const actors = el('g', { id: 'actors' }, world);
    // money + sparkles that rain only during the fantasy
    const fx = el('g', { class: 'fantasy', display: 'none' }, world);
    const bills = [], sparks = [];
    for (let i = 0; i < 26; i++) {
      const b = el('g', {}, fx);
      el('rect', { x: -34, y: -17, width: 68, height: 34, rx: 3, fill: '#a9d3a0', stroke: INK, 'stroke-width': 3.5 }, b);
      el('circle', { cx: 0, cy: 0, r: 9, fill: 'none', stroke: INK, 'stroke-width': 2.5 }, b);
      el('path', { d: 'M-26,-10 L-26,10 M26,-10 L26,10', stroke: INK, 'stroke-width': 2.5 }, b);
      bills.push(b);
    }
    for (let i = 0; i < 16; i++) sparks.push(el('path', { d: 'M0,-22 C3,-5 5,-3 22,0 C5,3 3,5 0,22 C-3,5 -5,3 -22,0 C-5,-3 -3,-5 0,-22 Z', fill: C.star, stroke: INK, 'stroke-width': 3 }, fx));
    const curtains = buildCurtains(world);
    world.appendChild(bg.front);
    return { world, bg, orch, actors, curtains, fx, bills, sparks };
  };
  DS.poseOrchestra = poseOrchestra;
  DS.poseStage = poseStage;
})();
