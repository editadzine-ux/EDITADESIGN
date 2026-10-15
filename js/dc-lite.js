/* Minimal renderer for the exported Edita site: turns the pre-parsed template tree into React elements. */
(function () {
  'use strict';
  var h = React.createElement;
  var HOLE = /\{\{\s*([^}]*?)\s*\}\}/g;
  var WHOLE = /^\{\{\s*([^}]*?)\s*\}\}$/;
  var ATTR_MAP = { 'class': 'className', 'for': 'htmlFor', 'tabindex': 'tabIndex', 'readonly': 'readOnly', 'maxlength': 'maxLength', 'autocomplete': 'autoComplete', 'colspan': 'colSpan', 'rowspan': 'rowSpan', 'srcset': 'srcSet', 'crossorigin': 'crossOrigin', 'xlink:href': 'xlinkHref', 'xml:space': 'xmlSpace' };

  function camel(s) { return s.replace(/[-:]([a-z])/g, function (_, c) { return c.toUpperCase(); }); }

  function literal(expr) {
    if (expr === 'true') return { ok: true, v: true };
    if (expr === 'false') return { ok: true, v: false };
    if (expr === 'null') return { ok: true, v: null };
    if (/^-?\d+(\.\d+)?$/.test(expr)) return { ok: true, v: parseFloat(expr) };
    var m = /^'(.*)'$/.exec(expr) || /^"(.*)"$/.exec(expr);
    if (m) return { ok: true, v: m[1] };
    return { ok: false };
  }

  function lookup(expr, scope) {
    var lit = literal(expr);
    if (lit.ok) return lit.v;
    var parts = expr.split('.');
    var cur = scope;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function interp(str, scope) {
    var m = WHOLE.exec(str);
    if (m) return lookup(m[1], scope);
    if (str.indexOf('{{') < 0) return str;
    return str.replace(HOLE, function (_, e) { var v = lookup(e, scope); return v == null ? '' : String(v); });
  }

  function styleObj(str) {
    var out = {};
    var depth = 0, buf = '', decls = [];
    for (var i = 0; i < str.length; i++) {
      var c = str[i];
      if (c === '(') depth++;
      else if (c === ')') depth--;
      if (c === ';' && depth === 0) { decls.push(buf); buf = ''; } else buf += c;
    }
    decls.push(buf);
    decls.forEach(function (d) {
      var k = d.indexOf(':');
      if (k < 0) return;
      var name = d.slice(0, k).trim(), val = d.slice(k + 1).trim();
      if (!name) return;
      if (name.indexOf('--') === 0) out[name] = val;
      else {
        if (name.indexOf('-webkit-') === 0) name = 'Webkit' + name.slice(8).replace(/^./, function (c) { return c.toUpperCase(); });
        out[camel(name)] = val;
      }
    });
    return out;
  }

  function props(attrs, scope, key) {
    var p = key != null ? { key: key } : {};
    for (var i = 0; i < attrs.length; i++) {
      var name = attrs[i][0], raw = attrs[i][1];
      if (name.indexOf('hint-') === 0) continue;
      var val = raw === null ? true : interp(raw, scope);
      if (name === 'style') { p.style = typeof val === 'string' ? styleObj(val) : val; continue; }
      var n = ATTR_MAP[name] || name;
      if (n === name && name.indexOf('-') > 0 && name.indexOf('data-') !== 0 && name.indexOf('aria-') !== 0) n = camel(name);
      if (n === 'value' && typeof val !== 'function') {
        p.value = val == null ? '' : val;
        continue;
      }
      p[n] = val;
    }
    return p;
  }

  function kids(nodes, scope) {
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      var r = node(nodes[i], scope, i);
      if (r === null || r === undefined || r === '') continue;
      out.push(r);
    }
    return out;
  }

  function node(n, scope, key) {
    if (typeof n === 'string') {
      var v = interp(n, scope);
      if (typeof v === 'boolean' || v == null) return null;
      return typeof v === 'object' ? null : String(v);
    }
    var tag = n[0], attrs = n[1], children = n[2];
    if (tag === 'sc-if') {
      var cond = null;
      for (var i = 0; i < attrs.length; i++) if (attrs[i][0] === 'value') cond = interp(attrs[i][1], scope);
      if (!cond) return null;
      return h.apply(null, [React.Fragment, { key: key }].concat(kids(children, scope)));
    }
    if (tag === 'sc-for') {
      var list = [], as = 'item';
      for (var j = 0; j < attrs.length; j++) {
        if (attrs[j][0] === 'list') list = interp(attrs[j][1], scope) || [];
        if (attrs[j][0] === 'as') as = attrs[j][1];
      }
      var items = [];
      for (var k = 0; k < list.length; k++) {
        var sub = Object.create(scope);
        sub[as] = list[k];
        sub.$index = k;
        items.push(h.apply(null, [React.Fragment, { key: k }].concat(kids(children, sub))));
      }
      return h.apply(null, [React.Fragment, { key: key }].concat(items));
    }
    var c = kids(children, scope);
    return h.apply(null, [tag, props(attrs, scope, key)].concat(c));
  }

  window.DCLogic = class DCLogic extends React.Component {
    render() {
      var vals = this.renderVals ? this.renderVals() : {};
      var tree = window.__DC_TREE__;
      var out = kids(tree, vals);
      return h.apply(null, [React.Fragment, null].concat(out));
    }
  };

  window.__dcMount = function (Component, defaults) {
    var root = ReactDOM.createRoot(document.getElementById('app'));
    root.render(h(Component, defaults));
  };
})();
