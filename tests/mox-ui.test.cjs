const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const MOX = path.join(ROOT, 'apps/productivity/mox/website');

test('Mox uses custom inline SVG icons instead of Unicode glyph placeholders', async () => {
  const svgMod = await import('../apps/productivity/mox/website/svg.js');
  assert.equal(typeof svgMod.moxIcon, 'function');
  assert.ok(Object.keys(svgMod.MOX_ICONS).length >= 25);
  for (const name of Object.keys(svgMod.MOX_ICONS)) {
    const markup = svgMod.moxIcon(name);
    assert.match(markup, /^<svg class="mox-ico" viewBox="0 0 24 24"[^>]*>.*<\/svg>$/);
  }

  const html = fs.readFileSync(path.join(MOX, 'index.html'), 'utf8');
  const appJs = fs.readFileSync(path.join(MOX, 'app.js'), 'utf8');
  const wsJs = fs.readFileSync(path.join(MOX, 'workspace.js'), 'utf8');

  for (const glyph of ['✳', '✎', '⌕', '⟨⟩', '∑', '＋', '⚙', '⌑', '☰', '⌄', '◈', '▱', '✧', '↑', '▤', '▧', '↻', '⚠', '▭', '▯', '◉', '⌁', '◇']) {
    assert.ok(!html.includes(glyph), `index.html contains legacy glyph ${glyph}`);
    assert.ok(!appJs.includes(glyph), `app.js contains legacy glyph ${glyph}`);
    assert.ok(!wsJs.includes(glyph), `workspace.js contains legacy glyph ${glyph}`);
  }

  const dom = new JSDOM(html, { url: 'http://localhost/apps/productivity/mox/website/index.html?nosw' });
  const doc = dom.window.document;
  for (const sel of [
    '.brand-mark', '#newChat', '#libraryButton', '#workspaceButton', '#calculatorButton',
    '#addFilesSmall', '#addFolder', '#settingsButton', '#privacyLink', '#sidebarToggle',
    '.model-menu-chevron', '#workspaceTop', '#calcTop', '#sourceBadge', '#helpButton',
    '.model-orbit', '#attachButton', '#sendButton', '#wsClose', '#wsNewFile', '#wsNewFile2',
    '#calcClose', '#modalClose', '.side-help-mark', '#sideHelpMenuBtn', '#sideHelpNewChat'
  ]) {
    assert.ok(doc.querySelector(`${sel} svg.mox-ico`), `${sel} renders custom SVG icon`);
  }
  assert.equal(doc.querySelectorAll('.quick-card svg.mox-ico').length, 7);
});

