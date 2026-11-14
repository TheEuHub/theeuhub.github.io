/* Standalone browser tab host for proton's VLC player.
 * Boots apps/media/media/app.html outside core.js so both the desktop window
 * and a popped-out browser tab share one player, playlist and hotkey set. */
'use strict';

(() => {
  const params = new URLSearchParams(location.search);
  const kind = params.get('kind') || '';
  const src = params.get('src') || '';
  const name = params.get('name') || '';
  const userParam = (params.get('user') || '').toLowerCase();
  const accountParam = params.get('account') || '';
  const startAt = parseFloat(params.get('t') || '0') || 0;
  const rate = parseFloat(params.get('rate') || '1') || 1;

  if (name) document.title = `${name} — VLC`;

  if (!window.crossOriginIsolated && 'serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('coi-serviceworker.js').then((reg) => {
      if (reg && !navigator.serviceWorker.controller && !sessionStorage.getItem('proton.vlc.coiReload')) {
        sessionStorage.setItem('proton.vlc.coiReload', '1');
        location.reload();
      }
    }).catch(() => {});
  }

  /* Restore read-only account context so FS.readBlob() sees the user's VFS. */
  if (typeof MH !== 'undefined') {
    const accounts = MH.accounts();
    if (userParam && accounts[userParam]) {
      window.currentUser = accounts[userParam];
      window.userData = MH.loadData(userParam, accounts[userParam].displayName || accountParam || userParam);
    } else if (userParam) {
      window.currentUser = { username: accountParam || userParam, usernameLower: userParam, displayName: accountParam || userParam };
      window.userData = MH.loadData(userParam, accountParam || userParam);
    }
  }

  if (typeof window.bar !== 'function') {
    window.bar = (title, controls = '') => `<div class="appbar"><h2>${MH.esc(title)}</h2>${controls}</div>`;
  }
  if (typeof window.APPS === 'undefined') {
    window.APPS = { media: { id: 'media', name: 'VLC', icon: 'data/icons/vlc.png', svgIcon: false } };
  }

  let registered = null;
  window.registerApp = (def) => { registered = def; };

  async function bootTab() {
    const body = document.getElementById('vlc-tab-body');
    if (!body) return;
    body.tabIndex = -1;
    try {
      const resp = await fetch('apps/media/media/app.html');
      const text = await resp.text();
      const doc = new DOMParser().parseFromString(text, 'text/html');
      const scriptEl = doc.querySelector('script[data-proton-app]');
      if (!scriptEl) throw new Error('VLC app module block missing');
      const s = document.createElement('script');
      s.textContent = scriptEl.textContent;
      document.body.appendChild(s);
      s.remove();
      if (!registered || typeof registered.render !== 'function') {
        throw new Error('VLC app module failed to register');
      }
      registered.render(body, {
        tab: true,
        kind,
        path: kind === 'vfs' ? src : '',
        url: kind === 'url' ? src : '',
        name,
        startAt,
        rate,
      });
      body.focus();
    } catch (err) {
      body.innerHTML = `<div class="pad"><h3>Could not load VLC</h3><p class="muted">${MH.esc(err?.message || String(err))}</p></div>`;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootTab);
  else bootTab();
})();
