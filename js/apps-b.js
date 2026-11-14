/* ═══════════════════════════════════════════════════════════════
   OldOS · Web Edition — apps, part B
   Contacts (shared) · Phone · Mail · Safari · Contacts
   ═══════════════════════════════════════════════════════════════ */
'use strict';
(function (OldOS) {
const { $, $$, esc, store, audio, registerApp, launchApp, showBanner, SEED_MAILS, VOICEMAILS } = OldOS;

/* ───────── shared contacts store ───────── */
const CONTACTS_SEED = [
  { id: 'c-maya', first: 'Maya', last: 'Chen', phone: '(210) 555-0147', email: 'maya@theeuhub.dev', star: true, hue: 262 },
  { id: 'c-mom', first: 'Mom', last: '', phone: '(210) 555-0119', email: 'mom@famille.net', star: true, hue: 340 },
  { id: 'c-zane', first: 'Zane', last: '(dev)', phone: '(415) 555-0176', email: 'zzanehip@github.com', star: false, hue: 200 },
  { id: 'c-grandma', first: 'Grandma', last: 'Rosa', phone: '(210) 555-0132', email: '', star: false, hue: 20 },
  { id: 'c-lab', first: 'The', last: 'Lab', phone: '(800) 555-0100', email: 'lab@old.os', star: false, hue: 130 },
  { id: 'c-pizza', first: 'Pizza', last: 'Palace', phone: '(210) 555-0161', email: '', star: false, hue: 45 }
];
const contactsStore = {
  load() { let c = store.get('contacts', null); if (!c) { c = CONTACTS_SEED; store.set('contacts', c); } return c; },
  save(list) { store.set('contacts', list); },
  byId(id) { return this.load().find(c => c.id === id); }
};
const fullName = c => (c.first + ' ' + (c.last || '')).trim();
const initials = c => ((c.first[0] || '?') + (c.last[0] || '')).toUpperCase();
const avatarStyle = hue => 'background:radial-gradient(circle at 35% 32%, hsl(' + hue + ',60%,64%), hsl(' + hue + ',62%,38%))';

/* start an outgoing call overlay inside a view (shared Phone/Contacts) */
const startCall = (view, num, name) => {
  const hue = Math.abs([...num].reduce((a, c) => a + c.charCodeAt(0), 0)) % 360;
  const overlay = document.createElement('div');
  overlay.className = 'incall';
  overlay.innerHTML = '<div class="incall-avatar" style="background:radial-gradient(circle at 38% 34%, hsl(' + hue + ',60%,66%), hsl(' + hue + ',62%,36%))">' + esc((name || num).trim().charAt(0).toUpperCase()) + '</div>'
    + '<div class="incall-name">' + esc(name || num) + '</div>'
    + '<div class="incall-num">' + esc(num) + '</div>'
    + '<div class="incall-status" id="incallStatus">calling mobile…</div>'
    + '<div class="incall-controls">'
    + '<button class="incall-ctrl" id="muteBtn"><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="10" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v3M4 4l16 16"/></svg>MUTE</button>'
    + '<button class="incall-ctrl" id="spkBtn"><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4h4l5 4V6l-5 4H4z" fill="currentColor" stroke="none"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19.5 6a9 9 0 0 1 0 12"/></svg>SPEAKER</button>'
    + '</div>'
    + '<button class="call-btn end" id="endCallBtn" style="margin-top:auto;margin-bottom:42px" aria-label="End call"><svg viewBox="0 0 24 24" width="26" height="26" fill="#fff"><path d="M6.6 10.8a15.4 15.4 0 0 1 10.8 0l2 2a1.3 1.3 0 0 1 .1 1.8l-2 2.2a1.3 1.3 0 0 1-1.8.3l-2.7-1.7a1.3 1.3 0 0 1-.7-1.2v-1.5a11.9 11.9 0 0 0-4.5 0v1.5a1.3 1.3 0 0 1-.7 1.2l-2.7 1.7a1.3 1.3 0 0 1-1.8-.3l-2-2.2a1.3 1.3 0 0 1 .1-1.8l2-2z" transform="rotate(135 12 12)"/></svg></button>';
  view.appendChild(overlay);
  const status = overlay.querySelector('#incallStatus');
  let seconds = 0, connected = false;
  const t0 = setInterval(() => {
    if (!connected) { connected = true; status.textContent = '0:00'; return; }
    seconds++;
    status.textContent = Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
  }, 1000);
  overlay.querySelector('#muteBtn').addEventListener('click', function () { this.classList.toggle('on'); audio.click(); });
  overlay.querySelector('#spkBtn').addEventListener('click', function () { this.classList.toggle('on'); audio.click(); });
  let done = false;
  const end = () => {
    if (done) return; done = true;
    clearInterval(t0);
    /* log to recents */
    const recents = store.get('recents', []);
    recents.unshift({ id: 'r-' + Date.now(), name: name || '', num, ts: Date.now(), missed: false });
    store.set('recents', recents.slice(0, 30));
    overlay.style.transition = 'opacity .22s, transform .22s';
    overlay.style.opacity = '0'; overlay.style.transform = 'scale(.92)';
    setTimeout(() => overlay.remove(), 230);
  };
  overlay.querySelector('#endCallBtn').addEventListener('click', end);
  overlay._cleanup = () => { clearInterval(t0); done = true; };
  return overlay;
};

/* ══════════════ PHONE ══════════════ */
registerApp('phone', (() => {
  let tab = 'favorites';
  const keyRows = [
    ['1',''],['2','ABC'],['3','DEF'],
    ['4','GHI'],['5','JKL'],['6','MNO'],
    ['7','PQRS'],['8','TUV'],['9','WXYZ'],
    ['*',''],['0','+'],['#','']
  ];
  const TAB_ICONS = {
    favorites: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3.6l2.6 5.3 5.8.9-4.2 4.1 1 5.8L12 17l-5.2 2.7 1-5.8L3.6 9.8l5.8-.9L12 3.6z"/></svg>',
    recents: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2.4"/></svg>',
    contacts: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.6-3.8 4.3-5.8 7.5-5.8s5.9 2 7.5 5.8"/></svg>',
    keypad: '<svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor"><circle cx="6" cy="6" r="1.7"/><circle cx="12" cy="6" r="1.7"/><circle cx="18" cy="6" r="1.7"/><circle cx="6" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="18" cy="12" r="1.7"/><circle cx="6" cy="18" r="1.7"/><circle cx="12" cy="18" r="1.7"/><circle cx="18" cy="18" r="1.7"/></svg>',
    voicemail: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="6.5" cy="14" r="3.4"/><circle cx="17.5" cy="14" r="3.4"/><path d="M6.5 10.6h11"/></svg>'
  };
  const TAB_LABELS = { favorites: 'Favorites', recents: 'Recents', contacts: 'Contacts', keypad: 'Keypad', voicemail: 'Voicemail' };

  const recentsSeed = () => {
    const r = store.get('recents', null);
    if (r) return r;
    const seed = [
      { id: 'r-seed-1', name: 'Maya', num: '(210) 555-0147', ts: Date.now() - 3600e3 * 5, missed: true },
      { id: 'r-seed-2', name: 'Mom', num: '(210) 555-0119', ts: Date.now() - 86400e3, missed: false }
    ];
    store.set('recents', seed);
    return seed;
  };

  const bodyHTML = () => {
    if (tab === 'favorites') {
      const favs = contactsStore.load().filter(c => c.star);
      return '<div class="app-scroll pinstripe">' + (favs.length ? favs.map(c =>
        '<div class="row"><span class="avatar" style="width:40px;height:40px;flex-basis:40px;font-size:13px;' + avatarStyle(c.hue) + '">' + esc(initials(c)) + '</span><span class="row-label">' + esc(fullName(c)) + '<small class="sub">mobile · ' + esc(c.phone) + '</small></span><button class="call-btn" data-call="' + esc(c.phone) + '" data-name="' + esc(fullName(c)) + '" style="width:40px;height:40px;margin-left:auto;flex:0 0 auto" aria-label="Call ' + esc(fullName(c)) + '"><svg viewBox="0 0 24 24" width="19" height="19" fill="#fff"><path d="M6.6 10.8a15.4 15.4 0 0 1 10.8 0l2 2a1.3 1.3 0 0 1 .1 1.8l-2 2.2a1.3 1.3 0 0 1-1.8.3l-2.7-1.7a1.3 1.3 0 0 1-.7-1.2v-1.5a11.9 11.9 0 0 0-4.5 0v1.5a1.3 1.3 0 0 1-.7 1.2l-2.7 1.7a1.3 1.3 0 0 1-1.8-.3l-2-2.2a1.3 1.3 0 0 1 .1-1.8l2-2z"/></svg></button></div>'
      ).join('') : '<p class="center-note" style="padding:30px 16px">Star someone in Contacts.</p>') + '</div>';
    }
    if (tab === 'recents') {
      const recents = recentsSeed();
      return '<div class="app-scroll pinstripe">' + (recents.length ? recents.map(r =>
        '<button class="row tappable" data-call="' + esc(r.num) + '" data-name="' + esc(r.name || r.num) + '">' + (r.missed ? '<span style="color:#d03327;font-size:11px">↘</span> ' : '<span style="color:#2e9e4f;font-size:11px">↗</span> ') + '<span class="row-label" style="' + (r.missed ? 'color:#d03327' : '') + '">' + esc(r.name || r.num) + '<small class="sub">' + esc(new Date(r.ts).toLocaleString([], { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })) + '</small></span><span class="row-chev">›</span></button>'
      ).join('') : '<p class="center-note" style="padding:30px">No recent calls.</p>') + '</div>';
    }
    if (tab === 'contacts') {
      return '<div class="app-scroll pinstripe">' + contactsStore.load().map(c =>
        '<button class="row tappable" data-call="' + esc(c.phone) + '" data-name="' + esc(fullName(c)) + '"><span class="avatar" style="width:34px;height:34px;flex-basis:34px;font-size:11px;' + avatarStyle(c.hue) + '">' + esc(initials(c)) + '</span><span class="row-label">' + esc(fullName(c)) + '</span><span class="row-chev">›</span></button>'
      ).join('') + '</div>';
    }
    if (tab === 'keypad') {
      return '<div style="flex:1;display:flex;flex-direction:column;background:radial-gradient(120% 90% at 50% -10%, #23242a 0%, #0b0b0e 75%)">'
        + '<div class="keypad-display" id="keypadDisplay">&nbsp;</div>'
        + '<div class="keypad-grid">' + keyRows.map(([k, sub]) => '<button class="key" data-key="' + k + '"><b>' + k + '</b>' + (sub ? '<small>' + sub + '</small>' : '<small>&nbsp;</small>') + '</button>').join('') + '</div>'
        + '<div style="flex:1;display:flex;align-items:flex-start;justify-content:center;gap:26px;padding-top:10px">'
        +   '<button id="backspaceBtn" class="nav-btn" style="border-radius:50%;width:44px;height:44px;opacity:.85" aria-label="Backspace"><svg viewBox="0 0 24 18" width="20" height="15" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8.4 1.5h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-11L2 9l6.4-7.5z"/><path d="M11 6l6 6M17 6l-6 6"/></svg></button>'
        +   '<button class="call-btn" id="keypadCallBtn" aria-label="Call"><svg viewBox="0 0 24 24" width="26" height="26" fill="#fff"><path d="M6.6 10.8a15.4 15.4 0 0 1 10.8 0l2 2a1.3 1.3 0 0 1 .1 1.8l-2 2.2a1.3 1.3 0 0 1-1.8.3l-2.7-1.7a1.3 1.3 0 0 1-.7-1.2v-1.5a11.9 11.9 0 0 0-4.5 0v1.5a1.3 1.3 0 0 1-.7 1.2l-2.7 1.7a1.3 1.3 0 0 1-1.8-.3l-2-2.2a1.3 1.3 0 0 1 .1-1.8l2-2z"/></svg></button>'
        +   '<span style="width:44px"></span>'
        + '</div></div>';
    }
    /* voicemail */
    const heard = (store.get('voicemail', { heard: [] }).heard) || [];
    return '<div class="app-scroll" style="background:#0d0d10">' + VOICEMAILS.map(vm => {
      const unheard = !heard.includes(vm.id);
      return '<div class="vm-row" data-vm="' + esc(vm.id) + '" style="cursor:pointer">'
        + (unheard ? '<span style="width:8px;height:8px;border-radius:50%;background:#1c64f2;box-shadow:0 0 5px #1c64f2"></span>' : '<span style="width:8px"></span>')
        + '<div style="min-width:0;flex:1"><div style="color:#f2f2f4;font-size:13px;font-weight:600">' + esc(vm.from) + ' <span style="color:#6f6f78;font-weight:400">· ' + esc(vm.dur + 's') + '</span></div><div style="color:#8f8f99;font-size:10px">' + esc(vm.num + ' · ' + vm.date) + '</div></div>'
        + '<button class="vm-play" data-play="' + esc(vm.id) + '" aria-label="Play voicemail"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button>'
        + '</div>';
    }).join('') + '<p class="center-note">Voice Memos are synthesized locally. No tapes were harmed.</p></div>';
  };

  const vmPlayer = (() => {
    let playing = null;
    return {
      toggle(id) {
        if (playing) { try { playing.stop(); } catch (e) {} try { playing.osc && playing.osc.stop(); } catch (e) {} playing = null; }
        OldOS.audio.resume();
        /* synth a “voice”: warbling bandpassed sawtooth */
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const t0 = ctx.currentTime;
        const dur = VOICEMAILS.find(v => v.id === id).dur;
        const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 95;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 7.5;
        const lfoGain = ctx.createGain(); lfoGain.gain.value = 38;
        lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 5; bp.frequency.setValueAtTime(380, t0);
        bp.frequency.linearRampToValueAtTime(950, t0 + dur * 0.4);
        bp.frequency.linearRampToValueAtTime(520, t0 + dur);
        const am = ctx.createGain(); am.gain.setValueAtTime(0.0001, t0);
        am.gain.linearRampToValueAtTime(0.16, t0 + 0.06);
        am.gain.setValueAtTime(0.16, t0 + dur - 0.15);
        am.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        /* syllabic amplitude wobble */
        const syll = ctx.createOscillator(); syll.frequency.value = 4.2;
        const syllGain = ctx.createGain(); syllGain.gain.value = 0.055;
        syll.connect(syllGain); syllGain.connect(am.gain);
        osc.connect(bp).connect(am).connect(ctx.destination);
        osc.start(t0); lfo.start(t0); syll.start(t0);
        osc.stop(t0 + dur); lfo.stop(t0 + dur); syll.stop(t0 + dur);
        playing = { stop() { try { osc.stop(); lfo.stop(); syll.stop(); } catch (e) {} ctx.close(); } };
        const heard = store.get('voicemail', { heard: [] });
        if (!heard.heard.includes(id)) { heard.heard.push(id); store.set('voicemail', heard); }
        OldOS.refreshBadges();
        setTimeout(() => { playing = null; }, dur * 1000 + 120);
      }
    };
  })();

  return {
    render() {
      return '<div class="app-inner" style="background:#101014">'
        + '<div class="nav-bar"><span class="nav-title">Phone</span><button class="nav-btn" data-action="clear"' + (tab === 'recents' ? '' : ' style="opacity:0;pointer-events:none"') + '>Clear</button></div>'
        + '<div id="phoneBody" style="flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative">' + bodyHTML() + '</div>'
        + '<div class="tab-bar">' + Object.keys(TAB_LABELS).map(k => '<button class="tab-item' + (k === tab ? ' active' : '') + '" data-tab="' + k + '">' + TAB_ICONS[k] + esc(TAB_LABELS[k]) + '</button>').join('') + '</div>'
        + '</div>';
    },
    mount(view) {
      const clearBtn = view.querySelector('[data-action="clear"]');
      const body = $('#phoneBody', view);
      let numberBuf = '';

      const refresh = () => {
        body.innerHTML = bodyHTML();
        $('#phoneBody', view).querySelectorAll('[data-call]').forEach(b => b.addEventListener('click', () => startCall(view, b.dataset.call, b.dataset.name)));
        if (tab === 'keypad') {
          const disp = $('#keypadDisplay', view);
          const paint = () => { disp.textContent = numberBuf || ' '; disp.innerHTML = numberBuf ? esc(numberBuf) : '&nbsp;'; };
          view.querySelectorAll('[data-key]').forEach(k => k.addEventListener('click', () => {
            if (numberBuf.length >= 15) return;
            numberBuf += k.dataset.key;
            audio.key(k.dataset.key);
            paint();
          }));
          $('#backspaceBtn', view).addEventListener('click', () => { numberBuf = numberBuf.slice(0, -1); audio.click(); paint(); });
          $('#keypadCallBtn', view).addEventListener('click', () => { if (numberBuf.trim()) { startCall(view, numberBuf, numberBuf); numberBuf = ''; setTimeout(paint, 300); } });
        }
        if (tab === 'voicemail') {
          view.querySelectorAll('[data-play]').forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); audio.click(); vmPlayer.toggle(btn.dataset.play); btn.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><rect x="6" y="5" width="4.5" height="14" rx="1"/><rect x="13.5" y="5" width="4.5" height="14" rx="1"/></svg>'; }));
          view.querySelectorAll('[data-vm]').forEach(row => row.addEventListener('click', () => {
            const vm = VOICEMAILS.find(v => v.id === row.dataset.vm);
            showBanner('Voicemail · ' + vm.from, vm.transcript);
          }));
        }
        clearBtn.style.opacity = tab === 'recents' ? '1' : '0';
        clearBtn.style.pointerEvents = tab === 'recents' ? 'auto' : 'none';
      };
      view.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => { tab = btn.dataset.tab; audio.click(); view.querySelectorAll('.tab-item').forEach(t => t.classList.toggle('active', t.dataset.tab === tab)); refresh(); }));
      clearBtn.addEventListener('click', () => { store.set('recents', []); refresh(); showBanner('Phone', 'Recents cleared.'); });
      refresh();
    },
    unmount(view) { const ov = view.querySelector('.incall'); if (ov && ov._cleanup) ov._cleanup(); }
  };
})());

