/* ═══════════════════════════════════════════════════════════════════
   SWTK — a SwiftUI-flavored declarative engine for HTML + JS
   Fan-made, CC BY 4.0, part of OldOS · Web Edition.
   Not affiliated with Apple Inc. Swift, SwiftUI, SF Symbols and iOS
   are trademarks of Apple Inc.

   Two ways to use it:
   1. Direct JS API (this file):  SWTK.vstack({spacing: 16}, [ SWTK.text('hi') ])
   2. Compile real SwiftUI syntax via swiftweb/swiftc.js (the SWTK playground)

   The runtime is intentionally dependency-free. Views are re-evaluated
   on state change (like SwiftUI's invalidation model) and patched
   into the DOM by full subtree replacement with focus restoration.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var uid = 0;
  var nextSid = function () { return 'sw' + (uid++); };

  var esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  /* ─── enum markers (Swift's dot-leading case literals) ─────────── */
  var e = function (name) { return { __enum: String(name) }; };
  var isEnum = function (v) { return v && typeof v === 'object' && v.__enum !== undefined; };
  var enumName = function (v) { return isEnum(v) ? v.__enum : String(v == null ? '' : v); };

  var COLORS = {
    red: '#ff3b30', orange: '#ff9500', yellow: '#ffcc00', green: '#34c759',
    mint: '#00c7be', teal: '#30b0c7', cyan: '#32ade6', blue: '#007aff',
    indigo: '#5856d6', purple: '#af52de', pink: '#ff2d55', brown: '#a2845e',
    white: '#ffffff', black: '#000000', gray: '#8e8e93', clear: 'transparent'
  };
  var resolveColor = function (v) {
    var n = enumName(v);
    if (COLORS[n]) return COLORS[n];
    return /^#|^rgb|^hsl/.test(n) ? n : '#000';
  };
  var FONT_SIZES = {
    largeTitle: 34, title: 28, title2: 22, title3: 20,
    headline: 17, subheadline: 15, body: 17, callout: 16,
    footnote: 13, caption: 12, caption2: 11
  };
  var FONT_WEIGHTS = {
    ultraLight: 200, thin: 200, light: 300, regular: 400,
    medium: 500, semibold: 600, bold: 700, heavy: 800, black: 900
  };
  var resolveFont = function (v) {
    var n = enumName(v);
    return { size: FONT_SIZES[n] || 17, weight: FONT_WEIGHTS[n] || 400, name: n };
  };
  var resolveWeight = function (v) { return FONT_WEIGHTS[enumName(v)] || 400; };
  var resolveAlignment = function (v) {
    var n = enumName(v);
    return ({ leading: 'flex-start', top: 'flex-start', trailing: 'flex-end', bottom: 'flex-end', center: 'center', firstTextBaseline: 'flex-start', lastTextBaseline: 'flex-end' })[n] || 'center';
  };
  var resolveEdge = function (v) { return enumName(v); };

  /* SF Symbol subset → text glyphs. Real browsers render both; this
     keeps a sane cross-platform fallback. */
  var SF = {
    star: '★', starFill: '★', heart: '♥', heartFill: '♥',
    checkmark: '✓', xmark: '✕', plus: '+', minus: '−',
    gear: '⚙', gearshape: '⚙', bell: '🔔', house: '🏠',
    camera: '📷', trash: '🗑', bolt: '⚡', magnifyingglass: '🔍',
    flame: '🔥', leaf: '🍃', musicNote: '♪', wifi: '≋'
  };
  var resolveSymbol = function (name) { return SF[enumName(name)] || enumName(name) || '◍'; };

  /* ─── view descriptor ──────────────────────────────────────────── */
  function Node(kind, props) {
    this.kind = kind;
    this.props = props || {};
    this.children = [];
    this.m = {};           /* modifier bag */
  }
  var mk = function (kind, props, children) {
    var n = new Node(kind, props);
    if (children) n.children = children.filter(Boolean);
    return n;
  };

  /* modifier helpers — mutate the descriptor and return it (builder style) */
  var applyMod = function (node, name, args) {
    args = args || [];
    var m = node.m;
    switch (name) {
      case 'padding': {
        var first = args[0];
        if (first === undefined) { m.pad = [14, 14, 14, 14]; break; }
        if (typeof first === 'number') { m.pad = [first, first, first, first]; break; }
        var edge = resolveEdge(first), amt = typeof args[1] === 'number' ? args[1] : 14;
        var cur = m.pad ? m.pad.slice() : [0, 0, 0, 0];
        if (edge === 'all') cur = [amt, amt, amt, amt];
        else if (edge === 'horizontal') { cur[1] = cur[3] = amt; }
        else if (edge === 'vertical') { cur[0] = cur[2] = amt; }
        else if (edge === 'top') cur[0] = amt;
        else if (edge === 'bottom') cur[2] = amt;
        else if (edge === 'leading' || edge === 'left') cur[3] = amt;
        else if (edge === 'trailing' || edge === 'right') cur[1] = amt;
        m.pad = cur; break;
      }
      case 'foregroundColor': m.color = resolveColor(args[0]); break;
      case 'background': m.bg = resolveColor(args[0]); break;
      case 'fill': m.fill = resolveColor(args[0]); break;
      case 'font': m.font = resolveFont(args[0]); break;
      case 'fontWeight': m.weight = resolveWeight(args[0]); break;
      case 'bold': m.weight = 700; break;
      case 'italic': m.italic = true; break;
      case 'cornerRadius': m.radius = args[0]; break;
      case 'opacity': m.opacity = args[0]; break;
      case 'frame': m.frame = Object.assign({}, m.frame, args[0] || {}); break;
      case 'lineLimit': m.lineClamp = args[0]; break;
      case 'shadow': { var sh = args[0]; m.shadow = (sh && typeof sh === 'object' && typeof sh.radius === 'number') ? sh.radius : (typeof sh === 'number' ? sh : 8); break; }
      case 'tint': m.tint = resolveColor(args[0]); break;
      case 'disabled': m.disabled = !!args[0]; break;
      case 'multilineTextAlignment': m.textAlign = enumName(args[0]); break;
      case 'tracking': m.tracking = args[0]; break;
      case 'onTapGesture': m.onTap = args[0]; break;
      default: break; /* unknown modifiers are ignored, not fatal */
    }
    return node;
  };
  var mod = applyMod; /* exported: SWTK.m */

  /* style composition ────────────────────────────────────────────── */
  var styleOf = function (node, extra) {
    var m = node.m, s = [];
    if (m.pad) s.push('padding:' + m.pad.map(function (v) { return v + 'px'; }).join(' '));
    if (m.color) s.push('color:' + m.color);
    if (m.bg) s.push('background:' + m.bg);
    if (m.font) { s.push('font-size:' + m.font.size + 'px'); if (!m.weight) s.push('font-weight:' + m.font.weight); }
    if (m.weight) s.push('font-weight:' + m.weight);
    if (m.italic) s.push('font-style:italic');
    if (m.radius != null) s.push('border-radius:' + m.radius + 'px');
    if (m.opacity != null) s.push('opacity:' + m.opacity);
    if (m.frame) { if (m.frame.width != null) s.push('width:' + m.frame.width + 'px'); if (m.frame.height != null) s.push('height:' + m.frame.height + 'px'); }
    if (m.lineClamp) s.push('display:-webkit-box;-webkit-line-clamp:' + m.lineClamp + ';-webkit-box-orient:vertical;overflow:hidden');
    if (m.shadow != null) s.push('box-shadow:0 ' + Math.round(m.shadow / 2) + 'px ' + m.shadow + 'px rgba(0,0,0,.35)');
    if (m.textAlign) s.push('text-align:' + ({ leading: 'left', center: 'center', trailing: 'right' }[m.textAlign] || 'left'));
    if (m.tracking != null) s.push('letter-spacing:' + m.tracking + 'px');
    if (m.onTap) s.push('cursor:pointer');
    if (extra) s.push(extra);
    return s.join(';');
  };
  var styleAttr = function (node, extra) {
    var css = styleOf(node, extra);
    return css ? ' style="' + css + '"' : '';
  };
  /* onTapGesture → reuse the [data-swtk-act] wiring (same click semantics) */
  var pushTap = function (node) { return registerAct(currentView, node.m.onTap); };
  var attrsOf = function (node, extra) {
    var out = styleAttr(node, extra);
    if (node.m.onTap && node.kind !== 'button') out += ' data-swtk-act="' + pushTap(node) + '"';
    return out;
  };

  /* renderer ─────────────────────────────────────────────────────── */
  var renderNode = function (node, out) {
    if (!node) return;
    if (Array.isArray(node)) { node.forEach(function (c) { renderNode(c, out); }); return; }
    switch (node.kind) {
      case 'group': renderNode(node.children, out); return;
      case 'text':
        out.push('<div class="swtk-text"' + attrsOf(node, 'line-height:1.25') + '>' + esc(node.props.content) + '</div>');
        return;
      case 'spacer':
        out.push('<div class="swtk-spacer" style="flex:1 1 auto;min-width:8px;min-height:8px"></div>');
        return;
      case 'vstack':
        out.push('<div class="swtk-stack"' + attrsOf(node,
          'display:flex;flex-direction:column;gap:' + (node.props.spacing != null ? node.props.spacing : 8) + 'px;align-items:' + resolveAlignment(node.props.alignment || 'center')) + '>');
        renderNode(node.children, out);
        out.push('</div>');
        return;
      case 'hstack':
        out.push('<div class="swtk-stack"' + attrsOf(node,
          'display:flex;flex-direction:row;gap:' + (node.props.spacing != null ? node.props.spacing : 8) + 'px;align-items:' + resolveAlignment(node.props.alignment || 'center')) + '>');
        renderNode(node.children, out);
        out.push('</div>');
        return;
      case 'zstack':
        out.push('<div class="swtk-zstack"' + attrsOf(node, 'position:relative;display:grid;place-items:center') + '>');
        node.children.forEach(function (c) {
          out.push('<div style="grid-area:1/1;width:100%;height:100%;display:flex;align-items:center;justify-content:center">');
          renderNode(c, out);
          out.push('</div>');
        });
        out.push('</div>');
        return;
      case 'scroll':
        out.push('<div class="swtk-scroll"' + attrsOf(node, 'overflow:auto;max-height:100%') + '>');
        renderNode(node.children, out);
        out.push('</div>');
        return;
      case 'list':
        out.push('<div class="swtk-list"' + attrsOf(node, 'background:#fff;border-radius:12px;overflow:hidden;border:1px solid rgba(0,0,0,.08)') + '>');
        node.children.forEach(function (c, i) {
          out.push('<div class="swtk-list-row" style="padding:10px 14px;' + (i ? 'border-top:1px solid rgba(60,60,67,.18);' : '') + 'color:#111;font-size:16px;background:#fff">');
          renderNode(c, out);
          out.push('</div>');
        });
        out.push('</div>');
        return;
      case 'button': {
        var disabled = node.m.disabled ? ' disabled' : '';
        var tint = node.m.tint || '#007aff';
        out.push('<button class="swtk-btn"' + disabled + attrsOf(node,
          'background:' + tint + ';color:#fff;border:none;border-radius:10px;padding:9px 22px;font-size:16px;font-weight:600;font-family:inherit;box-shadow:0 1px 2px rgba(0,0,0,.18);' + (node.m.disabled ? 'opacity:.45;' : 'cursor:pointer'))
          + ' data-swtk-act="' + node.props.actionId + '">' + esc(node.props.label) + '</button>');
        return;
      }
      case 'rectangle':
        out.push('<div class="swtk-rect"' + attrsOf(node, 'height:60px;background:' + (node.m.fill || '#8e8e93')) + '></div>');
        return;
      case 'circle':
        out.push('<div class="swtk-circle"' + attrsOf(node, 'width:60px;height:60px;border-radius:50%;background:' + (node.m.fill || '#8e8e93')) + '></div>');
        return;
      case 'image': {
        var size = node.m.font ? node.m.font.size : 28;
        out.push('<span class="swtk-symbol"' + attrsOf(node, 'font-size:' + size + 'px;line-height:1') + '>' + esc(resolveSymbol(node.props.symbol)) + '</span>');
        return;
      }
      case 'textfield':
        out.push('<input class="swtk-field" type="text" autocomplete="off" spellcheck="false" data-swtk-field="' + node.props.bindId + '" placeholder="' + esc(node.props.placeholder) + '" value="' + esc(node.props.value) + '"' + attrsOf(node,
          'width:100%;padding:9px 12px;border-radius:10px;border:1px solid rgba(60,60,67,.3);font-size:16px;font-family:inherit;background:#fff;color:#111;outline:none') + '>');
        return;
      case 'toggle': {
        var on = !!node.props.isOn;
        out.push('<button class="swtk-toggle' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" data-swtk-toggle="' + node.props.bindId + '"' + (node.m.disabled ? ' disabled' : '') + attrsOf(node, 'margin-left:auto') + '><span class="swtk-knob"></span></button>');
        return;
      }
      case 'slider':
        out.push('<input class="swtk-slider" type="range" min="' + node.props.min + '" max="' + node.props.max + '" step="0.01" value="' + node.props.value + '" data-swtk-slider="' + node.props.bindId + '"' + attrsOf(node, 'width:100%;accent-color:#007aff') + '>');
        return;
      case 'label-row': /* Toggle's built-in label row */
        out.push('<div class="swtk-label-row" style="display:flex;align-items:center;gap:12px;width:100%">');
        out.push('<span class="swtk-text" style="color:#111;font-size:16px">' + esc(node.props.label) + '</span>');
        renderNode(node.children, out);
        out.push('</div>');
        return;
      default:
        out.push('<div class="swtk-unknown">unsupported view: ' + esc(node.kind) + '</div>');
    }
  };
  var toHTML = function (node) {
    var out = [];
    renderNode(node, out);
    return out.join('');
  };

  /* ─── state cells & bindings ───────────────────────────────────── */
  var View = function () {
    this.__cells = [];
    this.__container = null;
    this.__scheduled = false;
    this.__acts = [];   /* per-render action registry */
    this.__flds = [];   /* per-render field/toggle/slider registry */
    this.__uid = 0;
  };
  View.prototype.__s = function (i, initial) {
    if (!this.__cells[i]) this.__cells[i] = { view: this, i: i, v: initial };
    return this.__cells[i];
  };
  View.prototype.__invalidate = function () {
    if (this.__scheduled) return;
    this.__scheduled = true;
    var self = this;
    var run = function () {
      self.__scheduled = false;
      if (self.__container) renderInto(self, self.__container);
    };
    if (global.requestAnimationFrame) global.requestAnimationFrame(run); else Promise.resolve().then(run);
  };
  View.prototype.body = function () { return mk('group', {}, []); };

  var set = function (cell, v) {
    if (cell.v === v) return;
    cell.v = v;
    cell.view.__invalidate();
  };
  var get = function (cell) { return cell.v; };
  var binding = function (cell) {
    return { __binding: true, get: function () { return cell.v; }, set: function (v) { set(cell, v); } };
  };

  /* action registry ──────────────────────────────────────────────── */
  var registerAct = function (view, fn) {
    view.__acts.push(fn);
    return view.__acts.length - 1;
  };
  var registerFld = function (view, entry) {
    view.__flds.push(entry);
    return view.__flds.length - 1;
  };

  /* builders used by transpiled SwiftUI ─────────────────────────── */
  var builders = {
    group: function (children) { return mk('group', {}, children); },
    text: function (content) { return mk('text', { content: content }); },
    spacer: function () { return mk('spacer'); },
    rectangle: function () { return mk('rectangle'); },
    circle: function () { return mk('circle'); },
    image: function (symbol) { return mk('image', { symbol: symbol }); },
    vstack: function (opts, children) { return mk('vstack', opts || {}, children); },
    hstack: function (opts, children) { return mk('hstack', opts || {}, children); },
    zstack: function (opts, children) { return mk('zstack', opts || {}, children); },
    scroll: function (children) { return mk('scroll', {}, children); },
    list: function (children) { return mk('list', {}, children); },
    button: function (label, onTap) {
      return mk('button', { label: label, actionId: registerAct(currentView, onTap) });
    },
    textField: function (placeholder, bind) {
      return mk('textfield', { placeholder: placeholder, value: bind.get(), bindId: registerFld(currentView, { type: 'field', bind: bind }) });
    },
    toggle: function (label, bind) {
      var t = mk('toggle', { isOn: bind.get(), bindId: registerFld(currentView, { type: 'toggle', bind: bind }) });
      return mk('label-row', { label: label }, [t]);
    },
    slider: function (bind, min, max) {
      return mk('slider', { value: bind.get(), min: min, max: max, bindId: registerFld(currentView, { type: 'slider', bind: bind }) });
    },
    forEachRange: function (start, end, fn) {
      var out = [];
      for (var i = start; i < end; i++) out.push(fn(i));
      return mk('group', {}, out);
    },
    forEach: function (list, fn) {
      var out = [];
      (list || []).forEach(function (item, i) { out.push(fn(item, i)); });
      return mk('group', {}, out);
    },
    cond: function (test, thenGroup, elseGroup) {
      return test ? thenGroup : (elseGroup || mk('group', {}, []));
    }
  };

  /* the "current view" being built — set during body evaluation so
     builders can register handlers against it */
  var currentView = null;

  /* render into container ─────────────────────────────────────────── */
  var renderInto = function (view, container) {
    var active = null;
    if (container.querySelector) {
      var f = container.querySelector('[data-swtk-field]:focus,[data-swtk-slider]:focus');
      if (f) {
        active = { id: f.getAttribute('data-swtk-field') || f.getAttribute('data-swtk-slider'), start: f.selectionStart, end: f.selectionEnd };
      }
    }
    view.__acts = [];
    view.__flds = [];
    view.__uid = 0;
    currentView = view;
    var tree;
    try { tree = view.body(); } catch (err) {
      currentView = null;
      container.innerHTML = '<div class="swtk-error">' + esc(err && err.message ? err.message : err) + '</div>';
      return;
    }
    currentView = null;
    container.innerHTML = toHTML(tree);
    /* wire actions */
    var actEls = container.querySelectorAll('[data-swtk-act]');
    for (var i = 0; i < actEls.length; i++) {
      (function (el) {
        var fn = view.__acts[+el.getAttribute('data-swtk-act')];
        if (fn) el.addEventListener('click', function () { fn(); });
      })(actEls[i]);
    }
    /* wire fields */
    var fldEls = container.querySelectorAll('[data-swtk-field]');
    for (var j = 0; j < fldEls.length; j++) {
      (function (el) {
        var entry = view.__flds[+el.getAttribute('data-swtk-field')];
        if (!entry) return;
        el.addEventListener('input', function () { entry.bind.set(el.value); });
      })(fldEls[j]);
    }
    var tEls = container.querySelectorAll('[data-swtk-toggle]');
    for (var k = 0; k < tEls.length; k++) {
      (function (el) {
        var entry = view.__flds[+el.getAttribute('data-swtk-toggle')];
        if (!entry) return;
        el.addEventListener('click', function () { entry.bind.set(!entry.bind.get()); });
      })(tEls[k]);
    }
    var sEls = container.querySelectorAll('[data-swtk-slider]');
    for (var m2 = 0; m2 < sEls.length; m2++) {
      (function (el) {
        var entry = view.__flds[+el.getAttribute('data-swtk-slider')];
        if (!entry) return;
        el.addEventListener('input', function () { entry.bind.set(parseFloat(el.value)); });
      })(sEls[m2]);
    }
    /* restore field focus after re-render */
    if (active && active.id != null) {
      var again = container.querySelector('[data-swtk-field="' + active.id + '"],[data-swtk-slider="' + active.id + '"]');
      if (again) {
        try {
          again.focus();
          if (active.start != null && again.setSelectionRange) again.setSelectionRange(active.start, active.end);
        } catch (e2) { /* not focusable — fine */ }
      }
    }
  };

  var mount = function (viewCtor, container) {
    var view = new viewCtor();
    view.__container = container;
    renderInto(view, container);
    return view;
  };

  /* CJS export (tests) + global (browser) */
  var SWTK = {
    /* API */
    View: View, mount: mount, set: set, get: get, binding: binding,
    e: e, mod: mod, m: mod, builders: builders, toHTML: toHTML,
    /* sugar that mirrors the emitted code */
    group: builders.group, text: builders.text, spacer: builders.spacer,
    rectangle: builders.rectangle, circle: builders.circle, image: builders.image,
    vstack: builders.vstack, hstack: builders.hstack, zstack: builders.zstack,
    scroll: builders.scroll, list: builders.list, button: builders.button,
    textField: builders.textField, toggle: builders.toggle, slider: builders.slider,
    forEachRange: builders.forEachRange, forEach: builders.forEach, cond: builders.cond,
    _setCurrentView: function (v) { currentView = v; }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = SWTK;
  global.SWTK = SWTK;
})(typeof window !== 'undefined' ? window : globalThis);