test('Opening Mox in #copilot-frame shows a clean text-chat help menu without fancy IDE clutter', () => {
  const html = fs.readFileSync(path.join(MOX, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(MOX, 'styles.css'), 'utf8');

  const host = new JSDOM('<!doctype html><html><body><iframe id="copilot-frame"></iframe></body></html>', {
    url: 'http://localhost/index.html'
  });
  const copilotFrame = host.window.document.getElementById('copilot-frame');

  const sideDom = new JSDOM(html, {
    url: 'http://localhost/apps/productivity/mox/website/index.html?nosw',
    runScripts: 'dangerously',
    beforeParse(win) {
      Object.defineProperty(win, 'frameElement', { value: copilotFrame, configurable: true });
    }
  });
  const sDoc = sideDom.window.document;
  const sStyle = sDoc.createElement('style');
  sStyle.textContent = css;
  sDoc.head.appendChild(sStyle);

  assert.ok(sDoc.documentElement.classList.contains('mox-side-help'));
  assert.equal(sideDom.window.getComputedStyle(sDoc.querySelector('.sidebar')).display, 'none');
  assert.equal(sideDom.window.getComputedStyle(sDoc.querySelector('.topbar')).display, 'none');
  assert.equal(sideDom.window.getComputedStyle(sDoc.querySelector('#modelCard')).display, 'none');
  assert.equal(sideDom.window.getComputedStyle(sDoc.querySelector('#quickStart')).display, 'none');
  assert.equal(sideDom.window.getComputedStyle(sDoc.querySelector('#attachButton')).display, 'none');
  assert.equal(sideDom.window.getComputedStyle(sDoc.querySelector('.workspace-panel')).display, 'none');
  assert.equal(sideDom.window.getComputedStyle(sDoc.querySelector('.calc-panel')).display, 'none');
  assert.notEqual(sideDom.window.getComputedStyle(sDoc.querySelector('.side-help-bar')).display, 'none');
  assert.notEqual(sideDom.window.getComputedStyle(sDoc.querySelector('#sideHelpMenu')).display, 'none');
  assert.equal(sDoc.querySelectorAll('.side-help-item').length, 5);

  const fullDom = new JSDOM(html, {
    url: 'http://localhost/apps/productivity/mox/website/index.html?nosw',
    runScripts: 'dangerously'
  });
  const fDoc = fullDom.window.document;
  const fStyle = fDoc.createElement('style');
  fStyle.textContent = css;
  fDoc.head.appendChild(fStyle);

  assert.ok(!fDoc.documentElement.classList.contains('mox-side-help'));
  assert.equal(fullDom.window.getComputedStyle(fDoc.querySelector('.side-help-bar')).display, 'none');
  assert.equal(fullDom.window.getComputedStyle(fDoc.querySelector('#sideHelpMenu')).display, 'none');
  assert.notEqual(fullDom.window.getComputedStyle(fDoc.querySelector('.sidebar')).display, 'none');
  assert.notEqual(fullDom.window.getComputedStyle(fDoc.querySelector('#modelCard')).display, 'none');
});

test('Calculator-answerable questions pass the exact computed value to the AI model and never output "Answered with Calculator"', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mox-calc-handoff-'));
  const html = fs.readFileSync(path.join(MOX, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(MOX, 'styles.css'), 'utf8');

  const savedGlobals = {};
  const setGlobal = (key, val) => {
    savedGlobals[key] = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value: val, configurable: true, writable: true });
  };

  try {
    for (const file of ['calculator.js', 'model-store.js', 'svg.js', 'workspace.js']) {
      fs.copyFileSync(path.join(MOX, file), path.join(tmpDir, file));
    }
    fs.writeFileSync(path.join(tmpDir, 'mock-wllama.js'), `
      export class Wllama {
        async loadModel() { return true; }
        async createChatCompletion(opts) {
          globalThis.__MOX_MODEL_CALLS.push(opts.messages);
          const sys = opts.messages[0]?.content || '';
          const user = opts.messages[opts.messages.length - 1]?.content || '';
          let reply = 'Here is a helpful plain-text reply.';
          if (sys.includes('VERIFIED ANSWER:')) {
            const m = sys.match(/Exact result:\\s*(.+)/);
            const exact = m ? m[1].trim() : '';
            if (user.includes('999')) reply = 'The answer is 424242.';
            else if (user.includes('666')) reply = 'Answered with Calculator: ' + exact + '.';
            else if (user.includes('25 * 48')) reply = '25 times 48 is 1,200.';
            else reply = 'That comes to ' + exact + '.';
          }
          for (const part of reply.split(' ')) {
            opts.onData?.({ choices: [{ delta: { content: part + ' ' } }] });
          }
          return { choices: [{ message: { content: reply } }] };
        }
      }
    `);
    const patchedApp = fs.readFileSync(path.join(MOX, 'app.js'), 'utf8')
      .replace(`new URL('vendor/wllama/wllama.js', import.meta.url).href`, `new URL('./mock-wllama.js', import.meta.url).href`);
    fs.writeFileSync(path.join(tmpDir, 'app.js'), patchedApp);

    const host = new JSDOM('<!doctype html><html><body><iframe id="copilot-frame"></iframe></body></html>', {
      url: 'http://localhost/index.html'
    });
    const copilotFrame = host.window.document.getElementById('copilot-frame');
    const dom = new JSDOM(html, {
      url: 'http://127.0.0.1/apps/productivity/mox/website/index.html?nosw',
      runScripts: 'dangerously',
      beforeParse(win) {
        Object.defineProperty(win, 'frameElement', { value: copilotFrame, configurable: true });
      }
    });
    const { window } = dom;
    const { document } = window;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    for (const k of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'Event', 'KeyboardEvent', 'CustomEvent', 'MutationObserver', 'DOMParser', 'localStorage', 'Blob', 'AbortController', 'navigator', 'location']) {
      setGlobal(k, window[k]);
    }
    setGlobal('requestAnimationFrame', (fn) => setTimeout(fn, 0));
    setGlobal('__MOX_MODEL_CALLS', []);
    setGlobal('fetch', async (u) => {
      const s = String(u);
      if (s.includes('models/manifest.json')) {
        return new Response(JSON.stringify({
          default: 'smollm2',
          models: [{ id: 'smollm2', name: 'SmolLM2', file: 'smollm2.gguf', bytes: 16, parameters: '135M' }],
          available: [{ id: 'smollm2', name: 'SmolLM2', file: 'smollm2.gguf', bytes: 16, parameters: '135M' }]
        }), { status: 200 });
      }
      if (s.includes('models/smollm2.gguf')) {
        return new Response('GGUF', { status: 200, headers: { 'Content-Length': '4' } });
      }
      if (s.includes('knowledge/index.json')) {
        return new Response(JSON.stringify({ categories: [], documents: [] }), { status: 200 });
      }
      return new Response('{}', { status: 404 });
    });

    await import(path.join(tmpDir, 'app.js'));
    await new Promise((r) => setTimeout(r, 150));

    assert.equal(window.__mox.state().modelReady, true);

    const submit = async (text) => {
      document.getElementById('messageInput').value = text;
      document.getElementById('chatForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 80));
      return [...document.querySelectorAll('.message.assistant .message-body')].pop();
    };

    const body1 = await submit('What is 25 * 48?');
    assert.equal(globalThis.__MOX_MODEL_CALLS.length, 1);
    assert.ok(globalThis.__MOX_MODEL_CALLS[0][0].content.includes('VERIFIED ANSWER:'));
    assert.ok(globalThis.__MOX_MODEL_CALLS[0][0].content.includes('Exact result: 1200'));
    assert.match(body1.textContent, /25 times 48 is 1,200\./);
    assert.ok(!/answered with calculator/i.test(body1.textContent));
    assert.ok(!/computed by the calculator/i.test(body1.textContent));
    assert.equal(body1.querySelectorAll('.msg-action').length, 2);

    const body2 = await submit('666 + 1');
    assert.match(body2.textContent, /667/);
    assert.ok(!/answered with calculator/i.test(body2.textContent));

    const body3 = await submit('999 + 1');
    assert.match(body3.textContent, /1000/);
    assert.ok(!/answered with calculator/i.test(body3.textContent));
    assert.ok(!/computed by the calculator/i.test(body3.textContent));

    document.getElementById('sideHelpNewChat').click();
    assert.equal(document.getElementById('welcome').hidden, false);
  } finally {
    for (const [k, desc] of Object.entries(savedGlobals)) {
      if (desc) Object.defineProperty(globalThis, k, desc);
      else delete globalThis[k];
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Mox falls back cleanly through CPU/single-thread/compat modes and retrieves all TheEuHub repository docs', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mox-fallback-repos-'));
  const html = fs.readFileSync(path.join(MOX, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(MOX, 'styles.css'), 'utf8');

  const savedGlobals = {};
  const setGlobal = (key, val) => {
    savedGlobals[key] = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value: val, configurable: true, writable: true });
  };

  try {
    for (const file of ['calculator.js', 'model-store.js', 'svg.js', 'workspace.js']) {
      fs.copyFileSync(path.join(MOX, file), path.join(tmpDir, file));
    }
    fs.writeFileSync(path.join(tmpDir, 'mock-wllama.js'), `
      export class Wllama {
        constructor(config) {
          this.config = config;
          this.compatArgs = null;
          this.exited = false;
        }
        setCompat(compat, mode) {
          this.compatArgs = { compat, mode };
        }
        getWorkerResources() {
          return { wasmPath: this.config.default, compat: false };
        }
        async loadModel(_blobs, params) {
          globalThis.__MOX_LOAD_ATTEMPTS.push({
            config: this.config,
            compatArgs: this.compatArgs,
            resources: this.getWorkerResources(),
            params
          });
          // Simulate WebGPU + multi-thread failure on first attempt(s), succeeding on single-thread compat CPU.
          if (params.n_threads > 1 || !this.getWorkerResources().compat) {
            throw new Error('Simulated multi-thread / non-compat load failure');
          }
          return true;
        }
        async exit() { this.exited = true; }
        async createChatCompletion(opts) {
          return { choices: [{ message: { content: 'Loaded in compat single-thread fallback.' } }] };
        }
      }
    `);
    const patchedApp = fs.readFileSync(path.join(MOX, 'app.js'), 'utf8')
      .replace(`new URL('vendor/wllama/wllama.js', import.meta.url).href`, `new URL('./mock-wllama.js', import.meta.url).href`);
    fs.writeFileSync(path.join(tmpDir, 'app.js'), patchedApp);

    const dom = new JSDOM(html, {
      url: 'http://127.0.0.1/apps/productivity/mox/website/index.html?nosw',
      runScripts: 'dangerously',
      beforeParse(win) {
        Object.defineProperty(win.navigator, 'hardwareConcurrency', { value: 8, configurable: true });
        Object.defineProperty(win.navigator, 'gpu', { value: {}, configurable: true });
      }
    });
    const { window } = dom;
    const { document } = window;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    for (const k of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'Event', 'KeyboardEvent', 'CustomEvent', 'MutationObserver', 'DOMParser', 'localStorage', 'Blob', 'AbortController', 'navigator', 'location']) {
      setGlobal(k, window[k]);
    }
    setGlobal('requestAnimationFrame', (fn) => setTimeout(fn, 0));
    setGlobal('__MOX_LOAD_ATTEMPTS', []);

    const libraryIndexJson = fs.readFileSync(path.join(MOX, 'knowledge/index.json'), 'utf8');
    setGlobal('fetch', async (u) => {
      const s = String(u);
      if (s.includes('vendor/wllama/compat/wllama.wasm')) {
        return new Response(new Uint8Array([0x00, 0x61, 0x73, 0x6d]), { status: 200 });
      }
      if (s.includes('models/manifest.json')) {
        return new Response(JSON.stringify({
          default: 'smollm2',
          models: [{ id: 'smollm2', name: 'SmolLM2', file: 'smollm2.gguf', bytes: 16, parameters: '135M' }],
          available: [{ id: 'smollm2', name: 'SmolLM2', file: 'smollm2.gguf', bytes: 16, parameters: '135M' }]
        }), { status: 200 });
      }
      if (s.includes('models/smollm2.gguf')) {
        return new Response('GGUF', { status: 200, headers: { 'Content-Length': '4' } });
      }
      if (s.includes('knowledge/index.json')) {
        return new Response(libraryIndexJson, { status: 200 });
      }
      const kMatch = s.match(/knowledge\/(.+)$/);
      if (kMatch) {
        const fp = path.join(MOX, 'knowledge', kMatch[1]);
        if (fs.existsSync(fp)) return new Response(fs.readFileSync(fp, 'utf8'), { status: 200 });
      }
      return new Response('{}', { status: 404 });
    });

    await import(path.join(tmpDir, 'app.js'));
    await new Promise((r) => setTimeout(r, 250));

    const state = window.__mox.state();
    assert.equal(state.modelReady, true, 'fallback ladder recovered instead of falling back to searchOnly');
    assert.equal(state.searchOnly, false);
    assert.equal(state.libraryCount, 58);

    const attempts = globalThis.__MOX_LOAD_ATTEMPTS;
    assert.ok(attempts.length >= 2, `expected multi-step fallback attempts, got ${attempts.length}`);
    const last = attempts[attempts.length - 1];
    assert.equal(last.compatArgs?.mode, 'firefox_safari');
    assert.equal(last.resources.compat, true);
    assert.equal(last.params.n_threads, 1);
    assert.equal(last.params.n_gpu_layers, 0);

    const overviewHits = window.__mox.retrieve('What are all of my repositories?');
    assert.ok(overviewHits.some((h) => h.doc.path.startsWith('repositories/')),
      'overview query matches repositories category');
    const overviewText = overviewHits.map((h) => h.text).join('\n');
    assert.match(overviewText, /theeuhub\.github\.io/i);
    assert.match(overviewText, /Ampler-launcher/i);

    const protonHits = window.__mox.retrieve('Tell me about theeuhub.github.io and proton');
    assert.equal(protonHits[0]?.doc.path, 'repositories/theeuhub-github-io-proton.md');

    const amplerHits = window.__mox.retrieve('How does Ampler-launcher work?');
    assert.equal(amplerHits[0]?.doc.path, 'repositories/ampler-launcher-repository.md');
  } finally {
    for (const [k, desc] of Object.entries(savedGlobals)) {
      if (desc) Object.defineProperty(globalThis, k, desc);
      else delete globalThis[k];
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Vendored wllama + wllama-compat runtime loads bundled SmolLM2 GGUF and generates a reply', async () => {
  const { Worker: NodeWorker, MessageChannel: NodeMessageChannel } = require('node:worker_threads');
  const compatWasm = path.join(MOX, 'vendor/wllama/compat/wllama.wasm');
  const compatJs = path.join(MOX, 'vendor/wllama/compat/wllama.js');
  const mod = new WebAssembly.Module(fs.readFileSync(compatWasm));
  assert.ok(WebAssembly.Module.exports(mod).length > 0);

  const savedGlobals = {};
  const setGlobal = (key, val) => {
    savedGlobals[key] = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value: val, configurable: true, writable: true });
  };

  const blobRegistry = new Map();
  let blobCounter = 1;
  let instance = null;
  try {
    setGlobal('window', globalThis);
    setGlobal('navigator', { userAgent: 'Mozilla/5.0', hardwareConcurrency: 2 });
    setGlobal('MessageChannel', NodeMessageChannel);
    setGlobal('document', { baseURI: 'http://localhost/' });
    setGlobal('URL', class extends URL {});
    globalThis.URL.createObjectURL = (b) => {
      const u = `blob:test-${blobCounter++}`;
      blobRegistry.set(u, b);
      return u;
    };
    globalThis.URL.revokeObjectURL = (u) => blobRegistry.delete(u);

    setGlobal('Worker', class {
      constructor(url) {
        const blob = blobRegistry.get(url);
        this._ready = (async () => {
          const code = await blob.text();
          const bootstrap = `
            const { parentPort } = require('node:worker_threads');
            const nodeFs = require('node:fs');
            globalThis.self = globalThis;
            globalThis.WorkerGlobalScope = function(){};
            globalThis.location = { href: 'http://localhost/' };
            globalThis.WorkerNavigator = function(){};
            globalThis.WorkerNavigator.prototype = {};
            globalThis.navigator = Object.create(globalThis.WorkerNavigator.prototype);
            globalThis.postMessage = (d) => parentPort.postMessage(d);
            globalThis.fetch = async (u) => {
              const s = String(u).replace('http://localhost', '');
              return new Response(nodeFs.readFileSync(s), { status: 200 });
            };
            WebAssembly.instantiateStreaming = async (respPromise, imports) => {
              const resp = await respPromise;
              return WebAssembly.instantiate(await resp.arrayBuffer(), imports);
            };
            Object.defineProperty(globalThis, 'process', { value: undefined, configurable: true });
            ${code}
            parentPort.on('message', (data) => { if (typeof onmessage === 'function') onmessage({ data }); });
          `;
          this._nw = new NodeWorker(bootstrap, { eval: true });
          this._nw.on('message', (data) => { if (this.onmessage) this.onmessage({ data }); });
          this._nw.on('error', (err) => { if (this.onerror) this.onerror(err); });
          return this._nw;
        })();
      }
      async postMessage(data) { (await this._ready).postMessage(data); }
      async terminate() { return (await this._ready).terminate(); }
    });

    setGlobal('fetch', async (u) => {
      const s = String(u).replace('http://localhost', '');
      return new Response(fs.readFileSync(s), { status: 200 });
    });

    const NOOP_CACHE = {
      match: async () => null, put: async () => {}, getSize: async () => -1,
      list: async () => [], delete: async () => {}, getNameFromURL: async (u) => String(u)
    };
    const { Wllama } = await import(path.join(MOX, 'vendor/wllama/wllama.js'));
    instance = new Wllama({ default: compatWasm, 'wllama.wasm': compatWasm }, {
      suppressNativeLog: true,
      cacheManager: NOOP_CACHE
    });
    instance.setCompat({ worker: compatJs, wasm: compatWasm }, 'firefox_safari');

    const gguf = fs.readFileSync(path.join(MOX, 'models/smollm2-135m-instruct-q4_1.gguf'));
    await instance.loadModel([new Blob([gguf])], {
      n_ctx: 512, n_threads: 1, n_batch: 64, n_gpu_layers: 0, jinja: true, seed: 42
    });
    const out = await instance.createChatCompletion({
      messages: [{ role: 'user', content: 'Say hello in 3 words.' }],
      max_tokens: 10,
      temp: 0.1
    });
    assert.ok((out?.choices?.[0]?.message?.content || '').trim().length > 0);
  } finally {
    if (instance) await instance.exit().catch(() => {});
    for (const [k, desc] of Object.entries(savedGlobals)) {
      if (desc) Object.defineProperty(globalThis, k, desc);
      else delete globalThis[k];
    }
  }
});

