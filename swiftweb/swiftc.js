/* ═══════════════════════════════════════════════════════════════════
   SwiftC-for-SWTK — transpiles a readable SwiftUI subset into JS that
   drives swtk.js. Hand-written recursive-descent, zero dependencies.

   SUPPORTED
   ───────
   struct Name: View { ... }                only one View in file (top-level)
   @State private var x = <literal>         Int, Double, String, Bool, Array
   let name = <expr>                        member constant (arrays allowed)
   var body: some View { <view> }           exactly one body
   VStack / HStack / ZStack / Group / ScrollView / List
     (alignment:/spacing: named args)
   Text("… \(interp) …")
   Button("…") { <stmts> }
   Image(systemName: "…")
   Spacer() / Rectangle() / Circle()
   TextField("…", text: $bind) / Toggle("…", isOn: $bind)
   Slider(value: $bind, in: 0...1)
   ForEach(a..<b) { i in <views> }          ForEach(collection) { item in … }
                                               ForEach(collection) { index, item in … }
   if <expr> { <views> } else if … else { <views> }
   let x = <expr>                           local constant inside a builder
   Modifiers: padding(…) foregroundColor background fill font fontWeight
     bold italic cornerRadius frame opacity shadow tint disabled tracking
     multilineTextAlignment lineLimit onTapGesture{…}
   Expressions: ternary, && || ! == != < <= > >= + - * / %, parens,
     array literals, string interpolation, Int() Double() String() abs()
     min() max(), member access on known members, Color.<name>
   Statements:  x = e  x += e  x -= e  x *= e  x /= e  flag.toggle()

   NOT SUPPORTED (by design — compiler errors, never silent miscompiles)
   @ObservedObject · @Binding · custom View structs nested in body ·
   NavigationStack · .sheet/.alert · animations · protocols other than View
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  /* ───────── lexer ───────── */
  var KEYWORDS = {}; /* contextual — parser disambiguates */
  var OPS = ['..<', '...', '->', '&&', '||', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%'];

  var lex = function (src) {
    var tokens = [], i = 0, line = 1, n = src.length;
    var isIdStart = function (c) { return /[A-Za-z_]/.test(c); };
    var isIdPart = function (c) { return /[A-Za-z0-9_]/.test(c); };
    while (i < n) {
      var c = src[i];
      if (c === '\n') { line++; i++; continue; }
      if (/\s/.test(c)) { i++; continue; }
      /* comments */
      if (src.startsWith('//', i)) { while (i < n && src[i] !== '\n') i++; continue; }
      if (src.startsWith('/*', i)) {
        var depth = 1; i += 2;
        while (i < n && depth > 0) {
          if (src.startsWith('/*', i)) { depth++; i += 2; }
          else if (src.startsWith('*/', i)) { depth--; i += 2; }
          else { if (src[i] === '\n') line++; i++; }
        }
        continue;
      }
      /* string literal with interpolation segments */
      if (c === '"') {
        var segs = [], buf = '', j = i + 1;
        while (j < n) {
          var sc = src[j];
          if (sc === '\\') {
            var nx = src[j + 1];
            if (nx === 'n') buf += '\n'; else if (nx === 't') buf += '\t';
            else if (nx === '"') buf += '"'; else if (nx === '\\') buf += '\\';
            else if (nx === '(') { /* interpolation — find matching paren */
              segs.push({ t: 'lit', v: buf }); buf = '';
              var depth2 = 1, k = j + 2, code = '';
              while (k < n && depth2 > 0) {
                var cc = src[k];
                if (cc === '(') depth2++;
                else if (cc === ')') { depth2--; if (depth2 === 0) break; }
                if (cc === '\n') line++;
                code += cc; k++;
              }
              segs.push({ t: 'code', v: code });
              j = k + 1; continue;
            } else buf += nx;
            j += 2; continue;
          }
          if (sc === '"') break;
          if (sc === '\n') line++;
          buf += sc; j++;
        }
        if (j >= n) throw err('Unterminated string literal', line);
        segs.push({ t: 'lit', v: buf });
        tokens.push({ t: 'str', segs: segs, line: line });
        i = j + 1; continue;
      }
      /* numbers */
      if (/[0-9]/.test(c)) {
        var num = /[0-9]+(\.[0-9]+)?/.exec(src.slice(i))[0];
        tokens.push({ t: 'num', v: num, line: line });
        i += num.length; continue;
      }
      /* identifiers / keywords */
      if (isIdStart(c)) {
        var m = /[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
        tokens.push({ t: 'ident', v: m[0], line: line });
        i += m[0].length; continue;
      }
      /* operators (longest match) */
      var op = null;
      for (var o = 0; o < OPS.length; o++) if (src.startsWith(OPS[o], i)) { op = OPS[o]; break; }
      if (op) { tokens.push({ t: 'op', v: op, line: line }); i += op.length; continue; }
      if ('+-*/%=<>!&|?:.,;()[]{}@$'.indexOf(c) !== -1) {
        tokens.push({ t: 'punct', v: c, line: line }); i++; continue;
      }
      throw err('Unexpected character "' + c + '"', line);
    }
    tokens.push({ t: 'eof', line: line });
    return tokens;
  };

  var err = function (msg, line) {
    var e2 = new Error((line ? 'Line ' + line + ': ' : '') + msg);
    e2.line = line;
    return e2;
  };

  /* ───────── parser ───────── */
  function Parser(src) {
    this.tokens = lex(src);
    this.pos = 0;
  }
  Parser.prototype.peek = function () { return this.tokens[this.pos]; };
  Parser.prototype.next = function () { return this.tokens[this.pos++]; };
  Parser.prototype.at = function (t, v) {
    var tk = this.peek();
    if (tk.t !== t) return false;
    return v === undefined || tk.v === v;
  };
  Parser.prototype.atIdent = function (v) { var tk = this.peek(); return tk.t === 'ident' && tk.v === v; };
  Parser.prototype.expect = function (t, v) {
    var tk = this.next();
    if (tk.t !== t || (v !== undefined && tk.v !== v)) {
      throw err('Expected ' + (v || t) + ' but found ' + (tk.t === 'eof' ? 'end of input' : '"' + (tk.v || tk.t) + '"'), tk.line);
    }
    return tk;
  };
  Parser.prototype.expectIdent = function (v) { return this.expect('ident', v); };
  Parser.prototype.atOp = function (v) { return this.at('op', v); };
  Parser.prototype.atPunct = function (v) { return this.at('punct', v); };
  Parser.prototype.eatPunct = function (v) { if (this.atPunct(v)) return this.next(); return null; };
  Parser.prototype.eatIdent = function (v) { if (this.atIdent(v)) return this.next(); return null; };
  Parser.prototype.eatOp = function (v) { if (this.atOp(v)) return this.next(); return null; };

  /* public entry */
  var compile = function (source) {
    var p = new Parser(source);
    var structNode = p.parseStruct();
    var meta = { viewName: structNode.name };
    var js = emitStruct(structNode);
    p.expect('eof');
    return { js: js, meta: meta };
  };

  /* struct Name: View { … } */
  Parser.prototype.parseStruct = function () {
    this.expectIdent('struct');
    var name = this.expect('ident').v;
    if (!/^[A-Z]/.test(name)) throw err('View struct names must start with a capital letter', this.peek().line);
    this.expect('punct', ':');
    /* inheritance clause — only View supported */
    var base = this.expect('ident').v;
    if (base !== 'View') throw err('Only `View` conformance is supported — got ' + base, this.peek().line);
    if (this.eatPunct(',')) throw err('Only `View` conformance is supported — multiple inheritance is not', this.peek().line);
    this.expect('punct', '{');
    var members = [];
    while (!this.atPunct('}')) {
      if (this.at('eof')) throw err('Unterminated struct — missing closing }', this.peek().line);
      members.push(this.parseMember());
    }
    this.expect('punct', '}');
    return { name: name, members: members };
  };

  Parser.prototype.parseMember = function () {
    var isState = false;
    while (this.atPunct('@')) {
      this.next();
      var attr = this.expect('ident').v;
      /* optional attribute arguments e.g. @StateObject(wrappedValue:) — reject cleanly */
      if (this.eatPunct('(')) {
        var depthA = 1;
        while (depthA > 0) {
          var tkA = this.next();
          if (tkA.t === 'eof') throw err('Unterminated attribute', tkA.line);
          if (tkA.v === '(') depthA++;
          else if (tkA.v === ')') depthA--;
        }
      }
      if (attr === 'State') isState = true;
      else if (attr !== 'ViewBuilder') {
        throw err('@' + attr + ' is not supported — only @State', this.peek().line);
      }
    }
    this.eatIdent('private'); this.eatIdent('public'); this.eatIdent('fileprivate'); this.eatIdent('internal');
    var isLet = !!this.eatIdent('let');
    if (!isLet) this.expectIdent('var');
    var name = this.expect('ident').v;
    /* type annotation: skip until `=` (initializer) or `{` (body / computed) */
    var depth3 = 0, sawEq = false, sawColon = false;
    while (true) {
      var tk = this.peek();
      if (tk.t === 'punct' && tk.v === ':') { sawColon = true; this.next(); continue; }
      if (tk.t === 'punct' && (tk.v === '<' || tk.v === '(')) depth3++;
      if (tk.t === 'punct' && (tk.v === '>' || tk.v === ')')) depth3--;
      if (depth3 === 0 && tk.t === 'punct' && tk.v === '=') { sawEq = true; break; }
      if (depth3 === 0 && tk.t === 'punct' && tk.v === '{') break;
      this.next();
    }
    /* body property */
    if (name === 'body') {
      this.expect('punct', '{');
      var bodyView = this.parseViewSequenceUntil('}');
      this.expect('punct', '}');
      return { kind: 'body', view: bodyView };
    }
    if (!sawEq) throw err('Member "' + name + '" needs an initializer', this.peek().line);
    this.expect('punct', '=');
    var init = this.parseExpr();
    this.eatPunct(';');
    return { kind: isState ? 'state' : (isLet ? 'let' : 'var'), name: name, init: init };
  };

  /* sequences of views until closing brace */
  Parser.prototype.parseViewSequenceUntil = function (close) {
    var views = [];
    while (!this.atPunct(close)) {
      if (this.at('eof')) throw err('Unexpected end of input inside view builder', this.peek().line);
      if (this.atIdent('let')) { /* local constant inside builder */
        this.expectIdent('let');
        var lname = this.expect('ident').v;
        this.expect('punct', '=');
        var init = this.parseExpr();
        this.eatPunct(';');
        views.push({ kind: 'let-stmt', name: lname, init: init });
        continue;
      }
      views.push(this.parseView());
    }
    return views;
  };

  Parser.prototype.parseView = function () {
    var tk = this.peek();
    /* conditional view */
    if (this.atIdent('if')) return this.parseIfView();
    /* ForEach */
    if (this.atIdent('ForEach')) return this.parseForEach();
    var view = this.parsePrimaryView();
    return view;
  };

  Parser.prototype.parseIfView = function () {
    this.expectIdent('if');
    var cond = this.parseExpr();
    this.expect('punct', '{');
    var thenViews = this.parseViewSequenceUntil('}');
    this.expect('punct', '}');
    var elseView = null;
    if (this.eatIdent('else')) {
      if (this.atIdent('if')) elseView = [this.parseIfView()];
      else {
        this.expect('punct', '{');
        elseView = this.parseViewSequenceUntil('}');
        this.expect('punct', '}');
      }
    }
    var node = { kind: 'if-view', cond: cond, then: thenViews, else: elseView, mods: [] };
    node.mods = this.parseModifiers();
    return node;
  };

  Parser.prototype.parseForEach = function () {
    this.expectIdent('ForEach');
    this.expect('punct', '(');
    var first = this.parseExpr(); /* could be range */
    var isRange = false, rangeStart = null, rangeEnd = null;
    if (this.eatOp('..<')) {
      isRange = true;
      rangeStart = first;
      rangeEnd = this.parseExpr();
    }
    this.expect('punct', ')');
    this.expect('punct', '{');
    var params = [this.expect('ident').v];
    if (this.eatPunct(',')) params.push(this.expect('ident').v);
    this.expectIdent('in');
    var views = this.parseViewSequenceUntil('}');
    this.expect('punct', '}');
    var node = { kind: 'foreach', collection: isRange ? null : first, start: rangeStart, end: rangeEnd, params: params, views: views, mods: [] };
    node.mods = this.parseModifiers();
    return node;
  };

  var KNOWN_VIEWS = {
    VStack: 'vstack', HStack: 'hstack', ZStack: 'zstack', Group: 'group',
    ScrollView: 'scroll', List: 'list', Text: 'text', Spacer: 'spacer',
    Rectangle: 'rectangle', Circle: 'circle', Button: 'button', Image: 'image',
    TextField: 'textfield', Toggle: 'toggle', Slider: 'slider'
  };

  Parser.prototype.parsePrimaryView = function () {
    var tk = this.peek();
    if (tk.t !== 'ident' || !KNOWN_VIEWS[tk.v]) {
      throw err('Unsupported view "' + (tk.v || tk.t) + '" — expected a SwiftUI view', tk.line);
    }
    var kind = KNOWN_VIEWS[tk.v];
    this.next();
    /* SwiftUI allows bare `VStack { … }` — parens optional for container kinds */
    var PARENS_OPTIONAL = { vstack: 1, hstack: 1, zstack: 1, group: 1, scroll: 1, list: 1 };
    var parensOptional = !!PARENS_OPTIONAL[kind];
    var hasParens = this.atPunct('(');
    if (!hasParens && !parensOptional) {
      throw err(tk.v + ' requires parentheses', this.peek().line);
    }
    if (hasParens) this.next();
    var node;
    switch (kind) {
      case 'vstack': case 'hstack': case 'zstack': {
        var opts = hasParens ? this.parseNamedArgs() : [];
        if (hasParens) this.expect('punct', ')');
        this.expect('punct', '{');
        var kids = this.parseViewSequenceUntil('}');
        this.expect('punct', '}');
        node = { kind: kind, opts: opts, views: kids, mods: [] };
        break;
      }
      case 'group': {
        if (hasParens) this.expect('punct', ')');
        this.expect('punct', '{');
        var gkids = this.parseViewSequenceUntil('}');
        this.expect('punct', '}');
        node = { kind: 'group', views: gkids, mods: [] };
        break;
      }
      case 'scroll': {
        if (hasParens) {
          this.eatIdent('.vertical');
          if (this.atPunct('.')) { this.next(); this.next(); }
          this.expect('punct', ')');
        }
        this.expect('punct', '{');
        var sviews = this.parseViewSequenceUntil('}');
        this.expect('punct', '}');
        node = { kind: 'scroll', views: sviews, mods: [] };
        break;
      }
      case 'list': {
        if (hasParens) {
          this.eatIdent('.plain');
          if (this.atPunct('.')) { this.next(); this.next(); }
          this.expect('punct', ')');
        }
        this.expect('punct', '{');
        var lviews = this.parseViewSequenceUntil('}');
        this.expect('punct', '}');
        node = { kind: 'list', views: lviews, mods: [] };
        break;
      }
      case 'text': {
        var content = this.parseExpr();
        this.expect('punct', ')');
        node = { kind: 'text', content: content, mods: [] };
        break;
      }
      case 'spacer': {
        if (this.atIdent('minLength')) { /* Spacer(minLength: x) */
          this.next(); this.eatPunct(':'); this.parseExpr();
        }
        this.expect('punct', ')');
        node = { kind: 'spacer', mods: [] };
        break;
      }
      case 'rectangle': case 'circle': {
        this.expect('punct', ')');
        node = { kind: kind, mods: [] };
        break;
      }
      case 'button': {
        var label = this.parseExpr();
        this.expect('punct', ')');
        this.expect('punct', '{');
        var stmts = this.parseStatementsUntil('}');
        this.expect('punct', '}');
        node = { kind: 'button', label: label, action: stmts, mods: [] };
        break;
      }
      case 'image': {
        if (this.atIdent('systemName')) {
          this.next(); this.expect('punct', ':');
          var sym = this.parseExpr();
          this.expect('punct', ')');
          node = { kind: 'image', symbol: sym, mods: [] };
        } else {
          /* Image("asset") — treated as plain glyph/text fallback */
          var nm = this.parseExpr();
          this.expect('punct', ')');
          node = { kind: 'image', symbol: nm, mods: [] };
        }
        break;
      }
      case 'textfield': {
        var ph = this.parseExpr();
        this.expect('punct', ',');
        this.expectIdent('text');
        this.expect('punct', ':');
        var tvar = this.parseBinding();
        this.expect('punct', ')');
        node = { kind: 'textfield', placeholder: ph, binding: tvar, mods: [] };
        break;
      }
      case 'toggle': {
        var tlabel = this.parseExpr();
        this.expect('punct', ',');
        this.expectIdent('isOn');
        this.expect('punct', ':');
        var tvar = this.parseBinding();
        this.expect('punct', ')');
        node = { kind: 'toggle', label: tlabel, binding: tvar, mods: [] };
        break;
      }
      case 'slider': {
        this.expectIdent('value');
        this.expect('punct', ':');
        var svar = this.parseBinding();
        var min = null, max = null;
        if (this.eatPunct(',')) {
          this.expectIdent('in'); this.expect('punct', ':');
          min = this.parseExpr();
          this.expect('op', '...');
          max = this.parseExpr();
        }
        this.expect('punct', ')');
        node = { kind: 'slider', binding: svar, min: min, max: max, mods: [] };
        break;
      }
    }
    node.mods = this.parseModifiers();
    return node;
  };

  Parser.prototype.parseBinding = function () {
    this.expect('punct', '$');
    return this.expect('ident').v;
  };

  /* named arguments: either empty, or a, b: 1, .enum, … */
  Parser.prototype.parseNamedArgs = function () {
    var args = [];
    if (this.atPunct(')')) return args;
    while (true) {
      if (this.atPunct('.')) { args.push({ name: null, value: this.parseExpr() }); }
      else if (this.at('ident') && this.tokens[this.pos + 1].t === 'punct' && this.tokens[this.pos + 1].v === ':') {
        var name = this.next().v; this.expect('punct', ':');
        args.push({ name: name, value: this.parseExpr() });
      } else {
        args.push({ name: null, value: this.parseExpr() });
      }
      if (!this.eatPunct(',')) break;
    }
    return args;
  };

  /* statement block for Button action */
  Parser.prototype.parseStatementsUntil = function (close) {
    var stmts = [];
    while (!this.atPunct(close)) {
      if (this.at('eof')) throw err('Unterminated action closure', this.peek().line);
      stmts.push(this.parseStatement());
    }
    return stmts;
  };

  Parser.prototype.parseStatement = function () {
    var tk = this.peek();
    if (tk.t !== 'ident') { /* bare expression statement e.g. foo() */
      var e0 = this.parseExpr();
      this.eatPunct(';');
      return { kind: 'expr-stmt', expr: e0 };
    }
    var name = this.next();
    if (this.eatOp('+=')) return { kind: 'compound', name: name.v, op: '+=', expr: this.parseExpr() };
    if (this.eatOp('-=')) return { kind: 'compound', name: name.v, op: '-=', expr: this.parseExpr() };
    if (this.eatOp('*=')) return { kind: 'compound', name: name.v, op: '*=', expr: this.parseExpr() };
    if (this.eatOp('/=')) return { kind: 'compound', name: name.v, op: '/=', expr: this.parseExpr() };
    if (this.eatPunct('=')) return { kind: 'assign', name: name.v, expr: this.parseExpr() };
    if (this.eatPunct('.')) {
      var member = this.expect('ident').v;
      if (member === 'toggle') { this.expect('punct', '('); this.expect('punct', ')'); return { kind: 'toggle', name: name.v }; }
      if (member === 'randomize') { this.expect('punct', '('); this.expect('punct', ')'); return { kind: 'toggle', name: name.v }; /* legacy alias */
      }
      throw err('Unsupported statement: ' + name.v + '.' + member + '()', tk.line);
    }
    /* otherwise it was the start of an expression statement */
    this.pos--; /* rewind and re-parse as expression */
    var e1 = this.parseExpr();
    this.eatPunct(';');
    return { kind: 'expr-stmt', expr: e1 };
  };

  /* modifiers: .foo(...) chains */
  Parser.prototype.parseModifiers = function () {
    var mods = [];
    while (this.atPunct('.')) {
      this.next();
      var name = this.expect('ident').v;
      if (name === 'onTapGesture') {
        this.eatPunct('('); /* tolerate .onTapGesture() {} too */
        this.eatPunct(')');
        this.expect('punct', '{');
        var tapStmts = this.parseStatementsUntil('}');
        this.expect('punct', '}');
        mods.push({ name: name, args: [{ name: null, value: { kind: 'closure', stmts: tapStmts } }] });
        continue;
      }
      this.expect('punct', '(');
      var args = [];
      if (!this.atPunct(')')) {
        while (true) {
          if (this.at('ident') && this.tokens[this.pos + 1].t === 'punct' && this.tokens[this.pos + 1].v === ':' ) {
            var aname = this.next().v; this.expect('punct', ':');
            args.push({ name: aname, value: this.parseExpr() });
          } else {
            args.push({ name: null, value: this.parseExpr() });
          }
          if (!this.eatPunct(',')) break;
        }
      }
      this.expect('punct', ')');
      mods.push({ name: name, args: args });
    }
    return mods;
  };

  /* ── expressions ── */
  Parser.prototype.parseExpr = function () { return this.parseTernary(); };
  Parser.prototype.parseTernary = function () {
    var test = this.parseBinary(0);
    if (this.eatPunct('?')) {
      var a = this.parseExpr();
      this.expect('punct', ':');
      var b = this.parseExpr();
      return { kind: 'ternary', test: test, a: a, b: b };
    }
    return test;
  };

  var BIN_PRECEDENCE = [
    ['||'], ['&&'],
    ['==', '!='], ['<', '<=', '>', '>='],
    ['+', '-'], ['*', '/', '%']
  ];
  Parser.prototype.parseBinary = function (level) {
    if (level >= BIN_PRECEDENCE.length) return this.parseUnary();
    var left = this.parseBinary(level + 1);
    var ops = BIN_PRECEDENCE[level];
    while (true) {
      var hit = null;
      for (var i = 0; i < ops.length; i++) {
        if (ops[i].length === 1 ? this.atPunct(ops[i]) : this.atOp(ops[i])) { hit = ops[i]; break; }
      }
      if (!hit) break;
      this.next();
      var right = this.parseBinary(level + 1);
      left = { kind: 'binary', op: hit, left: left, right: right };
    }
    return left;
  };
  Parser.prototype.parseUnary = function () {
    if (this.eatPunct('!')) return { kind: 'unary', op: '!', expr: this.parseUnary() };
    if (this.eatPunct('-') || this.eatOp('-')) return { kind: 'unary', op: '-', expr: this.parseUnary() };
    return this.parsePostfix();
  };
  Parser.prototype.parsePostfix = function () {
    var expr = this.parsePrimaryExpr();
    while (this.atPunct('.')) {
      this.next();
      var member = this.expect('ident').v;
      if (this.atPunct('(')) {
        this.next();
        var args = [];
        if (!this.atPunct(')')) {
          while (true) {
            if (this.at('ident') && this.tokens[this.pos + 1].t === 'punct' && this.tokens[this.pos + 1].v === ':') {
              var aname = this.next().v; this.expect('punct', ':');
              args.push({ name: aname, value: this.parseExpr() });
            } else args.push({ name: null, value: this.parseExpr() });
            if (!this.eatPunct(',')) break;
          }
        }
        this.expect('punct', ')');
        expr = { kind: 'call', callee: expr, member: member, args: args };
      } else {
        expr = { kind: 'member', object: expr, member: member };
      }
    }
    return expr;
  };

  Parser.prototype.parsePrimaryExpr = function () {
    var tk = this.peek();
    if (tk.t === 'num') { this.next(); return { kind: 'num', value: tk.v }; }
    if (tk.t === 'str') { this.next(); return { kind: 'str', segs: tk.segs }; }
    if (this.eatPunct('(')) { var inner = this.parseExpr(); this.expect('punct', ')'); return inner; }
    if (this.eatPunct('[')) {
      var items = [];
      if (!this.atPunct(']')) {
        while (true) {
          items.push(this.parseExpr());
          if (!this.eatPunct(',')) break;
        }
      }
      this.expect('punct', ']');
      return { kind: 'array', items: items };
    }
    if (tk.t === 'punct' && tk.v === '.') {
      /* enum case, e.g. .horizontal / .blue */
      this.next();
      var caseName = this.expect('ident').v;
      return { kind: 'enum', name: caseName };
    }
    if (tk.t === 'ident') {
      this.next();
      var name = tk.v;
      if (name === 'true') return { kind: 'bool', value: true };
      if (name === 'false') return { kind: 'bool', value: false };
      if (name === 'nil') return { kind: 'nil' };
      if (this.atPunct('(')) {
        this.next();
        var args = [];
        if (!this.atPunct(')')) {
          while (true) {
            if (this.at('ident') && this.tokens[this.pos + 1].t === 'punct' && this.tokens[this.pos + 1].v === ':') {
              var aname = this.next().v; this.expect('punct', ':');
              args.push({ name: aname, value: this.parseExpr() });
            } else args.push({ name: null, value: this.parseExpr() });
            if (!this.eatPunct(',')) break;
          }
        }
        this.expect('punct', ')');
        return { kind: 'call', callee: { kind: 'ident', name: name }, member: null, args: args };
      }
      return { kind: 'ident', name: name };
    }
    throw err('Expected an expression, found ' + (tk.t === 'eof' ? 'end of input' : '"' + (tk.v || tk.t) + '"'), tk.line);
  };


  /* ───────── emitter: AST → JS that drives SWTK ───────── */

  var Emitter = function (structNode) {
    this.struct = structNode;
    this.tmp = 0;
    this.stateList = [];
    this.memberList = [];
    structNode.members.forEach(function (m) {
      if (m.kind === 'state') this.stateList.push(m);
      else if (m.kind !== 'body') this.memberList.push(m);
    }, this);
    this.memberNames = {};
    this.memberList.forEach(function (m) { this.memberNames[m.name] = true; }, this);
    this.stateIndex = {};
    this.stateList.forEach(function (m, i) { this.stateIndex[m.name] = i; }, this);
    this.locals = {};
  };

  Emitter.prototype.fresh = function (prefix) {
    return '_n' + (this.tmp++);
  };
  Emitter.prototype.isState = function (name) { return this.stateIndex[name] !== undefined; };
  Emitter.prototype.cell = function (name) { return '_s' + this.stateIndex[name]; };

  /* identifier resolution */
  Emitter.prototype.emitIdent = function (name) {
    if (name === 'self') return 'this';
    if (this.locals[name]) return name;
    if (this.isState(name)) return this.cell(name) + '.v';
    if (this.memberNames[name]) return 'this.' + name;
    return name; /* free symbol — assume global */
  };

  Emitter.prototype.emitExpr = function (node) {
    var self = this;
    switch (node.kind) {
      case 'num': return node.value;
      case 'bool': return node.value ? 'true' : 'false';
      case 'nil': return 'null';
      case 'str': return this.emitString(node);
      case 'array': return '[' + node.items.map(function (i) { return self.emitExpr(i); }).join(', ') + ']';
      case 'enum': return 'SWTK.e("' + node.name + '")';
      case 'ident': return this.emitIdent(node.name);
      case 'ternary':
        return '(' + this.emitExpr(node.test) + ' ? ' + this.emitExpr(node.a) + ' : ' + this.emitExpr(node.b) + ')';
      case 'unary':
        return '(' + node.op + this.emitExpr(node.expr) + ')';
      case 'binary': {
        var op = node.op;
        var l = this.emitExpr(node.left), r = this.emitExpr(node.right);
        return '(' + l + ' ' + op + ' ' + r + ')';
      }
      case 'member': {
        /* Color.red → enum */
        if (node.object.kind === 'ident' && node.object.name === 'Color') {
          return 'SWTK.e("' + node.member + '")';
        }
        var obj = this.emitExpr(node.object);
        if (node.member === 'count') return '(' + obj + '.length)';
        if (node.member === 'isEmpty') return '((' + obj + '.length !== undefined) ? (' + obj + '.length === 0) : !' + obj + ')';
        if (node.member === 'first') return '(' + obj + '[0])';
        if (node.member === 'last') return '(' + obj + '[' + obj + '.length - 1])';
        return obj + '.' + node.member;
      }
      case 'call': {
        var args = node.args.map(function (a) { return self.emitExpr(a.value); });
        if (node.callee && node.callee.kind === 'ident' && !node.member) {
          var fn = node.callee.name;
          if (fn === 'Color') {
            var carg = node.args.length ? node.args[0].value : null;
            return 'SWTK.e("' + (carg && carg.kind === 'enum' ? carg.name : 'white') + '")';
          }
          if (fn === 'Int') return 'Math.trunc(' + args[0] + ')';
          if (fn === 'Double') return 'Number(' + args[0] + ')';
          if (fn === 'String') return 'String(' + args[0] + ')';
          if (fn === 'Bool') return 'Boolean(' + args[0] + ')';
          if (fn === 'abs') return 'Math.abs(' + args[0] + ')';
          if (fn === 'min') return 'Math.min(' + args.join(', ') + ')';
          if (fn === 'max') return 'Math.max(' + args.join(', ') + ')';
          return fn + '(' + args.join(', ') + ')';
        }
        if (node.callee && node.member) {
          var target = this.emitExpr(node.callee);
          if (node.member === 'count') return '(' + target + '.length)';
          return target + '.' + node.member + '(' + args.join(', ') + ')';
        }
        return '/* unsupported call */ undefined';
      }
      case 'closure': {
        var lines = this.emitStatements(node.stmts);
        return 'function () {\n' + lines + '\n}';
      }
      default:
        throw err('Unsupported expression kind: ' + node.kind, 0);
    }
  };

  Emitter.prototype.emitString = function (node) {
    var hasCode = node.segs.some(function (sg) { return sg.t === 'code'; });
    var escLit = function (s) {
      return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
    };
    if (!hasCode) {
      var flat = node.segs.map(function (sg) { return sg.v; }).join('');
      return JSON.stringify(flat);
    }
    var out = '`';
    for (var i = 0; i < node.segs.length; i++) {
      var sg = node.segs[i];
      if (sg.t === 'lit') { out += escLit(sg.v); continue; }
      var sub = new Parser(sg.v);
      var expr = sub.parseExpr();
      out += '${' + this.emitExpr(expr) + '}';
    }
    return out + '`';
  };

  Emitter.prototype.emitBinding = function (name) {
    if (this.isState(name)) return 'SWTK.binding(' + this.cell(name) + ')';
    throw err('$' + name + ' — @State properties need to be declared with @State', 0);
  };

  Emitter.prototype.emitStatements = function (stmts) {
    var self = this, lines = [];
    stmts.forEach(function (st) {
      switch (st.kind) {
        case 'assign': {
          var v = self.emitExpr(st.expr);
          if (self.isState(st.name)) lines.push('SWTK.set(' + self.cell(st.name) + ', ' + v + ');');
          else if (self.memberNames[st.name]) lines.push('this.' + st.name + ' = ' + v + ';');
          else { lines.push(st.name + ' = ' + v + ';'); }
          break;
        }
        case 'compound': {
          var op = st.op[0]; /* '+', '-', '*', '/' */
          var rhs = self.emitExpr(st.expr);
          if (self.isState(st.name)) {
            var c = self.cell(st.name);
            lines.push('SWTK.set(' + c + ', ' + c + '.v ' + op + ' (' + rhs + '));');
          } else if (self.memberNames[st.name]) lines.push('this.' + st.name + ' = this.' + st.name + ' ' + op + ' (' + rhs + ');');
          else lines.push(st.name + ' = ' + st.name + ' ' + op + ' (' + rhs + ');');
          break;
        }
        case 'toggle':
          if (self.isState(st.name)) { var c2 = self.cell(st.name); lines.push('SWTK.set(' + c2 + ', !' + c2 + '.v);'); }
          else if (self.memberNames[st.name]) lines.push('this.' + st.name + ' = !this.' + st.name + ';');
          else lines.push(st.name + ' = !' + st.name + ';');
          break;
        case 'expr-stmt':
          lines.push(self.emitExpr(st.expr) + ';');
          break;
        default:
          throw err('Unsupported statement: ' + st.kind, 0);
      }
    });
    return lines.join('\n      ');
  };

  /* modifiers → SWTK.m(node, 'name', args) */
  Emitter.prototype.emitMods = function (expr, mods) {
    var self = this;
    var out = expr;
    mods.forEach(function (modd) {
      var allNamed = modd.args.length > 0 && modd.args.every(function (a) { return a.name; });
      var rendered;
      if (allNamed) {
        var obj = modd.args.map(function (a) { return JSON.stringify(a.name) + ': ' + self.emitExpr(a.value); }).join(', ');
        rendered = '{' + obj + '}';
      } else {
        rendered = '[' + modd.args.map(function (a) { return self.emitExpr(a.value); }).join(', ') + ']';
      }
      out = 'SWTK.m(' + out + ', ' + JSON.stringify(modd.name) + ', ' + rendered + ')';
    });
    return out;
  };

  Emitter.prototype.emitViewKids = function (views) {
    var temps = [];
    var lines = [];
    var self = this;
    views.forEach(function (v) {
      if (v.kind === 'let-stmt') {
        self.locals[v.name] = true;
        lines.push('const ' + v.name + ' = ' + self.emitExpr(v.init) + ';');
        return;
      }
      var r = self.emitView(v);
      lines = lines.concat(r.lines);
      temps.push(r.expr);
    });
    return { lines: lines, temps: temps };
  };

  Emitter.prototype.emitNamedOpts = function (opts) {
    var self = this;
    if (!opts || !opts.length) return '{}';
    var parts = opts.map(function (a) {
      return JSON.stringify(a.name || '_') + ': ' + self.emitExpr(a.value);
    });
    return '{' + parts.join(', ') + '}';
  };

  Emitter.prototype.emitView = function (node) {
    var self = this, lines = [];
    var kids;
    switch (node.kind) {
      case 'text': {
        var t = this.fresh('t');
        lines.push('var ' + t + ' = ' + this.emitMods('SWTK.text(' + this.emitExpr(node.content) + ')', node.mods) + ';');
        return { lines: lines, expr: t };
      }
      case 'spacer': case 'rectangle': case 'circle':
        return this.wrapMods('SWTK.' + node.kind + '()', node.mods);
      case 'image':
        return this.wrapMods('SWTK.image(' + this.emitExpr(node.symbol) + ')', node.mods);
      case 'vstack': case 'hstack': case 'zstack': {
        kids = this.emitViewKids(node.views);
        lines = lines.concat(kids.lines);
        var builder = node.kind === 'vstack' ? 'SWTK.vstack' : node.kind === 'hstack' ? 'SWTK.hstack' : 'SWTK.zstack';
        var expr = builder + '(' + this.emitNamedOpts(node.opts) + ', [' + kids.temps.join(', ') + '])';
        return this.wrapMods(expr, node.mods, lines);
      }
      case 'group': {
        kids = this.emitViewKids(node.views);
        lines = lines.concat(kids.lines);
        return this.wrapMods('SWTK.group([' + kids.temps.join(', ') + '])', node.mods, lines);
      }
      case 'scroll': {
        kids = this.emitViewKids(node.views);
        lines = lines.concat(kids.lines);
        return this.wrapMods('SWTK.scroll([' + kids.temps.join(', ') + '])', node.mods, lines);
      }
      case 'list': {
        kids = this.emitViewKids(node.views);
        lines = lines.concat(kids.lines);
        return this.wrapMods('SWTK.list([' + kids.temps.join(', ') + '])', node.mods, lines);
      }
      case 'button': {
        var label = this.emitExpr(node.label);
        var body = this.emitStatements(node.action);
        var expr2 = 'SWTK.button(' + label + ', function () {\n      ' + body + '\n    })';
        return this.wrapMods(expr2, node.mods);
      }
      case 'textfield':
        return this.wrapMods('SWTK.textField(' + this.emitExpr(node.placeholder) + ', ' + this.emitBinding(node.binding) + ')', node.mods);
      case 'toggle':
        return this.wrapMods('SWTK.toggle(' + this.emitExpr(node.label) + ', ' + this.emitBinding(node.binding) + ')', node.mods);
      case 'slider': {
        var mn = node.min ? this.emitExpr(node.min) : '0';
        var mx = node.max ? this.emitExpr(node.max) : '1';
        return this.wrapMods('SWTK.slider(' + this.emitBinding(node.binding) + ', ' + mn + ', ' + mx + ')', node.mods);
      }
      case 'foreach': {
        var params = node.params;
        var savedLocals = Object.assign({}, this.locals);
        params.forEach(function (pname) { this.locals[pname] = true; }, this);
        var kids = this.emitViewKids(node.views);
        this.locals = savedLocals;
        var kidsJs = kids.lines.join('\n      ');
        var bodyArr = kids.temps.length === 1 ? kids.temps[0] : 'SWTK.group([' + kids.temps.join(', ') + '])';
        var closure;
        if (node.start) {
          closure = 'SWTK.forEachRange(' + this.emitExpr(node.start) + ', ' + this.emitExpr(node.end) + ', function (' + params[0] + ') {\n      ' + kidsJs + '\n      return ' + bodyArr + ';\n    })';
        } else {
          /* 1 param → element · 2 params → (index, element), enumerated-style */
          var pjs = params.length === 2 ? params[0] + ', ' + params[1] : params[0];
          closure = 'SWTK.forEach(' + this.emitExpr(node.collection) + ', function (' + pjs + ') {\n      ' + kidsJs + '\n      return ' + bodyArr + ';\n    })';
        }
        return this.wrapMods(closure, node.mods, []);
      }
      case 'if-view': {
        var thenKids = this.emitViewKids(node.then);
        var elseKids = node.else ? this.emitViewKids(node.else) : null;
        var thenExpr = thenKids.temps.length ? (thenKids.temps.length === 1 ? thenKids.temps[0] : 'SWTK.group([' + thenKids.temps.join(', ') + '])') : 'SWTK.group([])';
        var elseExpr = elseKids ? (elseKids.temps.length ? (elseKids.temps.length === 1 ? elseKids.temps[0] : 'SWTK.group([' + elseKids.temps.join(', ') + '])') : 'SWTK.group([])') : 'null';
        lines = lines.concat(thenKids.lines, elseKids ? elseKids.lines : []);
        var ifExpr = 'SWTK.cond(' + this.emitExpr(node.cond) + ', ' + thenExpr + ', ' + elseExpr + ')';
        return this.wrapMods(ifExpr, node.mods, lines);
      }
      default:
        throw err('Unsupported view node: ' + node.kind, 0);
    }
  };

  Emitter.prototype.wrapMods = function (expr, mods, preLines) {
    var t = this.fresh('w');
    var lines = (preLines || []).slice();
    lines.push('var ' + t + ' = ' + this.emitMods(expr, mods || []) + ';');
    return { lines: lines, expr: t };
  };

  var emitStruct = function (structNode) {
    var em = new Emitter(structNode);
    var lines = [];
    /* member initializers */
    em.memberList.forEach(function (m) {
      lines.push('    this.' + m.name + ' = ' + em.emitExpr(m.init) + ';');
    });
    var ctor = lines.join('\n');
    var bodyProp = structNode.members.filter(function (m) { return m.kind === 'body'; })[0];
    if (!bodyProp) throw err('struct ' + structNode.name + ' needs `var body: some View { … }`', 0);

    var bodyLines = [];
    em.stateList.forEach(function (m, i) {
      bodyLines.push('    const _s' + i + ' = this.__s(' + i + ', ' + em.emitExpr(m.init) + ');');
    });
    var kids = em.emitViewKids(bodyProp.view);
    bodyLines = bodyLines.concat(kids.lines.map(function (l) { return '    ' + l; }));
    var root;
    if (kids.temps.length === 0) root = 'SWTK.group([])';
    else if (kids.temps.length === 1) root = kids.temps[0];
    else root = 'SWTK.group([' + kids.temps.join(', ') + '])';
    bodyLines.push('    return ' + root + ';');

    return '' +
      '/* Generated by SWTK SwiftC from ' + structNode.name + '.swift */\n' +
      'class ' + structNode.name + ' extends SWTK.View {\n' +
      '  constructor() {\n    super();\n' + (ctor ? ctor + '\n' : '') + '  }\n' +
      '  body() {\n' + bodyLines.join('\n') + '\n  }\n' +
      '}\n' +
      'return ' + structNode.name + ';\n';
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = { compile: compile, _Parser: Parser, _err: err };
  global.SWIFTC = { compile: compile };
})(typeof window !== 'undefined' ? window : globalThis);
