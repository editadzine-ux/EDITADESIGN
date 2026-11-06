// Motion audit: biggest frame-to-frame jumps of key pose channels (30 fps) over the whole clip.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html') + '?render=1');
  await p.evaluate(() => window.__ready);
  const r = await p.evaluate(() => {
    const ch = DS.choreoRef, keys = ['armX', 'armY', 'micT', 'hipDx', 'hipDy', 'lean', 'headRot', 'fBx', 'fBy', 'fFx', 'fFy', 'dx', 'y'];
    const out = {};
    for (const mode of ['rawPose', 'pose']) {
      let pops = 0, worst = 0, where = '';
      for (const id of ['T', 'S']) {
        let a = null, b = null;
        for (let f = 0; f < 166 * 30; f++) {
          const t = f / 30, q = ch[mode](id, t);
          if (a && b) for (const k of keys) {
            const acc = Math.abs(q[k] - 2 * b[k] + a[k]);   // second difference: sudden change of velocity
            if (acc > 18) pops++;
            if (acc > worst) { worst = acc; where = id + ' ' + k + ' @' + t.toFixed(2); }
          }
          a = b; b = q;
        }
      }
      out[mode] = { pops, worst: Math.round(worst), where };
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 0));
  await b.close();
})();