test('wllama runtime rejects cleanly on non-string signal.abort, worker.onerror, and single-thread memory step-down', async () => {
  const { MessageChannel: NodeMessageChannel } = require('node:worker_threads');
  const wllamaSrc = fs.readFileSync(path.join(MOX, 'vendor/wllama/wllama.js'), 'utf8');
  assert.ok(wllamaSrc.includes('wasmMemory: getWasmMemory()'), 'single-thread mode should also use getWasmMemory() step-down');
  assert.ok(wllamaSrc.includes('while (maxBytes >= minBytes)'), 'getWasmMemory() should include the 128 MB step');
  assert.ok(wllamaSrc.includes("self.addEventListener('unhandledrejection'"), 'worker should forward async createWasm/pthread rejections');
  assert.ok(wllamaSrc.includes('this.worker.onmessageerror='), 'ProxyToWorker should hook onmessageerror');

  const savedGlobals = {};
  const setGlobal = (key, val) => {
    savedGlobals[key] = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value: val, configurable: true, writable: true });
  };
  try {
    setGlobal('self', globalThis);
    setGlobal('location', { href: 'http://localhost/' });
    setGlobal('navigator', { userAgent: 'Mozilla/5.0', hardwareConcurrency: 2 });
    setGlobal('MessageChannel', NodeMessageChannel);
    setGlobal('URL', class extends URL {});
    globalThis.URL.createObjectURL = () => 'blob:mock/err';
    globalThis.URL.revokeObjectURL = () => {};
    setGlobal('fetch', async () => new Response('var Module={};', { status: 200 }));

    const NOOP_CACHE = {
      match: async () => null, put: async () => {}, getSize: async () => -1,
      list: async () => [], delete: async () => {}, getNameFromURL: async (u) => String(u)
    };
    const { Wllama } = await import(`${path.join(MOX, 'vendor/wllama/wllama.js')}?t=err`);

    setGlobal('Worker', class {
      constructor() {
        setTimeout(() => {
          this.onmessage?.({ data: { verb: 'signal.abort', args: ['abort', { message: 'bad wasm binary' }, undefined, null] } });
        }, 10);
      }
      postMessage() {}
      terminate() {}
    });
    const w1 = new Wllama({ default: 'http://localhost/w.wasm' }, {
      suppressNativeLog: true, cacheManager: NOOP_CACHE, logger: { debug() {}, log() {}, warn() {}, error() {} }
    });
    w1.setCompat({ worker: 'http://localhost/c.js', wasm: 'http://localhost/c.wasm' }, 'firefox_safari');
    await assert.rejects(
      () => w1.loadModel([new Blob(['gguf'])], { n_threads: 1, n_gpu_layers: 0 }),
      /bad wasm binary/
    );

    setGlobal('Worker', class {
      constructor() {
        setTimeout(() => { this.onerror?.({ message: 'Worker script error' }); }, 10);
      }
      postMessage() {}
      terminate() {}
    });
    const w2 = new Wllama({ default: 'http://localhost/w.wasm' }, {
      suppressNativeLog: true, cacheManager: NOOP_CACHE, logger: { debug() {}, log() {}, warn() {}, error() {} }
    });
    w2.setCompat({ worker: 'http://localhost/c.js', wasm: 'http://localhost/c.wasm' }, 'firefox_safari');
    await assert.rejects(
      () => w2.loadModel([new Blob(['gguf'])], { n_threads: 1, n_gpu_layers: 0 }),
      /Worker script error/
    );
  } finally {
    for (const [k, desc] of Object.entries(savedGlobals)) {
      if (desc) Object.defineProperty(globalThis, k, desc);
      else delete globalThis[k];
    }
  }
});

