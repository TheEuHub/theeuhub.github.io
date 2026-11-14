/* ═══════════════════════════════════════════════════════════════
   OldOS · Web Edition — kernel
   Boot, lock screen, springboard, app framework, sounds, settings
   ═══════════════════════════════════════════════════════════════ */
'use strict';
window.OldOS = (function () {

  /* ─── tiny helpers ─────────────────────────────────────────── */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const pad2 = n => String(n).padStart(2, '0');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  /* ─── persistent store (localStorage with in-memory fallback) ── */
  const memoryStore = new Map();
  const hasLS = (() => {
    try { const k = 'oldos.__probe'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; }
    catch (e) { return false; }
  })();
  const store = {
    get(key, fallback) {
      try {
        const raw = hasLS ? localStorage.getItem('oldos.' + key) : (memoryStore.has('oldos.' + key) ? memoryStore.get('oldos.' + key) : null);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, val) {
      try {
        const raw = JSON.stringify(val);
        if (hasLS) localStorage.setItem('oldos.' + key, raw); else memoryStore.set('oldos.' + key, raw);
      } catch (e) { console.warn('[OldOS] store full?', e); }
    },
    remove(key) { try { if (hasLS) localStorage.removeItem('oldos.' + key); else memoryStore.delete('oldos.' + key); } catch (e) {} },
    clearAll() {
      try {
        const keys = hasLS ? Object.keys(localStorage) : [...memoryStore.keys()];
        keys.filter(k => k.startsWith('oldos.')).forEach(k => { if (hasLS) localStorage.removeItem(k); else memoryStore.delete(k); });
      } catch (e) {}
      try { indexedDB.deleteDatabase('oldos-memos'); } catch (e) {}
    }
  };

  /* ─── settings ──────────────────────────────────────────────── */
  const DEFAULT_SETTINGS = {
    airplane: false,
    wifi: 'TheEuHub-5G',
    carrier: 'TheEuHub',
    brightness: 0.85,
    wallpaper: 'wallpaper_13',
    sounds: { unlock: true, tones: true, keys: true },
    badges: { mail: true, messages: true, phone: true },
    autolock: 1, /* minutes, 0 = never */
    passcode: null
  };
  const saved = store.get('settings', {});
  const settings = Object.assign({}, DEFAULT_SETTINGS, saved, {
    sounds: Object.assign({}, DEFAULT_SETTINGS.sounds, saved.sounds || {}),
    badges: Object.assign({}, DEFAULT_SETTINGS.badges, saved.badges || {})
  });
  const saveSettings = () => store.set('settings', settings);

  const WALLPAPERS = [
    ['wallpaper_1','Water Droplets'],['wallpaper_2','Granite'],['wallpaper_3','Metal Scratch'],['wallpaper_4','Waterline'],
    ['wallpaper_5','Waves'],['wallpaper_6','Carbon'],['wallpaper_7','Foliage'],['wallpaper_8','Sunrise'],
    ['wallpaper_9','Droid 13'],['wallpaper_10','Droid 14'],['wallpaper_11','Droid 17'],['wallpaper_12','Droid 16'],
    ['wallpaper_13','City Lattice'],['wallpaper_14','Aurora Fields'],['wallpaper_15','Neon Leaves'],['wallpaper_16','Cathedral Panes'],
    ['wallpaper_17','Rose Circuit'],['wallpaper_18','Ember Rock'],['wallpaper_19','Frozen Lake'],['wallpaper_20','Desert Bloom'],
    ['wallpaper_21','Koi Pond'],['wallpaper_22','Midnight Dunes'],['wallpaper_23','Orchid Maze'],['wallpaper_24','Teal Veil'],
    ['wallpaper_25','Glass Circuit'],['wallpaper_26','Ion Storm'],['wallpaper_27','Ivory Web']
  ];

  /* ─── Web Audio kit ─────────────────────────────────────────── */
  const audio = (() => {
    let ctx = null;
    const ac = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());
    const tone = (freq, { type = 'sine', dur = 0.18, vol = 0.22, when = 0, glide = null } = {}) => {
      try {
        const a = ac(), t0 = a.currentTime + when;
        const o = a.createOscillator(), g = a.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, t0);
        if (glide) o.frequency.exponentialRampToValueAtTime(glide, t0 + dur);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g).connect(a.destination);
        o.start(t0); o.stop(t0 + dur + 0.02);
      } catch (e) {}
    };
    const noise = ({ dur = 0.1, vol = 0.25, when = 0, type = 'bandpass', freq = 1800, q = 1.2, glide = null } = {}) => {
      try {
        const a = ac(), t0 = a.currentTime + when;
        const len = Math.max(1, Math.floor(a.sampleRate * dur));
        const buf = a.createBuffer(1, len, a.sampleRate);
        const ch = buf.getChannelData(0);
        for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = a.createBufferSource(); src.buffer = buf;
        const f = a.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
        if (glide) f.frequency.exponentialRampToValueAtTime(glide, t0 + dur);
        const g = a.createGain();
        g.gain.setValueAtTime(vol, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(f).connect(g).connect(a.destination);
        src.start(t0);
      } catch (e) {}
    };
    const DTMF = { '1':[697,1209],'2':[697,1336],'3':[697,1477],'4':[770,1209],'5':[770,1336],'6':[770,1477],'7':[852,1209],'8':[852,1336],'9':[852,1477],'*':[941,1209],'0':[941,1336],'#':[941,1477] };
    return {
      resume() { try { ac().resume(); } catch (e) {} },
      click() { if (settings.sounds.keys) tone(2100, { type: 'square', dur: 0.028, vol: 0.05 }); },
      key(k) {
        if (!settings.sounds.keys) return;
        const f = DTMF[k]; if (!f) return;
        [f[0], f[1]].forEach(fr => tone(fr, { type: 'sine', dur: 0.14, vol: 0.16 }));
      },
      unlock() {
        if (!settings.sounds.unlock) return;
        noise({ dur: 0.07, vol: 0.3, freq: 2600, q: 0.8, type: 'highpass' });
        tone(1567, { type: 'sine', dur: 0.1, vol: 0.18, when: 0.05 });
        tone(2093, { type: 'sine', dur: 0.22, vol: 0.2, when: 0.11 });
      },
      lock() { if (settings.sounds.unlock) { tone(1046, { type: 'sine', dur: 0.07, vol: 0.14 }); tone(659, { type: 'sine', dur: 0.12, vol: 0.14, when: 0.07 }); } },
      triTone() {
        if (!settings.sounds.tones) return;
        [880, 1108.7, 1479.9].forEach((f, i) => tone(f, { type: 'sine', dur: 0.24, vol: 0.22, when: i * 0.11 }));
      },
      sendWhoosh() { if (settings.sounds.tones) noise({ dur: 0.28, vol: 0.22, freq: 900, glide: 3400, q: 2.4 }); },
      error() { if (settings.sounds.keys) { tone(196, { type: 'square', dur: 0.09, vol: 0.16 }); tone(147, { type: 'square', dur: 0.16, vol: 0.16, when: 0.11 }); } },
      shutter() {
        noise({ dur: 0.045, vol: 0.5, freq: 2000, q: 0.6 });
        noise({ dur: 0.08, vol: 0.4, freq: 1100, when: 0.07, q: 0.7 });
        tone(5200, { type: 'square', dur: 0.03, vol: 0.06, when: 0.02 });
      },
      marimba(freq, when = 0) {
        tone(freq, { type: 'sine', dur: 0.5, vol: 0.3, when });
        tone(freq * 4, { type: 'sine', dur: 0.18, vol: 0.07, when });
      },
      alarmChime() {
        const seq = [659.3, 783.9, 1046.5, 783.9, 659.3, 1046.5];
        seq.forEach((f, i) => this.marimba(f, i * 0.22));
      },
      timerRing() {
        for (let i = 0; i < 12; i++) this.marimba(1568, i * 0.13);
      },
      mailNew() {
        if (!settings.sounds.tones) return;
        noise({ dur: 0.18, vol: 0.18, freq: 1500, glide: 3600, q: 2 });
        tone(1174.7, { type: 'sine', dur: 0.18, vol: 0.14, when: 0.14 });
      }
    };
  })();

  /* ─── element refs (bound on init) ──────────────────────────── */
  let els = {};

  /* ─── time ──────────────────────────────────────────────────── */
  const timeStrings = () => {
    const d = new Date();
    let h = d.getHours();
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    return { hm: h + ':' + pad2(d.getMinutes()), ap, full: h + ':' + pad2(d.getMinutes()) + ' ' + ap };
  };
  const tickClock = () => {
    const { hm, ap, full } = timeStrings();
    els.sbTime.textContent = full;
    els.lsTime.textContent = hm;
    const d = new Date();
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    els.lsDate.textContent = days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate();
  };

  /* ─── battery ───────────────────────────────────────────────── */
  const paintBattery = pct => {
    els.sbBattPct.textContent = Math.round(pct) + '%';
    els.sbBattFill.style.width = clamp(pct, 4, 100) + '%';
    els.sbBattFill.classList.toggle('low', pct <= 20);
  };
  const initBattery = () => {
    if (navigator.getBattery) {
      navigator.getBattery().then(b => {
        const upd = () => paintBattery(Math.round(b.level * 100));
        upd();
        b.addEventListener('levelchange', upd);
      }).catch(() => paintBattery(100));
    } else paintBattery(100);
  };

  /* ─── settings application ──────────────────────────────────── */
  const applySettings = () => {
    els.wallpaper.style.backgroundImage = 'url("assets/wallpapers/' + encodeURIComponent(settings.wallpaper) + '.jpg")';
    els.brightnessDim.style.opacity = String((1 - clamp(settings.brightness, 0.15, 1)) * 0.62);
    els.statusbar.classList.toggle('airplane', !!settings.airplane);
    const noSim = settings.carrier === 'No SIM';
    els.sbCarrier.textContent = settings.airplane ? 'Airplane Mode' : (noSim ? 'No Service' : settings.carrier);
    els.sbBars.classList.toggle('offline', !!settings.airplane || noSim);
    saveSettings();
    resetAutolock();
  };

  /* ─── lock / unlock ─────────────────────────────────────────── */
  let locked = true;
  const resetAutolock = () => {
    clearTimeout(resetAutolock._t);
    if (locked) return;
    const mins = +settings.autolock || 0;
    if (mins > 0) resetAutolock._t = setTimeout(() => lock(true), mins * 60 * 1000);
  };
  const lock = (silent) => {
    if (locked) return;
    locked = true;
    if (!silent) audio.lock();
    els.lockScreen.classList.remove('hidden-up');
    closeMultitask();
    exitEditing();
    closeFolder();
  };
  const unlock = (gotoApp) => {
    locked = false;
    els.lockScreen.classList.add('hidden-up');
    els.springboard.classList.add('on');
    audio.unlock();
    resetAutolock();
    if (gotoApp) setTimeout(() => launchApp(gotoApp), 240);
  };
  const requestUnlock = (gotoApp) => {
    if (settings.passcode) openPasscode(() => unlock(gotoApp));
    else unlock(gotoApp);
  };

  /* ─── passcode ──────────────────────────────────────────────── */
  let pcBuffer = '', pcCallback = null, pcMode = 'unlock';
  const openPasscode = (cb, mode) => {
    pcBuffer = ''; pcCallback = cb || null; pcMode = mode || 'unlock';
    $('#pcTitle').textContent = pcMode === 'set' ? 'Set New Passcode' : pcMode === 'confirm' ? 'Confirm Passcode' : 'Enter Passcode';
    paintPcDots();
    els.passcode.hidden = false;
    els.passcode.classList.remove('shake');
  };
  const closePasscode = () => { els.passcode.hidden = true; pcBuffer = ''; pcCallback = null; };
  const paintPcDots = () => $$('#pcDots i').forEach((d, i) => d.classList.toggle('filled', i < pcBuffer.length));
  const pcInput = digit => {
    if (pcBuffer.length >= 4) return;
    pcBuffer += digit; audio.click(); paintPcDots();
    if (pcBuffer.length === 4) setTimeout(pcSubmit, 140);
  };
  const pcSubmit = () => {
    if (pcMode === 'set') { /* stash and ask confirm */
      const first = pcBuffer; pcBuffer = '';
      pcMode = 'confirm'; openPasscode(pcCallback, 'confirm');
      openPasscode._first = first; paintPcDots();
      $('#pcTitle').textContent = 'Confirm Passcode';
      return;
    }
    if (pcMode === 'confirm') {
      if (pcBuffer === openPasscode._first) {
        settings.passcode = pcBuffer; saveSettings(); closePasscode();
        showBanner('Passcode Lock', 'Passcode enabled. Your secrets are safe.');
      } else {
        els.passcode.classList.add('shake'); audio.error();
        pcBuffer = ''; pcMode = 'set'; $('#pcTitle').textContent = 'Set New Passcode';
        setTimeout(paintPcDots, 60);
      }
      return;
    }
    if (settings.passcode === pcBuffer) { const cb = pcCallback; closePasscode(); if (cb) cb(); }
    else {
      els.passcode.classList.add('shake'); audio.error(); pcBuffer = '';
      setTimeout(paintPcDots, 60);
    }
  };

  /* ─── springboard data ──────────────────────────────────────── */
  const STOCK_LAYOUT = {
    pages: [
      ['messages','calendar','photos','camera','youtube','stocks','maps','weather','notes','folder:utilities','itunes','appstore','gamecenter','settings'],
      ['contacts']
    ],
    dock: ['phone','mail','safari','ipod'],
    folders: { utilities: { id: 'utilities', name: 'Utilities', apps: ['clock','calculator','compass','voicememos'] } }
  };
  const APPS = {}; /* id -> {name, icon, noBadge?, smallIcon?} */
  const APP_DEFS = [
    ['messages','Messages','Messages'],['calendar','Calendar','Calendar'],['photos','Photos','Photos'],['camera','Camera','Camera'],
    ['youtube','YouTube','YouTube'],['stocks','Stocks','Stocks'],['maps','Maps','Maps'],['weather','Weather','Weather Fahrenheit'],
    ['notes','Notes','Notes'],['itunes','iTunes','iTunes'],['appstore','App Store','App Store'],['gamecenter','Game Center','Game Center'],
    ['settings','Settings','Settings'],['contacts','Contacts','Contacts'],['phone','Phone','Phone'],['mail','Mail','Mail'],
    ['safari','Safari','Safari'],['ipod','iPod','iPod'],['clock','Clock','Clock'],['calculator','Calculator','Calculator'],
    ['compass','Compass','Compass'],['voicememos','Voice Memos','Voice Memos']
  ];
  APP_DEFS.forEach(([id, name, icon]) => { APPS[id] = { id, name, icon: 'assets/icons/' + icon + '.png' }; });

  const installedApps = () => store.get('installed', []);
  const saveInstalled = list => store.set('installed', list);

  /* badges: read straight from stores */
  const badgeFor = id => {
    if (id === 'messages') {
      if (!settings.badges.messages) return 0;
      const m = store.get('messages', null);
      if (!m || !m.threads) return 2;
      return m.threads.reduce((sum, t) => sum + (t.unread || 0), 0);
    }
    if (id === 'mail') {
      if (!settings.badges.mail) return 0;
      const m = store.get('mail', { read: {}, trash: [], extra: [] });
      const extraUnread = (m.extra || []).filter(e => !(m.read || {})[e.id]).length;
      const seedUnread = SEED_MAILS.filter(e => e.unread && !(m.read || {})[e.id] && !(m.trash || []).includes(e.id)).length;
      return seedUnread + extraUnread;
    }
    if (id === 'phone') {
      if (!settings.badges.phone) return 0;
      const v = store.get('voicemail', { heard: [] });
      return VOICEMAILS.filter(vm => !(v.heard || []).includes(vm.id)).length;
    }
    return 0;
  };

  /* seed data shared with apps */
  const SEED_MAILS = [
    { id: 'seed-1', from: 'Apple', subject: 'Welcome to your new iPhone!', preview: 'Congratulations — and may we suggest…', body: 'Congratulations on your new iPhone 4.\n\nTo get started, tap any icon. Seriously, they all work. Safari goes to the web. iPod plays synthesized chiptunes (we know, we know). The Utilities folder hides Clock, Calculator, Compass and Voice Memos.\n\nSet your wallpaper in Settings. Show off to your friends. Remember 2010 fondly.\n\n— The OldOS Team', date: 'Jun 7, 2010', unread: true, seed: true },
    { id: 'seed-2', from: 'Zane (zzanehip)', subject: 'OldOS 2.0 is OUT', preview: 'Clock, Calculator, and the new homescreen…', body: 'Hey!\n\nVersion 2.0 of OldOS is finally here. The clock got a full rework, the calculator was rebuilt, and the homescreen icons are crisper than ever — even on iOS 26.\n\nAnd hey — someone seems to have rebuilt the whole thing in HTML5. You’re using it right now. Meta, right?\n\n— Zane', date: 'Nov 1, 2026', unread: true, seed: true },
    { id: 'seed-3', from: 'iTunes Store', subject: 'Your receipt', preview: 'Thank you for your purchase of…', body: 'Dear Customer,\n\nThank you for your purchase.\n\n  1 × “Silicon Sunrise” — The Web Audio Synth Engine … FREE\n  1 × “Pocket Symphony No. 4” — 8-Bit Heart …… $0.99\n\nYour card ending in •••• 2010 was charged $0.99.\n\nEnjoy the music.\n\n— iTunes Store', date: 'Nov 3, 2026', unread: true, seed: true },
    { id: 'seed-4', from: 'Maya', subject: 'release checklist', preview: 'lock screen, jiggle mode, the works', body: 'ok the checklist:\n\n1. slide to unlock feels right\n2. jiggle mode on long-press\n3. multitasking tray on double home\n4. badges clear when read\n5. DON’T ship without testing calculator ±\n\nyou’ve got this.\n\n— M', date: 'Nov 6, 2026', unread: false, seed: true },
    { id: 'seed-5', from: 'The Verge? No — TheEuHub Gazette', subject: 'Local developer ships time machine', preview: '“It was the water droplets,” sources say', body: 'CUPERTINO-ADJACENT, TX — A local developer has shipped what experts are calling “a working 2010 in a browser tab,” complete with slide-to-unlock, a functioning Game Center, and weather that actually knows it’s 84° outside.\n\n“It was the water droplets,” the developer told reporters. “Everything else followed.”\n\nMore at 11.', date: 'Nov 9, 2026', unread: false, seed: true }
  ];
  const VOICEMAILS = [
    { id: 'vm-1', from: 'Maya', num: '(210) 555-0147', dur: 14, date: 'Yesterday, 6:42 PM', transcript: 'Hey, it’s Maya. The build finally passed and the springboard is buttery. Call me when you’re back from the retro computing meetup.' },
    { id: 'vm-2', from: 'Unknown', num: '(800) 555-0199', dur: 8, date: 'Monday, 2:15 PM', transcript: 'Congratulations! You have been selected to win an iPod shuffle. Please hold for the next available operator from 2004.' },
    { id: 'vm-3', from: 'Mom', num: '(210) 555-0119', dur: 21, date: 'Sunday, 11:03 AM', transcript: 'Hi sweetheart, your father and I figured out the slide to unlock thing. You were right, it’s delightful. Your father wants to know if it has Angry Birds. Tell him it does not.' }
  ];

  /* ─── render springboard ─────────────────────────────────────── */
  let editMode = false;
  const layoutSignature = () => installedApps().map(a => a.id).join(',');

  const iconHTML = (id, opts = {}) => {
    const app = APPS[id];
    if (!app) return '';
    const badge = badgeFor(id);
    const removable = opts.removable ? ' removable' : '';
    return '<button class="icon' + (opts.dock ? ' dock-icon' : '') + removable + '" data-app="' + esc(id) + '" style="--d:' + ((Math.random() * 0.14).toFixed(2)) + 's" aria-label="' + esc(app.name) + '">'
      + '<span class="icon-img"><img src="' + app.icon + '" alt="' + esc(app.name) + '" width="59" height="60" draggable="false">'
      + (badge > 0 ? '<span class="badge">' + badge + '</span>' : '')
      + (opts.removable ? '<span class="icon-x" data-x="' + esc(id) + '" aria-hidden="true">✕</span>' : '')
      + '</span><span class="icon-label">' + esc(app.name) + '</span></button>';
  };

  const folderHTML = f => {
    const minis = f.apps.slice(0, 9).map(a => {
      const app = APPS[a];
      const small = app ? 'assets/icons/small/' + encodeURI(app.name + '-Small.png') : '';
      return '<img src="' + (small || app.icon) + '" alt="" onerror="this.onerror=null;this.src=&quot;' + app.icon + '&quot;">';
    }).join('');
    return '<button class="icon folder-icon" data-folder="' + esc(f.id) + '" style="--d:0.05s" aria-label="' + esc(f.name) + ' folder">'
      + '<span class="icon-img"><span class="folder-mini-grid">' + minis + '</span></span>'
      + '<span class="icon-label">' + esc(f.name) + '</span></button>';
  };

  const renderInstalledIntoPage1 = pageEl => {
    installedApps().forEach(rec => {
      const b = document.createElement('button');
      b.className = 'icon removable';
      b.dataset.app = 'installed:' + rec.id;
      b.dataset.installed = rec.id;
      b.style.setProperty('--d', (Math.random() * 0.14).toFixed(2) + 's');
      b.setAttribute('aria-label', rec.name);
      b.innerHTML = '<span class="icon-img"><canvas width="118" height="120" aria-hidden="true"></canvas>'
        + '<span class="icon-x" data-x="installed:' + esc(rec.id) + '" aria-hidden="true">✕</span></span>'
        + '<span class="icon-label">' + esc(rec.name) + '</span>';
      pageEl.appendChild(b);
      drawInstalledIcon(b.querySelector('canvas'), rec);
    });
  };

  const drawInstalledIcon = (canvas, rec) => {
    try {
      const ctx = canvas.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, 0, 120);
      const h = rec.hue != null ? rec.hue : (rec.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % 360);
      g.addColorStop(0, 'hsl(' + h + ',72%,68%)');
      g.addColorStop(0.5, 'hsl(' + h + ',65%,48%)');
      g.addColorStop(1, 'hsl(' + h + ',70%,30%)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 118, 120);
      /* gloss */
      const gg = ctx.createLinearGradient(0, 0, 0, 62);
      gg.addColorStop(0, 'rgba(255,255,255,.55)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gg; ctx.fillRect(0, 0, 118, 60);
      ctx.fillStyle = 'rgba(255,255,255,.96)';
      ctx.font = '800 56px "Helvetica Neue", Helvetica, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
      ctx.fillText((rec.name || '?').trim().charAt(0).toUpperCase(), 59, 68);
    } catch (e) {}
  };

  const renderSpringboard = () => {
    const page0 = $('#page0'), page1 = $('#page1');
    page0.innerHTML = STOCK_LAYOUT.pages[0].map(id => {
      if (id.startsWith('folder:')) return folderHTML(STOCK_LAYOUT.folders[id.slice(7)]);
      return iconHTML(id);
    }).join('');
    page1.innerHTML = STOCK_LAYOUT.pages[1].map(id => iconHTML(id)).join('');
    renderInstalledIntoPage1(page1);
    $('#dock').innerHTML = STOCK_LAYOUT.dock.map(id => iconHTML(id, { dock: true })).join('');
    renderDots();
  };

  const refreshBadges = () => {
    $$('.icon[data-app]').forEach(icon => {
      const id = icon.dataset.app;
      const imgWrap = icon.querySelector('.icon-img');
      if (!imgWrap) return;
      const old = imgWrap.querySelector('.badge');
      const n = id.startsWith('installed:') ? 0 : badgeFor(id);
      if (old) old.remove();
      if (n > 0) {
        const b = document.createElement('span');
        b.className = 'badge'; b.textContent = n > 99 ? '99+' : n;
        imgWrap.appendChild(b);
      }
    });
  };

  /* ─── paging ────────────────────────────────────────────────── */
  const PAGE_COUNT = 3; /* spotlight, page0, page1 */
  let pageIndex = 1;   /* start on home page */
  const pager = { dragging: false, startX: 0, dx: 0, width: 320 };

  const renderDots = () => {
    $('#pageDots').innerHTML = [0, 1].map(i =>
      '<button class="page-dot' + (pageIndex === i + 1 ? ' active' : '') + '" data-dot="' + (i + 1) + '" aria-label="Page ' + (i + 1) + '"></button>'
    ).join('');
  };
  const goPage = i => {
    pageIndex = clamp(i, 0, PAGE_COUNT - 1);
    $('#pagesTrack').style.transform = 'translateX(' + (-pageIndex * 320) + 'px)';
    renderDots();
  };

  const initPager = () => {
    const vp = $('#pagesViewport');
    const track = $('#pagesTrack');
    let startScroll = 0;
    vp.addEventListener('pointerdown', e => {
      if (e.target.closest('input,textarea,.spotlight-results')) return;
      pager.dragging = true; pager.startX = e.clientX; pager.dx = 0;
      pager.scale = vp.getBoundingClientRect().width / 320;
      track.classList.add('dragging');
      vp.setPointerCapture(e.pointerId);
    });
    vp.addEventListener('pointermove', e => {
      if (!pager.dragging) return;
      pager.dx = (e.clientX - pager.startX) / (pager.scale || 1);
      const base = -pageIndex * 320;
      let t = base + pager.dx;
      /* rubber-band at edges */
      if (t > 0) t = t * 0.35;
      if (t < -(PAGE_COUNT - 1) * 320) t = -(PAGE_COUNT - 1) * 320 + (t + (PAGE_COUNT - 1) * 320) * 0.35;
      track.style.transform = 'translateX(' + t + 'px)';
    });
    const endDrag = () => {
      if (!pager.dragging) return;
      pager.dragging = false;
      track.classList.remove('dragging');
      const dx = pager.dx;
      if (Math.abs(dx) > 52) goPage(pageIndex + (dx < 0 ? 1 : -1));
      else goPage(pageIndex);
      if (Math.abs(dx) > 9) lastDragAt = Date.now();
      pager.dx = 0;
    };
    vp.addEventListener('pointerup', endDrag);
    vp.addEventListener('pointercancel', endDrag);
    goPage(1);   /* land on the icon grid, not the Spotlight void */
  };
  let lastDragAt = 0;
  const wasSwipe = () => Date.now() - lastDragAt < 180;

  /* ─── folder overlay ─────────────────────────────────────────── */
  let openFolderId = null;
  const renderFolderOverlay = () => {
    let overlay = $('#folderOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'folderOverlay';
      overlay.className = 'folder-overlay';
      overlay.innerHTML = '<div class="folder-panel"><div class="folder-name" id="folderPanelName"></div><div class="folder-grid" id="folderPanelGrid"></div></div>';
      els.springboard.appendChild(overlay);
      overlay.addEventListener('pointerdown', e => { if (e.target === overlay) closeFolder(); });
    }
    return overlay;
  };
  const openFolder = id => {
    const f = STOCK_LAYOUT.folders[id]; if (!f) return;
    openFolderId = id;
    const overlay = renderFolderOverlay();
    $('#folderPanelName').textContent = f.name;
    $('#folderPanelGrid').innerHTML = f.apps.map(a => iconHTML(a)).join('');
    requestAnimationFrame(() => overlay.classList.add('open'));
  };
  const closeFolder = () => {
    openFolderId = null;
    const overlay = $('#folderOverlay');
    if (overlay) overlay.classList.remove('open');
  };

  /* ─── edit (jiggle) mode ─────────────────────────────────────── */
  const enterEditing = () => {
    if (locked || editMode) return;
    editMode = true;
    els.springboard.classList.add('editing');
    els.editingBar.hidden = false;
  };
  const exitEditing = () => {
    if (!editMode) return;
    editMode = false;
    els.springboard.classList.remove('editing');
    els.editingBar.hidden = true;
  };
  const resetLayout = () => {
    saveInstalled([]);
    renderSpringboard();
    refreshBadges();
  };
  const installApp = rec => {
    const list = installedApps();
    if (list.length >= 15) return false;
    if (!list.some(r => r.id === rec.id)) list.push(rec);
    saveInstalled(list);
    renderSpringboard();
    refreshBadges();
    return true;
  };
  const uninstallApp = recId => {
    saveInstalled(installedApps().filter(r => r.id !== recId));
    renderSpringboard();
    refreshBadges();
  };
  const uninstallInstalled = appId => {
    const recId = appId.replace(/^installed:/, '');
    saveInstalled(installedApps().filter(r => r.id !== recId));
    renderSpringboard();
    refreshBadges();
    showBanner('App Store', 'App removed from your home screen.');
  };

  /* ─── app framework ───────────────────────────────────────────── */
  const APPS_IMPL = {}; /* registered by apps-*.js: id -> {render(view), mount?, unmount?} */
  const registerApp = (id, impl) => { APPS_IMPL[id] = impl; };

  let currentApp = null, currentCleanup = null;
  const recents = [];

  const launchApp = (id, opts) => {
    if (locked) return;
    closeFolder();
    exitEditing();
    /* installed stub? */
    const installedRec = id.startsWith('installed:') ? installedApps().find(r => r.id === id.slice(10)) : null;
    const app = APPS[id];
    if (!app && !installedRec) return;

    if (currentApp) closeApp(true);

    const view = document.createElement('section');
    view.className = 'app-view visible';
    view.dataset.app = id;
    $('#appLayer').appendChild(view);

    if (installedRec) renderInstalledStub(view, installedRec);
    else {
      const impl = APPS_IMPL[id];
      view.innerHTML = impl && impl.render ? impl.render(view) : stubHTML(app.name);
      if (impl && impl.mount) { try { impl.mount(view, opts || {}); } catch (e) { console.error('[OldOS] mount failed for ' + id, e); } }
      currentCleanup = impl && impl.unmount ? () => { try { impl.unmount(view); } catch (e) { console.error(e); } } : null;
    }
    if (!installedRec) {} else currentCleanup = null;

    /* zoom-from-icon animation */
    const iconEl = $('.icon[data-app="' + String(id).replace(/["\\]/g, '\\$&') + '"] .icon-img');
    const screenRect = els.screen.getBoundingClientRect();
    if (iconEl) {
      const r = iconEl.getBoundingClientRect();
      const scale = screenRect.width / 320;
      const ox = (r.left + r.width / 2 - screenRect.left) / scale;
      const oy = (r.top + r.height / 2 - screenRect.top) / scale;
      view.style.transformOrigin = ox + 'px ' + oy + 'px';
    } else {
      view.style.transformOrigin = '50% 88%';
    }
    view.style.transition = 'none';
    view.style.transform = 'scale(0.18)';
    view.style.opacity = '0.25';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      view.style.transition = 'transform .34s cubic-bezier(.25,1.05,.3,1), opacity .28s';
      view.style.transform = 'scale(1)';
      view.style.opacity = '1';
    }));

    currentApp = id;
    if (!id.startsWith('installed:')) {
      const idx = recents.indexOf(id);
      if (idx >= 0) recents.splice(idx, 1);
      recents.unshift(id);
      if (recents.length > 6) recents.pop();
    }
    els.springboard.style.visibility = 'hidden';
    closeMultitask();
    resetAutolock();
  };

  const closeApp = (instant) => {
    const view = $('#appLayer .app-view');
    if (!view) { currentApp = null; return; }
    const finish = () => { view.remove(); };
    if (instant) { finish(); }
    else {
      view.style.transition = 'transform .26s ease-in, opacity .22s';
      view.style.transform = 'scale(0.2)';
      view.style.opacity = '0';
      setTimeout(finish, 250);
    }
    if (currentCleanup) { const c = currentCleanup; currentCleanup = null; c(); }
    currentApp = null;
    els.springboard.style.visibility = '';
    resetAutolock();
  };

  const stubHTML = name =>
    '<div class="app-inner"><div class="nav-bar"><span class="nav-title">' + esc(name) + '</span></div>'
    + '<div class="app-scroll pinstripe"><p class="center-note" style="padding:40px 20px">This app is not ready for primetime — but the rest of the phone is.</p></div></div>';

  const renderInstalledStub = (view, rec) => {
    view.innerHTML = '<div class="app-inner" style="background:radial-gradient(120% 90% at 50% 0%, #2b3242 0%, #0b0d13 70%);align-items:center;justify-content:center;text-align:center;padding:20px">'
      + '<canvas width="118" height="120" style="width:96px;height:97px;border-radius:22px;box-shadow:0 14px 34px rgba(0,0,0,.6)"></canvas>'
      + '<h2 style="color:#fff;font-size:20px;margin:14px 0 4px;letter-spacing:-.01em">' + esc(rec.name) + '</h2>'
      + '<p style="color:#8f96a3;font-size:11px;max-width:200px;line-height:1.5">Installed from the web App Store. A full build of this app is “coming soon,” just like everything in 2010.</p>'
      + '<button class="btn-pill" id="stubGetMore" style="margin-top:16px">Browse the App Store</button>'
      + '</div>';
    drawInstalledIcon(view.querySelector('canvas'), rec);
    view.querySelector('#stubGetMore').addEventListener('click', () => { closeApp(); setTimeout(() => launchApp('appstore'), 260); });
  };

  const goHome = () => {
    if (!els.passcode.hidden) { closePasscode(); return; }
    closeFolder();
    if (editMode) { exitEditing(); return; }
    if (currentApp) { closeApp(); return; }
    closeMultitask();
  };

  /* ─── multitasking tray ──────────────────────────────────────── */
  const toggleMultitask = () => {
    if (locked || !els.passcode.hidden) return;
    const tray = els.multitask;
    if (tray.classList.contains('open')) { closeMultitask(); return; }
    $('#multitaskIcons').innerHTML = recents.map(id => {
      const app = APPS[id];
      return '<button class="multitask-item" data-recent="' + esc(id) + '"><img src="' + app.icon + '" alt="' + esc(app.name) + '"><span>' + esc(app.name) + '</span></button>';
    }).join('') || '<span style="color:#777;font-size:11px;padding:18px 8px">No recent apps — double-tap icons do the rest.</span>';
    /* now playing */
    const np = store.get('nowPlaying', null);
    $('#multitaskNowPlaying').textContent = np && np.title ? (np.artist ? np.artist + ' — ' : '') + np.title : 'iPod · Not Playing';
    tray.classList.add('open');
  };
  const closeMultitask = () => els.multitask && els.multitask.classList.remove('open');

  /* ─── banner ──────────────────────────────────────────────────── */
  let bannerTimer = null;
  const showBanner = (title, body, onTap) => {
    els.bannerTitle.textContent = title;
    els.bannerBody.textContent = body;
    els.banner.classList.add('show');
    els.banner.onclick = () => { els.banner.classList.remove('show'); if (onTap) onTap(); };
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => els.banner.classList.remove('show'), 4200);
  };

  /* ─── home button wiring ──────────────────────────────────────── */
  const initHomeButton = () => {
    let lastTap = 0;
    els.homeButton.addEventListener('click', () => {
      const now = Date.now();
      if (now - lastTap < 340) { toggleMultitask(); lastTap = 0; return; }
      lastTap = now;
      goHome();
    });
    els.doneEditingBtn.addEventListener('click', exitEditing);
    els.powerBtn.addEventListener('click', () => lock(false));
  };

  /* ─── icon interactions (delegated) ───────────────────────────── */
  const initIconInteractions = () => {
    let pressTimer = null, pressTarget = null;

    els.pagesViewport.addEventListener('click', e => {
      if (wasSwipe()) return;
      const x = e.target.closest('[data-x]');
      if (x) { e.stopPropagation(); uninstallInstalled(x.dataset.x); return; }
      const icon = e.target.closest('.icon[data-app]');
      if (icon) {
        if (editMode) return;
        audio.click();
        launchApp(icon.dataset.app);
        return;
      }
      const folder = e.target.closest('.icon[data-folder]');
      if (folder) { audio.click(); openFolder(folder.dataset.folder); return; }
      /* tap empty area in edit mode exits */
      if (editMode && !e.target.closest('.icon')) exitEditing();
    });
    els.dock.addEventListener('click', e => {
      if (wasSwipe()) return;
      const icon = e.target.closest('.icon[data-app]');
      if (icon && !editMode) { audio.click(); launchApp(icon.dataset.app); }
    });
    els.springboard.addEventListener('click', e => {
      /* folder overlay icons */
      const icon = e.target.closest('#folderOverlay .icon[data-app]');
      if (icon && !editMode) { audio.click(); closeFolder(); launchApp(icon.dataset.app); }
    });

    /* long-press → jiggle */
    const startPress = e => {
      const icon = e.target.closest('.icon');
      if (!icon) return;
      pressTarget = icon;
      pressTimer = setTimeout(() => { enterEditing(); }, 560);
    };
    const cancelPress = () => clearTimeout(pressTimer);
    ['pointerdown'].forEach(evt => els.springboard.addEventListener(evt, startPress));
    ['pointerup','pointermove','pointercancel','pointerleave'].forEach(evt => els.springboard.addEventListener(evt, cancelPress));
  };

  /* ─── spotlight ───────────────────────────────────────────────── */
  const initSpotlight = () => {
    const input = $('#spotlightInput');
    const results = $('#spotlightResults');
    const hint = $('#spotlightHint');
    const clearBtn = $('#spotlightClear');
    $('#spotlightJump').addEventListener('click', () => { goPage(0); setTimeout(() => input.focus(), 250); });
    clearBtn.addEventListener('click', () => { input.value = ''; paint(); input.focus(); });
    const paint = () => {
      const q = input.value.trim().toLowerCase();
      clearBtn.classList.toggle('visible', q.length > 0);
      hint.style.display = q ? 'none' : '';
      if (!q) { results.innerHTML = ''; return; }
      const appHits = Object.values(APPS).filter(a => a.name.toLowerCase().includes(q));
      let html = appHits.map(a =>
        '<button class="spot-row" data-launch="' + esc(a.id) + '"><img src="' + a.icon + '" alt=""><span>' + esc(a.name) + '<small>Application</small></span></button>'
      ).join('');
      html += '<button class="spot-row" data-web="' + esc(q) + '"><span style="width:34px;height:34px;border-radius:8px;background:linear-gradient(180deg,#8ec4f5,#1c64f2);display:flex;align-items:center;justify-content:center;font-size:16px;color:#fff">⌕</span><span>Search the web for “' + esc(q) + '”<small>Safari · DuckDuckGo</small></span></button>';
      html += '<button class="spot-row" data-wiki="' + esc(q) + '"><span style="width:34px;height:34px;border-radius:8px;background:linear-gradient(180deg,#f4f4f6,#c9c9d0);display:flex;align-items:center;justify-content:center;font-size:19px;color:#111;font-family:Georgia,serif;font-weight:700">W</span><span>“' + esc(q) + '” on Wikipedia<small>Safari · Wikipedia</small></span></button>';
      results.innerHTML = html;
    };
    input.addEventListener('input', paint);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { const first = results.querySelector('.spot-row'); if (first) first.click(); } });
    results.addEventListener('click', e => {
      const launch = e.target.closest('[data-launch]');
      if (launch) { input.blur(); launchApp(launch.dataset.launch); return; }
      const web = e.target.closest('[data-web]');
      if (web) { input.blur(); launchApp('safari', { url: 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(web.dataset.web) }); return; }
      const wiki = e.target.closest('[data-wiki]');
      if (wiki) { input.blur(); launchApp('safari', { url: 'https://en.wikipedia.org/wiki/Special:Search?search=' + encodeURIComponent(wiki.dataset.wiki) }); }
    });
  };

  /* ─── dots click ──────────────────────────────────────────────── */
  const initDots = () => $('#pageDots').addEventListener('click', e => {
    const dot = e.target.closest('[data-dot]');
    if (dot) goPage(+dot.dataset.dot);
  });

  /* ─── slide to unlock ─────────────────────────────────────────── */
  const initSlider = () => {
    const knob = $('#slideKnob');
    const track = $('#slideTrack');
    let dragging = false, knobX = 0, maxTravel = 200;
    const measure = () => { maxTravel = track.getBoundingClientRect().width / (track.getBoundingClientRect().width / 272) - 68; };
    const setKnob = x => { knobX = clamp(x, 0, maxTravel); knob.style.left = (2 + knobX) + 'px'; knob.setAttribute('aria-valuenow', String(Math.round(knobX / maxTravel * 100))); };
    knob.addEventListener('pointerdown', e => {
      measure(); dragging = true;
      knob.setPointerCapture(e.pointerId);
      knob.style.transition = 'none';
    });
    knob.addEventListener('pointermove', e => {
      if (!dragging) return;
      const rect = track.getBoundingClientRect();
      const scale = rect.width / 272;
      setKnob((e.clientX - rect.left) / scale - 33);
    });
    const release = () => {
      if (!dragging) return;
      dragging = false;
      knob.style.transition = 'left .28s cubic-bezier(.3,1.4,.4,1)';
      if (knobX > maxTravel * 0.74) {
        setKnob(maxTravel);
        els.lockScreen.classList.add('hidden-up');
        requestUnlock();
      } else setKnob(0);
    };
    knob.addEventListener('pointerup', release);
    knob.addEventListener('pointercancel', release);
    /* keyboard access */
    knob.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { measure(); setKnob(knobX + 24); if (knobX > maxTravel * 0.8) { requestUnlock(); setKnob(0); } }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); requestUnlock(); }
    });
    /* grabber → camera */
    $('#cameraGrabber').addEventListener('click', () => {
      els.lockScreen.classList.add('hidden-up');
      locked = false;
      resetAutolock();
      audio.unlock();
      setTimeout(() => launchApp('camera'), 220);
    });
  };

  /* ─── boot ────────────────────────────────────────────────────── */
  const boot = () => {
    const fill = $('#bootBarFill');
    let p = 0;
    const step = () => {
      p = Math.min(100, p + 8 + Math.random() * 22);
      fill.style.width = p + '%';
      if (p < 100) setTimeout(step, 70 + Math.random() * 110);
      else setTimeout(() => els.bootView.classList.add('hidden'), 320);
    };
    setTimeout(step, 180);
  };

  /* ─── public init ─────────────────────────────────────────────── */
  const init = () => {
    els = {
      screen: $('#screen'), wallpaper: $('#wallpaper'), statusbar: $('#statusbar'),
      sbTime: $('#sbTime'), sbCarrier: $('#sbCarrier'), sbBars: $('#sbBars'), sbWifi: $('#sbWifi'),
      sbAirplane: $('#sbAirplane'), sbBattPct: $('#sbBattPct'), sbBattFill: $('#sbBattFill'),
      lockScreen: $('#lockScreen'), lsTime: $('#lsTime'), lsDate: $('#lsDate'),
      passcode: $('#passcodeScreen'), springboard: $('#springboard'), pagesViewport: $('#pagesViewport'),
      pageDots: $('#pageDots'), dock: $('#dock'), appLayer: $('#appLayer'),
      multitask: $('#multitaskTray'), banner: $('#banner'), bannerTitle: $('#bannerTitle'), bannerBody: $('#bannerBody'),
      editingBar: $('#editingBar'), doneEditingBtn: $('#doneEditingBtn'), brightnessDim: $('#brightnessDim'),
      homeButton: $('#homeButton'), powerBtn: $('#powerBtn'), bootView: $('#bootView')
    };

    initHomeButton();
    initPager();
    initDots();
    initIconInteractions();
    initSpotlight();
    initSlider();
    initPasscodeKeys();

    /* wake/sleep resets the slider knob */
    els.lockScreen.addEventListener('transitionend', () => {
      if (!locked) $('#slideKnob').style.left = '2px';
    });

    renderSpringboard();
    refreshBadges();
    applySettings();
    tickClock();
    setInterval(tickClock, 1000);
    initBattery();
    boot();

    /* auto-lock on any interaction */
    els.screen.addEventListener('pointerdown', resetAutolock, { passive: true });
  };

  const initPasscodeKeys = () => {
    const keys = [
      ['1',''],['2','ABC'],['3','DEF'],['4','GHI'],['5','JKL'],['6','MNO'],['7','PQRS'],['8','TUV'],['9','WXYZ'],['blank',''],['0','+'],['del','']
    ];
    $('#pcKeypad').innerHTML = keys.map(([d, sub]) => {
      if (d === 'blank') return '<span class="pc-key blank" aria-hidden="true"></span>';
      if (d === 'del') return '<button class="pc-key pc-del" data-del="1" aria-label="Delete"><svg viewBox="0 0 24 18" width="26" height="19" fill="currentColor"><path d="M8.4 1h11.4A2.2 2.2 0 0 1 22 3.2v11.6a2.2 2.2 0 0 1-2.2 2.2H8.4a2.2 2.2 0 0 1-1.7-.85L1.6 10a2 2 0 0 1 0-2.4l5.1-6a2.2 2.2 0 0 1 1.7-.6zm3.3 5.4l-3 3.6 3 3.6M11.7 9.5l4.6 0" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
      return '<button class="pc-key" data-digit="' + d + '">' + d + (sub ? '<small>' + sub + '</small>' : '') + '</button>';
    }).join('');
    $('#pcKeypad').addEventListener('click', e => {
      const d = e.target.closest('[data-digit]');
      if (d) { pcInput(d.dataset.digit); return; }
      const del = e.target.closest('[data-del]');
      if (del) { pcBuffer = pcBuffer.slice(0, -1); audio.click(); paintPcDots(); }
    });
    $('#pcEmergency').addEventListener('click', () => { closePasscode(); els.lockScreen.classList.add('hidden-up'); locked = false; els.springboard.classList.add('on'); resetAutolock(); setTimeout(() => launchApp('phone'), 200); });
    $('#pcForgot').addEventListener('click', () => {
      if (confirm('Forgot your passcode? Reset it and unlock this demo phone?')) {
        settings.passcode = null; saveSettings(); closePasscode(); unlock(); showBanner('Passcode Lock', 'Passcode removed for this browser.');
      }
    });
  };

  /* ─── shared small APIs used by app modules ───────────────────── */
  const fmtDuration = s => { s = Math.max(0, Math.floor(s)); const m = Math.floor(s / 60); return m + ':' + pad2(s % 60); };

  return {
    init, $, $$, clamp, pad2, esc, store, audio,
    settings, saveSettings, applySettings, WALLPAPERS,
    launchApp, closeApp, goHome, registerApp,
    resetLayout, installApp, uninstallApp,
    launchInstalledStub: renderInstalledStub,
    refreshBadges, badgeFor, showBanner, fmtDuration,
    lock, unlock, requestUnlock, openPasscode, closePasscode,
    STOCK_LAYOUT, APPS, SEED_MAILS, VOICEMAILS,
    enterEditing, exitEditing,
    get locked() { return locked; },
    get currentApp() { return currentApp; },
    get editMode() { return editMode; }
  };
})();

document.addEventListener('DOMContentLoaded', () => OldOS.init());
