/* Donkey rig: layered SVG characters with separate limbs, 2-bone IK, jaw and face controls.
   All geometry is in character-local space: origin on the stage floor between the feet,
   facing right (+x), y grows downward (so "up" is negative). Facing left is a mirror on the root. */
(function () {
  const DS = (window.DS = window.DS || {});
  const NS = 'http://www.w3.org/2000/svg';
  const INK = '#2b2522';
  const D2R = Math.PI / 180;

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const rot = (x, y, a) => {
    const c = Math.cos(a * D2R), s = Math.sin(a * D2R);
    return [x * c - y * s, x * s + y * c];
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const f1 = (n) => Math.round(n * 10) / 10;

  // two-bone IK. pick(j1, j2) chooses which elbow/knee solution to use.
  function ik(ax, ay, bx, by, l1, l2, pick) {
    let dx = bx - ax, dy = by - ay;
    let d = Math.hypot(dx, dy);
    const maxd = l1 + l2 - 0.5;
    if (d > maxd) { dx *= maxd / d; dy *= maxd / d; d = maxd; bx = ax + dx; by = ay + dy; }
    const mind = Math.abs(l1 - l2) + 1;
    if (d < mind) d = mind;
    const a = Math.atan2(dy, dx);
    const A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const j1 = [ax + l1 * Math.cos(a + A), ay + l1 * Math.sin(a + A)];
    const j2 = [ax + l1 * Math.cos(a - A), ay + l1 * Math.sin(a - A)];
    const j = pick(j1, j2);
    return { j, end: [bx, by] };
  }
  const boneT = (p, q) => `translate(${f1(p[0])},${f1(p[1])}) rotate(${f1(Math.atan2(q[1] - p[1], q[0] - p[0]) / D2R - 90)})`;

  // tapered capsule along +y
  function capsule(L, w0, w1, y0 = 0) {
    const a = w0 / 2, b = w1 / 2;
    return `M${-a},${y0} L${-b},${L} A${b},${b} 0 0 0 ${b},${L} L${a},${y0} A${a},${a} 0 0 0 ${-a},${y0} Z`;
  }

  // ear centerline path with bend; returns outer path and inner (pink) path
  function earPaths(L, W, bend, blunt) {
    const n = 12, left = [], right = [], il = [], ir = [];
    let x = 0, y = 0, ang = -90;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      pts.push([x, y, ang]);
      ang += (bend / n);
      x += Math.cos(ang * D2R) * (L / n);
      y += Math.sin(ang * D2R) * (L / n);
    }
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      const [px, py, a] = pts[i];
      const w = blunt ? W * 0.5 * (0.55 + 0.45 * Math.min(1, s * 3)) * (s > 0.9 ? Math.sqrt(Math.max(0, 1 - Math.pow((s - 0.9) / 0.1, 2))) : 1) : W * (0.62 + 0.55 * Math.sin(Math.PI * Math.min(1, s * 1.05 + 0.08))) * (1 - Math.pow(s, 3) * 0.95) * 0.5;
      const nx = Math.cos((a - 90) * D2R), ny = Math.sin((a - 90) * D2R);
      left.push([px + nx * w, py + ny * w]);
      right.push([px - nx * w, py - ny * w]);
      if (s > 0.12 && s < 0.9) {
        const wi = w * 0.55;
        il.push([px + nx * wi, py + ny * wi]);
        ir.push([px - nx * wi, py - ny * wi]);
      }
    }
    const tip = pts[n];
    const P = (arr) => arr.map((p) => `${f1(p[0])},${f1(p[1])}`).join(' L');
    const outer = `M${P(left)} L${f1(tip[0])},${f1(tip[1])} L${P(right.slice().reverse())} Z`;
    const inner = `M${P(il)} L${P(ir.slice().reverse())} Z`;
    return { outer, inner };
  }

  const SPECS = {
    T: {
      name: 'tall', skin: '#f2c3ad', earOut: '#f3b6a3', hand: '#f5cbb7', muzzle: '#f9dccf', earIn: '#f8d2c5', mane: '#9b4f2b',
      suit: '#1fa39b', suitShade: '#168a83', shirt: '#fffdf6', tie: '#151515', belt: '#151515', buckle: '#e9b54a', sock: '#fffdf6', buttons: 2,
      hipY: -300, hipHalf: 26, thigh: 152, shin: 146, footSpread: 40, legW: 44, shinW: 38, pantsEnd: 0.7, sockW: 15,
      torsoH: 178, shoulderHalf: 54, waistHalf: 62, belly: 4, hem: 22,
      upper: 88, fore: 84, armW: 32, foreW: 28,
      neckLen: 96, neckW: 30, neckAng: 14,
      head: { cr: 44, cx: 2, cy: -44, mx: 112, my: -40, mrx: 44, mry: 30, mrot: -14, eye1: [36, -66], eye2: [60, -72], er: 11, teeth: 'buck', earL: 150, earW: 54, sc: 1.32 },
      ears: [{ x: -14, y: -78, ang: -26, bend: -6 }, { x: 12, y: -84, ang: 4, bend: 5 }],
      tail: false, scale: 1,
    },
    S: {
      name: 'short', skin: '#f2a172', earOut: '#f2a172', hand: '#f7c9ae', muzzle: '#f8d4c2', earIn: '#f6b79c', mane: '#8a4524',
      suit: '#f3b51e', suitShade: '#d99c12', shirt: '#fffdf6', tie: '#a3182a', belt: '#6e4524', buckle: '#e9b54a', sock: '#fffdf6', buttons: 1,
      hipY: -196, hipHalf: 32, thigh: 98, shin: 90, footSpread: 44, legW: 62, shinW: 50, pantsEnd: 0.78, sockW: 18,
      torsoH: 152, shoulderHalf: 52, waistHalf: 80, belly: 26, hem: 26,
      upper: 74, fore: 68, armW: 34, foreW: 30,
      neckLen: 40, neckW: 40, neckAng: 18,
      head: { cr: 48, cx: 0, cy: -46, mx: 96, my: -34, mrx: 52, mry: 40, mrot: -8, eye1: [34, -70], eye2: [60, -74], er: 12, teeth: 'buck', earL: 185, earW: 42, sc: 1.3 },
      ears: [{ x: -16, y: -80, ang: -20, bend: 0, len: 0.18 }, { x: 10, y: -88, ang: 18, bend: -130, blunt: 1 }],
      tail: false, scale: 1,
    },
  };

  class Donkey {
    constructor(id, parent) {
      this.id = id;
      this.s = SPECS[id];
      const s = this.s;
      this.root = el('g', { class: 'donkey ' + id }, parent);
      this.body = el('g', {}, this.root);
      const L = (n) => el('g', { class: n }, this.body);
      this.layers = {
        armBack: L('armBack'), tail: L('tail'), legs: L('legs'), neck: L('neck'), torso: L('torso'),
        head: L('head'), armFrontFree: L('armFreeFront'), armFront: L('armFront'),
      };
      this.buildLegs();
      this.buildTorso();
      this.buildNeck();
      this.buildHead();
      this.free = this.buildArm(this.layers.armBack, 'free');
      this.mic = this.buildArm(this.layers.armFront, 'mic');
      if (s.tail) this.buildTail();
    }

    // limb pair: outline layer + fill layer so joints read as one silhouette
    pair(parentOl, parentFl, d, fill) {
      const ol = el('path', { d, fill: INK, stroke: INK, 'stroke-width': 9, 'stroke-linejoin': 'round' }, parentOl);
      const fl = el('path', { d, fill }, parentFl);
      return { ol, fl, set(t) { ol.setAttribute('transform', t); fl.setAttribute('transform', t); } };
    }

    buildLegs() {
      const s = this.s, g = this.layers.legs;
      this.legs = [];
      for (let i = 0; i < 2; i++) {
        const lg = el('g', {}, g);
        const ol = el('g', {}, lg), fl = el('g', {}, lg);
        const thigh = this.pair(ol, fl, capsule(s.thigh, s.legW, s.shinW + 4), s.suit);
        const sock = this.pair(ol, fl, capsule(s.shin, s.sockW, s.sockW - 2, s.shin * s.pantsEnd - 8), s.sock);
        const shin = this.pair(ol, fl, capsule(s.shin * s.pantsEnd, s.shinW + 2, s.shinW), s.suit);
        // trouser cuff line
        const cuff = el('path', { d: `M${-s.shinW / 2},${s.shin * s.pantsEnd} L${s.shinW / 2},${s.shin * s.pantsEnd}`, stroke: INK, 'stroke-width': 3, fill: 'none' }, fl);
        const shoe = el('path', {
          d: 'M-16,-6 C-18,-16 6,-15 20,-10 C38,-6 50,0 48,10 C46,15 -14,15 -18,10 C-20,4 -18,0 -16,-6 Z',
          fill: INK, stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round',
        }, lg);
        this.legs.push({ g: lg, thigh, shin, sock, cuff, shoe });
      }
    }

    buildTorso() {
      const s = this.s, g = this.tg = el('g', {}, this.layers.torso);
      const H = s.torsoH, sh = s.shoulderHalf, wh = s.waistHalf, b = s.belly, hem = s.hem;
      // pants seat over the top of the thighs
      el('path', { d: `M${-wh * 0.86},-34 C${-wh * 0.95},4 ${-wh * 0.8},${hem + 18} ${-wh * 0.55},${hem + 22} L${wh * 0.55},${hem + 22} C${wh * 0.8},${hem + 18} ${wh * 0.95},4 ${wh * 0.86},-34 Z`, fill: s.suit, stroke: INK, 'stroke-width': 4.5, 'stroke-linejoin': 'round' }, g);
      // shirt
      el('path', { d: `M-20,${-H + 2} C${-30 - b * 0.6},${-H * 0.55} ${-30 - b * 0.8},-50 -26,-30 L26,-30 C${30 + b * 0.8},-50 ${30 + b * 0.6},${-H * 0.55} 20,${-H + 2} Z`, fill: s.shirt, stroke: INK, 'stroke-width': 4 }, g);
      // tie
      el('path', { d: `M-8,${-H + 6} L8,${-H + 6} L5,${-H + 20} L-5,${-H + 20} Z M-5,${-H + 20} L5,${-H + 20} L${10 + b * 0.1},-62 L0,-48 L${-10 - b * 0.1},-62 Z`, fill: s.tie, stroke: INK, 'stroke-width': 3.5, 'stroke-linejoin': 'round' }, g);
      // belt + buckle
      el('path', { d: `M${-wh * 0.84},-40 L${wh * 0.84},-40 L${wh * 0.86},-24 L${-wh * 0.86},-24 Z`, fill: s.belt, stroke: INK, 'stroke-width': 3.5 }, g);
      el('rect', { x: -12, y: -43, width: 24, height: 22, rx: 3, fill: s.buckle, stroke: INK, 'stroke-width': 3.5 }, g);
      el('rect', { x: -5, y: -37, width: 10, height: 10, fill: s.belt }, g);
      // jacket flaps (open), with a crooked hand-drawn feel
      const flap = (k) => {
        const m = (x) => x * k;
        return `M${m(-14)},${-H} L${m(-sh)},${-H + 6} C${m(-sh - b * 0.9 - 6)},${-H * 0.62} ${m(-wh - b)},${-H * 0.2} ${m(-wh)},${hem} ` +
          `C${m(-wh * 0.7)},${hem + 8} ${m(-36)},${hem + 4} ${m(-26 - b * 0.4)},${hem - 2} ` +
          `C${m(-34 - b * 0.9)},${-H * 0.25} ${m(-34 - b * 0.5)},${-H * 0.5} ${m(-24)},${-H * 0.62} L${m(-30)},${-H * 0.7} L${m(-20)},${-H + 18} Z`;
      };
      el('path', { d: flap(1), fill: s.suit, stroke: INK, 'stroke-width': 4.5, 'stroke-linejoin': 'round' }, g);
      el('path', { d: flap(-1), fill: s.suit, stroke: INK, 'stroke-width': 4.5, 'stroke-linejoin': 'round' }, g);
      // collar points
      el('path', { d: `M-18,${-H - 2} L-4,${-H + 12} L-22,${-H + 16} Z M18,${-H - 2} L4,${-H + 12} L22,${-H + 16} Z`, fill: s.shirt, stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }, g);
      // button
      for (let i = 0; i < (s.buttons || 1); i++) el('circle', { cx: -wh * 0.62 - b * 0.4, cy: -H * (0.42 - i * 0.2), r: 8, fill: s.buckle, stroke: INK, 'stroke-width': 3 }, g);
      this.torsoPts = { shoulderB: [-sh + 6, -H + 14], shoulderF: [sh - 6, -H + 14], neck: [6, -H + 4] };
      // pants rip on the seat (hidden until the bow)
      this.rip = el('g', { display: 'none' }, g);
      el('path', { d: `M${-wh * 0.98},-14 L${-wh * 0.86},-22 L${-wh * 0.74},-12 L${-wh * 0.62},-24 L${-wh * 0.52},-10 L${-wh * 0.56},${hem + 8} L${-wh * 0.72},${hem + 16} L${-wh * 0.9},${hem + 10} Z`, fill: '#fffaf0', stroke: INK, 'stroke-width': 3.5, 'stroke-linejoin': 'round' }, this.rip);
      for (const [x, y] of [[-0.86, -4], [-0.7, 4], [-0.78, 18], [-0.62, 14], [-0.88, 26]]) el('circle', { cx: wh * x, cy: y, r: 4, fill: '#d8323a' }, this.rip);
      // empty pockets turned inside out (hidden until needed)
      this.pockets = [-1, 1].map((k) => {
        const pg = el('g', { display: 'none' }, g);
        el('path', { d: 'M-15,0 L15,0 L11,30 Q0,38 -11,30 Z', fill: '#fbf8f0', stroke: INK, 'stroke-width': 3.5, 'stroke-linejoin': 'round' }, pg);
        el('path', { d: 'M-6,12 L-2,18 M4,10 L7,20', stroke: '#cfc4b3', 'stroke-width': 2.5 }, pg);
        return { pg, x: k * (wh * 0.96 + b * 0.3), y: -4 };
      });
    }

    buildNeck() {
      const s = this.s;
      this.neck = el('path', { d: capsule(s.neckLen + 16, s.neckW, s.neckW + 4, 0), fill: s.skin, stroke: INK, 'stroke-width': 4.5 }, this.layers.neck);
    }

    buildHead() {
      const s = this.s, h = s.head;
      const hg = (this.hg = el('g', {}, this.layers.head));
      this.earG = [];
      // back ear behind head
      const mkEar = (parent) => {
        const g = el('g', {}, parent);
        const o = el('path', { fill: s.earOut || s.skin, stroke: INK, 'stroke-width': 4.5, 'stroke-linejoin': 'round' }, g);
        const i = el('path', { fill: s.earIn }, g);
        return { g, o, i };
      };
      this.earG.push(mkEar(hg));
      // mane tuft
      el('path', { d: 'M-34,-70 L-44,-98 L-24,-84 L-22,-116 L-8,-90 L2,-122 L10,-92 L24,-112 L22,-82 L36,-92 L28,-66 Z', fill: s.mane, stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, hg);
      // outline pass for skull/bridge/muzzle/jaw/mouth
      const ol = el('g', {}, hg), fl = el('g', {}, hg);
      const skull = `M${h.cx - h.cr},${h.cy + 6} C${h.cx - h.cr - 4},${h.cy - h.cr * 1.1} ${h.cx + h.cr * 0.7},${h.cy - h.cr * 1.25} ${h.cx + h.cr},${h.cy - h.cr * 0.55} ` +
        `C${h.mx - h.mrx * 0.7},${h.my - h.mry * 1.05} ${h.mx - h.mrx * 0.2},${h.my - h.mry * 1.0} ${h.mx},${h.my - h.mry * 0.6} ` +
        `L${h.mx - h.mrx * 0.4},${h.my + h.mry * 0.9} C${h.cx + h.cr},${h.cy + h.cr * 1.25} ${h.cx - h.cr * 0.6},${h.cy + h.cr * 1.1} ${h.cx - h.cr},${h.cy + 6} Z`;
      const muzzleD = `M${h.mx - h.mrx},${h.my} a${h.mrx},${h.mry} 0 1 0 ${h.mrx * 2},0 a${h.mrx},${h.mry} 0 1 0 ${-h.mrx * 2},0 Z`;
      this.mouthOl = el('path', { fill: INK, stroke: INK, 'stroke-width': 9, 'stroke-linejoin': 'round' }, ol);
      this.jawOl = el('path', { fill: INK, stroke: INK, 'stroke-width': 9, 'stroke-linejoin': 'round' }, ol);
      el('path', { d: skull, fill: INK, stroke: INK, 'stroke-width': 9, 'stroke-linejoin': 'round' }, ol);
      el('path', { d: muzzleD, fill: INK, stroke: INK, 'stroke-width': 9, transform: `rotate(${h.mrot} ${h.mx} ${h.my})` }, ol);
      el('path', { d: skull, fill: s.skin }, fl);
      this.mouthFl = el('path', { fill: '#9b3a35' }, fl);
      this.tongue = el('path', { fill: '#e98a86' }, fl);
      this.jawFl = el('path', { fill: s.muzzle }, fl);
      this.muzzle = el('path', { d: muzzleD, fill: s.muzzle, transform: `rotate(${h.mrot} ${h.mx} ${h.my})` }, fl);
      // teeth
      this.teeth = el('g', {}, fl);
      const tx = h.mx - h.mrx * 0.5, ty = h.my + h.mry * 0.82;
      if (h.teeth === 'row') {
        el('path', { d: `M${tx - 18},${ty - 6} L${tx + 46},${ty - 14} L${tx + 47},${ty + 4} L${tx - 16},${ty + 12} Z`, fill: '#fffdf7', stroke: INK, 'stroke-width': 3.5, 'stroke-linejoin': 'round' }, this.teeth);
        for (let i = 1; i < 5; i++) {
          const x = tx - 17 + i * 12.8, y0 = ty - 7.5 - i * 1.6;
          el('path', { d: `M${x},${y0} L${x + 0.3},${y0 + 17}`, stroke: INK, 'stroke-width': 2.5 }, this.teeth);
        }
      } else {
        el('path', { d: `M${tx + 18},${ty - 10} L${tx + 38},${ty - 12} L${tx + 39},${ty + 18} L${tx + 19},${ty + 20} Z M${tx + 40},${ty - 12} L${tx + 60},${ty - 14} L${tx + 61},${ty + 16} L${tx + 41},${ty + 18} Z`, fill: '#fffdf7', stroke: INK, 'stroke-width': 3.5, 'stroke-linejoin': 'round' }, this.teeth);
      }
      this.teethY = ty;
      // closed mouth line
      this.mouthLine = el('path', { fill: 'none', stroke: INK, 'stroke-width': 4.5, 'stroke-linecap': 'round' }, fl);
      // nostrils
      const nx = h.mx + h.mrx * 0.45, ny = h.my - h.mry * 0.35;
      el('ellipse', { cx: nx, cy: ny, rx: 5, ry: 7, fill: INK, transform: `rotate(-20 ${nx} ${ny})` }, fl);
      el('ellipse', { cx: nx - 26, cy: ny + 2, rx: 4, ry: 6, fill: INK, transform: `rotate(-20 ${nx - 26} ${ny + 2})` }, fl);
      // eyes
      this.eyes = [h.eye1, h.eye2].map(([ex, ey], k) => {
        const g = el('g', { transform: `translate(${ex},${ey})` }, hg);
        const r = h.er * (k ? 0.92 : 1);
        const cid = `eyeclip-${this.id}-${k}`;
        const cp = el('clipPath', { id: cid }, g);
        el('ellipse', { cx: 0, cy: 0, rx: r * 0.86, ry: r * 1.08 }, cp);
        const open = el('g', {}, g);
        el('ellipse', { cx: 0, cy: 0, rx: r * 0.86, ry: r * 1.08, fill: '#fffdf8' }, open);
        const pupil = el('circle', { cx: 0, cy: 0, r: r * 0.42, fill: INK, 'clip-path': `url(#${cid})` }, open);
        const lid = el('path', { fill: s.skin, 'clip-path': `url(#${cid})` }, open);
        const lidLine = el('path', { fill: 'none', stroke: INK, 'stroke-width': 3.5, 'stroke-linecap': 'round' }, open);
        el('ellipse', { cx: 0, cy: 0, rx: r * 0.86, ry: r * 1.08, fill: 'none', stroke: INK, 'stroke-width': 3.5 }, open);
        const closed = el('path', { fill: 'none', stroke: INK, 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
        const brow = el('path', { d: `M${-r},0 Q0,${-r * 0.5} ${r},0`, fill: 'none', stroke: INK, 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
        return { g, r, open, pupil, lid, lidLine, closed, brow };
      });
      // front ear (in front of the head)
      this.earG.push(mkEar(hg));
      // straw (hay) stuck in the mouth corner
      this.strawHead = el('path', { d: `M${h.mx - h.mrx * 0.55},${h.my + h.mry * 0.85} L${h.mx + 60},${h.my + h.mry * 1.5}`, stroke: '#e3c35a', 'stroke-width': 6, 'stroke-linecap': 'round', fill: 'none', display: 'none' }, hg);
      this.strawHeadOl = el('path', { d: `M${h.mx - h.mrx * 0.55},${h.my + h.mry * 0.85} L${h.mx + 60},${h.my + h.mry * 1.5}`, stroke: INK, 'stroke-width': 10, 'stroke-linecap': 'round', fill: 'none', display: 'none' }, hg);
      hg.insertBefore(this.strawHeadOl, this.strawHead);
      // expression extras: blush, tongue sticking out, sweat drop, tear
      const bx = h.mx - h.mrx * 1.05, byy = h.my + 4;
      this.blush = el('g', { opacity: 0 }, hg);
      el('ellipse', { cx: bx, cy: byy, rx: 22, ry: 12, fill: '#f08b86', opacity: 0.8 }, this.blush);
      el('path', { d: `M${bx - 9},${byy - 3} l5,6 M${bx - 1},${byy - 4} l5,6 M${bx + 7},${byy - 3} l5,6`, stroke: '#d9615c', 'stroke-width': 2.5, 'stroke-linecap': 'round' }, this.blush);
      this.tongueOut = el('path', { fill: '#ee8e8a', stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round', display: 'none' }, hg);
      const drop = 'M0,-16 C6,-6 11,0 11,6 C11,13 6,17 0,17 C-6,17 -11,13 -11,6 C-11,0 -6,-6 0,-16 Z';
      this.sweat = el('path', { d: drop, fill: '#a9d8ef', stroke: INK, 'stroke-width': 3.5, display: 'none' }, hg);
      this.sweat2 = el('path', { d: drop, fill: '#a9d8ef', stroke: INK, 'stroke-width': 3.5, display: 'none' }, hg);
      this.tear = el('path', { d: drop, fill: '#a9d8ef', stroke: INK, 'stroke-width': 3, display: 'none' }, hg);
      // snore bubble from the nostril
      this.bubble = el('circle', { cx: h.mx + h.mrx * 0.62, cy: h.my - h.mry * 0.2, r: 10, fill: 'rgba(235,245,255,0.55)', stroke: INK, 'stroke-width': 3, display: 'none' }, hg);
      // motion marks (like the little curved strokes in the reference art), in body space
      this.marks = el('g', { fill: 'none', stroke: INK, 'stroke-width': 4, 'stroke-linecap': 'round' }, this.body);
      // a moth that flies out of an empty pocket
      this.moth = el('g', { display: 'none' }, this.body);
      this.mothW = el('path', { d: 'M0,0 C-10,-22 -30,-20 -26,-4 C-24,6 -8,6 0,0 Z M0,0 C10,-22 30,-20 26,-4 C24,6 8,6 0,0 Z', fill: '#d8d0c4', stroke: INK, 'stroke-width': 3, 'stroke-linejoin': 'round' }, this.moth);
      el('ellipse', { cx: 0, cy: 2, rx: 4, ry: 9, fill: '#8a7f73', stroke: INK, 'stroke-width': 2.5 }, this.moth);
    }

    buildArm(layer, kind) {
      const s = this.s;
      const g = el('g', {}, layer);
      const ol = el('g', {}, g), fl = el('g', {}, g);
      const upper = this.pair(ol, fl, capsule(s.upper, s.armW, s.foreW + 2), s.suit);
      const fore = this.pair(ol, fl, capsule(s.fore, s.foreW + 2, s.foreW), s.suit);
      const cuff = el('path', { d: capsule(10, s.foreW + 4, s.foreW + 4, 0), fill: s.shirt, stroke: INK, 'stroke-width': 3.5 }, g);
      const micG = el('g', {}, g);
      if (kind === 'mic') {
        el('path', { d: 'M-6,0 L-7,-68 L7,-68 L6,0 Z', fill: '#4a3a2e', stroke: INK, 'stroke-width': 3 }, micG);
        el('circle', { cx: 0, cy: -82, r: 17, fill: '#efe2c0', stroke: INK, 'stroke-width': 3.5 }, micG);
        el('path', { d: 'M-12,-90 L12,-90 M-15,-82 L15,-82 M-12,-74 L12,-74 M-8,-96 L-8,-68 M0,-98 L0,-66 M8,-96 L8,-68', stroke: '#8a7a5a', 'stroke-width': 1.8 }, micG);
      }
      const hand = el('g', {}, g);
      const shapes = {
        open: el('path', { d: 'M-15,0 C-20,14 -24,24 -36,30 C-42,33 -38,40 -30,38 L-18,32 C-22,44 -20,54 -12,54 C-10,58 -2,58 0,52 C3,58 11,57 12,51 C18,54 24,48 20,40 C26,40 28,32 22,26 L16,0 Z', fill: s.hand, stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, hand),
        fist: el('path', { d: 'M-15,0 C-22,8 -22,30 -10,34 C0,38 14,36 18,26 C22,16 18,4 14,0 Z M-12,14 C-4,12 6,12 14,14 M-12,23 C-4,21 6,21 14,23', fill: s.hand, stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, hand),
        point: el('path', { d: 'M-15,0 C-22,8 -22,28 -10,32 C-4,34 2,34 4,32 L6,62 C7,68 15,68 15,62 L16,28 C20,18 18,4 14,0 Z', fill: s.hand, stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round' }, hand),
      };
      const straw = el('path', { d: 'M0,22 L-8,-40', stroke: '#e3c35a', 'stroke-width': 6, 'stroke-linecap': 'round', display: 'none' }, hand);
      return { g, upper, fore, cuff, micG, hand, shapes, straw, kind };
    }

    buildTail() {
      const s = this.s;
      this.tailG = el('g', {}, this.layers.tail);
      this.tailPath = el('path', { fill: 'none', stroke: INK, 'stroke-width': 11, 'stroke-linecap': 'round' }, this.tailG);
      this.tailFill = el('path', { fill: 'none', stroke: s.skin, 'stroke-width': 5, 'stroke-linecap': 'round' }, this.tailG);
      this.tuft = el('path', { fill: s.mane, stroke: INK, 'stroke-width': 3.5, 'stroke-linejoin': 'round' }, this.tailG);
    }

    // ---------- per-frame pose ----------
    apply(p, ear) {
      const s = this.s, h = s.head;
      const sq = p.sq || 1, sx = 1 + (1 - sq) * 0.75;
      this.root.setAttribute('transform', `translate(${f1(p.x + (p.dx || 0))},${f1(p.ground + p.y)}) scale(${(p.face * s.scale * sx).toFixed(3)},${(s.scale * sq).toFixed(3)})`);
      // pelvis
      const pv = [p.hipDx, s.hipY + p.hipDy + (p.crouch || 0)];
      const tiltRot = (x, y) => rot(x, y, p.hipRot);
      // legs: [back(left), front(right)]
      const feet = [
        [-s.footSpread + p.fBx, -12 + p.fBy, p.fBa || 0],
        [s.footSpread + p.fFx, -12 + p.fFy, p.fFa || 0],
      ];
      let md = '';
      const arc = (x, y, k, n = 2, sz = 16) => { let d = ''; for (let j = 0; j < n; j++) { const r = sz + j * 9; d += `M${f1(x + k * j * 9)},${f1(y - r)} Q${f1(x + k * (j * 9 + r * 0.55))},${f1(y)} ${f1(x + k * j * 9)},${f1(y + r)} `; } return d; };
      if ((p.arcF || 0) > 0.3) {
        feet.forEach((f, i) => { if (f[1] < -24 || p.arcF > 0.9) md += arc(f[0] - 34, f[1] - 4, -1) + arc(f[0] + 62, f[1] - 4, 1); });
      }
      for (let i = 0; i < 2; i++) {
        const hj = tiltRot(i ? s.hipHalf : -s.hipHalf, 0);
        const hip = [pv[0] + hj[0], pv[1] + hj[1]];
        const flip = i ? p.kneeFlipF : p.kneeFlipB;
        const r = ik(hip[0], hip[1], feet[i][0], feet[i][1], s.thigh, s.shin, (a, b) => ((a[0] > b[0]) !== !!(flip > 0.5) ? a : b));
        const L = this.legs[i];
        L.thigh.set(boneT(hip, r.j));
        L.shin.set(boneT(r.j, r.end));
        L.sock.set(boneT(r.j, r.end));
        L.cuff.setAttribute('transform', boneT(r.j, r.end));
        L.shoe.setAttribute('transform', `translate(${f1(r.end[0])},${f1(r.end[1])}) rotate(${f1(feet[i][2])})`);
      }
      // torso
      const lean = p.lean + p.hipRot * 0.35;
      const puffX = 1 + p.puff * 0.35, puffY = 1 + p.puff * 0.5;
      this.tg.setAttribute('transform', `translate(${f1(pv[0])},${f1(pv[1])}) rotate(${f1(lean)}) scale(${puffX.toFixed(3)},${puffY.toFixed(3)})`);
      const toWorld = (x, y) => { const q = rot(x * puffX, y * puffY, lean); return [q[0] + pv[0], q[1] + pv[1]]; };
      const shB = toWorld(...this.torsoPts.shoulderB), shF = toWorld(...this.torsoPts.shoulderF);
      this.rip.setAttribute('display', (p.rip || 0) > 0.5 ? 'inline' : 'none');
      const pk = p.pockets || 0;
      this.pockets.forEach((P) => {
        P.pg.setAttribute('display', pk > 0.05 ? 'inline' : 'none');
        P.pg.setAttribute('transform', `translate(${P.x},${P.y}) scale(1.7,${(pk * 1.7).toFixed(2)})`);
      });
      const mo = p.moth || 0;
      if (mo > 0 && mo < 1) {
        const pw = toWorld(this.pockets[1].x, 20);
        const mx = pw[0] + 70 * Math.sin(mo * 8) + mo * 40, my = pw[1] - mo * 420;
        this.moth.setAttribute('display', 'inline');
        this.moth.setAttribute('transform', `translate(${f1(mx)},${f1(my)}) rotate(${f1(15 * Math.sin(mo * 13))}) scale(1.8)`);
        this.mothW.setAttribute('transform', `scale(1,${(0.25 + 0.75 * Math.abs(Math.sin(p.t * 38))).toFixed(2)})`);
      } else this.moth.setAttribute('display', 'none');
      shB[1] += p.shrug || 0; shF[1] += p.shrug || 0;
      const nb = toWorld(...this.torsoPts.neck);
      const neckAng = -90 + s.neckAng + lean + (p.neckRot || 0);
      const nt = [nb[0] + Math.cos(neckAng * D2R) * s.neckLen + p.headDx, nb[1] + Math.sin(neckAng * D2R) * s.neckLen + p.headDy];
      this.neck.setAttribute('transform', boneT(nt, nb).replace(/translate\([^)]*\)/, `translate(${f1(nt[0])},${f1(nt[1])})`));
      // head
      const hr = p.headRot + lean * 0.4;
      const hs = s.head.sc || 1;
      this.hg.setAttribute('transform', `translate(${f1(nt[0])},${f1(nt[1])}) rotate(${f1(hr)}) scale(${hs})`);
      this.headWorld = (x, y) => { const q = rot(x * hs, y * hs, hr); return [q[0] + nt[0], q[1] + nt[1]]; };
      this.applyFace(p, ear);
      if ((p.arcE || 0) > 0.3) {
        const a = this.headWorld(-70, -150), b = this.headWorld(60, -175);
        md += arc(a[0], a[1], -1, 2, 14) + arc(b[0], b[1], 1, 2, 14);
      }
      this.marks.setAttribute('d', '');
      this.marks.innerHTML = '';
      if (md) el('path', { d: md }, this.marks);
      // tail
      if (this.tailG) {
        const bx = pv[0] - s.waistHalf + 4, by = pv[1] + 6, sw = Math.sin(p.t * 5) * 6 + p.hipDx * 0.6;
        const ex = bx - 40 + sw, ey = by + 120;
        this.tailPath.setAttribute('d', `M${f1(bx)},${f1(by)} C${f1(bx - 40)},${f1(by + 20)} ${f1(bx - 34 + sw)},${f1(by + 70)} ${f1(ex)},${f1(ey)}`);
        this.tailFill.setAttribute('d', this.tailPath.getAttribute('d'));
        this.tuft.setAttribute('d', `M${f1(ex - 8)},${f1(ey - 12)} L${f1(ex - 26)},${f1(ey + 20)} L${f1(ex - 10)},${f1(ey + 10)} L${f1(ex - 6)},${f1(ey + 32)} L${f1(ex + 4)},${f1(ey + 12)} L${f1(ex + 18)},${f1(ey + 26)} L${f1(ex + 8)},${f1(ey - 6)} Z`);
      }
      // mouth position in body space (used for the mic hand)
      const mouthW = this.headWorld(h.mx - h.mrx * 0.15, h.my + h.mry * 1.25);
      // ---- mic arm (front)
      const chest = [shF[0] + 22, shF[1] + 118];
      const micAng = -38 + (p.micTilt || 0); // mic points up-left toward the muzzle
      const micDir = [Math.cos((micAng - 90) * D2R), Math.sin((micAng - 90) * D2R)];
      const headTarget = [mouthW[0] + 26 - micDir[0] * 74 + (p.micDx || 0), mouthW[1] + 6 - micDir[1] * 74 + (p.micDy || 0)];
      const mt = clamp(p.micT, 0, 1);
      const handM = [chest[0] + (headTarget[0] - chest[0]) * mt, chest[1] + (headTarget[1] - chest[1]) * mt];
      // mic offered to the audience: arm out, mic pointing forward
      const mOut = clamp(p.micOut || 0, 0, 1);
      handM[0] += (shF[0] + 150 - handM[0]) * mOut; handM[1] += (shF[1] - 20 - handM[1]) * mOut;
      this.poseArm(this.mic, shF, handM, 'fist', (mt > 0.5 ? micAng : micAng + 40 * (1 - mt * 2)) * (1 - mOut) + 72 * mOut, true);
      // ---- free arm
      const fa = [shB[0] + p.armX, shB[1] + p.armY];
      if (p.armFront) { if (this.free.g.parentNode !== this.layers.armFrontFree) this.layers.armFrontFree.appendChild(this.free.g); }
      else if (this.free.g.parentNode !== this.layers.armBack) this.layers.armBack.appendChild(this.free.g);
      this.poseArm(this.free, shB, fa, p.hand, p.handRot || 0, false, p);
      // straw
      const strawMouth = p.straw > 0.5;
      this.strawHead.setAttribute('display', strawMouth ? 'inline' : 'none');
      this.strawHeadOl.setAttribute('display', strawMouth ? 'inline' : 'none');
      this.free.straw.setAttribute('display', p.strawHand > 0.5 ? 'inline' : 'none');
    }

    poseArm(A, sh, target, hand, extraRot, isMic, p) {
      const s = this.s;
      const r = ik(sh[0], sh[1], target[0], target[1], s.upper, s.fore, (a, b) => (a[1] > b[1] ? a : b));
      A.upper.set(boneT(sh, r.j));
      A.fore.set(boneT(r.j, r.end));
      const ang = Math.atan2(r.end[1] - r.j[1], r.end[0] - r.j[0]) / D2R - 90;
      A.cuff.setAttribute('transform', `translate(${f1(r.end[0])},${f1(r.end[1])}) rotate(${f1(ang)}) translate(0,-8)`);
      if (isMic) {
        A.hand.setAttribute('transform', `translate(${f1(r.end[0])},${f1(r.end[1])}) rotate(${f1(ang)})`);
        // mic in world angle, anchored in the fist
        const fc = [r.end[0] + Math.cos((ang + 90) * D2R) * 18, r.end[1] + Math.sin((ang + 90) * D2R) * 18];
        A.micG.setAttribute('transform', `translate(${f1(fc[0])},${f1(fc[1])}) rotate(${f1(extraRot)}) translate(0,24)`);
        for (const k in A.shapes) A.shapes[k].setAttribute('display', k === 'fist' ? 'inline' : 'none');
      } else {
        A.hand.setAttribute('transform', `translate(${f1(r.end[0])},${f1(r.end[1])}) rotate(${f1(ang + extraRot)})`);
        for (const k in A.shapes) A.shapes[k].setAttribute('display', k === hand ? 'inline' : 'none');
      }
    }

    applyFace(p, ear) {
      const s = this.s, h = s.head;
      // ears with lag (ear = {rot, bend} offsets supplied by the caller from earlier poses)
      s.ears.forEach((e, i) => {
        const E = this.earG[i];
        const a = e.ang + ear.rot * (i ? 1 : 1.25) + (p.earDroop || 0) * (i ? 30 : 18);
        const bend = e.bend + ear.bend * (i ? 0.8 : 1.4) + (p.earDroop || 0) * 40;
        const { outer, inner } = earPaths(h.earL * (e.len || (i ? 1 : 0.94)), h.earW * (e.len ? 0.7 : 1), bend, e.blunt);
        E.o.setAttribute('d', outer);
        E.i.setAttribute('d', inner);
        E.g.setAttribute('transform', `translate(${e.x},${e.y}) rotate(${f1(a)})`);
      });
      // jaw: a pale lower lip/chin hinged back at the cheek; opening reveals a big dark mouth
      const jaw = clamp(p.jaw, 0, 1.15);
      const o = clamp(p.mouthO || 0, 0, 1);
      const R = h.mrx, Q = h.mry;
      const hx = h.mx - R * 1.15, hy = h.my + Q * 0.45 + jaw * Q * 0.45;
      const ja = jaw * (40 + o * 4);
      const L = R * (1.95 - o * 0.35);
      const w = (x, y) => { const q = rot(x, y, ja); return [q[0] + hx, q[1] + hy]; };
      const P = (a) => `${f1(a[0])},${f1(a[1])}`;
      const j0 = w(0, -4), jf = w(L, 2), jc = w(L + 10, 18), jb = w(L * 0.55, 30), jb0 = w(6, 20);
      const jawD = `M${P(j0)} L${P(jf)} C${P(w(L + 12, 4))} ${P(w(L + 10, 22))} ${P(jc)} C${P(w(L * 0.8, 32))} ${P(jb)} ${P(jb0)} Z`;
      this.jawOl.setAttribute('d', jawD);
      this.jawFl.setAttribute('d', jawD);
      const mf = [h.mx + R * (0.7 - o * 0.25), h.my + Q * 0.75];
      const mb = [h.mx - R * 0.35, h.my + Q * 0.98];
      const mD = `M${P(w(-2, -6))} L${f1(mb[0])},${f1(mb[1])} L${f1(mf[0])},${f1(mf[1])} L${P(w(L - 4, 0))} Z`;
      this.mouthOl.setAttribute('d', jaw > 0.04 ? mD : 'M0,0');
      this.mouthFl.setAttribute('d', jaw > 0.04 ? mD : 'M0,0');
      const t1 = w(L * 0.25, -2), t2 = w(L * 0.55, -16 * jaw), t3 = w(L * 0.85, -2);
      this.tongue.setAttribute('d', jaw > 0.3 ? `M${P(t1)} Q${P(t2)} ${P(t3)} Z` : 'M0,0');
      // teeth show when open or grinning
      const showTeeth = jaw > 0.12 || (p.grin || 0) > 0.5;
      this.teeth.setAttribute('display', showTeeth ? 'inline' : 'none');
      // closed-mouth smile line
      const sm = p.smile || 0;
      if (jaw <= 0.12) {
        const x0 = hx + 6, y0 = hy + 4, x1 = h.mx + h.mrx * 0.7, y1 = h.my + h.mry * 0.9;
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 + 8 + sm * 10;
        const cornerY = y0 - sm * 14 + (p.frown || 0) * 10;
        this.mouthLine.setAttribute('d', `M${f1(x0 - 6)},${f1(cornerY)} Q${f1(cx)},${f1(cy)} ${f1(x1)},${f1(y1 - 2)}`);
        this.mouthLine.setAttribute('display', 'inline');
      } else this.mouthLine.setAttribute('display', 'none');
      // eyes
      const open0 = clamp(p.eyeOpen, 0, 1.45);
      this.eyes.forEach((E, k) => {
        const r = E.r;
        const wink = p.wink || 0;
        const open = (wink > 0.5 && k === 1) || (wink < -0.5 && k === 0) ? 0.02 : open0;
        const sc = (open > 1 ? open : 1) * (p.bulge || 1);
        E.open.setAttribute('transform', `scale(${sc.toFixed(3)})`);
        if ((p.eyeHappy > 0.5 && !(wink && open > 0.08)) || open < 0.08) {
          E.open.setAttribute('display', 'none');
          E.closed.setAttribute('display', 'inline');
          E.closed.setAttribute('d', p.eyeHappy > 0.5 ? `M${-r},2 Q0,${-r * 1.1} ${r},2` : `M${-r},0 Q0,${r * 0.7} ${r},0`);
        } else {
          E.open.setAttribute('display', 'inline');
          E.closed.setAttribute('display', 'none');
          const cross = (p.cross || 0) * (k ? -1 : 1);
          const px = clamp(p.lookX + cross, -1.1, 1.1) * r * 0.45, py = clamp(p.lookY, -1, 1) * r * 0.5 + r * 0.12;
          E.pupil.setAttribute('r', f1(r * 0.42 * (p.pupil || 1)));
          E.pupil.setAttribute('cx', f1(px));
          E.pupil.setAttribute('cy', f1(py));
          const lidY = -r * 1.1 + (1 - Math.min(1, open)) * r * 2.1;
          const tilt = (p.lidTilt || 0) * r * 0.5;
          E.lid.setAttribute('d', `M${-r * 1.2},${-r * 1.4} L${r * 1.2},${-r * 1.4} L${r * 1.2},${f1(lidY + tilt)} L${-r * 1.2},${f1(lidY - tilt)} Z`);
          E.lidLine.setAttribute('d', open < 0.95 ? `M${-r * 0.9},${f1(lidY - tilt * 0.8)} L${r * 0.9},${f1(lidY + tilt * 0.8)}` : 'M0,0');
        }
        const by = -r * 1.55 - (p.brow || 0) * 9 - (k === 1 ? (p.browR || 0) * 12 : (p.browL || 0) * 12);
        const bt = (p.browTilt || 0) * (k ? 1 : -1) * 14;
        E.brow.setAttribute('transform', `translate(0,${f1(by)}) rotate(${f1(bt)})`);
      });
      const bub = p.bubble || 0;
      this.bubble.setAttribute('display', bub > 0.05 ? 'inline' : 'none');
      this.bubble.setAttribute('r', f1(6 + 30 * bub));
      this.bubble.setAttribute('cx', f1(h.mx + h.mrx * 0.62 + 10 + 22 * bub));
      // blush, tongue, sweat, tear
      this.blush.setAttribute('opacity', clamp(p.blush || 0, 0, 1).toFixed(2));
      const to = clamp(p.tongueOut || 0, 0, 1);
      if (to > 0.05) {
        const x0 = h.mx + R * 0.2, y0 = h.my + Q * 0.95, L2 = 20 + 30 * to;
        this.tongueOut.setAttribute('d', `M${f1(x0 - 12)},${f1(y0)} C${f1(x0 + L2 * 0.4)},${f1(y0 + 2)} ${f1(x0 + L2 + 6)},${f1(y0 + L2 * 0.7)} ${f1(x0 + L2 - 4)},${f1(y0 + L2 * 0.9)} C${f1(x0 + L2 - 14)},${f1(y0 + L2 * 1.1)} ${f1(x0 + 2)},${f1(y0 + 16)} ${f1(x0 - 12)},${f1(y0 + 12)} Z`);
        this.tongueOut.setAttribute('display', 'inline');
      } else this.tongueOut.setAttribute('display', 'none');
      const sw = p.sweat || 0;
      const ph = (p.t * 0.9) % 1;
      this.sweat.setAttribute('display', sw > 0.5 ? 'inline' : 'none');
      this.sweat.setAttribute('transform', `translate(${f1(h.cx - h.cr * 0.7)},${f1(h.cy - h.cr * 0.65 + ph * 26)}) scale(${(0.8 + ph * 0.3).toFixed(2)})`);
      const ph2 = (p.t * 0.9 + 0.5) % 1;
      this.sweat2.setAttribute('display', sw > 1.5 ? 'inline' : 'none');
      this.sweat2.setAttribute('transform', `translate(${f1(h.cx + h.cr * 0.35)},${f1(h.cy - h.cr * 1.05 + ph2 * 22)}) scale(${(0.7 + ph2 * 0.3).toFixed(2)})`);
      const te = p.tear || 0, ph3 = (p.t * 0.6) % 1;
      this.tear.setAttribute('display', te > 0.5 ? 'inline' : 'none');
      this.tear.setAttribute('transform', `translate(${f1(h.eye2[0] + 4)},${f1(h.eye2[1] + 22 + ph3 * 34)}) scale(1)`);
    }
  }

  DS.el = el;
  DS.INK = INK;
  DS.rot = rot;
  DS.clamp = clamp;
  DS.Donkey = Donkey;
  DS.SPECS = SPECS;
})();
