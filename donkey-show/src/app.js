/* Player: audio is the master clock (play/pause/seek/replay), camera shots, Hebrew RTL subtitles,
   timeline editor (line times, speakers, tap-to-time), and a headless render hook (DS.renderAt). */
(function () {
  const DS = window.DS;
  const params = new URLSearchParams(location.search);
  const RENDER = params.has('render');
  // vertical 9:16 master for phones (?v=1): same animation, every shot re-framed for a 1080x1920 frame
  const VERT = params.has('v');
  const FW = VERT ? 1080 : 1920, FH = VERT ? 1920 : 1080;
  if (VERT) {
    document.body.classList.add('vert');
    document.getElementById('svg').setAttribute('viewBox', `0 0 ${FW} ${FH}`);
  }
  const STORE = 'donkey-show-timing-v7';
  const $ = (s) => document.querySelector(s);

  // ---------- data ----------
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let data = clone(DS.DEFAULT_DATA);
  if (!RENDER) {
    try { const s = localStorage.getItem(STORE); if (s) data = Object.assign(clone(DS.DEFAULT_DATA), JSON.parse(s)); } catch (e) { /* storage unavailable */ }
  }
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (e) { } };
  const choreo = new DS.Choreo(data);
  DS.choreoRef = choreo;
  const refresh = () => { data.cues.sort((a, b) => a.start - b.start); data.shots.sort((a, b) => a.t - b.t); choreo.setData(data); save(); };

  // strip niqqud/cantillation for display (the pointed source text is kept untouched)
  const plain = (s) => s.replace(/[֑-ׇֽֿׁׂׅׄ]/g, '');

  // ---------- vocal envelope (mouth driver) ----------
  let env = null, envFps = 60, envSource = 'none';
  function useBundledEnvelope() {
    const s = DS.VOCAL_ENV.data; env = new Float32Array(s.length);
    for (let i = 0; i < s.length; i++) env[i] = (s.charCodeAt(i) - 48) / 63;
    envFps = DS.VOCAL_ENV.fps; envSource = 'bundled';
  }
  DS.envelope = (t) => {
    if (!env || mockMouths) return null;
    const x = t * envFps, i = Math.floor(x);
    if (i < 0 || i >= env.length - 1) return 0;
    return env[i] + (env[i + 1] - env[i]) * (x - i);
  };
  let mockMouths = false;

  // ---------- stage ----------
  const svg = $('#svg');
  const stage = DS.buildStage(svg);
  const T = new DS.Donkey('T', stage.actors);
  const S = new DS.Donkey('S', stage.actors);
  const sub = $('#sub');
  const badge = $('#badge');
  const credit = $('#credit');
  const title = $('#title');

  // ---------- camera: static framings, framings that track faces/hands, and animated moves ----------
  const SHOTS = {
    wide: { s: 1.0, cx: 960, cy: 540 },
    xwide: { s: 1.0, cx: 960, cy: 540 },
    curtain: { s: 1.35, cx: 960, cy: 520 },
    two: { s: 1.15, cx: 970, cy: 470 },
    dlg: { s: 1.4, cx: 975, cy: 400 },
    cuT: { s: 1.5, cx: 740, cy: 410 },
    cuS: { s: 1.95, cx: 1345, cy: 515 },
    cuBass: { s: 2.2, cx: 440, cy: 650 },
    cuGuit: { s: 2.1, cx: 1650, cy: 660 },
    feet: { s: 1.6, cx: 965, cy: 770 },
    turtle: { s: 2.7, cx: 1772, cy: 700 },
    band: { s: 1.5, cx: 1500, cy: 700 },
    audience: { s: 1.0, cx: 960, cy: 2940 },
    cuDrum: { s: 2.5, cx: 946, cy: 680 },
  };
  const D = { rip: 2.5, faceT: 2.2, faceS: 2.4, xfaceT: 3.3, xfaceS: 3.5, guitFace: 3.0, fret: 3.0, guit: 1.9 };
  let marks = {};
  const ctmPoint = (node, x, y) => { const m = node.getCTM(); return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]; };
  function measure(pT, pS) {
    // called with the world transform reset, so CTMs are in world space
    const hb = (Dk, p, rest) => {
      const b = Dk.hg.getBBox(), c = ctmPoint(Dk.hg, b.x + b.width * 0.5, b.y + b.height * 0.55);
      return [c[0] * 0.6 + (p.x + p.dx + p.face * 80) * 0.4, c[1] * 0.55 + rest * 0.45];
    };
    marks.faceT = hb(T, pT, 300); marks.faceS = hb(S, pS, 470);
    const g = stage.orch.guitar;
    marks.guitFace = ctmPoint(g.headWrap, 0, -10);
    marks.fret = ctmPoint(g.armF.end, 0, 0);
    marks.guit = ctmPoint(g.torso, 0, -150);
    marks.rip = ctmPoint(S.tg, -50, -40);
    marks.xT = pT.x + (pT.dx || 0); marks.xS = pS.x + (pS.dx || 0);
  }
  function framing(k) {
    if (SHOTS[k]) return SHOTS[k];
    const key = k.replace(/^x(face[TS])$/, '$1');
    const m = marks[key] || [960, 540];
    const sc = D[k] || 2.2;
    // keep faces in the upper part of the frame so subtitles never cover a mouth
    const lift = /face/.test(k) ? 150 / sc : 0;
    return { s: sc, cx: m[0], cy: m[1] + lift - (k.startsWith('x') ? 0 : 20) };
  }
  // vertical re-framing: two-shots fit both donkeys across the narrow frame, dialogue follows the speaker,
  // close-ups keep their framing (they simply show less to the sides and more above and below)
  const FIT = { wide: [190, 600, 1.0], xwide: [200, 600, 0.95], two: [175, 540, 1.05], feet: [125, 800, 1.2], curtain: null };
  function vert(f, k, t) {
    if (!VERT || !f) return f;
    if (k === 'dlg') {
      const c = choreo.anyActive(t);
      if (c && c.who !== 'both') return vert(framing(c.who === 'T' ? 'faceT' : 'faceS'), 'face', t);
      k = 'two';
    }
    const F = FIT[k];
    if (F) {
      const a = marks.xT || 680, b = marks.xS || 1265, span = Math.abs(b - a) + 2 * F[0];
      const sc = Math.max(F[2], Math.min(1.7, FW / span));
      return { s: sc, cx: (a + b) / 2 + 10, cy: F[1] };
    }
    if (k === 'face' || /^(x?face[TS]|cuT|cuS)$/.test(k)) return { s: f.s * 0.95, cx: f.cx, cy: f.cy + 60 / f.s };
    return f;
  }
  const EASE = { io: (u) => u * u * (3 - 2 * u), out: (u) => 1 - Math.pow(1 - u, 3), in: (u) => u * u * u, lin: (u) => u };
  const camState = { idx: -1, t: -1, cx: 0, cy: 0 };
  function camera(t) {
    const shots = data.shots;
    let cur = shots[0];
    for (const sh of shots) if (t >= sh.t) cur = sh;
    let f = vert(framing(cur.k), cur.k, t);
    if (cur.to) {
      const u = (EASE[cur.e || 'io'])(Math.max(0, Math.min(1, (t - cur.t) / (cur.d || 1))));
      const g = vert(framing(cur.to), cur.to, t);
      f = { s: Math.exp(Math.log(f.s) + (Math.log(g.s) - Math.log(f.s)) * u), cx: f.cx + (g.cx - f.cx) * u, cy: f.cy + (g.cy - f.cy) * u };
    }
    let sc = f.s;
    if (cur.pulse) sc *= 1 + 0.018 * Math.pow(Math.abs(Math.cos(Math.PI * choreo.beat(t))), 10);
    // slow push-in during a held shot so the frame breathes (never on moves or the end card)
    const idx = shots.indexOf(cur), next = shots[idx + 1], dur = (next ? next.t : (data.duration || 166)) - cur.t;
    if (!cur.to && cur.k !== 'curtain') sc *= 1 + 0.035 * Math.min(1, (t - cur.t) / Math.max(1.5, dur));
    // tracked framings follow the subject with a little lag (operator feel), reset on every cut or seek
    let cx = f.cx, cy = f.cy;
    const tracked = !SHOTS[cur.k] || (cur.to && !SHOTS[cur.to]);
    if (tracked && camState.idx === idx && t > camState.t && t - camState.t < 0.12) {
      const al = 1 - Math.exp(-(t - camState.t) / 0.14);
      cx = camState.cx + (cx - camState.cx) * al; cy = camState.cy + (cy - camState.cy) * al;
    }
    camState.idx = idx; camState.t = t; camState.cx = cx; camState.cy = cy;
    return { s: sc, cx, cy, k: cur.to && t - cur.t < (cur.d || 1) ? 'move' : cur.to || cur.k };
  }
  DS.camera = camera;

  function earLag(id, t) {
    if (DS.SPRITES) return { rot: 0, bend: 0 }; // drawn heads: ears are part of the drawing
    const a = choreo.pose(id, t), b = choreo.pose(id, t - 0.07), c = choreo.pose(id, t - 0.14);
    const hy = (p) => p.y + p.hipDy + p.headDy, hr = (p) => p.headRot + p.lean;
    const dy = (hy(a) - hy(b)) * 0.9 + (hy(b) - hy(c)) * 0.5;
    const dr = (hr(a) - hr(b)) * 1.2 + (hr(b) - hr(c)) * 0.6;
    return { rot: -dr * 1.4 + dy * 0.35 + Math.sin(t * 2.1 + (id === 'T' ? 0 : 1)) * 1.5, bend: dy * 0.6 - dr * 0.8 };
  }

  let lastSub = null;
  let lastT = 0;
  function renderAt(t) {
    lastT = t;
    const pT = choreo.pose('T', t), pS = choreo.pose('S', t);
    T.apply(pT, earLag('T', t));
    S.apply(pS, earLag('S', t));
    DS.poseStage(stage, choreo.stage(t));
    DS.poseOrchestra(stage.orch, choreo.orchestra(t));
    stage.world.removeAttribute('transform');
    measure(pT, pS);
    const sh = camera(t);
    stage.world.setAttribute('transform', `translate(${FW / 2},${FH / 2}) scale(${sh.s.toFixed(4)}) translate(${(-sh.cx).toFixed(1)},${(-sh.cy).toFixed(1)})`);
    // subtitles: the current line, or keep the previous one briefly across tiny gaps
    let c = choreo.anyActive(t);
    if (!c) for (const q of data.cues) if (t > q.end && t < q.end + 0.35) c = q;
    const txt = c ? plain(c.text) : '';
    if (txt !== lastSub) { sub.textContent = txt; sub.style.opacity = txt ? 1 : 0; lastSub = txt; }
    // opening title on the closed curtain: fades and settles in, line by line, gone before the curtain moves
    { const op = data.markers.open, cl = (x) => Math.max(0, Math.min(1, x)), ez = (u) => u * u * (3 - 2 * u);
      const a1 = ez(cl((t - 0.25) / 0.6)), a2 = ez(cl((t - 0.75) / 0.6)), out = 1 - ez(cl((t - (op - 0.55)) / 0.45));
      title.style.opacity = (Math.max(a1, 0) * out).toFixed(3);
      title.style.transform = `translate(-50%, -50%) scale(${(0.97 + 0.03 * a1 + 0.012 * cl(t / op)).toFixed(4)})`;
      title.children[1].style.width = (420 * a2) + 'px';
      title.children[2].style.opacity = a2.toFixed(3); }
    const ct = data.musicEnd + 3.15, co = Math.max(0, Math.min(1, (t - ct) / 0.8));
    credit.style.opacity = co.toFixed(3);
    credit.style.transform = `translate(-50%, -50%) scale(${(0.96 + 0.04 * co).toFixed(3)})`;
  }
  DS.renderAt = renderAt;
  DS.actors = { T, S, stage };
  // QA: where are the ears / whole characters on screen right now?
  DS.frameCheck = () => {
    const out = { shot: camera(lastT).k };
    for (const [k, d] of [['T', T], ['S', S]]) {
      const ears = d.sprite && d.sprite.cur ? [d.sprite.imgs[d.sprite.cur].getBoundingClientRect()] : d.earG.map((e) => e.o.getBoundingClientRect());
      const body = d.root.getBoundingClientRect();
      out[k] = { earTop: Math.min(...ears.map((r) => r.top)), earL: Math.min(...ears.map((r) => r.left)), earR: Math.max(...ears.map((r) => r.right)),
        top: body.top, left: body.left, right: body.right, bottom: body.bottom };
    }
    return out;
  };
  DS.data = () => data;

  if (RENDER) {
    document.body.classList.add('render');
    useBundledEnvelope();
    if (params.has('mock')) { mockMouths = true; badge.hidden = false; }
    renderAt(parseFloat(params.get('t') || '0'));
    const imgs = Array.from(document.querySelectorAll('image')).map((im) => new Promise((res) => { const i = new Image(); i.onload = i.onerror = res; i.src = im.getAttribute('href'); }));
    window.__ready = Promise.all([document.fonts.ready, ...imgs]).then(() => new Promise((r) => setTimeout(() => r(true), 300)));
    return;
  }

  // ---------- audio clock ----------
  const audio = $('#audio');
  let haveAudio = false, demoClock = { playing: false, base: 0, t0: 0 };
  const DUR = () => Math.max(haveAudio && isFinite(audio.duration) ? audio.duration : 0, data.duration || 90);
  const tail = { on: false, t0: 0 };
  const now = () => (haveAudio ? (tail.on ? Math.min(DUR(), audio.duration + (performance.now() - tail.t0) / 1000) : audio.currentTime) : demoClock.playing ? demoClock.base + (performance.now() - demoClock.t0) / 1000 : demoClock.base);
  const playing = () => (haveAudio ? !audio.paused || tail.on : demoClock.playing);
  audio.addEventListener('ended', () => { tail.on = true; tail.t0 = performance.now(); });

  function setStatus(msg) { $('#status').textContent = msg; }
  function setMode() {
    badge.hidden = haveAudio && !mockMouths;
    $('#modeNote').textContent = haveAudio
      ? (envSource === 'bundled' ? 'שיר מצורף · תנועות פה לפי ערוץ השירה שהופרד מהשיר' : 'קובץ שנטען · תנועות פה לפי עוצמת המיקס — יש לכוונן זמני שורות')
      : 'תצוגת ניסיון אילמת — תזמונים ותנועות פה להמחשה בלבד';
  }

  audio.addEventListener('loadedmetadata', () => { haveAudio = true; setMode(); drawTimeline(); setStatus(`אודיו נטען · ${fmt(audio.duration)}`); });
  audio.addEventListener('error', () => { if (!haveAudio) { setStatus('לא נמצא קובץ שיר — מצב תצוגה אילמת'); setMode(); } });
  useBundledEnvelope();
  audio.src = 'audio/song.mp3';

  $('#file').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    audio.src = URL.createObjectURL(f);
    setStatus('מחשב מעטפת עוצמה מהקובץ…');
    try {
      const buf = await f.arrayBuffer();
      const ac = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100, 44100);
      const ab = await ac.decodeAudioData(buf);
      const ch = ab.getChannelData(0), hop = Math.floor(ab.sampleRate / 60), n = Math.floor(ch.length / hop);
      const db = new Float32Array(n);
      for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < hop; j++) { const v = ch[i * hop + j]; s += v * v; } db[i] = 10 * Math.log10(s / hop + 1e-10); }
      const sorted = Array.from(db).sort((a, b) => a - b), hi = sorted[Math.floor(n * 0.97)], lo = hi - 18;
      env = db.map((v) => Math.max(0, Math.min(1, (v - lo) / (hi - lo)))); envFps = 60; envSource = 'file';
      setMode(); setStatus(`נטען: ${f.name}. זמני השורות עדיין של השיר המקורי — אפשר למתוח או לתזמן בהקשה.`);
    } catch (err) { setStatus('לא הצלחתי לפענח את הקובץ: ' + err.message); }
  });

  function play() {
    if (haveAudio) audio.play();
    else { demoClock.t0 = performance.now(); demoClock.playing = true; }
  }
  function pause() {
    if (tail.on) { tail.on = false; return; }
    if (haveAudio) audio.pause();
    else { demoClock.base = now(); demoClock.playing = false; }
  }
  function seek(t) {
    t = Math.max(0, Math.min(DUR(), t));
    tail.on = false;
    if (haveAudio) audio.currentTime = Math.min(t, audio.duration || t); else { demoClock.base = t; demoClock.t0 = performance.now(); }
  }
  $('#play').onclick = play;
  $('#pause').onclick = pause;
  $('#replay').onclick = () => { seek(0); play(); };
  $('#mock').onchange = (e) => { mockMouths = e.target.checked; setMode(); };

  const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;

  // ---------- timeline strip ----------
  const tl = $('#tl'), tctx = tl.getContext('2d');
  const COL = { T: '#6c9f98', S: '#e2ae45', both: '#b98aa0' };
  function drawTimeline() {
    const W = (tl.width = tl.clientWidth * devicePixelRatio), H = (tl.height = 64 * devicePixelRatio), d = DUR();
    tctx.clearRect(0, 0, W, H);
    tctx.fillStyle = '#efe4d2'; tctx.fillRect(0, 0, W, H);
    // beat ticks per bar
    tctx.fillStyle = '#d8cab3';
    for (let b = 0; ; b += 4) { const x = ((data.beat0 + (b * 60) / data.bpm) / d) * W; if (x > W) break; tctx.fillRect(x, 0, 1, H); }
    for (const c of data.cues) {
      tctx.fillStyle = COL[c.who];
      const x0 = (c.start / d) * W, x1 = (c.end / d) * W;
      tctx.fillRect(x0, c.kind === 'sing' ? 8 * devicePixelRatio : 26 * devicePixelRatio, Math.max(2, x1 - x0), 16 * devicePixelRatio);
    }
    tctx.fillStyle = '#2b2522';
    for (const s of data.shots) { const x = (s.t / d) * W; tctx.fillRect(x, 46 * devicePixelRatio, 2, 14 * devicePixelRatio); }
    const px = (now() / d) * W; tctx.fillStyle = '#c0392b'; tctx.fillRect(px - 1, 0, 3, H);
  }
  tl.addEventListener('pointerdown', (e) => { const r = tl.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * DUR()); });

  // ---------- cue editor ----------
  const tbody = $('#cues tbody');
  let activeRow = null;
  function buildEditor() {
    tbody.innerHTML = '';
    data.cues.forEach((c, i) => {
      const tr = document.createElement('tr'); tr.dataset.i = i;
      tr.innerHTML = `<td class="id">${c.id}</td>
        <td><select>${['T', 'S', 'both'].map((w) => `<option value="${w}" ${w === c.who ? 'selected' : ''}>${{ T: 'גבוה', S: 'נמוך', both: 'שניהם' }[w]}</option>`).join('')}</select></td>
        <td><input type="number" step="0.01" class="st" value="${c.start.toFixed(2)}"></td>
        <td><input type="number" step="0.01" class="en" value="${c.end.toFixed(2)}"></td>
        <td class="tx" dir="rtl">${plain(c.text)}</td>
        <td class="btns"><button class="go" title="קפוץ לשורה">▶</button><button class="setS" title="התחלה = עכשיו">⇤</button><button class="setE" title="סיום = עכשיו">⇥</button></td>`;
      const sel = tr.querySelector('select');
      sel.onchange = () => { c.who = sel.value; refresh(); drawTimeline(); };
      tr.querySelector('.st').onchange = (e) => { c.start = +e.target.value; refresh(); drawTimeline(); };
      tr.querySelector('.en').onchange = (e) => { c.end = +e.target.value; refresh(); drawTimeline(); };
      tr.querySelector('.go').onclick = () => seek(c.start - 0.5);
      tr.querySelector('.setS').onclick = () => { c.start = +now().toFixed(2); refresh(); buildEditor(); drawTimeline(); };
      tr.querySelector('.setE').onclick = () => { c.end = +now().toFixed(2); refresh(); buildEditor(); drawTimeline(); };
      tbody.appendChild(tr);
    });
    $('#bpm').value = data.bpm; $('#beat0').value = data.beat0;
    $('#adv').value = JSON.stringify({ markers: data.markers, shots: data.shots, musicEnd: data.musicEnd }, null, 1);
  }
  $('#bpm').onchange = (e) => { data.bpm = +e.target.value; refresh(); drawTimeline(); };
  $('#beat0').onchange = (e) => { data.beat0 = +e.target.value; refresh(); drawTimeline(); };
  $('#applyAdv').onclick = () => {
    try { const o = JSON.parse($('#adv').value); Object.assign(data, o); refresh(); drawTimeline(); setStatus('עודכן'); }
    catch (e) { setStatus('JSON לא תקין: ' + e.message); }
  };
  $('#stretch').onclick = () => {
    if (!haveAudio) return setStatus('צריך קודם לטעון אודיו');
    const last = Math.max(...data.cues.map((c) => c.end)), k = (audio.duration * 0.97) / last;
    data.cues.forEach((c) => { c.start = +(c.start * k).toFixed(2); c.end = +(c.end * k).toFixed(2); });
    data.shots.forEach((s) => (s.t = +(s.t * k).toFixed(2)));
    for (const key of ['open', 'inhale']) data.markers[key] = +(data.markers[key] * k).toFixed(2);
    if (data.markers.instr) data.markers.instr = data.markers.instr.map(([a, b]) => [+(a * k).toFixed(2), +(b * k).toFixed(2)]);
    data.musicEnd = +(audio.duration - 0.3).toFixed(2);
    refresh(); buildEditor(); drawTimeline(); setStatus(`הזמנים נמתחו פי ${k.toFixed(3)} — מומלץ לכוונן בהקשה`);
  };
  $('#reset').onclick = () => { if (!confirm('לחזור לזמנים המקוריים?')) return; data = clone(DS.DEFAULT_DATA); choreo.setData(data); save(); buildEditor(); drawTimeline(); };
  $('#export').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
    a.download = 'donkey-show-timing.json'; a.click();
  };
  $('#import').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { data = Object.assign(clone(DS.DEFAULT_DATA), JSON.parse(await f.text())); refresh(); buildEditor(); drawTimeline(); setStatus('תזמון יובא'); }
    catch (err) { setStatus('קובץ לא תקין'); }
  };

  // tap timing: J = next line starts now, K = current line ends now
  let tapIdx = 0;
  $('#tap').onchange = (e) => { tapIdx = 0; for (let i = 0; i < data.cues.length; i++) if (data.cues[i].start < now()) tapIdx = i + 1; setStatus(e.target.checked ? `מצב הקשה פעיל · J = התחלת שורה ${data.cues[tapIdx] ? data.cues[tapIdx].id : '-'}, K = סיום השורה הנוכחית` : ''); };
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'Space') { e.preventDefault(); playing() ? pause() : play(); }
    if (!$('#tap').checked) return;
    const t = +now().toFixed(2);
    if (e.key === 'j' || e.key === 'J' || e.key === 'ח') {
      const c = data.cues[tapIdx]; if (!c) return;
      const len = c.end - c.start; c.start = t; c.end = t + len;
      const prev = data.cues[tapIdx - 1]; if (prev && prev.end > t) prev.end = +(t - 0.05).toFixed(2);
      tapIdx++; choreo.setData(data); save(); buildEditor(); drawTimeline();
      setStatus(`${c.id} ← ${fmt(t)} · הבאה: ${data.cues[tapIdx] ? data.cues[tapIdx].id : '—'}`);
    }
    if (e.key === 'k' || e.key === 'K' || e.key === 'ל') {
      const c = data.cues[tapIdx - 1]; if (!c) return; c.end = t; choreo.setData(data); save(); buildEditor(); drawTimeline();
    }
  });

  // ---------- fit + loop ----------
  function fit() {
    const wrap = $('#stageWrap'), w = wrap.clientWidth;
    $('#stage').style.transform = `scale(${w / FW})`;
    wrap.style.height = (FH * w) / FW + 'px';
    drawTimeline();
  }
  window.addEventListener('resize', fit);
  const scrub = $('#scrub');
  let scrubbing = false;
  scrub.addEventListener('input', () => { scrubbing = true; seek((scrub.value / 1000) * DUR()); });
  scrub.addEventListener('change', () => (scrubbing = false));
  let lastDraw = 0;
  function loop(ts) {
    const t = now();
    if (!haveAudio && demoClock.playing && t >= DUR()) pause();
    renderAt(t);
    if (!scrubbing) scrub.value = Math.round((t / DUR()) * 1000);
    $('#time').textContent = `${fmt(t)} / ${fmt(DUR())}`;
    if (ts - lastDraw > 100) {
      drawTimeline(); lastDraw = ts;
      const c = choreo.anyActive(t);
      if (c !== activeRow) {
        tbody.querySelectorAll('tr.on').forEach((r) => r.classList.remove('on'));
        if (c) { const r = tbody.querySelector(`tr[data-i="${data.cues.indexOf(c)}"]`); if (r) r.classList.add('on'); }
        activeRow = c;
      }
    }
    requestAnimationFrame(loop);
  }
  buildEditor(); setMode(); fit(); requestAnimationFrame(loop);
})();
