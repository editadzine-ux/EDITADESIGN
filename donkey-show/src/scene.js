/* Stage v2 (production kit v2): midnight-navy backdrop, narrow ruby curtains with gold tie-backs,
   six warm bulbs on a gold wire, a brown band riser, a gold oval platform with footlights.
   Band on the riser: pianist (red), bassist (blue), drummer (ivory, red & gold kit),
   guitarist monkey (navy suit, black pompadour, red electric guitar) and a turtle stage manager
   with headset, glasses and a clock sign. Everything is flat vector, posed per frame. */
(function () {
  const DS = window.DS;
  const el = DS.el, INK = DS.INK;
  const f1 = (n) => Math.round(n * 10) / 10;

  const C = {
    navy: '#0b1236', curtain: '#c4122f', curtainDark: '#8f0c22', gold: '#e9b54a', goldDark: '#b9832a',
    riser: '#87562a', riserTop: '#a86e36', platform: '#e2a443', platformRim: '#c2862e', bulb: '#ffe7a3',
    fur: '#8d5332', hair: '#5e321b', face: '#f3c7a2', skin: '#f3c7a2', earIn: '#f0a596',
    wood: '#8f5a2c', woodDark: '#6d4220', bass: '#d98a2c',
  };
  DS.COLORS = C;

  // ---------------- background ----------------
  function buildBackground(world, defs) {
    const g = el('g', { class: 'bg' }, world);
    el('rect', { x: -700, y: -500, width: 3320, height: 2100, fill: C.navy }, g);
    // soft glow for bulbs + warm pools on the platform (subtle, no beams)
    const rg = el('radialGradient', { id: 'bulbGlow' }, defs);
    el('stop', { offset: '0%', 'stop-color': '#ffd98a', 'stop-opacity': 0.55 }, rg);
    el('stop', { offset: '100%', 'stop-color': '#ffd98a', 'stop-opacity': 0 }, rg);
    const pg = el('radialGradient', { id: 'pool' }, defs);
    el('stop', { offset: '0%', 'stop-color': '#ffd27a', 'stop-opacity': 0.75 }, pg);
    el('stop', { offset: '100%', 'stop-color': '#ffd27a', 'stop-opacity': 0 }, pg);
    // band riser
    el('rect', { x: 50, y: 852, width: 1820, height: 58, fill: C.riser, stroke: INK, 'stroke-width': 3.5 }, g);
    el('rect', { x: 50, y: 848, width: 1820, height: 10, fill: C.riserTop, stroke: INK, 'stroke-width': 3 }, g);
    // gold oval platform with rim and footlights
    el('path', { d: 'M85,985 L85,1018 A875,64 0 0 0 1835,1018 L1835,985 Z', fill: C.platformRim, stroke: INK, 'stroke-width': 3.5 }, g);
    el('ellipse', { cx: 960, cy: 985, rx: 875, ry: 64, fill: C.platform, stroke: INK, 'stroke-width': 3.5 }, g);
    const pools = [el('ellipse', { cx: 680, cy: 982, rx: 300, ry: 46, fill: 'url(#pool)' }, g), el('ellipse', { cx: 1265, cy: 982, rx: 300, ry: 46, fill: 'url(#pool)' }, g)];
    const soloSpot = el('ellipse', { cx: 1535, cy: 854, rx: 190, ry: 20, fill: 'url(#pool)', opacity: 0 }, g);
    for (const x of [210, 470, 780, 960, 1140, 1450, 1710]) {
      const yy = 1018 + 64 * Math.sqrt(Math.max(0, 1 - Math.pow((x - 960) / 875, 2))) - 8;
      el('circle', { cx: x, cy: yy, r: 22, fill: 'url(#bulbGlow)' }, g);
      el('circle', { cx: x, cy: yy, r: 10, fill: C.bulb, stroke: INK, 'stroke-width': 2.5 }, g);
    }
    return { g, pools, soloSpot };
  }

  function buildLights(world) {
    const g = el('g', { class: 'lights' }, world);
    const P = (u) => [380 + u * 1160, 4 + 74 * (1 - Math.pow(2 * u - 1, 2))];
    let d = '';
    for (let i = 0; i <= 40; i++) { const [x, y] = P(i / 40); d += (i ? ' L' : 'M') + f1(x) + ',' + f1(y); }
    el('path', { d: 'M-300,-10 L380,4 ' + d.replace(/^M/, 'L') + ' L2220,-10', fill: 'none', stroke: C.gold, 'stroke-width': 3.5 }, g);
    const bulbs = [];
    for (let i = 0; i < 6; i++) {
      const [x, y] = P(0.12 + i * 0.152);
      el('circle', { cx: x, cy: y + 30, r: 44, fill: 'url(#bulbGlow)' }, g);
      el('rect', { x: x - 7, y: y - 2, width: 14, height: 14, rx: 2, fill: C.goldDark, stroke: INK, 'stroke-width': 2 }, g);
      bulbs.push(el('circle', { cx: x, cy: y + 27, r: 17, fill: C.bulb, stroke: INK, 'stroke-width': 3 }, g));
    }
    return { g, bulbs };
  }

  function buildCurtains(world) {
    const g = el('g', { class: 'curtains' }, world);
    const side = (k) => {
      const sg = el('g', {}, g);
      const e = k < 0 ? 128 : 1792, tb = k < 0 ? 42 : 1878;
      const d = k < 0
        ? `M-700,-500 L${e},-500 C${e - 6},120 ${e - 40},330 ${tb},430 C${tb + 4},620 ${tb + 8},800 ${tb + 14},960 L-700,960 Z`
        : `M2620,-500 L${e},-500 C${e + 6},120 ${e + 40},330 ${tb},430 C${tb - 4},620 ${tb - 8},800 ${tb - 14},960 L2620,960 Z`;
      el('path', { d, fill: C.curtain, stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, sg);
      for (let i = 1; i <= 3; i++) {
        const x = e - k * i * 34;
        el('path', { d: `M${x},-500 C${x - 4 * k},100 ${x - 10 * k},300 ${tb - k * i * 6},420 M${tb - k * i * 4},450 C${tb - k * i * 4},650 ${tb - k * i * 3},800 ${tb - k * i * 2},960`, fill: 'none', stroke: C.curtainDark, 'stroke-width': 3 }, sg);
      }
      el('rect', { x: tb - 26, y: 414, width: 52, height: 28, rx: 5, fill: C.gold, stroke: INK, 'stroke-width': 3, transform: `rotate(${k * -8} ${tb} 428)` }, sg);
    };
    side(-1); side(1);
    const main = el('g', {}, g), L = el('g', {}, main), R = el('g', {}, main);
    const panel = (p, flip) => {
      el('rect', { x: 0, y: -500, width: 1250, height: 1800, fill: C.curtain }, p);
      for (let i = 1; i <= 10; i++) { const x = i * 113; el('path', { d: `M${x},-500 C${x - 8},300 ${x + 10},700 ${x - 4},1200`, fill: 'none', stroke: C.curtainDark, 'stroke-width': 4 }, p); }
      el('path', { d: `M${flip ? 0 : 1250},-500 L${flip ? 0 : 1250},1300`, stroke: INK, 'stroke-width': 4.5 }, p);
      el('rect', { x: 0, y: 1060, width: 1250, height: 30, fill: C.gold, stroke: INK, 'stroke-width': 3 }, p);
    };
    panel(L, false); panel(R, true);
    return { g, L, R, main };
  }

  // ---------------- band characters ----------------
  function limb(parent, x, y, l1, l2, w, color, shoe) {
    // two-segment limb drawn as outlined strokes; returns groups to rotate
    const g = el('g', { transform: `translate(${x},${y})` }, parent);
    const up = el('g', {}, g);
    el('path', { d: `M0,0 L0,${l1}`, stroke: INK, 'stroke-width': w + 7, 'stroke-linecap': 'round' }, up);
    el('path', { d: `M0,0 L0,${l1}`, stroke: color, 'stroke-width': w, 'stroke-linecap': 'round' }, up);
    const lo = el('g', { transform: `translate(0,${l1})` }, up);
    el('path', { d: `M0,0 L0,${l2}`, stroke: INK, 'stroke-width': w + 6, 'stroke-linecap': 'round' }, lo);
    el('path', { d: `M0,0 L0,${l2}`, stroke: color, 'stroke-width': w - 1, 'stroke-linecap': 'round' }, lo);
    const end = el('g', { transform: `translate(0,${l2})` }, lo);
    if (shoe) el('path', { d: shoe, fill: INK }, end);
    else el('path', { d: 'M-9,-3 C-12,8 -6,16 0,16 C7,16 12,8 9,-3 Z M-9,4 L-14,10', fill: C.skin, stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }, end);
    return { g, up, lo, end, l1 };
  }
  // 2-bone IK in a limb's parent space; returns [upperAngle, lowerRelAngle] for limb()/setLimb()
  function ikLimb(sx, sy, tx, ty, l1, l2, bendSign) {
    let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy);
    const mx = l1 + l2 - 0.5; if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; }
    d = Math.max(d, Math.abs(l1 - l2) + 1);
    const a = Math.atan2(dy, dx), A = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
    const ua = a + bendSign * A, jx = sx + Math.cos(ua) * l1, jy = sy + Math.sin(ua) * l1;
    const la = Math.atan2(sy + dy - jy, sx + dx - jx);
    return [ua * 180 / Math.PI - 90, (la - ua) * 180 / Math.PI];
  }
  const setLimb = (L, a1, a2) => { L.up.setAttribute('transform', `rotate(${f1(a1)})`); L.lo.setAttribute('transform', `translate(0,${L.l1}) rotate(${f1(a2)})`); };

  function monkeyHead(parent, bow, kind) {
    const g = el('g', {}, parent);
    const ear = (x) => { el('circle', { cx: x, cy: 4, r: 18, fill: C.fur, stroke: INK, 'stroke-width': 3.5 }, g); el('circle', { cx: x, cy: 4, r: 10, fill: C.earIn }, g); };
    ear(-46); ear(46);
    el('circle', { cx: 0, cy: -4, r: 44, fill: C.fur, stroke: INK, 'stroke-width': 3.5 }, g);
    if (kind === 'pomp') {
      // tall black pompadour
      el('path', { d: 'M-40,-22 C-46,-60 -10,-72 18,-70 C40,-96 70,-84 66,-62 C58,-72 40,-70 34,-58 C46,-50 44,-30 34,-24 C10,-40 -20,-34 -40,-22 Z', fill: '#1f1712', stroke: INK, 'stroke-width': 3.5, 'stroke-linejoin': 'round' }, g);
    } else {
      // bob haircut with a fringe
      el('path', { d: 'M-46,6 C-52,-40 -20,-56 0,-56 C24,-56 52,-40 46,6 C40,-14 30,-24 20,-26 C14,-18 4,-22 0,-28 C-6,-20 -16,-20 -20,-26 C-32,-22 -42,-12 -46,6 Z', fill: C.hair, stroke: INK, 'stroke-width': 3.5, 'stroke-linejoin': 'round' }, g);
    }
    el('path', { d: 'M-30,-10 C-32,-28 -8,-30 0,-18 C8,-30 32,-28 30,-10 C34,16 20,38 0,38 C-20,38 -34,16 -30,-10 Z', fill: C.face, stroke: INK, 'stroke-width': 3 }, g);
    const eyes = [];
    for (const ex of [-13, 13]) {
      const eg = el('g', { transform: `translate(${ex},-8)` }, g);
      el('ellipse', { rx: 9, ry: 8.5, fill: '#fffdf8', stroke: INK, 'stroke-width': 2.5 }, eg);
      el('circle', { cx: 0, cy: 3, r: 3.4, fill: INK }, eg);
      const lid = el('path', { fill: C.face }, eg);
      const line = el('path', { stroke: INK, 'stroke-width': 3, 'stroke-linecap': 'round' }, eg);
      const brow = el('path', { stroke: INK, 'stroke-width': 3, 'stroke-linecap': 'round', fill: 'none' }, eg);
      eyes.push({ eg, lid, line, brow });
    }
    el('path', { d: 'M-5,10 L-3,13 M5,10 L3,13', stroke: INK, 'stroke-width': 2.2 }, g);
    const mouth = el('path', { fill: 'none', stroke: INK, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    if (bow) {
      el('path', { d: 'M0,-58 L-28,-74 L-26,-44 Z M0,-58 L28,-74 L26,-44 Z', fill: bow, stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }, g);
      el('circle', { cx: 0, cy: -58, r: 7, fill: bow, stroke: INK, 'stroke-width': 3 }, g);
    }
    return { g, eyes, mouth };
  }

  function tail(parent, d) {
    el('path', { d, fill: 'none', stroke: INK, 'stroke-width': 11, 'stroke-linecap': 'round' }, parent);
    el('path', { d, fill: 'none', stroke: C.fur, 'stroke-width': 5.5, 'stroke-linecap': 'round' }, parent);
  }
  const HEEL = 'M-6,-2 L14,-2 C22,0 24,6 22,9 L-8,9 L-8,16 L-11,16 L-11,4 Z';
  const SHOE = 'M-14,-4 C-12,-12 10,-10 24,-6 C36,-2 40,6 36,10 L-14,10 Z';

  function buildBand(world) {
    const g = el('g', { class: 'band' }, world);
    const M = {};
    const Y = 852; // riser top

    // ---- pianist (red) at an upright piano, facing left
    {
      const r = el('g', { transform: `translate(250,${Y})` }, g);
      const piano = el('g', {}, r);
      el('path', { d: 'M-235,0 L-235,-240 L-60,-240 L-60,0 Z', fill: C.wood, stroke: INK, 'stroke-width': 4 }, piano);
      el('path', { d: 'M-245,-250 L-50,-250 L-50,-236 L-245,-236 Z', fill: '#a56a35', stroke: INK, 'stroke-width': 3.5 }, piano);
      el('path', { d: 'M-220,-220 L-75,-220 L-75,-150 L-220,-150 Z', fill: 'none', stroke: C.woodDark, 'stroke-width': 3 }, piano);
      el('path', { d: 'M-235,-128 L-40,-128 L-40,-108 L-235,-108 Z', fill: '#fffaf0', stroke: INK, 'stroke-width': 3 }, piano);
      for (let i = 0; i < 9; i++) el('path', { d: `M${-225 + i * 20},-128 L${-225 + i * 20},-118`, stroke: INK, 'stroke-width': 5 }, piano);
      el('path', { d: 'M-220,-90 L-75,-90 L-75,-20 L-220,-20 Z', fill: 'none', stroke: C.woodDark, 'stroke-width': 3 }, piano);
      // stool
      el('path', { d: 'M-14,-92 L70,-92 L70,-78 L-14,-78 Z M-4,-78 L-8,0 M60,-78 L64,0', fill: C.wood, stroke: INK, 'stroke-width': 4 }, r);
      tail(r, 'M50,-110 C110,-120 120,-200 86,-210 C60,-218 56,-180 78,-180');
      const legs = [limb(r, 2, -98, 50, 58, 13, C.skin, HEEL), limb(r, 20, -98, 50, 58, 13, C.skin, HEEL)];
      // dress: bodice with puff sleeve, long skirt over the knees
      el('path', { d: 'M-6,-190 C-20,-170 -22,-130 -20,-104 C-40,-100 -64,-80 -70,-52 C-40,-46 10,-46 66,-62 C70,-84 60,-100 42,-104 C42,-132 38,-170 24,-190 Z', fill: '#e2333b', stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, r);
      const arms = [limb(r, -2, -176, 46, 52, 11, C.skin), limb(r, 16, -176, 46, 54, 11, C.skin)];
      el('path', { d: 'M-12,-186 C-30,-196 -36,-172 -20,-162 C-10,-158 0,-170 -12,-186 Z', fill: '#e2333b', stroke: INK, 'stroke-width': 3.5 }, r);
      const head = monkeyHead(el('g', { transform: 'translate(8,-238)' }, r), '#e2333b');
      M.piano = { r, head, arms, legs };
    }
    // ---- bassist (blue) standing behind a big double bass
    {
      const r = el('g', { transform: `translate(410,${Y})` }, g);
      tail(r, 'M-30,-140 C-90,-150 -100,-230 -66,-238 C-40,-244 -36,-206 -56,-206');
      const legs = [limb(r, -14, -112, 54, 54, 13, C.skin, HEEL), limb(r, 8, -112, 54, 54, 13, C.skin, HEEL)];
      el('path', { d: 'M-22,-212 C-30,-180 -36,-140 -40,-100 C-20,-92 20,-92 34,-100 C30,-140 26,-180 20,-212 Z', fill: '#22307a', stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, r);
      const head = monkeyHead(el('g', { transform: 'translate(-2,-262)' }, r), '#22307a');
      const bass = el('g', { transform: 'translate(62,-6) rotate(4)' }, r);
      el('path', { d: 'M-8,-330 L8,-330 L10,-170 L-10,-170 Z', fill: '#3a2414', stroke: INK, 'stroke-width': 3.5 }, bass);
      el('path', { d: 'M-4,-344 C-20,-350 -18,-372 -2,-374 C14,-376 18,-356 4,-352', fill: C.bass, stroke: INK, 'stroke-width': 3.5 }, bass);
      el('path', { d: 'M-14,-344 L-24,-344 M14,-336 L24,-336 M-14,-326 L-24,-326', stroke: C.gold, 'stroke-width': 5, 'stroke-linecap': 'round' }, bass);
      el('path', { d: 'M0,-210 C-48,-212 -60,-166 -44,-136 C-78,-118 -82,-34 -44,0 L44,0 C82,-34 78,-118 44,-136 C60,-166 48,-212 0,-210 Z', fill: C.bass, stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, bass);
      el('path', { d: 'M-22,-120 C-30,-104 -14,-92 -22,-76 M22,-120 C30,-104 14,-92 22,-76', fill: 'none', stroke: INK, 'stroke-width': 3.5 }, bass);
      el('path', { d: 'M-8,-40 L8,-40 L4,-4 L-4,-4 Z', fill: INK }, bass);
      el('path', { d: 'M-12,-58 L12,-58', stroke: INK, 'stroke-width': 4 }, bass);
      el('path', { d: 'M-3,-330 L-3,-40 M3,-330 L3,-40', stroke: '#f4e2b0', 'stroke-width': 1.5 }, bass);
      const arms = [limb(r, 16, -200, 50, 50, 11, C.skin), limb(r, -14, -198, 52, 54, 11, C.skin)];
      el('path', { d: 'M8,-208 C26,-218 34,-196 22,-184 C12,-178 2,-192 8,-208 Z M-28,-206 C-42,-214 -48,-192 -34,-182 C-24,-178 -16,-192 -28,-206 Z', fill: '#22307a', stroke: INK, 'stroke-width': 3.5 }, r);
      M.bass = { r, head, arms, bass };
    }
    // ---- drummer (ivory) behind a red & gold kit
    {
      const r = el('g', { transform: `translate(935,${Y})` }, g);
      el('path', { d: 'M-30,-86 L30,-86 L30,-74 L-30,-74 Z M-22,-74 L-26,0 M22,-74 L26,0', fill: '#c0352f', stroke: INK, 'stroke-width': 3.5 }, r);
      tail(r, 'M-26,-110 C-86,-120 -96,-196 -64,-204 C-38,-210 -34,-174 -54,-174');
      el('path', { d: 'M-20,-196 C-30,-160 -40,-120 -46,-80 C-20,-70 24,-70 46,-80 C40,-120 30,-160 20,-196 Z', fill: '#f2e3bd', stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, r);
      const head = monkeyHead(el('g', { transform: 'translate(0,-244)' }, r), '#f4e6c2');
      const arms = [limb(r, -18, -184, 46, 46, 11, C.skin), limb(r, 18, -184, 46, 46, 11, C.skin)];
      for (const a of arms) { el('path', { d: 'M0,0 L0,56', stroke: INK, 'stroke-width': 9, 'stroke-linecap': 'round' }, a.end); el('path', { d: 'M0,0 L0,56', stroke: '#e8c27a', 'stroke-width': 4.5, 'stroke-linecap': 'round' }, a.end); }
      const kit = el('g', {}, r);
      // cymbals on gold stands
      const cym = [];
      for (const [x, h] of [[-150, 210], [150, 190]]) {
        el('path', { d: `M${x},0 L${x},${-h} M${x - 22},0 L${x},-40 L${x + 22},0`, stroke: C.gold, 'stroke-width': 5, fill: 'none' }, kit);
        const c = el('g', { transform: `translate(${x},${-h})` }, kit);
        el('path', { d: 'M-52,4 C-30,-10 30,-10 52,4 C30,10 -30,10 -52,4 Z', fill: C.gold, stroke: INK, 'stroke-width': 3.5 }, c);
        el('circle', { cx: 0, cy: -4, r: 5, fill: C.goldDark, stroke: INK, 'stroke-width': 2 }, c);
        cym.push(c);
      }
      // snare / tom
      el('path', { d: 'M95,0 L95,-100 M80,0 L95,-60 L110,0', stroke: C.gold, 'stroke-width': 4, fill: 'none' }, kit);
      el('path', { d: 'M58,-150 L132,-150 L132,-110 L58,-110 Z', fill: '#cf2a2a', stroke: INK, 'stroke-width': 3.5 }, kit);
      el('ellipse', { cx: 95, cy: -150, rx: 37, ry: 9, fill: '#f6e3b0', stroke: INK, 'stroke-width': 3.5 }, kit);
      el('path', { d: 'M58,-142 L132,-142 M58,-116 L132,-116', stroke: C.gold, 'stroke-width': 4 }, kit);
      // bass drum
      el('circle', { cx: 0, cy: -72, r: 74, fill: '#cf2a2a', stroke: INK, 'stroke-width': 4 }, kit);
      el('circle', { cx: 0, cy: -72, r: 62, fill: '#f6e3b0', stroke: INK, 'stroke-width': 3.5 }, kit);
      el('circle', { cx: 0, cy: -72, r: 68, fill: 'none', stroke: C.gold, 'stroke-width': 3 }, kit);
      M.drums = { r, head, arms, cym };
    }
    // ---- guitarist monkey: navy suit, black pompadour, red electric guitar
    {
      const r = el('g', { transform: `translate(1535,${Y})` }, g);
      const body = el('g', {}, r);
      tail(body, 'M-34,-120 C-100,-110 -116,-40 -80,-30 C-54,-24 -50,-62 -72,-60');
      const legs = [limb(body, -16, -128, 70, 64, 22, '#253f92', SHOE), limb(body, 16, -128, 70, 64, 22, '#253f92', SHOE)];
      const torso = el('g', {}, body);
      el('path', { d: 'M-34,-252 C-44,-200 -42,-160 -36,-118 L36,-118 C42,-160 44,-200 34,-252 Z', fill: '#253f92', stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, torso);
      el('path', { d: 'M-12,-252 L0,-226 L12,-252 Z', fill: '#fffaf0', stroke: INK, 'stroke-width': 3 }, torso);
      el('path', { d: 'M-4,-238 L4,-238 L6,-196 L0,-188 L-6,-196 Z', fill: '#d8232a', stroke: INK, 'stroke-width': 2.5 }, torso);
      const headWrap = el('g', { transform: 'translate(0,-298)' }, torso);
      const head = monkeyHead(headWrap, null, 'pomp');
      const guitar = el('g', {}, torso);
      const gg = el('g', { transform: 'translate(-6,-168) rotate(-8)' }, guitar);
      el('path', { d: 'M22,-14 L150,-112 L162,-100 L36,-2 Z', fill: '#e6b05a', stroke: INK, 'stroke-width': 3.5, 'stroke-linejoin': 'round' }, gg);
      el('path', { d: 'M146,-118 C150,-142 178,-150 190,-138 C198,-128 186,-116 172,-110 L160,-100 Z', fill: '#e6b05a', stroke: INK, 'stroke-width': 3.5, 'stroke-linejoin': 'round' }, gg);
      for (const [x, y] of [[164, -132], [174, -128], [182, -122]]) el('circle', { cx: x, cy: y, r: 3.5, fill: C.gold, stroke: INK, 'stroke-width': 1.5 }, gg);
      el('path', { d: 'M-60,-6 C-80,-36 -54,-66 -26,-52 C-8,-68 30,-66 38,-40 C60,-30 66,8 42,30 C28,54 -10,62 -38,48 C-74,38 -82,20 -60,-6 Z', fill: '#d8232a', stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, gg);
      el('path', { d: 'M-36,-4 C-42,-26 -14,-36 2,-24 C24,-30 38,-8 24,14 C10,34 -26,34 -36,-4 Z', fill: '#f4e8c8', stroke: INK, 'stroke-width': 3 }, gg);
      el('path', { d: 'M-22,-4 L8,-18 M-16,10 L14,-4', stroke: INK, 'stroke-width': 4 }, gg);
      for (const [x, y] of [[18, 20], [30, 8], [6, 30]]) el('circle', { cx: x, cy: y, r: 4.5, fill: C.gold, stroke: INK, 'stroke-width': 2 }, gg);
      el('path', { d: 'M-30,-2 L150,-106', stroke: '#f6ead0', 'stroke-width': 1.2 }, gg);
      const armF = limb(torso, -28, -236, 60, 58, 18, '#253f92');
      const armB = limb(torso, 28, -240, 54, 52, 18, '#253f92');
      el('path', { d: 'M-4,10 L10,14 L2,24 Z', fill: '#f4e8c8', stroke: INK, 'stroke-width': 2 }, armB.end);
      const lines = el('path', { d: 'M170,-300 L196,-316 M178,-284 L204,-290', stroke: '#fff6e0', 'stroke-width': 3.5, 'stroke-linecap': 'round', display: 'none' }, torso);
      M.guitar = { r, body, torso, headWrap, head, legs, armB, armF, guitar, lines };
    }
    // ---- curtain cord with a tassel (the turtle's last word)
    {
      const cord = el('g', {}, g);
      el('path', { d: 'M1840,-200 L1840,690', stroke: INK, 'stroke-width': 9 }, cord);
      el('path', { d: 'M1840,-200 L1840,690', stroke: C.gold, 'stroke-width': 5 }, cord);
      const tassel = el('g', {}, cord);
      el('path', { d: 'M1840,690 C1826,700 1824,740 1830,760 L1850,760 C1856,740 1854,700 1840,690 Z', fill: C.gold, stroke: INK, 'stroke-width': 3 }, tassel);
      el('path', { d: 'M1832,760 L1830,782 M1840,760 L1840,786 M1848,760 L1850,782', stroke: C.goldDark, 'stroke-width': 3 }, tassel);
      M.cord = { cord, tassel };
    }
    // ---- turtle stage manager with headset, glasses and a clock sign
    {
      const r = el('g', { transform: `translate(1770,${Y})` }, g);
      const shell = el('g', {}, r);
      el('path', { d: 'M10,-230 C80,-226 96,-120 74,-40 C64,-10 30,-6 12,-14 Z', fill: '#e5891c', stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, shell);
      el('path', { d: 'M30,-206 L62,-190 L70,-150 L44,-130 L24,-150 Z M44,-130 L70,-110 L68,-70 L44,-56 L26,-76 Z', fill: 'none', stroke: '#b9620f', 'stroke-width': 3 }, shell);
      const legs = [limb(r, -18, -64, 34, 30, 22, '#f1c453', 'M-14,-2 C-14,10 22,10 24,2 Z'), limb(r, 12, -64, 34, 30, 22, '#f1c453', 'M-14,-2 C-14,10 22,10 24,2 Z')];
      el('path', { d: 'M-36,-196 C-44,-150 -42,-100 -32,-56 L28,-56 C36,-100 36,-150 28,-196 Z', fill: '#f1c453', stroke: INK, 'stroke-width': 4 }, r);
      el('path', { d: 'M-38,-190 C-44,-140 -42,-100 -32,-72 L-8,-62 L-2,-180 Z M26,-190 C34,-140 34,-100 26,-72 L6,-62 L2,-180 Z', fill: '#26304f', stroke: INK, 'stroke-width': 3.5 }, r);
      const headG = el('g', { transform: 'translate(-6,-200)' }, r);
      const head = el('g', {}, headG);
      el('path', { d: 'M-10,30 C-16,0 -20,-30 -14,-50 C-30,-56 -44,-74 -40,-94 C-34,-122 10,-130 24,-104 C34,-86 28,-58 14,-50 C18,-30 16,0 12,30 Z', fill: '#f1c453', stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, head);
      el('path', { d: 'M-38,-86 L-34,-84', stroke: INK, 'stroke-width': 3 }, head);
      const tEyes = [];
      for (const ex of [-22, 2]) {
        const eg = el('g', { transform: `translate(${ex},-92)` }, head);
        el('circle', { r: 11, fill: '#fffdf8', stroke: INK, 'stroke-width': 2.5 }, eg);
        const pupil = el('circle', { cx: 0, cy: 3, r: 3.5, fill: INK }, eg);
        const lid = el('path', { fill: '#f1c453', stroke: INK, 'stroke-width': 2.5 }, eg);
        el('circle', { r: 14, fill: 'none', stroke: INK, 'stroke-width': 2.5 }, eg);
        tEyes.push({ eg, pupil, lid });
      }
      el('path', { d: 'M-8,-92 L-10,-92 M16,-94 L30,-96', stroke: INK, 'stroke-width': 2.5 }, head);
      const tMouth = el('path', { fill: 'none', stroke: INK, 'stroke-width': 3, 'stroke-linecap': 'round' }, head);
      el('path', { d: 'M-24,-118 C-14,-142 30,-140 34,-100', fill: 'none', stroke: '#3b3a3a', 'stroke-width': 7 }, head);
      el('ellipse', { cx: 32, cy: -92, rx: 10, ry: 15, fill: '#4a4848', stroke: INK, 'stroke-width': 3 }, head);
      el('path', { d: 'M30,-80 C24,-64 8,-60 -12,-62', fill: 'none', stroke: '#3b3a3a', 'stroke-width': 3.5 }, head);
      el('ellipse', { cx: -14, cy: -62, rx: 6, ry: 4, fill: '#3b3a3a' }, head);
      // clock sign held in front
      const sign = el('g', {}, r);
      el('rect', { x: -50, y: -40, width: 92, height: 80, rx: 4, fill: '#fffdf6', stroke: INK, 'stroke-width': 3.5 }, sign);
      el('circle', { cx: -4, cy: 0, r: 30, fill: '#fffdf6', stroke: INK, 'stroke-width': 3.5 }, sign);
      for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; el('path', { d: `M${f1(-4 + Math.cos(a) * 24)},${f1(Math.sin(a) * 24)} L${f1(-4 + Math.cos(a) * 28)},${f1(Math.sin(a) * 28)}`, stroke: INK, 'stroke-width': 2.5 }, sign); }
      const hourH = el('path', { d: 'M0,0 L0,-15', stroke: INK, 'stroke-width': 4, 'stroke-linecap': 'round' }, el('g', { transform: 'translate(-4,0)' }, sign));
      const minH = el('path', { d: 'M0,0 L0,-24', stroke: INK, 'stroke-width': 3, 'stroke-linecap': 'round' }, el('g', { transform: 'translate(-4,0)' }, sign));
      el('path', { d: 'M-48,-12 C-60,-12 -60,12 -48,12 Z M40,-12 C52,-12 52,12 40,12 Z', fill: '#f1c453', stroke: INK, 'stroke-width': 3 }, sign);
      const tArm = limb(r, 22, -172, 44, 40, 13, '#f1c453');
      tArm.g.setAttribute('display', 'none');
      M.turtle = { r, headG, head, eyes: tEyes, mouth: tMouth, sign, hourH, minH, legs, tArm };
    }
    return M;
  }

  function poseBand(M, o) {
    const sinb = (k, ph = 0) => Math.sin((o.beat + ph) * Math.PI * k);
    const pulse = (ph = 0) => Math.pow(Math.abs(Math.cos((o.beat + ph) * Math.PI)), 6);
    const play = o.playing ? 1 : 0;
    // pianist: hands alternate on the keys
    setLimb(M.piano.arms[0], 72 + 4 * sinb(2) * play, 26 + 8 * Math.max(0, sinb(2)) * play);
    setLimb(M.piano.arms[1], 66 - 4 * sinb(2) * play, 30 + 8 * Math.max(0, -sinb(2)) * play);
    setLimb(M.piano.legs[0], -80, 82); setLimb(M.piano.legs[1], -76, 80);
    M.piano.head.g.parentNode.setAttribute('transform', `translate(8,${f1(-238 + (o.pianoNod || 0))}) rotate(${f1(-3 + 1.2 * sinb(1) * play)})`);
    // bassist: one hand high on the neck, the other plucks
    setLimb(M.bass.arms[0], -158, 30);
    setLimb(M.bass.arms[1], -64 + 6 * Math.abs(sinb(2)) * play, -40 + 14 * Math.abs(sinb(2)) * play);
    M.bass.head.g.parentNode.setAttribute('transform', `translate(-2,${f1(-262 + (o.bassNod || 0))}) rotate(${f1(2 + 1.2 * sinb(0.5) * play)})`);
    // drummer: sticks on the beat; one dry accent or the final hit
    const acc = Math.max(o.dry || 0, o.finalHit || 0);
    setLimb(M.drums.arms[0], 34, 70 - 22 * pulse() * play - 30 * acc);
    setLimb(M.drums.arms[1], -34, -66 + 18 * pulse(0.5) * play + 34 * acc);
    M.drums.cym[1].setAttribute('transform', `translate(150,-190) rotate(${f1(8 * (o.cymbal || 0))})`);
    // guitarist: strums on the beat; solo turns it into a stadium show
    // guitarist: strums along; the solo is a stadium show (riff, bend, windmill, knee slide, guitar raise)
    const G = M.guitar, solo = o.solo || 0, gt = o.gt == null ? -99 : o.gt;
    const sm = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
    const wb = (a, z, fi = 0.5, fo = 0.5) => Math.min(sm((gt - a) / fi), sm((z - gt) / fo));
    const bend = solo * Math.max(wb(4, 8), wb(20, 24), wb(28, 32));
    const wind = solo * wb(8, 12, 0.3, 0.3);
    const kneel = solo * wb(16, 28, 0.8, 1.2);
    const raise = Math.max(solo * wb(32, 40), o.gRaise || 0);
    const bang = solo * (1 - bend) * (1 - raise * 0.6);
    const slide = -60 * solo * (sm((gt - 16) / 1.5) - sm((gt - 28) / 2.5));
    const nod = Math.pow(Math.abs(Math.sin(o.beat * Math.PI)), 3);
    const lean = -solo * 6 - bend * 22 - kneel * 18 - raise * 10;
    const dip = 8 * Math.abs(sinb(1)) * play * (1 - solo) + solo * 18 + kneel * 62 + bang * 10 * nod;
    G.r.setAttribute('transform', `translate(${f1(1535 + slide)},852)`);
    G.torso.setAttribute('transform', `translate(0,${f1(dip)}) rotate(${f1(lean)} 0 -120)`);
    // legs: wide stance → deeper in the solo → kneeling with shins out to the sides
    const st = 30 + solo * 14;
    setLimb(G.legs[0], st * (1 - kneel) + 22 * kneel, -18 * (1 - kneel) - 108 * kneel - solo * 14 * (1 - kneel));
    setLimb(G.legs[1], -st * (1 - kneel) - 22 * kneel, 18 * (1 - kneel) + 108 * kneel + solo * 14 * (1 - kneel));
    G.legs[0].g.setAttribute('transform', `translate(-16,${f1(-128 + dip)})`); G.legs[1].g.setAttribute('transform', `translate(16,${f1(-128 + dip)})`);
    // guitar: tilts up on bends, vertical when raised
    const gRot = -bend * 22 - raise * 58 - kneel * 10;
    G.guitar.setAttribute('transform', `rotate(${f1(gRot)} 0 -60)`);
    const toTorso = (x, y) => {
      const c8 = Math.cos(-8 * Math.PI / 180), s8 = Math.sin(-8 * Math.PI / 180);
      let X = x * c8 - y * s8 - 6, Yy = x * s8 + y * c8 - 168;
      const cr = Math.cos(gRot * Math.PI / 180), sr = Math.sin(gRot * Math.PI / 180);
      const ox = X, oy = Yy + 60; return [ox * cr - oy * sr, ox * sr + oy * cr - 60];
    };
    // fretting hand slides along the neck
    const fret = 0.12 + (solo ? 0.24 * (0.5 + 0.5 * Math.sin(gt * Math.PI / 2)) : 0.1) * (1 - bend) + bend * 0.32 + raise * 0.1;
    const fp = toTorso(40 + fret * 108, -16 - fret * 88 - bend * 10);
    const aF = ikLimb(-28, -236, fp[0], fp[1], 60, 58, 1);
    setLimb(G.armF, aF[0], aF[1]);
    // picking hand: steady strum → tremolo in the solo → windmill circles
    const pickFreq = solo ? 8 : 2, stop = o.gStop || 0;
    const pk = Math.sin(o.beat * Math.PI * pickFreq) * (play ? 1 : 0) * (1 - stop);
    let sp = toTorso(2, -10 + pk * (solo ? 7 : 12));
    if (wind > 0.01) { const th = gt * Math.PI * 2; const wc = [28 + Math.cos(th) * 95, -240 + Math.sin(th) * 95]; sp = [sp[0] + (wc[0] - sp[0]) * wind, sp[1] + (wc[1] - sp[1]) * wind]; }
    const aB = ikLimb(28, -240, sp[0], sp[1], 54, 52, -1);
    setLimb(G.armB, aB[0], aB[1]);
    // head: bangs on the beat, thrown back on bends, pompadour leads
    const hr = (4 * sinb(1) * play * (1 - solo) + bang * 16 * (nod - 0.5) - bend * 24 - raise * 12 + kneel * -10) * (1 - stop) - stop * 10;
    G.headWrap.setAttribute('transform', `translate(0,${f1(-298 + bang * 6 * nod)}) rotate(${f1(hr)})`);
    G.lines.setAttribute('display', solo > 0.5 && (bend > 0.5 || raise > 0.5 || Math.sin(o.beat * Math.PI * 2) > 0.6) ? 'inline' : 'none');
    G.face = stop > 0.5 ? { squeeze: 0, mouth: 'o', lid: 0.1, lookX: -1, noBlink: 1 } : { squeeze: solo > 0.4 && bend < 0.5 ? 1 : 0, mouth: bend > 0.5 ? 'o' : solo > 0.4 ? 'grit' : 'flat', lid: bend > 0.5 ? 0.25 : 0.45 };
    if (M.soloSpot) { M.soloSpot.setAttribute('opacity', (solo * 0.9).toFixed(2)); M.soloSpot.setAttribute('cx', f1(1535 + slide)); }
    // turtle: holds the clock sign; can raise it, look at it, sigh
    const T = M.turtle, tRaise = o.tRaise || 0, look = o.tLook || 0;
    const go = o.tGo || 0, pull = o.tPull || 0, ga = o.t * 9;
    T.sign.setAttribute('transform', `translate(${f1(-8 - tRaise * 10 + go * 26 * Math.cos(ga))},${f1(-118 - tRaise * 90 + go * 26 * Math.sin(ga) + pull * 70)})`);
    T.tArm.g.setAttribute('display', pull > 0.02 ? 'inline' : 'none');
    const ry = -150 + 60 * Math.max(0, Math.min(1, (pull - 0.3) / 0.5));
    if (pull > 0.02) { const k2 = Math.min(1, pull * 2); const aa = ikLimb(22, -172, 22 + 46 * k2, -172 + (ry + 172) * k2, 44, 40, -1); setLimb(T.tArm, aa[0], aa[1]); }
    if (M.cord) M.cord.tassel.setAttribute('transform', `translate(0,${f1(Math.max(0, ry + 150))})`);
    T.headG.setAttribute('transform', `translate(-6,${f1(-200 + (o.tSigh || 0) * 10)}) rotate(${f1(look * 16 - (o.tSigh || 0) * 6)} 0 20)`);
    const minA = (o.clock || 0) * 360, hourA = 60 + (o.clock || 0) * 30;
    T.minH.setAttribute('transform', `rotate(${f1(minA)})`);
    T.hourH.setAttribute('transform', `rotate(${f1(hourA)})`);
    T.eyes.forEach((E) => {
      const lid = Math.min(1, (o.tLid != null ? o.tLid : 0.5) + (o.tBlink ? 1 : 0));
      const y = -11 + lid * 16;
      E.lid.setAttribute('d', `M-11,-11 L11,-11 L11,${f1(y)} L-11,${f1(y)} Z`);
      E.pupil.setAttribute('cx', f1((o.tLookX || 0) * 4));
      E.pupil.setAttribute('cy', f1(3 + look * 4 - (o.tRoll || 0) * 7));
    });
    T.mouth.setAttribute('d', o.tSigh > 0.5 ? 'M-26,-60 Q-18,-66 -8,-60' : 'M-28,-58 Q-18,-64 -6,-58');
    // monkey faces: bored by default; o.faces[name] overrides gaze, lids, brows, mouth, tilt
    const MOUTH = {
      flat: 'M-10,24 Q0,19 10,24', smile: 'M-11,20 Q0,30 11,20', smirk: 'M-9,25 Q2,26 11,18',
      o: 'M-5,22 a5,6 0 1 0 10,0 a5,6 0 1 0 -10,0', yawn: 'M-8,18 a8,11 0 1 0 16,0 a8,11 0 1 0 -16,0',
      grit: 'M-14,18 L14,18 L12,30 L-12,30 Z M-8,18 L-8,30 M0,18 L0,30 M8,18 L8,30',
    };
    const blink = (seed) => ((o.t * 0.37 + seed) % 4.1) < 0.12;
    const face = (name, H, base, seed) => {
      const f = Object.assign({ lid: base.lid, lookX: 0, lookY: 0, brow: 0, browR: base.browR || 0, mouth: base.mouth || 'flat', squeeze: base.squeeze || 0 }, (o.faces || {})[name] || {});
      const shut = f.lid >= 0.98 || (blink(seed) && f.lid < 0.9 && !f.noBlink);
      H.eyes.forEach((E, i) => {
        const pupil = E.eg.children[1];
        if (f.squeeze > 0.5) {
          // squeezed-shut eyes: > <
          E.eg.children[0].setAttribute('display', 'none'); pupil.setAttribute('display', 'none');
          E.lid.setAttribute('d', ''); E.line.setAttribute('d', i ? 'M-8,-6 L4,0 L-8,6' : 'M8,-6 L-4,0 L8,6');
          E.brow.setAttribute('d', i ? 'M-8,-10 L8,-16' : 'M-8,-16 L8,-10');
          return;
        }
        E.eg.children[0].setAttribute('display', 'inline'); pupil.setAttribute('display', 'inline');
        const l = shut ? 1 : f.lid;
        pupil.setAttribute('cx', f1(f.lookX * 3.6));
        pupil.setAttribute('cy', f1(3 + f.lookY * 3.6));
        const y = -9 + l * 16;
        E.lid.setAttribute('d', `M-10,-10 L10,-10 L10,${f1(y)} L-10,${f1(y)} Z`);
        E.line.setAttribute('d', `M-9,${f1(y)} L9,${f1(y)}`);
        const up = f.brow + (i === 1 ? f.browR : 0);
        E.brow.setAttribute('d', `M-9,${f1(-12 - up * 9)} L9,${f1(-12 - up * 12)}`);
      });
      H.mouth.setAttribute('d', MOUTH[f.mouth] || MOUTH.flat);
      H.mouth.setAttribute('fill', f.mouth === 'o' || f.mouth === 'yawn' ? '#8f3a35' : f.mouth === 'grit' ? '#fffaf0' : 'none');
      return f;
    };
    face('piano', M.piano.head, { lid: 0.55 }, 0.3);
    face('bass', M.bass.head, { lid: 0.5, browR: o.bassBrow || 0 }, 1.7);
    face('drums', M.drums.head, { lid: 0.6 }, 2.9);
    face('guitar', M.guitar.head, G.face, 2.2);
  }

  function poseStage(S, st) {
    const k = st.curtain;
    const ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    S.curtains.L.setAttribute('transform', `translate(${f1(-290 - ease * 1300)},0) scale(${(1 - ease * 0.6).toFixed(3)},1)`);
    S.curtains.R.setAttribute('transform', `translate(${f1(960 + ease * 1300 + ease * 700)},0) scale(${(1 - ease * 0.6).toFixed(3)},1)`);
    S.curtains.main.setAttribute('display', k >= 1 ? 'none' : 'inline');
    S.bg.pools[0].setAttribute('cx', f1(st.poolT)); S.bg.pools[1].setAttribute('cx', f1(st.poolS));
    S.bg.pools.forEach((p) => p.setAttribute('opacity', (0.55 + 0.45 * (st.glow || 0)).toFixed(2)));
  }

  // dark auditorium seen from the stage: rows of empty seats, one red seat marked 'reserved'
  function buildAudience(world, defs) {
    const g = el('g', { class: 'audience', transform: 'translate(0,2400)' }, world);
    el('rect', { x: -900, y: -500, width: 3720, height: 2100, fill: '#05081b' }, g);
    const sg = el('radialGradient', { id: 'seatSpot' }, defs);
    el('stop', { offset: '0%', 'stop-color': '#ffd27a', 'stop-opacity': 0.35 }, sg);
    el('stop', { offset: '100%', 'stop-color': '#ffd27a', 'stop-opacity': 0 }, sg);
    el('ellipse', { cx: 960, cy: 560, rx: 330, ry: 260, fill: 'url(#seatSpot)' }, g);
    for (let r = 0; r < 4; r++) {
      const w = 150 + r * 40, h = 150 + r * 50, y = 260 + r * 210, n = Math.ceil(2400 / w) + 2;
      for (let i = -Math.floor(n / 2); i <= Math.floor(n / 2); i++) {
        const x = 960 + i * (w + 14) + (r % 2 ? 0 : w / 2 + 7);
        const red = r === 1 && i === 0;
        el('path', { d: `M${x - w / 2},${y + h} L${x - w / 2},${y + 30} C${x - w / 2},${y} ${x + w / 2},${y} ${x + w / 2},${y + 30} L${x + w / 2},${y + h} Z`,
          fill: red ? '#c4122f' : '#171127', stroke: red ? INK : '#2a2142', 'stroke-width': red ? 4.5 : 3 }, g);
        if (red) {
          el('path', { d: `M${x - 40},${y + 56} L${x + 40},${y + 56} L${x + 40},${y + 104} L${x - 40},${y + 104} Z`, fill: '#fffaf0', stroke: INK, 'stroke-width': 3 }, g);
          el('path', { d: `M${x - 22},${y + 56} L${x},${y + 36} L${x + 22},${y + 56}`, fill: 'none', stroke: INK, 'stroke-width': 2.5 }, g);
          const tx = el('text', { x, y: y + 90, 'text-anchor': 'middle', 'font-family': 'Rubik, sans-serif', 'font-weight': 700, 'font-size': 28, fill: INK, direction: 'rtl' }, g);
          tx.textContent = 'שמור';
        }
      }
    }
    return g;
  }

  DS.buildStage = function (svg) {
    const defs = el('defs', {}, svg);
    const world = el('g', { id: 'world' }, svg);
    const bg = buildBackground(world, defs);
    const lights = buildLights(world);
    const orch = buildBand(world);
    orch.soloSpot = bg.soloSpot;
    const actors = el('g', { id: 'actors' }, world);
    const curtains = buildCurtains(world);
    buildAudience(world, defs);
    return { world, bg, lights, orch, actors, curtains };
  };
  DS.poseOrchestra = poseBand;
  DS.poseStage = poseStage;
})();
