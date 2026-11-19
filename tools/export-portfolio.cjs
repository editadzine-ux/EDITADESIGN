// Regenerate the WordPress seed and server-rendered fragments from the static portfolio.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const dest = path.join(root, 'wordpress/portfolio');
fs.mkdirSync(dest, {recursive:true});
const source = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const catalogue = vm.runInNewContext(source.match(/this\._P = (?:catalogue \?\? )?(\[[\s\S]*?\n    \]);/)[1]);
fs.writeFileSync(path.join(dest, 'seed.json'), JSON.stringify(catalogue,null,2)+'\n');
const tree = JSON.parse(source.split('\n',1)[0].slice('window.__DC_TREE__ = '.length,-1));
const fragments = {};
function collect(nodes) {
  for (const n of nodes) if (Array.isArray(n)) {
    const attrs=Object.fromEntries(n[1]);
    if (attrs.class==='ix') fragments.index=n;
    if (attrs.class==='lg-track') fragments.logos=n;
    if (attrs.class==='cs' && attrs.role==='dialog') fragments.case=n;
    collect(n[2]);
  }
}
collect(tree);
function variable(key) {
  const [scope,...fields]=key.trim().split('.');
  if (!/^\w+$/.test(scope)||fields.some(f=>!/^\w+$/.test(f))) throw new Error(key);
  return '$'+scope+fields.map(f=>"['"+f+"']").join('');
}
const holes=/\{\{\s*([\w.]+)\s*\}\}/g;
function printValue(text,attribute) {
  const escape=attribute?'esc_attr':'esc_html';
  return text.replace(holes,(_,v)=>'<?php echo '+escape+'('+variable(v)+'); ?>');
}
function compile(n) {
  if(typeof n==='string') return printValue(n,false);
  const [tag,attrs,children]=n;
  const a=Object.fromEntries(attrs);
  const content=children.map(compile).join('');
  if(tag==='sc-if') return '<?php if ('+variable(a.value.slice(2,-2))+') : ?>'+content+'<?php endif; ?>';
  if(tag==='sc-for') return '<?php foreach ('+variable(a.list.slice(2,-2))+' as '+variable(a.as)+') : ?>'+content+'<?php endforeach; ?>';
  const attributes=attrs.filter(([k])=>k!=='ref'&&!k.startsWith('on')&&!k.startsWith('hint-')).map(([k,v])=>' '+(k==='tabIndex'?'tabindex':k)+'="'+printValue(v??'',true)+'"').join('');
  return '<'+tag+attributes+'>'+content+(['img','br','input','source'].includes(tag)?'':'</'+tag+'>');
}
for(const [name,node] of Object.entries(fragments)) fs.writeFileSync(path.join(dest,name+'-view.php'),"<?php defined( 'ABSPATH' ) || exit; /* Generated from the public case template. */ ?>\n"+compile(node)+'\n');
