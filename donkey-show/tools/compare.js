// Side-by-side check of a vector character against its reference illustration.
// node tools/compare.js <T|S> <ref.png> <out.png> '<pose json>'
const { chromium } = require('playwright');
const path = require('path');
const [, , who, ref, out, poseJson] = process.argv;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html') + '?render=1');
  await p.evaluate(() => window.__ready);
  await p.evaluate(({ who, pose }) => {
    DS.renderAt(20);
    const A = DS.actors, st = A.stage;
    for (const k of ['bg', 'lights', 'curtains']) if (st[k] && st[k].g) st[k].g.setAttribute('display', 'none');
    document.querySelectorAll('.band, .audience, .bg, .lights, .curtains').forEach((e) => e.setAttribute('display', 'none'));
    document.getElementById('sub').style.display = 'none';
    const other = who === 'T' ? A.S : A.T, me = A[who];
    other.root.setAttribute('display', 'none');
    const base = Object.assign(DS.basePose(who, 1.0), { x: 960, ground: 1000, face: who === 'T' ? 1 : -1 }, pose);
    me.apply(base, { rot: 0, bend: 0 });
    st.world.setAttribute('transform', 'translate(0,0)');
    document.body.style.background = '#fbf3e2';
    document.querySelector('#stage').style.background = '#fbf3e2';
  }, { who, pose: JSON.parse(poseJson || '{}') });
  await p.screenshot({ path: out + '.mine.png' });
  await b.close();
  const { execFileSync } = require('child_process');
  execFileSync('python3', ['-I', '-c', `
from PIL import Image
a=Image.open(${JSON.stringify(ref)}).convert('RGB').resize((1672//2*2//2,941//2)); b=Image.open(${JSON.stringify(out + '.mine.png')}).convert('RGB').resize((960,540))
b=b.resize((836,470)); W=Image.new('RGB',(836*2,470),'white'); W.paste(a,(0,0)); W.paste(b,(836,0)); W.save(${JSON.stringify(out)})`]);
})();
