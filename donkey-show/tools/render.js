#!/usr/bin/env node
/* Renders the clip frame by frame in headless Chromium and pipes PNG frames into FFmpeg.
   The song's time is the clock: frame n is drawn at t = from + n / fps, then muxed with the
   same audio span, so picture and sound stay locked.
     node tools/render.js --out out/clip.mp4 [--from 0] [--to 159.6] [--fps 30] [--audio audio/song.mp3] [--mock]
     node tools/render.js --stills 1.0,5.5,12 --outdir out/stills                                       */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const flag = (k) => args.includes('--' + k);
const root = path.resolve(__dirname, '..');
const VERT = flag('vertical');
const url = 'file://' + path.join(root, 'index.html') + '?render=1' + (flag('mock') ? '&mock=1' : '') + (VERT ? '&v=1' : '');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VERT ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto(url);
  await page.evaluate(() => window.__ready);
  const stage = await page.$('#stage');

  if (flag('check')) {
    // sample the whole clip and report frames where ears/characters leave the 1920x1080 frame
    const step = +opt('step', 0.1), to = +opt('to', 159.6);
    let bad = 0;
    for (let t = +opt('from', 0); t <= to; t += step) {
      const r = await page.evaluate((t) => { DS.renderAt(t); return DS.frameCheck(); }, t);
      for (const k of ['T', 'S']) {
        const c = r[k], issues = [];
        if (['wide', 'xwide', 'two', 'dlg'].includes(r.shot) && c.earTop < 4 && c.earR > 0 && c.earL < 1920) issues.push(`ear top ${c.earTop.toFixed(0)}`);
        if (r.shot === 'wide' && (c.left < 0 || c.right > 1920 || c.bottom > 1080)) issues.push(`body ${c.left.toFixed(0)}..${c.right.toFixed(0)} x ${c.top.toFixed(0)}..${c.bottom.toFixed(0)}`);
        if (issues.length) { bad++; console.log(t.toFixed(2), r.shot, k, issues.join(', ')); }
      }
    }
    console.log('check done, issues:', bad);
    await browser.close();
    return;
  }
  if (opt('stills')) {
    const outdir = path.resolve(opt('outdir', path.join(root, 'out', 'stills')));
    fs.mkdirSync(outdir, { recursive: true });
    for (const t of opt('stills').split(',').map(Number)) {
      await page.evaluate((t) => DS.renderAt(t), t);
      await stage.screenshot({ path: path.join(outdir, `t${t.toFixed(2).padStart(7, '0')}.png`) });
    }
    await browser.close();
    return;
  }

  const fps = +opt('fps', 30), from = +opt('from', 0), to = +opt('to', 166);
  const out = path.resolve(opt('out', path.join(root, 'out', 'clip.mp4')));
  const audio = opt('audio', path.join(root, 'audio', 'song.mp3'));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const n = Math.round((to - from) * fps);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    ...(audio && !flag('noaudio') ? ['-ss', String(from), '-t', String(to - from), '-i', audio] : []),
    '-map', '0:v', ...(audio && !flag('noaudio') ? ['-map', '1:a', '-c:a', 'aac', '-b:a', '192k'] : []),
    '-c:v', 'libx264', '-preset', opt('preset', 'medium'), '-crf', opt('crf', '18'), '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-af', 'apad', '-t', String(to - from), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const t = from + i / fps;
    await page.evaluate((t) => DS.renderAt(t), t);
    const buf = await stage.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 150 === 0) process.stdout.write(`frame ${i}/${n}  t=${t.toFixed(2)}  ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await browser.close();
  console.log('wrote', out, `(${n} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
})();