/* ══════════════ MAIL ══════════════ */
registerApp('mail', (() => {
  const load = () => {
    let m = store.get('mail', null);
    if (!m) { m = { read: {}, trash: [], starred: [], extra: [], sent: [] }; store.set('mail', m); }
    return m;
  };
  const save = m => { store.set('mail', m); OldOS.refreshBadges(); };
  const allInbox = () => [...load().extra, ...SEED_MAILS].filter(m => !load().trash.includes(m.id));
  const unreadCount = () => allInbox().filter(m => !load().read[m.id]).length;

  const mailboxesHTML = () => {
    const unread = unreadCount();
    return '<div class="app-scroll pinstripe">'
      + '<div class="group-list">'
      + '<button class="row tappable" data-box="inbox"><span style="font-size:18px">▼</span><span class="row-label" style="font-weight:600">Inbox</span>' + (unread ? '<span class="row-value"><span style="background:#1c64f2;color:#fff;border-radius:10px;min-width:21px;height:20px;padding:0 6px;font-size:12px;font-weight:800;display:inline-flex;align-items:center;justify-content:center">' + unread + '</span></span>' : '') + '<span class="row-chev">›</span></button>'
      + '<button class="row tappable" data-box="sent"><span style="font-size:18px">▲</span><span class="row-label" style="font-weight:600">Sent</span><span class="row-value">' + load().sent.length + '</span><span class="row-chev">›</span></button>'
      + '<button class="row tappable" data-box="trash"><span style="font-size:18px">✕</span><span class="row-label" style="font-weight:600">Trash</span><span class="row-value">' + load().trash.length + '</span><span class="row-chev">›</span></button>'
      + '</div>'
      + '<div class="group-list"><button class="row center" data-action="check" id="checkMailBtn">Check for Mail</button></div>'
      + '<p class="center-note">Mailbox syncs locally. Nobody’s snooping — it’s 2010 privacy retro.</p>'
      + '</div>';
  };

  const inboxHTML = () => {
    const m = load();
    const rows = allInbox();
    return '<div class="app-scroll" style="background:#f2f2f6" id="inboxList">'
      + (rows.length ? rows.map(msg => {
          const unread = !m.read[msg.id];
          return '<button class="mail-row' + (unread ? ' unread' : '') + '" data-msg="' + esc(msg.id) + '" style="display:flex;align-items:flex-start;flex-direction:row;gap:0">' + (unread ? '<span class="mail-dot"></span>' : '<span style="width:16px"></span>') + '<span style="min-width:0;flex:1"><span class="mail-top"><span class="mail-from">' + esc(msg.from) + '</span><span class="mail-date">' + esc(msg.date) + '</span></span><span class="mail-subject">' + esc(msg.subject) + '</span><span class="mail-prev">' + esc(msg.preview || msg.body.split('\n')[0]) + '</span></span></button>';
        }).join('') : '<p class="center-note" style="padding:30px">Inbox zero. Miracles do happen.</p>')
      + '</div>';
  };

  const sentHTML = () => {
    const sent = load().sent;
    return '<div class="app-scroll" style="background:#f2f2f6">'
      + (sent.length ? sent.map(msg => '<div class="mail-row" style="display:block;cursor:default"><span class="mail-top"><span class="mail-from">To: ' + esc(msg.to) + '</span><span class="mail-date">' + new Date(msg.ts).toLocaleDateString([], { month: 'numeric', day: 'numeric' }) + '</span></span><span class="mail-subject">' + esc(msg.subject) + '</span><span class="mail-prev">' + esc(msg.body) + '</span></div>').join('') : '<p class="center-note" style="padding:30px">Nothing sent yet.</p>')
      + '</div>';
  };

  const trashHTML = () => {
    const m = load();
    const trashed = [...SEED_MAILS, ...m.extra].filter(x => m.trash.includes(x.id));
    return '<div class="app-scroll" style="background:#f2f2f6">'
      + (trashed.length ? trashed.map(msg => '<div class="mail-row" style="display:flex;align-items:center"><span style="min-width:0;flex:1"><span class="mail-subject">' + esc(msg.subject) + '</span><span class="mail-prev">From: ' + esc(msg.from) + '</span></span><button class="btn-silver" data-restore="' + esc(msg.id) + '" style="font-size:10px">Restore</button><button class="btn-silver" data-obliterate="' + esc(msg.id) + '" style="font-size:10px;color:#a3331c;margin-left:6px">Delete</button></div>').join('') : '<p class="center-note" style="padding:30px">Trash is empty. Marie Kondo approves.</p>')
      + '</div>';
  };

  const messageView = msg =>
    '<div class="app-scroll" style="background:#fff">'
    + '<div style="padding:12px 14px;border-bottom:1px solid #dcdce2">'
    + '<div style="font-size:16px;font-weight:800;color:#111">' + esc(msg.subject) + '</div>'
    + '<div style="margin-top:6px;display:flex;align-items:center;gap:10px"><span class="avatar" style="width:38px;height:38px;flex-basis:38px;font-size:13px;background:radial-gradient(circle at 35% 32%, #8fa8c8, #3d5678)">' + esc(msg.from.charAt(0).toUpperCase()) + '</span>'
    + '<div><div style="font-size:12.5px;font-weight:700;color:#222">' + esc(msg.from) + '</div><div style="font-size:10px;color:#8a8a92">To: me · ' + esc(msg.date) + '</div></div></div>'
    + '</div>'
    + '<div style="padding:14px;font-size:13px;line-height:1.62;color:#222;white-space:pre-wrap;font-family:Georgia,serif">' + esc(msg.body) + '</div>'
    + '</div>'
    + '<div style="flex:0 0 42px;display:flex;align-items:center;justify-content:space-around;background:linear-gradient(180deg,#d8d8dd,#b9b9c0);border-top:1px solid #96969e">'
    + '<button class="nav-btn" data-act="unread-toggle">Mark Unread</button>'
    + '<button class="nav-btn" data-act="star-toggle">' + (load().starred.includes(msg.id) ? '★ Starred' : '☆ Star') + '</button>'
    + '<button class="nav-btn red-btn" data-act="trash">Move to Trash</button>'
    + '</div>';

  const checkPool = [
    { id: 'extra-' + Date.now(), from: 'Zane (zzanehip)', subject: 'OldOS web build is live', preview: 'someone rebuilt you in HTML5…', body: 'So. Funny story.\n\nSomeone rebuilt the entire OS in HTML5 — lock screen, springboard, the works. It’s running on a GitHub Pages site and it’s genuinely delightful.\n\nI’d link it but you’re living inside it right now. Refresh later.\n\n— Zane', date: 'Today', unread: true },
    { id: 'extra-' + (Date.now() + 1), from: 'The OldOS Team', subject: 'Build 10 coming', preview: 'Maps directions, apparently', body: 'Team —\n\nBuild 10 is in review. Word on the street is the web rebuild already has Safari, live weather, and a multitasking tray. Our move.\n\nAlso someone please figure out why the Compass shows San Antonio instead of magnetic north. (It’s a joke. We know. It’s San Antonio.)\n\n— OldOS', date: 'Today', unread: true }
  ];

  return {
    render() {
      return '<div class="app-inner" style="background:#c6ccd6">'
        + '<div class="nav-bar" id="mailNav"><span class="nav-title">Mailboxes</span><button class="nav-btn blue" data-action="compose">Compose</button></div>'
        + '<div id="mailBody" style="flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative">' + mailboxesHTML() + '</div>'
        + '</div>';
    },
    mount(view) {
      const body = $('#mailBody', view);
      const nav = $('#mailNav', view);
      const setNav = (title, back, right) => {
        nav.innerHTML = (back ? '<button class="nav-back" data-action="back">' + esc(back) + '</button>' : '<span style="width:44px"></span>')
          + '<span class="nav-title">' + esc(title) + '</span>' + (right || '<span style="width:44px"></span>');
        nav.querySelector('[data-action="back"]') && nav.querySelector('[data-action="back"]').addEventListener('click', showMailboxes);
      };
      const showMailboxes = () => {
        body.innerHTML = mailboxesHTML();
        setNav('Mailboxes', null, '<button class="nav-btn blue" data-action="compose">Compose</button>');
        nav.querySelector('[data-action="compose"]').addEventListener('click', showCompose);
        bindMailboxes();
      };
      const showInbox = () => {
        body.innerHTML = inboxHTML();
        setNav('Inbox', 'Mailboxes');
        body.querySelectorAll('[data-msg]').forEach(b => b.addEventListener('click', () => showMessage(b.dataset.msg)));
      };
      const showSent = () => { body.innerHTML = sentHTML(); setNav('Sent', 'Mailboxes'); };
      const showTrash = () => {
        body.innerHTML = trashHTML();
        setNav('Trash', 'Mailboxes');
        body.querySelectorAll('[data-restore]').forEach(b => b.addEventListener('click', () => { const m = load(); m.trash = m.trash.filter(id => id !== b.dataset.restore); save(m); showTrash(); }));
        body.querySelectorAll('[data-obliterate]').forEach(b => b.addEventListener('click', () => { const m = load(); m.extra = m.extra.filter(e => e.id !== b.dataset.obliterate); m.trash = m.trash.filter(id => id !== b.dataset.obliterate); save(m); showTrash(); showBanner('Mail', 'Deleted forever. Really forever.'); }));
      };
      const showMessage = id => {
        const m = load();
        const msg = [...SEED_MAILS, ...m.extra].find(x => x.id === id);
        if (!msg) return;
        m.read[id] = true; save(m);
        body.innerHTML = messageView(msg);
        setNav('Message', 'Inbox');
        body.querySelector('[data-act="unread-toggle"]').addEventListener('click', () => { const mm = load(); delete mm.read[id]; save(mm); showInbox(); });
        body.querySelector('[data-act="star-toggle"]').addEventListener('click', e => { const mm = load(); const i = mm.starred.indexOf(id); if (i >= 0) mm.starred.splice(i, 1); else mm.starred.push(id); save(mm); e.target.textContent = i >= 0 ? '☆ Star' : '★ Starred'; });
        body.querySelector('[data-act="trash"]').addEventListener('click', () => { const mm = load(); if (!mm.trash.includes(id)) mm.trash.push(id); save(mm); showBanner('Mail', 'Moved to Trash.'); showInbox(); });
      };
      const showCompose = (prefillTo) => {
        body.innerHTML = '<form id="composeForm" style="flex:1;display:flex;flex-direction:column;background:#fff">'
          + '<div style="padding:8px 12px;border-bottom:1px solid #dcdce2;display:flex;align-items:center;gap:8px"><span style="font-size:12px;color:#666;width:52px">To:</span><input id="compTo" class="ios-input" style="border:none;box-shadow:none;height:28px" value="' + esc(prefillTo || '') + '" placeholder="friend@example.com" required aria-label="To"></div>'
          + '<div style="padding:8px 12px;border-bottom:1px solid #dcdce2;display:flex;align-items:center;gap:8px"><span style="font-size:12px;color:#666;width:52px">Subject:</span><input id="compSubj" class="ios-input" style="border:none;box-shadow:none;height:28px" placeholder="What’s this about?" aria-label="Subject"></div>'
          + '<textarea id="compBody" style="flex:1;border:none;outline:none;resize:none;padding:12px;font-size:14px;line-height:1.6;font-family:Georgia,serif" placeholder="Dear future,\n\n…"></textarea>'
          + '</form>';
        setNav('New Message', 'Mailboxes', '<button class="nav-btn blue" id="sendMailBtn">Send</button>');
        $('#sendMailBtn', view).addEventListener('click', () => {
          const to = $('#compTo', view).value.trim(), subj = $('#compSubj', view).value.trim(), text = $('#compBody', view).value;
          if (!to) { showBanner('Mail', 'Add a recipient first.'); return; }
          const m = load();
          m.sent.unshift({ id: 'sent-' + Date.now(), to, subject: subj || '(no subject)', body: text, ts: Date.now() });
          save(m);
          audio.sendWhoosh();
          showMailboxes();
          showBanner('Mail', 'Sent. Carried by a very responsible paper plane.');
        });
      };
      const bindMailboxes = () => {
        body.querySelectorAll('[data-box]').forEach(b => b.addEventListener('click', () => { audio.click(); ({ inbox: showInbox, sent: showSent, trash: showTrash }[b.dataset.box])(); }));
        const check = body.querySelector('[data-action="check"]');
        check.addEventListener('click', () => {
          check.textContent = 'Checking…';
          setTimeout(() => {
            const m = load();
            if (Math.random() < 0.62) {
              const poolMsg = checkPool[Math.floor(Math.random() * checkPool.length)];
              const msg = Object.assign({}, poolMsg, { id: poolMsg.id + '-' + Date.now() });
              m.extra.unshift(msg); save(m);
              audio.mailNew();
              showMailboxes();
              showBanner('New Mail', msg.from + ' — ' + msg.subject, showInbox);
            } else {
              showMailboxes();
              showBanner('Mail', 'No new mail. Enjoy the silence.');
            }
          }, 1200);
        });
      };
      showMailboxes();
      /* external callers (Contacts → Mail) via custom event */
      view._compose = to => showCompose(to);
    }
  };
})());