test('Mox handles 501 HEAD, non-Range 200 stream abort, partial JSPI, missing sw.js, and worker fallback without hanging', async () => {
  const http = require('node:http');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mox-server-compat-'));
  const html = fs.readFileSync(path.join(MOX, 'index.html'), 'utf8');
  const savedGlobals = {};
  const setGlobal = (key, val) => {
    savedGlobals[key] = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value: val, configurable: true, writable: true });
  };

  let headReqs = 0;
  let rangeProbeRequests = 0;
  let abortedFullProbe = false;
  let swRegistered = false;
  const externalUrls = [];

  const srv = http.createServer((req, res) => {
    const clean = (req.url || '/').split('?')[0];
    if (req.method === 'HEAD') {
      headReqs++;
      res.writeHead(501);
      res.end();
      return;
    }
    if (clean === '/models/manifest.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        version: 1,
        default: 'tiny',
        models: [{ id: 'tiny', name: 'Tiny', file: 'tiny.gguf', bytes: 1024, context: 2048 }]
      }));
      return;
    }
    if (clean === '/knowledge/index.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ version: 1, generated: '2026-11-14', categories: [], documents: [] }));
      return;
    }
    if (clean === '/models/tiny.gguf' || clean === '/vendor/wllama/compat/wllama.wasm') {
      if (req.headers.range) {
        // Simulate server ignoring Range: bytes=0-0 and sending a slow large 200 stream
        const totalSize = 512 * 1024;
        res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': String(totalSize) });
        rangeProbeRequests++;
        let sent = 0;
        const timer = setInterval(() => {
          if (res.destroyed || res.closed) { clearInterval(timer); return; }
          res.write(Buffer.alloc(16384, 0x41));
          sent += 16384;
          if (sent >= totalSize) { clearInterval(timer); res.end(); }
        }, 5);
        res.on('close', () => { clearInterval(timer); if (sent < totalSize) abortedFullProbe = true; });
      } else {
        const body = Buffer.from('GGUF_DATA');
        res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': String(body.length) });
        res.end(body);
      }
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    for (const file of ['calculator.js', 'model-store.js', 'svg.js', 'workspace.js']) {
      fs.copyFileSync(path.join(MOX, file), path.join(tmpDir, file));
    }
    fs.mkdirSync(path.join(tmpDir, 'vendor/wllama/compat'), { recursive: true });
    // First Wllama attempt fails, second succeeds (simulates fallback without hanging)
    fs.writeFileSync(path.join(tmpDir, 'vendor/wllama/wllama.js'), `
      let calls = 0;
      export class Wllama {
        setCompat(c) { this._compat = c; }
        async loadModel() {
          calls++;
          if (calls === 1) throw new Error('Attempt 1 stalled');
          return true;
        }
        async createChatCompletion() { return { choices: [{ message: { content: 'ok' } }] }; }
        async exit() {}
      }
    `);
    fs.writeFileSync(path.join(tmpDir, 'app.js'), fs.readFileSync(path.join(MOX, 'app.js'), 'utf8'));

    const dom = new JSDOM(html, {
      url: `${baseUrl}/index.html`,
      beforeParse(win) {
        // Partial JSPI (Suspending without promising) must not select native WASM
        win.WebAssembly.Suspending = (fn) => fn;
        delete win.WebAssembly.promising;
        Object.defineProperty(win.navigator, 'serviceWorker', {
          value: { register: async () => { swRegistered = true; return {}; } },
          configurable: true
        });
      }
    });
    for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'Event', 'KeyboardEvent',
      'CustomEvent', 'MutationObserver', 'DOMParser', 'localStorage', 'AbortController', 'navigator', 'location']) {
      setGlobal(key, dom.window[key]);
    }
    setGlobal('requestAnimationFrame', (fn) => setTimeout(fn, 0));
    const nativeFetch = globalThis.fetch;
    const tmpFilePrefix = `file://${tmpDir}`;
    setGlobal('fetch', (u, o) => {
      let target = typeof u === 'string' ? new URL(u, `${baseUrl}/index.html`).href : String(u?.url || u);
      if (target.startsWith(tmpFilePrefix)) target = `${baseUrl}${target.slice(tmpFilePrefix.length)}`;
      if (!target.startsWith(baseUrl)) externalUrls.push(target);
      return nativeFetch(target, o);
    });

    await import(`${path.join(tmpDir, 'app.js')}?srv=${Date.now()}`);
    const t0 = Date.now();
    while (Date.now() - t0 < 3000) {
      const cur = dom.window.__mox?.state();
      if (cur?.modelReady || cur?.searchOnly) break;
      await new Promise((r) => setTimeout(r, 25));
    }

    const st = dom.window.__mox.state();
    assert.equal(st.modelReady, true, 'model should finish via fallback despite 501 HEAD');
    assert.deepEqual(st.availableModels, ['tiny']);
    assert.ok(headReqs >= 2, 'HEAD probes were attempted');
    assert.ok(rangeProbeRequests >= 2, 'Range fallback probes ran on 501 HEAD');
    assert.equal(abortedFullProbe, true, 'non-Range 200 probe stream must be aborted immediately');
    assert.equal(swRegistered, false, 'missing sw.js must be skipped without calling serviceWorker.register');
    assert.deepEqual(externalUrls, [], 'must not contact any external CDN');
  } finally {
    srv.close();
    for (const [k, desc] of Object.entries(savedGlobals)) {
      if (desc) Object.defineProperty(globalThis, k, desc);
      else delete globalThis[k];
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
