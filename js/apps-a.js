/* ═══════════════════════════════════════════════════════════════
   OldOS · Web Edition — apps, part A
   Messages · Calendar · Photos · Camera · Stocks · Maps · Weather · Notes
   ═══════════════════════════════════════════════════════════════ */
'use strict';
(function (OldOS) {
const { $, $$, esc, store, audio, registerApp, launchApp, showBanner, fmtDuration } = OldOS;

/* ══════════════ MESSAGES ══════════════ */
registerApp('messages', (() => {
  const SEED_THREADS = () => ([
    { id: 't-mom', name: 'Mom', hue: 340, unread: 1, msgs: [
      { me: false, text: 'Sweetie, did you try the slide thing yet?', ts: Date.now() - 1000 * 60 * 93 },
      { me: true,  text: 'Yeah Mom, it works. The whole phone is in the browser now.', ts: Date.now() - 1000 * 60 * 88 },
      { me: false, text: 'In the WHAT? Anyway, call your grandmother.', ts: Date.now() - 1000 * 60 * 41 }
    ]},
    { id: 't-maya', name: 'Maya', hue: 262, unread: 1, msgs: [
      { me: false, text: 'did the jiggle mode survive the rebuild?', ts: Date.now() - 1000 * 60 * 18 },
      { me: false, text: 'also the calculator ± button is sacred. do not touch it.', ts: Date.now() - 1000 * 60 * 17 }
    ]},
    { id: 't-lab', name: 'The Lab', hue: 200, unread: 0, msgs: [
      { me: false, text: 'Build 9 is green. Clock, calculator, homescreen — all shipping.', ts: Date.now() - 1000 * 60 * 60 * 26 },
      { me: true,  text: 'Beautiful. Shipping it tonight.', ts: Date.now() - 1000 * 60 * 60 * 25 }
    ]}
  ]);
  const load = () => {
    let m = store.get('messages', null);
    if (!m || !m.threads) { m = { threads: SEED_THREADS() }; store.set('messages', m); }
    return m;
  };
  const save = m => { store.set('messages', m); OldOS.refreshBadges(); };

  const BOT = [
    ['hello|hi|hey', ['Hey! (·‿·)', 'Well hello there.', 'Hi hi hi.']],
    ['os|ios|old ?os', ['OldOS 2.0, baby. Rebuilt for the web.', 'It’s the water droplets that make it.', 'Slide to unlock. That’s the whole review.']],
    ['time', ['It’s ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ' — right on schedule.', 'Time flies when you’re reliving 2010.']],
    ['weather', ['Supposedly 84° and sunny. Check the Weather app before you leave.', 'If you’re indoors coding, it’s 72° and fluorescent.']],
    ['music|ipod|song', ['“Silicon Sunrise” is the anthem. It’s synthesized live, you know.', 'Put on Pocket Symphony No. 4 and thank me later.']],
    ['apple', ['Yes, Apple. No, not officially. Yes, we love them.', 'Apple, apple, apple. There. Happy?']],
    ['calc|calculator', ['The ± key is accounted for. Relax.', '4128 × 2 = 8256. You’re welcome.']],
    ['map|direction', ['Maps dropped a pin on you. San Antonio, most likely.', 'Zoom in. Always zoom in.']],
    ['secret|password|passcode', ['If I knew, would I tell you over SMS? …It’s in Settings → General → Passcode.', 'Nope. But your Notes might know.']]
  ];
  const botReply = (text, msgs) => {
    const t = text.toLowerCase();
    for (const [pat, arr] of BOT) {
      if (new RegExp(pat).test(t)) return arr[Math.floor(Math.random() * arr.length)];
    }
    const misc = ['lol. true.', 'fascinating. tell me more.', 'anyway — have you tried turning the whole decade off and on again?', 'noted. filing under “important stuff from you”.', 'ok but did you try Maps yet?', 'this is why we can’t have nice OS.'];
    return misc[Math.floor(Math.random() * misc.length)];
  };

  const renderList = () => {
    const m = load();
    return '<div class="app-inner">'
      + '<div class="nav-bar"><span class="nav-title">Messages</span><button class="nav-btn" data-action="compose">Compose</button></div>'
      + '<div class="app-scroll" id="convList">'
      + m.threads.map(t => {
          const last = t.msgs[t.msgs.length - 1];
          const initial = esc(t.name.trim().charAt(0).toUpperCase());
          const prev = last ? (last.me ? 'You: ' : '') + last.text : '';
          const time = last ? new Date(last.ts).toLocaleDateString([], { month: 'numeric', day: 'numeric' }) : '';
          return '<button class="conv-row" data-thread="' + esc(t.id) + '">'
            + '<span class="avatar" style="background:radial-gradient(circle at 35% 32%, hsl(' + t.hue + ',60%,64%), hsl(' + t.hue + ',62%,38%))">' + initial + '</span>'
            + '<span style="min-width:0"><span class="conv-name">' + esc(t.name) + (t.unread ? ' <span class="mail-dot" style="display:inline-block;vertical-align:1px"></span>' : '') + '</span>'
            + '<span class="conv-prev">' + esc(prev) + '</span></span>'
            + '<span class="conv-time">' + esc(time) + '</span></button>';
        }).join('')
      + '</div></div>';
  };

  const renderThread = (t) => {
    return '<div class="app-inner">'
      + '<div class="nav-bar"><button class="nav-back" data-action="back">Messages</button><span class="nav-title">' + esc(t.name) + '</span><button class="nav-btn" data-action="clear">Clear</button></div>'
      + '<div class="msg-thread" id="msgThread">'
      + t.msgs.map(m => '<div class="msg-time">' + new Date(m.ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + '</div><div class="bubble ' + (m.me ? 'me' : 'them') + '">' + esc(m.text) + '</div>').join('')
      + '</div>'
      + '<form class="msg-compose" id="msgForm"><input type="text" id="msgInput" placeholder="Text Message" autocomplete="off" aria-label="Message"><button type="submit" class="btn-pill" style="border-radius:16px">Send</button></form>'
      + '</div>';
  };

  return {
    render() { return renderList(); },
    mount(view) {
      const openThread = id => {
        const m = load();
        const t = m.threads.find(x => x.id === id); if (!t) return;
        t.unread = 0; save(m);
        view.innerHTML = renderThread(t);
        const thread = $('#msgThread', view);
        thread.scrollTop = thread.scrollHeight;
        view.querySelector('[data-action="back"]').addEventListener('click', () => { view.innerHTML = renderList(); bindList(); });
        view.querySelector('[data-action="clear"]').addEventListener('click', () => {
          const mm = load();
          const tt = mm.threads.find(x => x.id === id);
          tt.msgs = []; save(mm); openThread(id);
        });
        const form = $('#msgForm', view);
        const input = $('#msgInput', view);
        form.addEventListener('submit', e => {
          e.preventDefault();
          const text = input.value.trim(); if (!text) return;
          const mm = load(); const tt = mm.threads.find(x => x.id === id);
          tt.msgs.push({ me: true, text, ts: Date.now() });
          save(mm);
          audio.sendWhoosh();
          view.innerHTML = renderThread(tt);
          const th = $('#msgThread', view); th.scrollTop = th.scrollHeight;
          bindThread(id);
          /* bot reply */
          const typing = document.createElement('div');
          typing.className = 'typing'; typing.innerHTML = '<i></i><i></i>';
          setTimeout(() => { const th2 = $('#msgThread', view); if (th2) { th2.appendChild(typing); th2.scrollTop = th2.scrollHeight; } }, 650);
          setTimeout(() => {
            typing.remove();
            const m2 = load(); const t2 = m2.threads.find(x => x.id === id);
            t2.msgs.push({ me: false, text: botReply(text), ts: Date.now() });
            if (OldOS.currentApp !== 'messages') t2.unread = (t2.unread || 0) + 1;
            save(m2);
            const th3 = $('#msgThread', view);
            if (th3) {
              const b = document.createElement('div');
              b.className = 'bubble them'; b.textContent = t2.msgs[t2.msgs.length - 1].text;
              const tm = document.createElement('div');
              tm.className = 'msg-time'; tm.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
              th3.appendChild(tm); th3.appendChild(b); th3.scrollTop = th3.scrollHeight;
              audio.triTone();
            } else {
              OldOS.refreshBadges();
            }
          }, 1500 + Math.random() * 1400);
        });
        bindThread(id);
      };
      const bindThread = () => {};
      const bindList = () => {
        view.querySelectorAll('[data-thread]').forEach(btn => btn.addEventListener('click', () => openThread(btn.dataset.thread)));
        const compose = view.querySelector('[data-action="compose"]');
        compose.addEventListener('click', () => {
          const to = prompt('Send to whom? (Mom, Maya, The Lab)', 'Maya');
          if (!to) return;
          const m = load();
          let t = m.threads.find(x => x.name.toLowerCase() === to.trim().toLowerCase());
          if (!t) { t = { id: 't-' + Date.now(), name: to.trim(), hue: Math.floor(Math.random() * 360), unread: 0, msgs: [] }; m.threads.push(t); }
          save(m); openThread(t.id);
        });
      };
      bindList();
    }
  };
})());

/* ══════════════ CALENDAR ══════════════ */
registerApp('calendar', (() => {
  const DAYS = ['S','M','T','W','T','F','S'];
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const key = d => d.getFullYear() + '-' + OldOS.pad2(d.getMonth() + 1) + '-' + OldOS.pad2(d.getDate());
  const loadEvents = () => store.get('calEvents', null) || seedEvents();
  const seedEvents = () => {
    const today = new Date();
    const at = (offset, title, time) => { const d = new Date(); d.setDate(d.getDate() + offset); return { [key(d)]: [{ id: 'ev-' + offset, title, time }] }; };
    const ev = Object.assign({}, at(0, 'Ship OldOS to the web', '9:00 AM'), at(2, 'Dentist — bring book', '3:30 PM'), at(4, 'iPhone 4 anniversary (2010)', 'All Day'), at(-3, 'Called Grandma', '7:00 PM'));
    store.set('calEvents', ev);
    return ev;
  };
  const saveEvents = ev => store.set('calEvents', ev);
  let viewDate = new Date(), selected = new Date();

  const render = () => {
    const y = viewDate.getFullYear(), mo = viewDate.getMonth();
    const first = new Date(y, mo, 1);
    const startDay = first.getDay();
    const daysIn = new Date(y, mo + 1, 0).getDate();
    const daysPrev = new Date(y, mo, 0).getDate();
    const today = new Date();
    const events = loadEvents();
    let cells = '';
    for (let i = 0; i < 42; i++) {
      const n = i - startDay + 1;
      let dNum, dObj, out = false;
      if (n < 1) { dNum = daysPrev + n; dObj = new Date(y, mo - 1, dNum); out = true; }
      else if (n > daysIn) { dNum = n - daysIn; dObj = new Date(y, mo + 1, dNum); out = true; }
      else { dNum = n; dObj = new Date(y, mo, n); }
      const isToday = dObj.toDateString() === today.toDateString();
      const isSel = dObj.toDateString() === selected.toDateString();
      const k = key(dObj);
      const evs = events[k] || [];
      cells += '<button class="cal-cell' + (out ? ' out' : '') + (isToday ? ' today' : '') + (isSel ? ' selected' : '') + '" data-date="' + k + '">'
        + '<span class="dnum">' + dNum + '</span>'
        + (evs.length ? '<span class="evdots">' + evs.slice(0, 4).map(() => '<i></i>').join('') + '</span>' : '')
        + '</button>';
    }
    const selKey = key(selected);
    const selEvs = (events[selKey] || []);
    const selLabel = selected.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    return '<div class="app-inner" style="background:#101014">'
      + '<div class="nav-bar red"><button class="nav-back" data-action="today">Today</button><span class="nav-title">' + MONTHS[mo] + ' ' + y + '</span><button class="nav-btn" data-action="next-month">' + '›' + '</button></div>'
      + '<div class="cal-weekdays">' + DAYS.map(d => '<span>' + d + '</span>').join('') + '</div>'
      + '<div class="cal-grid">' + cells + '</div>'
      + '<div style="flex:1;overflow-y:auto;padding:10px 12px">'
      + '<div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#8d8d95;margin-bottom:6px">' + esc(selLabel) + '</div>'
      + (selEvs.length ? selEvs.map(ev => '<div class="row" style="border-radius:8px;margin-bottom:6px;border:1px solid rgba(255,255,255,.08);background:#1b1b21;color:#eee"><span style="color:#ffc36b;margin-right:4px">●</span><span style="color:#eee">' + esc(ev.title) + '</span><span style="margin-left:auto;color:#8d8d95;font-size:11px">' + esc(ev.time || '') + '</span><button class="row-chev" data-del-ev="' + esc(selKey) + ':' + esc(ev.id) + '" aria-label="Delete event" style="background:none;border:none;cursor:pointer">×</button></div>').join('') : '<p style="color:#5f6068;font-size:12px;padding:6px 2px">No events. Suspiciously free.</p>')
      + '<form id="evForm" style="display:flex;gap:6px;margin-top:10px"><input class="ios-input" id="evTitle" placeholder="New event…" autocomplete="off" aria-label="Event title" style="flex:1.4"><input class="ios-input" id="evTime" type="time" aria-label="Time" style="flex:.8"><button type="submit" class="nav-btn">Add</button></form>'
      + '</div></div>';
  };

  return {
    render() { return render(); },
    mount(view) {
      const rebind = () => {
        view.innerHTML = render();
        view.querySelector('[data-action="today"]').addEventListener('click', () => { viewDate = new Date(); selected = new Date(); rebind(); });
        view.querySelector('[data-action="next-month"]').addEventListener('click', () => { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1); rebind(); });
        view.querySelectorAll('.cal-cell').forEach(cell => cell.addEventListener('click', () => {
          const [yy, mm, dd] = cell.dataset.date.split('-').map(Number);
          selected = new Date(yy, mm - 1, dd);
          if (selected.getMonth() !== viewDate.getMonth()) viewDate = new Date(selected.getFullYear(), selected.getMonth(), 1);
          rebind();
        }));
        view.querySelectorAll('[data-del-ev]').forEach(btn => btn.addEventListener('click', () => {
          const [k, id] = btn.dataset.delEv.split(':');
          const ev = loadEvents();
          ev[k] = (ev[k] || []).filter(e => e.id !== id);
          if (!ev[k].length) delete ev[k];
          saveEvents(ev); rebind();
        }));
        $('#evForm', view).addEventListener('submit', e => {
          e.preventDefault();
          const title = $('#evTitle', view).value.trim(); if (!title) return;
          const timeVal = $('#evTime', view).value;
          const time = timeVal ? new Date('2000-01-01T' + timeVal).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'All Day';
          const ev = loadEvents();
          const k = key(selected);
          (ev[k] = ev[k] || []).push({ id: 'ev-' + Date.now(), title, time });
          saveEvents(ev); rebind();
        });
      };
      rebind();
    }
  };
})());

/* ══════════════ PHOTOS ══════════════ */
registerApp('photos', (() => {
  const BUNDLED = [
    { src: 'assets/img/Market_1.jpg', cap: 'OldOS · Marketing 1' },
    { src: 'assets/img/Market_2.jpg', cap: 'OldOS · Marketing 2' },
    { src: 'assets/img/Market_3.jpg', cap: 'OldOS · Marketing 3' },
    { src: 'assets/img/Market_4.jpg', cap: 'OldOS · Marketing 4' },
    { src: 'assets/img/Market_5.jpg', cap: 'OldOS · Marketing 5' },
    { src: 'assets/img/Header.jpg', cap: 'OldOS · README Header' }
  ];
  const WALLPAPER_ALBUM = Array.from({ length: 27 }, (_, i) => ({ src: 'assets/wallpapers/wallpaper_' + (i + 1) + '.jpg', cap: 'Wallpaper ' + (i + 1) }));
  const albums = () => ({
    'Camera Roll': () => store.get('photos', []).map((src, i) => ({ src, cap: 'Camera Roll ' + (i + 1), user: true })),
    'OldOS': () => BUNDLED,
    'Wallpapers': () => WALLPAPER_ALBUM
  });
  let currentAlbum = 'OldOS';

  return {
    render() {
      const photos = albums()[currentAlbum]();
      return '<div class="app-inner" style="background:#0c0c0e">'
        + '<div class="nav-bar"><button class="nav-btn" data-action="albums">Albums</button><span class="nav-title" id="albumTitle">' + esc(currentAlbum) + '</span><span class="nav-btn" style="pointer-events:none;opacity:.75">' + photos.length + ' Photos</span></div>'
        + '<div class="app-scroll" style="background:#0c0c0e"><div class="photos-grid">'
        + photos.map((p, i) => '<button data-idx="' + i + '" aria-label="Photo ' + (i + 1) + '"><img src="' + esc(p.src) + '" alt="' + esc(p.cap) + '" loading="lazy"></button>').join('')
        + (photos.length ? '' : '<p class="center-note" style="grid-column:1/-1;padding:30px 10px;color:#666">No photos yet — open Camera and snap something beautiful.</p>')
        + '</div></div>'
        + '</div>';
    },
    mount(view) {
      const albumBtn = view.querySelector('[data-action="albums"]');
      const openViewer = (photos, startIdx) => {
        let idx = startIdx;
        const viewer = document.createElement('div');
        viewer.className = 'photo-viewer';
        const paint = () => {
          const p = photos[idx];
          viewer.innerHTML = '<div class="nav-bar"><button class="nav-btn" data-v="done">Done</button><span class="nav-title" style="font-size:15px">' + (idx + 1) + ' of ' + photos.length + '</span>'
            + (p.user ? '<button class="nav-btn red-btn" data-v="delete">Delete</button>' : '<span class="nav-btn" style="pointer-events:none;opacity:.6">' + esc(p.cap.split('·')[0].trim()) + '</span>')
            + '</div><img alt="' + esc(p.cap) + '" src="' + esc(p.src) + '">'
            + '<div style="flex:0 0 auto;display:flex;justify-content:space-between;padding:8px 14px;background:#050507"><button class="nav-btn" data-v="prev">‹ Prev</button><div style="color:#8f8f99;font-size:11px;align-self:center">' + esc(p.cap) + '</div><button class="nav-btn" data-v="next">Next ›</button></div>';
          viewer.querySelector('[data-v="done"]').addEventListener('click', () => viewer.remove());
          viewer.querySelector('[data-v="prev"]').addEventListener('click', () => { idx = (idx - 1 + photos.length) % photos.length; paint(); });
          viewer.querySelector('[data-v="next"]').addEventListener('click', () => { idx = (idx + 1) % photos.length; paint(); });
          const del = viewer.querySelector('[data-v="delete"]');
          if (del) del.addEventListener('click', () => {
            const arr = store.get('photos', []);
            const target = photos[idx].src;
            const ni = arr.indexOf(target);
            if (ni >= 0) arr.splice(ni, 1);
            store.set('photos', arr);
            showBanner('Photos', 'Photo deleted.');
            viewer.remove();
            const grid = view.querySelector('.photos-grid');
            const fresh = albums()['Camera Roll']();
            if (currentAlbum === 'Camera Roll') {
              grid.innerHTML = fresh.map((p, i) => '<button data-idx="' + i + '"><img src="' + esc(p.src) + '" alt="Camera roll photo ' + i + '"></button>').join('') || '<p class="center-note" style="grid-column:1/-1;color:#666;padding:30px 10px">Album empty.</p>';
              bindGrid();
              view.querySelector('.nav-title + span').textContent = fresh.length + ' Photos';
            }
          });
        };
        view.appendChild(viewer);
        paint();
      };
      const bindGrid = () => {
        const photos = albums()[currentAlbum]();
        view.querySelectorAll('.photos-grid button[data-idx]').forEach(btn => btn.addEventListener('click', () => openViewer(photos, +btn.dataset.idx)));
      };
      bindGrid();
      albumBtn.addEventListener('click', () => {
        const existing = view.querySelector('.albums-panel');
        if (existing) { existing.remove(); return; }
        const panel = document.createElement('div');
        panel.className = 'albums-panel';
        panel.style.cssText = 'position:absolute;top:64px;left:10px;z-index:9;background:rgba(22,22,26,.97);border:1px solid rgba(255,255,255,.2);border-radius:12px;overflow:hidden;min-width:170px;box-shadow:0 10px 30px rgba(0,0,0,.6)';
        panel.innerHTML = Object.keys(albums()).map(name => {
          const count = albums()[name]().length;
          return '<button class="row" data-album="' + esc(name) + '" style="background:transparent;border-bottom:1px solid rgba(255,255,255,.1);color:#fff;display:flex;justify-content:space-between;width:100%;padding:11px 14px">' + esc(name) + '<span style="color:#8f8f99">' + count + '</span></button>';
        }).join('');
        view.appendChild(panel);
        panel.addEventListener('click', e => {
          const b = e.target.closest('[data-album]'); if (!b) return;
          currentAlbum = b.dataset.album;
          const photos = albums()[currentAlbum]();
          view.querySelector('#albumTitle').textContent = currentAlbum;
          view.querySelector('.photos-grid').innerHTML = photos.map((p, i) => '<button data-idx="' + i + '"><img src="' + esc(p.src) + '" alt="' + esc(p.cap) + '" loading="lazy"></button>').join('') || '<p class="center-note" style="grid-column:1/-1;color:#666;padding:30px 10px">No photos yet.</p>';
          view.querySelector('.nav-title + span').textContent = photos.length + ' Photos';
          panel.remove();
          bindGrid();
        });
      });
    }
  };
})());

/* ══════════════ CAMERA ══════════════ */
registerApp('camera', (() => {
  return {
    render() {
      return '<div class="app-inner" style="background:#000">'
        + '<div class="nav-bar"><button class="nav-btn" id="camFlash" aria-pressed="false">⚡ Off</button><span class="nav-title">Camera</span><button class="nav-btn" id="camFlip">Flip</button></div>'
        + '<div style="flex:1;position:relative;overflow:hidden;background:#000">'
        + '<video id="camVideo" autoplay playsinline muted style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none"></video>'
        + '<div id="camFallback" style="position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;padding:24px">'
        +   '<svg viewBox="0 0 24 18" width="52" height="40" fill="#3a3a42"><path d="M8.2 1L6.7 3.4H3.4A2.4 2.4 0 0 0 1 5.8v8.8a2.4 2.4 0 0 0 2.4 2.4h17.2a2.4 2.4 0 0 0 2.4-2.4V5.8a2.4 2.4 0 0 0-2.4-2.4h-3.3L15.8 1H8.2z"/></svg>'
        +   '<p style="color:#8f8f99;font-size:12px;line-height:1.6">Camera unavailable.<br>Grant camera permission, or check that your device has one — even iPhones in 2010 were pickier.</p>'
        +   '<button class="nav-btn blue" id="camToPhotos">Open Photos Instead</button>'
        + '</div>'
        + '<div id="camFlashFx" style="position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;transition:opacity .09s"></div>'
        + '<div style="position:absolute;bottom:10px;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:38px;z-index:5">'
        +   '<button class="nav-btn" id="camToApps" style="border-radius:16px">Photos</button>'
        +   '<button id="camShutter" aria-label="Take photo" style="width:62px;height:62px;border-radius:50%;border:4px solid #e8e8ec;background:radial-gradient(circle at 50% 40%, #fff, #b9b9c0 70%);box-shadow:0 3px 10px rgba(0,0,0,.6), inset 0 -3px 6px rgba(0,0,0,.25)"></button>'
        +   '<span style="width:54px"></span>'
        + '</div>'
        + '</div></div>';
    },
    mount(view) {
      const video = $('#camVideo', view);
      const fallback = $('#camFallback', view);
      let stream = null, facing = 'environment', flash = false;
      const start = async () => {
        try {
          if (stream) stream.getTracks().forEach(t => t.stop());
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
          video.srcObject = stream;
          video.style.display = 'block';
          fallback.style.display = 'none';
        } catch (e) {
          video.style.display = 'none';
          fallback.style.display = 'flex';
        }
      };
      start();
      $('#camFlip', view).addEventListener('click', () => { facing = facing === 'environment' ? 'user' : 'environment'; start(); });
      const flashBtn = $('#camFlash', view);
      flashBtn.addEventListener('click', () => {
        flash = !flash;
        flashBtn.textContent = flash ? '⚡ On' : '⚡ Off';
        flashBtn.setAttribute('aria-pressed', String(flash));
        flashBtn.style.color = flash ? '#ffe37e' : '';
      });
      $('#camShutter', view).addEventListener('click', () => {
        audio.shutter();
        const fx = $('#camFlashFx', view);
        if (flash) { fx.style.opacity = '1'; setTimeout(() => fx.style.opacity = '0', 120); }
        if (video.style.display !== 'block' || !video.videoWidth) { showBanner('Camera', 'No live view to capture.'); return; }
        const canvas = document.createElement('canvas');
        const w = 480, h = Math.round(w * video.videoHeight / video.videoWidth);
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(video, 0, 0, w, h);
        const url = canvas.toDataURL('image/jpeg', 0.72);
        let photos = store.get('photos', []);
        photos.unshift(url);
        if (photos.length > 24) photos = photos.slice(0, 24);
        try { store.set('photos', photos); }
        catch (e) { photos = photos.slice(0, 8); store.set('photos', photos); }
        showBanner('Camera', 'Saved to Camera Roll.');
      });
      const openPhotos = () => { OldOS.closeApp(); setTimeout(() => launchApp('photos', { album: 'Camera Roll' }), 240); };
      $('#camToPhotos', view).addEventListener('click', openPhotos);
      $('#camToApps', view).addEventListener('click', openPhotos);
      view._stopCamera = () => { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; };
    },
    unmount(view) { if (view._stopCamera) view._stopCamera(); }
  };
})());

/* ══════════════ STOCKS ══════════════ */
registerApp('stocks', (() => {
  const SYMBOLS = [
    { s: 'AAPL', n: 'Apple Inc.' }, { s: 'MSFT', n: 'Microsoft Corp.' }, { s: 'GOOG', n: 'Alphabet Inc.' },
    { s: 'AMZN', n: 'Amazon.com' }, { s: 'NFLX', n: 'Netflix Inc.' }, { s: 'DIS', n: 'Walt Disney Co.' },
    { s: 'YHOO', n: 'Yahoo! Inc.' }, { s: 'GE', n: 'General Electric' }
  ];
  const DEMO = { AAPL: { c: 289.3, o: 285.1 }, MSFT: { c: 88.4, o: 87.9 }, GOOG: { c: 642.1, o: 648.8 }, AMZN: { c: 184.2, o: 179.5 }, NFLX: { c: 33.7, o: 34.1 }, DIS: { c: 152.6, o: 151.2 }, YHOO: { c: 14.8, o: 14.6 }, GE: { c: 17.2, o: 17.3 } };
  const mulberry32 = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const seedOf = s => s.split('').reduce((a, c) => a + c.charCodeAt(0) * 7, 13);
  let quotes = null, rangeKey = '1D', selected = 'AAPL', live = false;

  const paintSparkline = canvas => {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const rand = mulberry32(seedOf(selected + rangeKey));
    const pts = [];
    let v = 50;
    for (let i = 0; i < 60; i++) { v += (rand() - 0.48) * 6; v = Math.max(8, Math.min(92, v)); pts.push(v); }
    ctx.beginPath();
    pts.forEach((p, i) => { const x = (i / (pts.length - 1)) * (w - 8) + 4; const y = h - 6 - (p / 100) * (h - 12); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.strokeStyle = '#57d968'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.lineTo(w - 4, h); ctx.lineTo(4, h); ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(87,217,104,.3)'); g.addColorStop(1, 'rgba(87,217,104,0)');
    ctx.fillStyle = g; ctx.fill();
  };

  const detailHTML = () => {
    const q = (quotes && quotes[selected]) || DEMO[selected];
    const chg = q.c - q.o, pct = (chg / q.o) * 100, up = chg >= 0;
    const meta = SYMBOLS.find(x => x.s === selected);
    return '<div class="stock-detail" style="padding:10px 14px 12px;border-bottom:1px solid #1e1e24">'
      + '<div style="display:flex;align-items:baseline;gap:10px"><span style="font-size:19px;font-weight:800;color:#fff">' + esc(selected) + '</span>'
      + '<span style="font-size:10px;color:#77777f">' + esc(meta.n) + (live ? '' : ' · offline demo') + '</span>'
      + '<span class="stock-chg ' + (up ? 'up' : 'down') + '" style="margin-left:auto">' + (up ? '+' : '') + chg.toFixed(2) + ' (' + (up ? '+' : '') + pct.toFixed(2) + '%)</span></div>'
      + '<div style="font-size:46px;font-weight:100;color:#fff;letter-spacing:-.02em;margin:2px 0 4px;font-variant-numeric:tabular-nums">' + q.c.toFixed(2) + '</div>'
      + '<canvas id="spark" width="272" height="64" style="width:100%;height:64px"></canvas>'
      + '<div style="display:flex;gap:6px;justify-content:center;margin:6px 0">' + ['1D','1W','1M','3M','1Y'].map(r => '<button class="range-btn" data-range="' + r + '" style="border:1px solid #2f2f37;background:' + (r === rangeKey ? '#2b7fdd' : '#17171d') + ';color:' + (r === rangeKey ? '#fff' : '#8f8f99') + ';border-radius:10px;font-size:10px;padding:3px 9px;font-weight:800">' + r + '</button>').join('') + '</div>'
      + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;text-align:center">'
      + [['OPEN', q.o], ['HIGH', q.h || q.c * 1.011], ['LOW', q.l || q.c * 0.989], ['CLOSE', q.c]].map(([k, v]) => '<div><div style="font-size:8px;letter-spacing:.18em;color:#5f6068">' + k + '</div><div style="font-size:12px;color:#d8d8dd;font-variant-numeric:tabular-nums">' + (+v).toFixed(2) + '</div></div>').join('')
      + '</div></div>';
  };

  const listHTML = () => '<div class="app-scroll" id="stockList" style="background:#050507">'
    + SYMBOLS.map(({ s, n }) => {
        const q = (quotes && quotes[s]) || DEMO[s];
        const chg = q.c - q.o, up = chg >= 0, pct = (chg / q.o) * 100;
        return '<button class="stock-row" data-sym="' + s + '"><span><span class="stock-sym">' + s + '</span><span class="stock-name">' + esc(n) + '</span></span>'
          + '<span class="stock-price">' + q.c.toFixed(2) + '</span>'
          + '<span class="stock-chg ' + (up ? 'up' : 'down') + '">' + (up ? '+' : '') + pct.toFixed(2) + '%</span></button>';
      }).join('')
    + '<p class="center-note" style="color:#4c4c54">' + (live ? 'Live quotes via stooq.com' : 'Offline demo data — open Stocks with network for live quotes') + '</p>'
    + '</div>';

  const fetchQuotes = async () => {
    if (OldOS.settings.airplane) { quotes = null; live = false; return false; }
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const r = await fetch('https://stooq.com/q/l/?s=' + SYMBOLS.map(x => x.s.toLowerCase() + '.us').join(',') + '&f=snd2t2ohlcv&e=csv', { signal: ctrl.signal });
      clearTimeout(t);
      if (!r.ok) return false;
      const text = await r.text();
      const rows = text.trim().split('\n').slice(1);
      const out = {};
      rows.forEach(line => {
        const cols = line.split(',');
        const sym = (cols[0] || '').replace('.US', '').toUpperCase();
        const o = parseFloat(cols[3]), h = parseFloat(cols[4]), l = parseFloat(cols[5]), c = parseFloat(cols[6]);
        if (sym && isFinite(c)) out[sym] = { o: isFinite(o) ? o : c, h, l, c };
      });
      if (!Object.keys(out).length) return false;
      quotes = out; live = true; return true;
    } catch (e) { quotes = null; live = false; return false; }
  };

  return {
    render() {
      return '<div class="app-inner stocks-app"><div class="nav-bar"><span class="nav-title">Stocks</span><button class="nav-btn" data-action="refresh">Refresh</button></div>'
        + '<div id="stockDetail">' + detailHTML() + '</div>' + listHTML() + '</div>';
    },
    mount(view) {
      const repaint = () => {
        view.querySelector('#stockDetail').innerHTML = detailHTML();
        const spark = view.querySelector('#spark');
        if (spark) paintSparkline(spark);
        const list = view.querySelector('#stockList');
        list.outerHTML = listHTML();
        bindRows();
      };
      const bindRows = () => {
        view.querySelectorAll('.stock-row').forEach(btn => btn.addEventListener('click', () => { selected = btn.dataset.sym; repaint(); }));
        view.querySelectorAll('.range-btn').forEach(btn => btn.addEventListener('click', () => { rangeKey = btn.dataset.range; repaint(); }));
      };
      bindRows();
      const spark = view.querySelector('#spark');
      if (spark) paintSparkline(spark);
      fetchQuotes().then(ok => { if (ok) repaint(); });
      view.querySelector('[data-action="refresh"]').addEventListener('click', e => {
        e.target.textContent = '…';
        fetchQuotes().then(ok => { e.target.textContent = 'Refresh'; repaint(); showBanner('Stocks', ok ? 'Quotes updated.' : 'Couldn’t reach stooq.com — showing demo data.'); });
      });
    }
  };
})());

/* ══════════════ MAPS ══════════════ */
registerApp('maps', (() => {
  const HOME = { lat: 29.4241, lon: -98.4936, name: 'San Antonio, TX' };
  let center = { ...HOME }, zoomDelta = 0.028, lastResults = [];

  const embedURL = () => {
    const d = zoomDelta;
    const bbox = [center.lon - d, center.lat - d * 0.62, center.lon + d, center.lat + d * 0.62].join('%2C');
    return 'https://www.openstreetmap.org/export/embed.html?bbox=' + bbox + '&layer=mapnik&marker=' + center.lat.toFixed(5) + '%2C' + center.lon.toFixed(5);
  };

  return {
    render() {
      return '<div class="app-inner" style="background:#0e0f12;position:relative">'
        + '<div class="nav-bar"><span class="nav-title">Maps</span><button class="nav-btn" data-action="directions">Directions</button></div>'
        + '<div style="position:relative;flex:1">'
        + '<iframe id="osmFrame" title="Map" src="' + embedURL() + '" style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>'
        + '<form id="mapSearch" style="position:absolute;top:8px;left:8px;right:8px;display:flex;gap:6px;z-index:5">'
        +   '<input id="mapQuery" class="ios-input" style="flex:1;border-radius:9px;box-shadow:0 2px 8px rgba(0,0,0,.35), inset 0 2px 4px rgba(0,0,0,.17)" placeholder="Search or address" autocomplete="off" aria-label="Search maps">'
        +   '<button type="submit" class="nav-btn" style="border-radius:9px">Go</button>'
        + '</form>'
        + '<div id="mapResults" style="position:absolute;top:44px;left:8px;right:8px;z-index:5;background:#fff;border-radius:9px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.4);display:none;max-height:170px;overflow-y:auto"></div>'
        + '<div style="position:absolute;left:8px;bottom:14px;z-index:5;display:flex;flex-direction:column;gap:6px">'
        +   '<button class="nav-btn" data-zoom="in" style="width:34px;height:34px;border-radius:8px;font-size:17px;padding:0">+</button>'
        +   '<button class="nav-btn" data-zoom="out" style="width:34px;height:34px;border-radius:8px;font-size:17px;padding:0">−</button>'
        + '</div>'
        + '<button id="mapLocate" class="nav-btn" aria-label="Locate me" style="position:absolute;right:8px;bottom:14px;z-index:5;width:38px;height:38px;border-radius:50%;padding:0;display:flex;align-items:center;justify-content:center">'
        +   '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="6.2"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"/></svg>'
        + '</button>'
        + '<div id="directionsPanel" style="position:absolute;top:44px;left:8px;right:8px;z-index:6;background:rgba(14,15,18,.96);border:1px solid rgba(255,255,255,.18);border-radius:10px;padding:9px;display:none">'
        +   '<input id="dirFrom" class="ios-input" placeholder="From: current location" style="margin-bottom:6px;font-size:12px;height:28px">'
        +   '<input id="dirTo" class="ios-input" placeholder="To: destination" style="margin-bottom:6px;font-size:12px;height:28px">'
        +   '<button id="dirGo" class="btn-pill" style="width:100%">Get Directions</button>'
        +   '<div id="dirSteps" style="max-height:130px;overflow-y:auto;margin-top:8px;color:#e8e8ec;font-size:11px"></div>'
        + '</div>'
        + '</div></div>';
    },
    mount(view) {
      const frame = $('#osmFrame', view);
      const setCenter = (lat, lon, name) => {
        center = { lat, lon, name: name || 'Dropped pin' };
        frame.src = embedURL();
      };
      const search = async q => {
        if (!q.trim()) return [];
        if (OldOS.settings.airplane) { showBanner('Maps', 'Airplane Mode is on.'); return []; }
        try {
          const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=5&q=' + encodeURIComponent(q));
          return await r.json();
        } catch (e) { showBanner('Maps', 'Search unavailable offline.'); return []; }
      };
      $('#mapSearch', view).addEventListener('submit', async e => {
        e.preventDefault();
        const q = $('#mapQuery', view).value.trim();
        if (!q) return;
        lastResults = await search(q);
        const box = $('#mapResults', view);
        if (!lastResults.length) { box.innerHTML = '<p style="padding:10px;font-size:12px;color:#555">No results found.</p>'; box.style.display = 'block'; return; }
        box.innerHTML = lastResults.map((r, i) => '<button class="row" data-pick="' + i + '" style="border-bottom:1px solid #e3e3e8;font-size:11.5px"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(r.display_name) + '</span></button>').join('');
        box.style.display = 'block';
      });
      $('#mapResults', view).addEventListener('click', e => {
        const b = e.target.closest('[data-pick]'); if (!b) return;
        const r = lastResults[+b.dataset.pick];
        $('#mapQuery', view).value = r.display_name.split(',')[0];
        $('#mapResults', view).style.display = 'none';
        zoomDelta = 0.012;
        setCenter(parseFloat(r.lat), parseFloat(r.lon), r.display_name.split(',')[0]);
      });
      view.querySelectorAll('[data-zoom]').forEach(btn => btn.addEventListener('click', () => {
        zoomDelta = clamp(zoomDelta * (btn.dataset.zoom === 'in' ? 0.55 : 1.8), 0.002, 0.6);
        frame.src = embedURL();
      }));
      $('#mapLocate', view).addEventListener('click', () => {
        if (!navigator.geolocation) { showBanner('Maps', 'Geolocation not supported here.'); return; }
        navigator.geolocation.getCurrentPosition(
          pos => setCenter(pos.coords.latitude, pos.coords.longitude, 'Current Location'),
          () => showBanner('Maps', 'Location denied — showing San Antonio.'),
          { timeout: 5000 }
        );
      });
      $('[data-action="directions"]', view).addEventListener('click', () => {
        const p = $('#directionsPanel', view);
        p.style.display = p.style.display === 'none' ? 'block' : 'none';
      });
      $('#dirGo', view).addEventListener('click', async () => {
        const fromQ = $('#dirFrom', view).value.trim();
        const toQ = $('#dirTo', view).value.trim();
        const stepsBox = $('#dirSteps', view);
        if (!toQ) { stepsBox.innerHTML = '<p style="color:#ffb2a8">Tell me where to.</p>'; return; }
        stepsBox.innerHTML = '<p style="color:#8ec4f5">Routing…</p>';
        const fromR = fromQ ? await search(fromQ) : [{ lat: String(center.lat), lon: String(center.lon) }];
        const toR = await search(toQ);
        if (!fromR.length || !toR.length) { stepsBox.innerHTML = '<p style="color:#ffb2a8">Couldn’t resolve one of those.</p>'; return; }
        const a = fromR[0], b = toR[0];
        try {
          const r = await fetch('https://router.project-osrm.org/route/v1/driving/' + a.lon + ',' + a.lat + ';' + b.lon + ',' + b.lat + '?steps=true&geometries=geojson&overview=false');
          const j = await r.json();
          const route = j.routes && j.routes[0];
          if (!route) throw new Error('no route');
          const arrows = { depart: '↑', arrive: '◎', turn: '↪', 'new name': '↑', merge: '↗', fork: '⑂', 'end of road': '→', continue: '↑', roundabout: '↻', rotary: '↻', 'on ramp': '↗', 'off ramp': '↘' };
          const dist = route.distance >= 1000 ? (route.distance / 1000).toFixed(1) + ' km' : Math.round(route.distance) + ' m';
          const mins = Math.max(1, Math.round(route.duration / 60));
          let stepsHtml = '<div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.15);padding:4px 2px 6px;margin-bottom:4px"><b>' + dist + ' · ' + mins + ' min</b><span style="color:#8f96a3">fastest route</span></div>';
          const steps = route.legs[0].steps.slice(0, 14);
          const mod = m => {
            if (!m) return '↑';
            const key = (m.type || '') + (m.modifier ? ' ' + m.modifier : '');
            if (/left/.test(key) && /slight/.test(key)) return '↖';
            if (/right/.test(key) && /slight/.test(key)) return '↗';
            if (/left/.test(key)) return '←';
            if (/right/.test(key)) return '→';
            return arrows[m.type] || '↑';
          };
          stepsHtml += steps.map(s => '<div style="display:flex;gap:8px;padding:3px 2px;border-bottom:1px solid rgba(255,255,255,.06)"><span style="color:#8ec4f5;width:16px">' + mod(s.maneuver) + '</span><span>' + esc(s.maneuver.type.replace(/_/g, ' ')) + (s.name ? ' onto <b>' + esc(s.name) + '</b>' : '') + '</span></div>').join('');
          stepsBox.innerHTML = stepsHtml;
          setCenter(parseFloat(b.lat), parseFloat(b.lon), toQ);
        } catch (e) {
          stepsBox.innerHTML = '<p style="color:#ffb2a8">Directions engine unreachable. Try again with network.</p>';
        }
      });
    }
  };
  function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }
})());

/* ══════════════ WEATHER ══════════════ */
registerApp('weather', (() => {
  const CODE = {
    0: ['Clear', 'sun@2x.png', 'moon@2x.png'], 1: ['Mostly Clear', 'sun@2x.png', 'moon@2x.png'], 2: ['Partly Cloudy', 'partlycloudy@2x.png', 'moon@2x.png'],
    3: ['Cloudy', 'clouds@2x.png', 'clouds@2x.png'], 45: ['Fog', 'fog@2x.png', 'fog@2x.png'], 48: ['Rime Fog', 'fog@2x.png', 'fog@2x.png'],
    51: ['Light Drizzle', 'rain@2x.png', 'rain@2x.png'], 53: ['Drizzle', 'rain@2x.png', 'rain@2x.png'], 55: ['Heavy Drizzle', 'rain@2x.png', 'rain@2x.png'],
    56: ['Freezing Drizzle', 'rain&snow@2x.png', 'rain&snow@2x.png'], 57: ['Freezing Drizzle', 'rain&snow@2x.png', 'rain&snow@2x.png'],
    61: ['Light Rain', 'rain@2x.png', 'rain@2x.png'], 63: ['Rain', 'rain@2x.png', 'rain@2x.png'], 65: ['Heavy Rain', 'rain&clouds@2x.png', 'rain&clouds@2x.png'],
    66: ['Freezing Rain', 'rain&snow@2x.png', 'rain&snow@2x.png'], 67: ['Freezing Rain', 'rain&snow@2x.png', 'rain&snow@2x.png'],
    71: ['Light Snow', 'snow@2x.png', 'snow@2x.png'], 73: ['Snow', 'snow@2x.png', 'snow@2x.png'], 75: ['Heavy Snow', 'snow@2x.png', 'snow@2x.png'],
    77: ['Snow Grains', 'snow@2x.png', 'snow@2x.png'], 80: ['Light Showers', 'rain&sun@2x.png', 'rain@2x.png'], 81: ['Showers', 'rain&sun@2x.png', 'rain@2x.png'],
    82: ['Violent Showers', 'rain&clouds@2x.png', 'rain&clouds@2x.png'], 85: ['Snow Showers', 'snow@2x.png', 'snow@2x.png'], 86: ['Snow Showers', 'snow@2x.png', 'snow@2x.png'],
    95: ['Thunderstorm', 'lightning@2x.png', 'lightning@2x.png'], 96: ['Thunderstorm + Hail', 'lightning@2x.png', 'lightning@2x.png'], 99: ['Thunderstorm + Hail', 'lightning@2x.png', 'lightning@2x.png']
  };
  const FALLBACK = () => ({
    current: { temperature_2m: 84, apparent_temperature: 88, weather_code: 2, relative_humidity_2m: 38, wind_speed_10m: 9 },
    daily: {
      time: Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d.toISOString().slice(0, 10); }),
      weather_code: [0, 2, 3, 80, 1, 0],
      temperature_2m_max: [89, 88, 85, 81, 84, 87],
      temperature_2m_min: [71, 72, 70, 68, 70, 73]
    },
    cached: true
  });
  let place = { name: 'San Antonio', country: 'United States', latitude: 29.4241, longitude: -98.4936 };
  let unit = store.get('wxUnit', 'fahrenheit');
  let lastData = null;

  const codeOf = (data, dayIdx) => CODE[data.daily.weather_code[dayIdx]] || CODE[2];

  const render = () => {
    return '<div class="app-inner weather-bg">'
      + '<div class="nav-bar" style="background:linear-gradient(180deg,rgba(40,52,66,.92),rgba(16,22,30,.92));border-bottom:1px solid rgba(255,255,255,.12);box-shadow:none"><button class="nav-btn" data-action="city">City</button><span class="nav-title" style="font-size:16px;font-weight:600">Weather</span><button class="nav-btn" data-action="unit">°' + (unit === 'fahrenheit' ? 'F' : 'C') + '</button></div>'
      + '<div id="wxBody" style="flex:1;display:flex;flex-direction:column"></div>'
      + '<div class="wx-days" id="wxDays"></div>'
      + '<div style="flex:0 0 auto;text-align:center;font-size:8px;letter-spacing:.14em;color:#4c5a68;padding:4px 0 6px;text-transform:uppercase">Powered by open-meteo · Not by Yahoo (they said no)</div>'
      + '<div id="wxCityPanel" style="position:absolute;top:64px;left:0;right:0;z-index:7;background:rgba(10,14,20,.96);border-bottom:1px solid rgba(255,255,255,.18);padding:10px;display:none">'
      +   '<input id="wxCityInput" class="ios-input" placeholder="Search city…" autocomplete="off" aria-label="Search city"><div id="wxCityResults" style="margin-top:8px;max-height:190px;overflow-y:auto"></div>'
      + '</div></div>';
  };

  const paint = view => {
    const data = lastData; if (!data) return;
    const cur = data.current;
    const nowHour = new Date().getHours();
    const isNight = nowHour < 6 || nowHour >= 19;
    const todayCode = CODE[cur.weather_code] || CODE[2];
    const body = $('#wxBody', view);
    body.innerHTML = '<div class="wx-now">'
      + '<button id="wxCityBtn" class="wx-city" style="background:none;border:none;color:#fff;cursor:pointer">' + esc(place.name) + ' <span style="font-size:10px;color:#8fb0c4">▼</span></button>'
      + '<div class="wx-temp">' + Math.round(cur.temperature_2m) + '<sup>°</sup></div>'
      + '<img src="assets/weather/' + (isNight ? todayCode[2] : todayCode[1]) + '" alt="" style="width:104px;height:104px;object-fit:contain;filter:drop-shadow(0 4px 14px rgba(0,0,0,.5))" onerror="this.style.display=&quot;none&quot;">'
      + '<div class="wx-cond">' + todayCode[0] + '</div>'
      + '<div class="wx-hl">H ' + Math.round(data.daily.temperature_2m_max[0]) + '° &nbsp; L ' + Math.round(data.daily.temperature_2m_min[0]) + '° &nbsp;·&nbsp; Feels ' + Math.round(cur.apparent_temperature) + '° &nbsp;·&nbsp; Wind ' + Math.round(cur.wind_speed_10m) + ' km/h &nbsp;·&nbsp; Hum ' + cur.relative_humidity_2m + '%</div>'
      + (data.cached ? '<div style="font-size:9px;color:#ffb2a8;margin-top:3px;letter-spacing:.1em">CACHED — NO NETWORK</div>' : '')
      + '</div>';
    const days = $('#wxDays', view);
    days.innerHTML = data.daily.time.map((iso, i) => {
      const d = new Date(iso + 'T12:00:00');
      const dow = i === 0 ? 'Today' : d.toLocaleDateString([], { weekday: 'short' });
      const ic = codeOf(data, i);
      return '<div class="wx-day"><span class="wx-dow">' + dow + '</span><img src="assets/weather/' + ic[1] + '" alt="" style="width:32px;height:32px;object-fit:contain" onerror="this.onerror=null;this.src=&quot;assets/weather/clouds@2x.png&quot;"><span class="wx-lo">' + Math.round(data.daily.temperature_2m_min[i]) + '°</span><span class="wx-hi">' + Math.round(data.daily.temperature_2m_max[i]) + '°</span></div>';
    }).join('');
    $('#wxCityBtn', view).addEventListener('click', () => toggleCityPanel(view));
  };

  const toggleCityPanel = view => {
    const p = $('#wxCityPanel', view);
    p.style.display = p.style.display === 'none' ? 'block' : 'none';
    if (p.style.display === 'block') $('#wxCityInput', view).focus();
  };

  const load = async view => {
    if (OldOS.settings.airplane) { lastData = FALLBACK(); paint(view); return; }
    try {
      const u = unit === 'fahrenheit' ? 'fahrenheit' : 'celsius';
      const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + place.latitude + '&longitude=' + place.longitude
        + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m'
        + '&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=6&timezone=auto&temperature_unit=' + u;
      const r = await fetch(url);
      if (!r.ok) throw new Error('wx');
      lastData = await r.json();
      paint(view);
    } catch (e) { lastData = FALLBACK(); paint(view); }
  };

  return {
    render() { return render(); },
    mount(view) {
      lastData = FALLBACK();
      paint(view);
      load(view);
      view.querySelector('[data-action="city"]').addEventListener('click', () => toggleCityPanel(view));
      const unitBtn = () => view.querySelector('[data-action="unit"]').textContent = '°' + (unit === 'fahrenheit' ? 'F' : 'C');
      view.querySelector('[data-action="unit"]').addEventListener('click', () => {
        unit = unit === 'fahrenheit' ? 'celsius' : 'fahrenheit';
        store.set('wxUnit', unit);
        unitBtn(); load(view);
      });
      $('#wxCityInput', view).addEventListener('keydown', async e => {
        if (e.key !== 'Enter') return;
        const q = e.target.value.trim(); if (!q) return;
        const box = $('#wxCityResults', view);
        box.innerHTML = '<p style="color:#8ec4f5;font-size:12px;padding:6px">Searching…</p>';
        try {
          const r = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q) + '&count=6&language=en&format=json');
          const j = await r.json();
          const hits = j.results || [];
          box.innerHTML = hits.length
            ? hits.map((h, i) => '<button class="row" data-hit="' + i + '" style="color:#fff;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:8px;margin-bottom:5px;padding:8px 10px;font-size:12.5px">' + esc(h.name) + '<small style="color:#8fb0c4"> · ' + esc([h.admin1, h.country].filter(Boolean).join(', ')) + '</small></button>').join('')
            : '<p style="color:#ffb2a8;font-size:12px;padding:6px">No such city. Try “San Antonio”.</p>';
          box.querySelectorAll('[data-hit]').forEach(btn => btn.addEventListener('click', () => {
            const h = hits[+btn.dataset.hit];
            place = { name: h.name, country: h.country || '', latitude: h.latitude, longitude: h.longitude };
            $('#wxCityPanel', view).style.display = 'none';
            load(view);
          }));
        } catch (err) {
          box.innerHTML = '<p style="color:#ffb2a8;font-size:12px;padding:6px">Offline — showing San Antonio.</p>';
        }
      });
    }
  };
})());

/* ══════════════ NOTES ══════════════ */
registerApp('notes', (() => {
  const load = () => store.get('notes', null) || seed();
  const seed = () => {
    const n = [
      { id: 'n-1', body: 'OldOS web rebuild — punch list\n\n✓ slide to unlock\n✓ jiggle mode\n✓ multitasking tray\n✓ DTMF keypad\n○ world domination (in progress)', ts: Date.now() - 86400000 * 2 },
      { id: 'n-2', body: 'Groceries, 2010 edition\n\n- iTunes gift cards\n- AA batteries (for the gamepad)\n- Clear plastic cover for phone\n- VHS rewind service', ts: Date.now() - 86400000 * 6 },
      { id: 'n-3', body: 'Ideas for iOS 5\n\nWhat if notifications were GREAT?\n\n(someone tell Apple)', ts: Date.now() - 86400000 * 11 }
    ];
    store.set('notes', n);
    return n;
  };
  const save = n => store.set('notes', n);

  const listHTML = () => {
    const notes = load().slice().sort((a, b) => b.ts - a.ts);
    return '<div class="app-inner"><div class="nav-bar"><span class="nav-title">Notes</span><button class="nav-btn" data-action="new">New Note</button></div>'
      + '<div class="app-scroll pinstripe">'
      + (notes.length ? notes.map(n => {
          const first = (n.body.split('\n').find(l => l.trim()) || 'New Note').trim();
          const count = n.body.length;
          const date = new Date(n.ts).toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' });
          return '<button class="row tappable" data-note="' + esc(n.id) + '" style="align-items:flex-start;padding:10px 14px"><span style="min-width:0;flex:1"><span class="row-label" style="display:block;font-size:14px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(first) + '</span><span class="sub" style="display:block;font-size:10px;color:#8a8a92;margin-top:2px">' + esc(date) + ' · ' + count + ' characters</span></span><span class="row-chev">›</span></button>';
        }).join('') : '<p class="center-note" style="padding:36px 16px">No notes. The suspense is killing these virtual trees anyway.</p>')
      + '</div><div class="notes-bar"><span></span><span id="notesCount">' + notes.length + ' Notes</span><button data-action="new" aria-label="New note"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h8"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L10 16l-4 1 1-4 9.5-9.5z"/></svg></button></div>'
      + '</div>';
  };

  return {
    render() { return listHTML(); },
    mount(view) {
      const openEditor = id => {
        const notes = load();
        const note = id ? notes.find(n => n.id === id) : null;
        const working = note ? { ...note } : { id: 'n-' + Date.now(), body: '', ts: Date.now() };
        view.innerHTML = '<div class="app-inner"><div class="nav-bar"><button class="nav-back" data-action="back">Notes</button><span class="nav-title" style="font-size:15px">' + (note ? 'Edit Note' : 'New Note') + '</span></div>'
          + '<div class="notes-pad"><textarea id="noteBody" placeholder="Begin typing…" aria-label="Note body">' + esc(working.body) + '</textarea></div>'
          + '<div class="notes-bar"><button id="noteDelete" style="color:#8a2c1d"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l1 13a2 2 0 0 0 2 1.8h5a2 2 0 0 0 2-1.8l1-13"/></svg> Delete</button><span id="noteMeta">' + working.body.length + ' characters</span><span></span></div>'
          + '</div>';
        const ta = $('#noteBody', view);
        const meta = $('#noteMeta', view);
        ta.focus();
        ta.addEventListener('input', () => { meta.textContent = ta.value.length + ' characters'; });
        const back = view.querySelector('[data-action="back"]');
        back.addEventListener('click', () => {
          const body = ta.value.replace(/\s+$/, '');
          const arr = load();
          const i = arr.findIndex(n => n.id === working.id);
          if (body.trim()) {
            if (i >= 0) arr[i] = { ...working, body, ts: Date.now() };
            else arr.push({ ...working, body, ts: Date.now() });
          } else if (i >= 0) arr.splice(i, 1);
          save(arr);
          view.innerHTML = listHTML();
          bindList();
        });
        $('#noteDelete', view).addEventListener('click', () => {
          save(load().filter(n => n.id !== working.id));
          view.innerHTML = listHTML();
          bindList();
          showBanner('Notes', 'Note deleted.');
        });
      };
      const bindList = () => {
        view.querySelectorAll('[data-note]').forEach(b => b.addEventListener('click', () => openEditor(b.dataset.note)));
        view.querySelectorAll('[data-action="new"]').forEach(b => b.addEventListener('click', () => openEditor(null)));
      };
      bindList();
    }
  };
})());

})(window.OldOS);
