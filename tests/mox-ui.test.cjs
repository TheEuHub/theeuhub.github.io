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