/* ══════════════ SAFARI ══════════════ */
registerApp('safari', (() => {
  const BOOKMARKS = [
    { name: 'Wikipedia — iPhone 4', url: 'https://en.wikipedia.org/wiki/IPhone_4', letter: 'W', hue: 210, note: 'frames nicely' },
    { name: 'Hacker News', url: 'https://news.ycombinator.com/', letter: 'Y', hue: 24, note: 'pg would be proud' },
    { name: 'Example Domain', url: 'https://example.com/', letter: 'E', hue: 140, note: 'always loads' },
    { name: 'Apache HTTP Server', url: 'https://httpd.apache.org/', letter: 'A', hue: 262, note: 'the web’s grandpa' },
    { name: 'Wikipedia — iOS 4', url: 'https://en.wikipedia.org/wiki/IOS_4', letter: 'i', hue: 0, note: 'read the lore' },
    { name: 'The OldOS Project', url: 'https://github.com/zzanehip/The-OldOS-Project', letter: 'O', hue: 48, note: 'opens externally' }
  ];
  const MOST_VISITED = [
    ...BOOKMARKS.slice(0, 5),
    { name: 'DuckDuckGo', url: 'https://html.duckduckgo.com/html/?q=old+os', letter: 'D', hue: 45, note: 'search' },
    { name: 'Archives of 1990s Web', url: 'https://example.com/', letter: '9', hue: 300, note: 'blast from past' },
    { name: 'C|Net News 2010', url: 'https://news.ycombinator.com/', letter: 'C', hue: 120, note: 'tech nostalgia' },
    { name: 'Apple History', url: 'https://en.wikipedia.org/wiki/Apple_Inc.', letter: 'A', hue: 330, note: 'the company' }
  ];

  return {
    render(_, opts) {
      return '<div class="app-inner" style="background:#fff;position:relative">'
        + '<div class="safari-top"><div class="safari-addr"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.8"/><path d="M15.8 15.8L21 21"/></svg><input id="safariUrl" type="text" value="" placeholder="Search or enter address" autocapitalize="off" autocomplete="off" spellcheck="false" aria-label="Address and search"></div><button class="nav-btn" id="safariExternal" aria-label="Open in new tab" style="padding:0 8px"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M9 7h8v8"/></svg></button></div>'
        + '<div class="safari-progress" id="safariProgress"></div>'
        + '<div class="safari-body" id="safariBody">'
        + '<div class="mv-grid" id="safariMostVisited">' + MOST_VISITED.map((t, i) => '<button class="mv-tile" data-url="' + esc(t.url) + '"><span class="mv-favicon" style="background:linear-gradient(160deg,hsl(' + t.hue + ',55%,62%),hsl(' + t.hue + ',60%,34%))">' + esc(t.letter) + '</span><span>' + esc(t.name) + '</span></button>').join('') + '</div>'
        + '<iframe id="safariFrame" title="Web page" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox" style="display:none"></iframe>'
        + '<div class="safari-tip" id="safariTip" style="display:none">Some sites refuse to be framed (X-Frame-Options). Tap ↗ to open in a real tab — Wikipedia, Hacker News and Example.com embed beautifully.</div>'
        + '</div>'
        + '<div class="safari-bar">'
        + '<button class="safari-tool" id="safariBack" aria-label="Back" disabled><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>'
        + '<button class="safari-tool" id="safariFwd" aria-label="Forward" disabled><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></button>'
        + '<button class="safari-tool" id="safariReload" aria-label="Reload"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.3-5.6L20 8.5"/><path d="M20 4v4.5h-4.5"/></svg></button>'
        + '<button class="safari-tool" id="safariBookmarks" aria-label="Bookmarks"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3.5h12V21l-6-4.4L6 21V3.5z"/></svg></button>'
        + '<button class="safari-tool" id="safariHome" aria-label="Home"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11l8-7 8 7M6.5 9.5V20h11V9.5"/></svg></button>'
        + '</div>'
        + '<div class="bookmarks-panel" id="safariBookmarksPanel"><div class="nav-bar" style="flex:0 0 44px"><button class="nav-back" id="safariBmClose">Safari</button><span class="nav-title" style="font-size:16px">Bookmarks</span><button class="nav-btn red-btn" id="safariClearHistory" style="font-size:10px">Clear History</button></div>'
        + '<div class="app-scroll" style="background:#e8e8ec"><div class="group-title">Bookmarks</div><div class="group-list" id="safariBmList">' + BOOKMARKS.map(b => '<button class="row tappable" data-bm="' + esc(b.url) + '"><span class="avatar" style="width:30px;height:30px;flex-basis:30px;font-size:12px;border-radius:7px;background:linear-gradient(160deg,hsl(' + b.hue + ',55%,60%),hsl(' + b.hue + ',60%,32%))">' + esc(b.letter) + '</span><span class="row-label" style="font-size:12px">' + esc(b.name) + '<small class="sub">' + esc(b.note) + '</small></span><span class="row-chev">›</span></button>').join('') + '</div>'
        + '<div class="group-title">History</div><div class="group-list" id="safariHistoryList"><p class="center-note" id="safariNoHistory" style="padding:12px">No history yet.</p></div>'
        + '<p class="center-note" style="padding:10px">Pages open sandboxed. Nothing you browse leaves this browser (except to the sites themselves).</p>'
        + '</div></div>'
        + '</div>';
    },
    mount(view, opts) {
      const frame = $('#safariFrame', view);
      const grid = $('#safariMostVisited', view);
      const input = $('#safariUrl', view);
      const progress = $('#safariProgress', view);
      const tip = $('#safariTip', view);
      const backBtn = $('#safariBack', view), fwdBtn = $('#safariFwd', view);
      const history = store.get('safariHistory', []);
      let histIdx = history.length;
      let progressTimer = null;

      const paintHistory = () => {
        const box = $('#safariHistoryList', view);
        const h = store.get('safariHistory', []);
        box.innerHTML = h.length ? h.slice(0, 12).map(u => '<button class="row tappable" data-bm="' + esc(u) + '"><span class="row-label" style="font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;max-width:250px">' + esc(u) + '</span><span class="row-chev">›</span></button>').join('') : '<p class="center-note" id="safariNoHistory" style="padding:12px">No history yet.</p>';
      };
      const setProgress = p => { progress.style.width = p + '%'; progress.style.opacity = p >= 100 ? '0' : '1'; };
      const navigate = (raw, push = true) => {
        let url = raw.trim();
        if (!url) return;
        if (!/^[a-z]+:\/\//i.test(url)) {
          url = /\.[a-z]{2,}(\/|$|\?|#)/i.test(url) ? 'https://' + url : 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(url);
        }
        /* youtube watch URLs → embed player */
        const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
        if (yt) url = 'https://www.youtube.com/embed/' + yt[1] + '?autoplay=1';
        /* sites that refuse framing → open externally instead of a blank void */
        if (/^https?:\/\/(www\.)?(github\.com|twitter\.com|x\.com|facebook\.com|instagram\.com|linkedin\.com)/i.test(url)) {
          window.open(url, '_blank', 'noopener');
          showBanner('Safari', 'That site refuses to be framed — opened in a new tab.');
          return;
        }
        grid.style.display = 'none';
        tip.style.display = 'block';
        frame.style.display = 'block';
        setProgress(18);
        let p = 18;
        clearInterval(progressTimer);
        progressTimer = setInterval(() => { p = Math.min(88, p + Math.random() * 9 + 2); setProgress(p); }, 200);
        frame.src = url;
        input.value = url;
        tip.textContent = 'Loading ' + url.slice(0, 60) + (url.length > 60 ? '…' : '');
        if (push) {
          const h = store.get('safariHistory', []);
          h.unshift(url);
          store.set('safariHistory', h.slice(0, 30));
          histIdx = 0;
          backBtn.disabled = false; fwdBtn.disabled = true;
        }
        paintHistory();
      };
      frame.addEventListener('load', () => { clearInterval(progressTimer); setProgress(100); tip.style.display = 'none'; setTimeout(() => { progress.style.width = '0%'; }, 500); });

      $('#safariUrl', view).addEventListener('keydown', e => { if (e.key === 'Enter') { navigate(input.value); input.blur(); } });
      $('#safariExternal', view).addEventListener('click', () => { if (input.value) window.open(input.value, '_blank', 'noopener'); });
      backBtn.addEventListener('click', () => { try { frame.contentWindow.history.back(); } catch (e) { navigate(input.value, false); } });
      fwdBtn.addEventListener('click', () => { try { frame.contentWindow.history.forward(); } catch (e) {} });
      $('#safariReload', view).addEventListener('click', () => { if (frame.style.display === 'block') frame.src = frame.src; });
      $('#safariHome', view).addEventListener('click', () => { frame.style.display = 'none'; tip.style.display = 'none'; grid.style.display = 'grid'; input.value = ''; });
      $('#safariBookmarks', view).addEventListener('click', () => $('#safariBookmarksPanel', view).classList.add('open'));
      $('#safariBmClose', view).addEventListener('click', () => $('#safariBookmarksPanel', view).classList.remove('open'));
      $('#safariClearHistory', view).addEventListener('click', () => { store.set('safariHistory', []); paintHistory(); });
      view.addEventListener('click', e => {
        const bm = e.target.closest('[data-bm],[data-url]');
        if (bm) { const url = bm.dataset.bm || bm.dataset.url; $('#safariBookmarksPanel', view).classList.remove('open'); navigate(url); }
      });
      paintHistory();
      if (opts && opts.url) navigate(opts.url);
    },
    unmount(view) { const f = view.querySelector('#safariFrame'); if (f) f.src = 'about:blank'; }
  };
})());

/* ══════════════ CONTACTS ══════════════ */
registerApp('contacts', (() => {
  return {
    render() {
      const list = contactsStore.load().slice().sort((a, b) => fullName(a).localeCompare(fullName(b)));
      let lastLetter = '';
      const groups = list.map(c => {
        const L = fullName(c).charAt(0).toUpperCase();
        const header = L !== lastLetter ? '<div class="group-title" style="margin:10px 14px 4px;color:#39404e">' + esc(L) + '</div>' : '';
        lastLetter = L;
        return header + '<button class="row tappable contact-row" data-id="' + esc(c.id) + '"><span class="avatar" style="width:36px;height:36px;flex-basis:36px;font-size:12px;' + avatarStyle(c.hue) + '">' + esc(initials(c)) + '</span><span class="row-label">' + esc(fullName(c)) + '<small class="sub">' + esc(c.phone) + '</small></span><span class="row-chev">›</span></button>';
      }).join('');
      return '<div class="app-inner pinstripe"><div class="nav-bar"><span class="nav-title">Contacts</span><button class="nav-btn" data-action="add">+</button></div>'
        + '<div style="padding:8px 12px 2px"><input id="contactSearch" class="ios-input" placeholder="Search contacts" autocomplete="off" aria-label="Search contacts"></div>'
        + '<div class="app-scroll" id="contactList">' + groups + '</div>'
        + '<div class="subpage" id="contactDetail" aria-hidden="true"></div>'
        + '</div>';
    },
    mount(view) {
      const list = $('#contactList', view);
      const detail = $('#contactDetail', view);
      const openDetail = c => {
        detail.innerHTML = '<div class="nav-bar"><button class="nav-back" data-act="close">Contacts</button><span class="nav-title" style="font-size:16px">Info</span><button class="nav-btn red-btn" data-act="delete" style="font-size:11px">Delete</button></div>'
          + '<div class="app-scroll pinstripe"><div style="display:flex;flex-direction:column;align-items:center;padding:20px 0 12px">'
          + '<span class="avatar" style="width:82px;height:82px;flex-basis:82px;font-size:28px;' + avatarStyle(c.hue) + '">' + esc(initials(c)) + '</span>'
          + '<div style="margin-top:10px;font-size:19px;font-weight:800;color:#111">' + esc(fullName(c)) + '</div>'
          + '<div style="display:flex;gap:14px;margin-top:10px">'
          + '<button class="call-btn" data-act="call" style="width:52px;height:52px" aria-label="Call"><svg viewBox="0 0 24 24" width="23" height="23" fill="#fff"><path d="M6.6 10.8a15.4 15.4 0 0 1 10.8 0l2 2a1.3 1.3 0 0 1 .1 1.8l-2 2.2a1.3 1.3 0 0 1-1.8.3l-2.7-1.7a1.3 1.3 0 0 1-.7-1.2v-1.5a11.9 11.9 0 0 0-4.5 0v1.5a1.3 1.3 0 0 1-.7 1.2l-2.7 1.7a1.3 1.3 0 0 1-1.8-.3l-2-2.2a1.3 1.3 0 0 1 .1-1.8l2-2z"/></svg></button>'
          + '<button class="call-btn" data-act="mail" style="width:52px;height:52px;background:radial-gradient(circle at 50% 36%, #9dc4f5, #2b6dd4 72%)" aria-label="Email"><svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M4 7l8 6 8-6" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'
          + '</div></div>'
          + '<div class="group-list"><div class="row"><span class="row-label" style="color:#8a5a00;font-size:11px;text-transform:uppercase;letter-spacing:.08em;width:56px">mobile</span><button class="row-value blue" data-act="call" style="border:none;background:none;font-size:15px;cursor:pointer">' + esc(c.phone) + '</button></div>'
          + (c.email ? '<button class="row tappable" data-act="mail"><span class="row-label" style="color:#8a5a00;font-size:11px;text-transform:uppercase;letter-spacing:.08em;width:56px">email</span><span class="row-value blue">' + esc(c.email) + '</span></button>' : '')
          + '</div>'
          + '<p class="center-note">OldOS Contacts · synced nowhere, cherished everywhere</p>'
          + '</div>';
        detail.classList.add('open');
        detail.querySelectorAll('[data-act="call"]').forEach(b => b.addEventListener('click', () => startCall(view, c.phone, fullName(c))));
        detail.querySelectorAll('[data-act="mail"]').forEach(b => b.addEventListener('click', () => {
          OldOS.closeApp();
          setTimeout(() => {
            launchApp('mail');
            setTimeout(() => {
              const mailView = document.querySelector('.app-view[data-app="mail"]');
              if (mailView && mailView._compose) mailView._compose(c.email);
            }, 320);
          }, 240);
        }));
        detail.querySelector('[data-act="close"]').addEventListener('click', () => detail.classList.remove('open'));
        detail.querySelector('[data-act="delete"]').addEventListener('click', () => {
          contactsStore.save(contactsStore.load().filter(x => x.id !== c.id));
          detail.classList.remove('open');
          showBanner('Contacts', fullName(c) + ' removed.');
          OldOS.closeApp();
          setTimeout(() => launchApp('contacts'), 60);
        });
      };
      list.addEventListener('click', e => {
        const row = e.target.closest('[data-id]'); if (!row) return;
        const c = contactsStore.byId(row.dataset.id); if (c) openDetail(c);
      });
      $('#contactSearch', view).addEventListener('input', e => {
        const q = e.target.value.trim().toLowerCase();
        list.querySelectorAll('[data-id]').forEach(row => { row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none'; });
        list.querySelectorAll('.group-title').forEach(h => { h.style.display = q ? 'none' : ''; });
      });
      view.querySelector('[data-action="add"]').addEventListener('click', () => {
        detail.innerHTML = '<div class="nav-bar"><button class="nav-back" data-act="close">Contacts</button><span class="nav-title" style="font-size:16px">New Contact</span><button class="nav-btn blue" data-act="save">Save</button></div>'
          + '<div class="app-scroll pinstripe"><div class="group-list" style="margin-top:14px">'
          + '<input id="ncFirst" class="row ios-input" placeholder="First name" style="border-bottom:1px solid #dcdce2;border-radius:0;height:46px;border:none;box-shadow:none">'
          + '<input id="ncLast" class="row ios-input" placeholder="Last name" style="border-bottom:1px solid #dcdce2;border-radius:0;height:46px;border:none;box-shadow:none">'
          + '<input id="ncPhone" class="row ios-input" placeholder="Phone number" style="border-bottom:1px solid #dcdce2;border-radius:0;height:46px;border:none;box-shadow:none" type="tel">'
          + '<input id="ncEmail" class="row ios-input" placeholder="Email (optional)" style="border-radius:0;height:46px;border:none;box-shadow:none" type="email">'
          + '</div></div>';
        detail.classList.add('open');
        $('#ncFirst', detail).focus();
        detail.querySelector('[data-act="close"]').addEventListener('click', () => detail.classList.remove('open'));
        detail.querySelector('[data-act="save"]').addEventListener('click', () => {
          const first = $('#ncFirst', detail).value.trim(), last = $('#ncLast', detail).value.trim(), phone = $('#ncPhone', detail).value.trim(), email = $('#ncEmail', detail).value.trim();
          if (!first && !last) { showBanner('Contacts', 'A name would help.'); return; }
          const c = { id: 'c-' + Date.now(), first: first || 'Friend', last, phone: phone || '(000) 555-0000', email, star: false, hue: Math.floor(Math.random() * 360) };
          const all = contactsStore.load(); all.push(c); contactsStore.save(all);
          detail.classList.remove('open');
          OldOS.closeApp();
          setTimeout(() => launchApp('contacts'), 60);
          showBanner('Contacts', fullName(c) + ' added.');
        });
      });
    }
  };
})());

})(window.OldOS);
