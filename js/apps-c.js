/* ═══════════════════════════════════════════════════════════════
   OldOS · Web Edition — apps, part C
   Settings · Calculator · Clock
   ═══════════════════════════════════════════════════════════════ */
'use strict';
(function (OldOS) {
const { $, $$, esc, store, audio, registerApp, launchApp, showBanner, WALLPAPERS } = OldOS;

/* ══════════════ SETTINGS ══════════════ */
registerApp('settings', (() => {
  const WIFI_NETS = ['TheEuHub-5G', 'Pretty Fly for a Wi-Fi', 'Drop It Like Its Hotspot', 'CoffeeShop Guest', 'xfinitywifi (lol)'];
  const CARRIERS = ['TheEuHub', 'OLD OS', 'AT&T', 'No SIM'];
  const AUTOLOCK = [['0', 'Never'], ['1', '1 Minute'], ['5', '5 Minutes']];

  const switchRow = (label, on, extra) =>
    '<div class="row"><span class="row-label">' + esc(label) + '</span><button class="ios-switch' + (on ? ' on' : '') + '" role="switch" aria-checked="' + !!on + '" ' + (extra || '') + '><span class="knob"></span></button></div>';
  const chevronRow = (label, value, act) =>
    '<button class="row tappable" data-act="' + esc(act) + '"><span class="row-label">' + esc(label) + '</span><span class="row-value">' + esc(value || '') + '</span><span class="row-chev">›</span></button>';
  const infoRow = (label, value) =>
    '<div class="row"><span class="row-label">' + esc(label) + '</span><span class="row-value">' + esc(value) + '</span></div>';
  const checkRow = (label, checked, act, arg) =>
    '<button class="row tappable" data-act="' + esc(act) + '" data-arg="' + esc(arg || label) + '"><span class="row-label">' + esc(label) + '</span><span class="row-value blue">' + (checked ? '✓' : '') + '</span></button>';

  const mainHTML = () => {
    const s = OldOS.settings;
    return '<div class="app-scroll">'
      + '<div class="group-list">' + switchRow('Airplane Mode', s.airplane, 'data-set="airplane"') + chevronRow('Wi-Fi', s.airplane ? 'Off' : s.wifi, 'wifi') + chevronRow('Carrier', s.carrier, 'carrier') + '</div>'
      + '<div class="group-list"><div class="row" style="flex-direction:column;align-items:stretch;gap:6px;padding:12px"><div style="display:flex;align-items:center;justify-content:space-between"><span class="row-label">Brightness</span><span style="font-size:10px;color:#8a8a92">' + Math.round(s.brightness * 100) + '%</span></div><div style="display:flex;align-items:center;gap:8px"><svg viewBox="0 0 24 24" width="15" height="15" fill="#666"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.2 4.2l2 2M17.8 17.8l2 2M19.8 4.2l-2 2M6.2 17.8l-2 2" stroke="#666" stroke-width="1.6" stroke-linecap="round"/></svg><input type="range" min="15" max="100" value="' + Math.round(s.brightness * 100) + '" class="ios-slider" id="brightnessSlider" style="flex:1" aria-label="Brightness"><svg viewBox="0 0 24 24" width="19" height="19" fill="#666"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.2 4.2l2 2M17.8 17.8l2 2M19.8 4.2l-2 2M6.2 17.8l-2 2" stroke="#666" stroke-width="1.8" stroke-linecap="round"/></svg></div></div>'
      + chevronRow('Wallpaper', wallpaperName(s.wallpaper), 'wallpaper')
      + chevronRow('Sounds', '', 'sounds') + chevronRow('Badges', '', 'badges') + chevronRow('Auto-Lock', autolockLabel(s.autolock), 'autolock') + '</div>'
      + '<div class="group-list">' + chevronRow('General', '', 'general') + '</div>'
      + '<p class="center-note">OldOS 2.0 (9) — Web Edition<br>Rebuilt by TheEuHub with MIT-adjacent enthusiasm</p>'
      + '</div>';
  };
  const wallpaperName = id => (WALLPAPERS.find(w => w[0] === id) || ['', 'Custom'])[1];
  const autolockLabel = v => v === 0 ? 'Never' : (v === 5 ? '5 Minutes' : '1 Minute');

  return {
    render() {
      return '<div class="app-inner pinstripe"><div class="nav-bar"><span class="nav-title">Settings</span></div><div class="app-scroll" id="settingsScroll">' + mainHTML() + '</div></div>';
    },
    mount(view) {
      const scroll = $('#settingsScroll', view);
      const openSub = (title, contentHTML, bind) => {
        const panel = document.createElement('div');
        panel.className = 'subpage';
        panel.innerHTML = '<div class="nav-bar"><button class="nav-back">Settings</button><span class="nav-title" style="font-size:16px">' + esc(title) + '</span><span style="width:44px"></span></div><div class="app-scroll pinstripe" style="flex:1">' + contentHTML + '</div>';
        view.querySelector('.app-inner').appendChild(panel);
        requestAnimationFrame(() => panel.classList.add('open'));
        panel.querySelector('.nav-back').addEventListener('click', () => { panel.classList.remove('open'); setTimeout(() => panel.remove(), 320); refreshMain(); });
        if (bind) bind(panel);
        return panel;
      };
      const refreshMain = () => { scroll.innerHTML = mainHTML(); bindMain(); };
      const bindMain = () => {
        scroll.querySelectorAll('[data-set="airplane"]').forEach(sw => sw.addEventListener('click', () => {
          OldOS.settings.airplane = !OldOS.settings.airplane;
          sw.classList.toggle('on', OldOS.settings.airplane);
          sw.setAttribute('aria-checked', String(OldOS.settings.airplane));
          OldOS.applySettings();
          refreshMain();
          showBanner('Settings', OldOS.settings.airplane ? 'Airplane Mode on — radios off, bars gone.' : 'Welcome back to the network.');
        }));
        const slider = $('#brightnessSlider', scroll);
        slider.addEventListener('input', () => { OldOS.settings.brightness = slider.value / 100; OldOS.applySettings(); });
        scroll.querySelectorAll('[data-act]').forEach(btn => btn.addEventListener('click', () => {
          const act = btn.dataset.act;
          audio.click();
          if (act === 'wifi') openSub('Wi-Fi', '<div class="group-list">' + WIFI_NETS.map(n => checkRow(n, !OldOS.settings.airplane && OldOS.settings.wifi === n, 'setwifi', n)).join('') + '</div><p class="center-note">Networks are remembered. Passwords are “hunter2”.</p>', p => {
            p.querySelectorAll('[data-act="setwifi"]').forEach(r => r.addEventListener('click', () => {
              OldOS.settings.wifi = r.dataset.arg; OldOS.settings.airplane = false; OldOS.applySettings();
              p.querySelectorAll('[data-act="setwifi"] .row-value').forEach(v => v.textContent = '');
              r.querySelector('.row-value').textContent = '✓';
              showBanner('Wi-Fi', 'Joined “' + r.dataset.arg + '”.');
            }));
          });
          else if (act === 'carrier') openSub('Carrier', '<div class="group-list">' + CARRIERS.map(c => checkRow(c, OldOS.settings.carrier === c, 'setcarrier', c)).join('') + '</div><p class="center-note">Choose your allegiance.</p>', p => {
            p.querySelectorAll('[data-act="setcarrier"]').forEach(r => r.addEventListener('click', () => {
              OldOS.settings.carrier = r.dataset.arg; OldOS.applySettings();
              p.querySelectorAll('[data-act="setcarrier"] .row-value').forEach(v => v.textContent = '');
              r.querySelector('.row-value').textContent = '✓';
            }));
          });
          else if (act === 'wallpaper') openSub('Wallpaper', '<div class="group-list" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:12px;background:#fff">' + WALLPAPERS.map(([id, name]) => '<button class="wallpaper-pick" data-wp="' + id + '" style="border:2px solid ' + (OldOS.settings.wallpaper === id ? '#2b7fdd' : 'transparent') + ';border-radius:10px;overflow:hidden;padding:0;background:#000;position:relative"><img src="assets/wallpapers/' + id + '.jpg" alt="' + esc(name) + '" loading="lazy" style="width:100%;height:110px;object-fit:cover;display:block;opacity:.92"><span style="position:absolute;bottom:0;left:0;right:0;font-size:7.5px;color:#fff;background:rgba(0,0,0,.65);padding:2px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(name) + '</span></button>').join('') + '</div><p class="center-note">27 originals from the OldOS asset catalog, decoded from Apple’s CgBI PNG format live for this site.</p>', p => {
            p.querySelectorAll('.wallpaper-pick').forEach(b => b.addEventListener('click', () => {
              OldOS.settings.wallpaper = b.dataset.wp; OldOS.applySettings();
              p.querySelectorAll('.wallpaper-pick').forEach(x => x.style.borderColor = 'transparent');
              b.style.borderColor = '#2b7fdd';
              showBanner('Wallpaper', '“' + wallpaperName(b.dataset.wp) + '” applied.');
            }));
          });
          else if (act === 'sounds') openSub('Sounds', '<div class="group-list">' + switchRow('Unlock Sound', OldOS.settings.sounds.unlock, 'data-snd="unlock"') + switchRow('Tri-Tone', OldOS.settings.sounds.tones, 'data-snd="tones"') + switchRow('Key Clicks', OldOS.settings.sounds.keys, 'data-snd="keys"') + '</div><p class="center-note">All synthesized with the Web Audio API. Zero audio files were downloaded.</p>', p => {
            p.querySelectorAll('[data-snd]').forEach(sw => sw.addEventListener('click', () => {
              const k = sw.dataset.snd;
              OldOS.settings.sounds[k] = !OldOS.settings.sounds[k];
              sw.classList.toggle('on', OldOS.settings.sounds[k]);
              sw.setAttribute('aria-checked', String(OldOS.settings.sounds[k]));
              OldOS.saveSettings();
              if (k === 'unlock') OldOS.audio.unlock(); else audio.triTone();
            }));
          });
          else if (act === 'badges') openSub('Badges', '<div class="group-list">' + switchRow('Messages', OldOS.settings.badges.messages, 'data-bdg="messages"') + switchRow('Mail', OldOS.settings.badges.mail, 'data-bdg="mail"') + switchRow('Phone', OldOS.settings.badges.phone, 'data-bdg="phone"') + '</div><p class="center-note">Red circles. The universal sign of “later, maybe never”.</p>', p => {
            p.querySelectorAll('[data-bdg]').forEach(sw => sw.addEventListener('click', () => {
              const k = sw.dataset.bdg;
              OldOS.settings.badges[k] = !OldOS.settings.badges[k];
              sw.classList.toggle('on', OldOS.settings.badges[k]);
              sw.setAttribute('aria-checked', String(OldOS.settings.badges[k]));
              OldOS.saveSettings(); OldOS.refreshBadges();
            }));
          });
          else if (act === 'autolock') openSub('Auto-Lock', '<div class="group-list">' + AUTOLOCK.map(([v, label]) => checkRow(label, String(OldOS.settings.autolock) === v, 'setautolock', v)).join('') + '</div><p class="center-note">The screen sleeps like it’s 2010: politely, automatically.</p>', p => {
            p.querySelectorAll('[data-act="setautolock"]').forEach(r => r.addEventListener('click', () => {
              OldOS.settings.autolock = +r.dataset.arg; OldOS.saveSettings(); OldOS.applySettings();
              p.querySelectorAll('[data-act="setautolock"] .row-value').forEach(v => v.textContent = '');
              r.querySelector('.row-value').textContent = '✓';
            }));
          });
          else if (act === 'general') openSub('General', '<div class="group-list">'
            + chevronRow('Passcode Lock', OldOS.settings.passcode ? 'On' : 'Off', 'passcode')
            + infoRow('Name', 'OldOS iPhone') + infoRow('Model', 'iPhone 4,1 (Web)') + infoRow('Version', '2.0 (9) Web Edition') + infoRow('Capacity', '∞ GB') + infoRow('Available', 'All of it') + infoRow('Serial', 'O1DSW3B2010WEB')
            + '<button class="row tappable" data-act="open-source"><span class="row-label" style="color:#1c5cd6">Open Source Licenses</span><span class="row-chev">›</span></button>'
            + '</div><div class="group-list"><button class="row tappable" data-act="reset-layout"><span class="row-label" style="color:#1c5cd6">Reset Home Screen Layout</span></button><button class="row danger" data-act="erase-all">Erase All OldOS Data</button></div><p class="center-note">CC BY 4.0 — zzanehip &amp; contributors.<br>Recreated with permission of the license, respect of the era.</p>', p => {
            p.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
              const a = b.dataset.act;
              if (a === 'open-source') window.open('https://github.com/zzanehip/The-OldOS-Project', '_blank', 'noopener');
              else if (a === 'reset-layout') { OldOS.resetLayout(); showBanner('General', 'Home screen restored to factory nostalgia.'); }
              else if (a === 'erase-all') {
                if (confirm('Erase EVERYTHING — notes, mail, photos, settings, passcode?') && confirm('For real? There is no undo. Only forward, into 2010.')) {
                  OldOS.store.clearAll();
                  location.reload();
                }
              }
              else if (a === 'passcode') {
                if (OldOS.settings.passcode) {
                  openSubInner('Turn Passcode Off', '<div class="group-list"><button class="row center" data-act="disable-passcode">Turn Passcode Off</button></div><p class="center-note">You will be asked for your current passcode.</p>', pp => {
                    pp.querySelector('[data-act="disable-passcode"]').addEventListener('click', () => {
                      OldOS.openPasscode(() => {
                        OldOS.settings.passcode = null; OldOS.saveSettings();
                        showBanner('Passcode', 'Passcode disabled.');
                      }, 'unlock');
                    });
                  });
                } else {
                  OldOS.openPasscode(() => showBanner('Passcode', 'Passcode enabled.'), 'set');
                }
              }
            }));
            /* nested subpage support: replace openSub with one that stacks */
            var openSubInner = (t, html, bindFn) => {
              const inner = document.createElement('div');
              inner.className = 'subpage';
              inner.innerHTML = '<div class="nav-bar"><button class="nav-back">General</button><span class="nav-title" style="font-size:16px">' + esc(t) + '</span><span style="width:44px"></span></div><div class="app-scroll pinstripe" style="flex:1">' + html + '</div>';
              p.appendChild(inner);
              requestAnimationFrame(() => inner.classList.add('open'));
              inner.querySelector('.nav-back').addEventListener('click', () => { inner.classList.remove('open'); setTimeout(() => inner.remove(), 320); });
              if (bindFn) bindFn(inner);
            };
          });
        }));
      };
      bindMain();
    }
  };
})());

/* ══════════════ CALCULATOR ══════════════ */
registerApp('calculator', (() => {
  let display = '0', acc = null, op = null, fresh = true;
  const KEYS = [
    ['AC', 'util'], ['±', 'util'], ['%', 'util'], ['÷', 'op'],
    ['7', 'num'], ['8', 'num'], ['9', 'num'], ['×', 'op'],
    ['4', 'num'], ['5', 'num'], ['6', 'num'], ['−', 'op'],
    ['1', 'num'], ['2', 'num'], ['3', 'num'], ['+', 'op'],
    ['0', 'num zero'], ['.', 'num'], ['=', 'op eq']
  ];
  const fmt = n => {
    if (!isFinite(n)) return 'Error';
    const abs = Math.abs(n);
    if (abs !== 0 && (abs >= 1e9 || abs < 1e-7)) return n.toExponential(4).replace('e+', 'e');
    let s = String(Math.round(n * 1e8) / 1e8);
    if (s.length > 12) s = String(Math.round(n * 1e6) / 1e6);
    return s;
  };
  const applyOp = (a, b, o) => o === '+' ? a + b : o === '−' ? a - b : o === '×' ? a * b : o === '÷' ? a / b : b;

  return {
    render() {
      return '<div class="app-inner" style="background:#000"><div class="calc-display"><div class="calc-value" id="calcValue">0</div></div>'
        + '<div class="calc-grid">' + KEYS.map(([k, cls]) => '<button class="calc-key ' + cls + '" data-key="' + esc(k) + '">' + esc(k) + '</button>').join('') + '</div>'
        + '</div>';
    },
    mount(view) {
      display = '0'; acc = null; op = null; fresh = true;
      const out = $('#calcValue', view);
      const paint = () => {
        out.textContent = display;
        out.style.fontSize = display.length > 9 ? (display.length > 12 ? '34px' : '44px') : '64px';
        view.querySelectorAll('.calc-key.op').forEach(b => b.classList.toggle('active', op && b.dataset.key === op && fresh));
      };
      const inputDigit = d => {
        if (display === 'Error' || fresh) { display = d === '.' ? '0.' : d; fresh = false; }
        else if (d === '.') { if (!display.includes('.')) display += '.'; }
        else if (display.replace('-', '').replace('.', '').length < 9) display = display === '0' ? d : display + d;
        paint();
      };
      const setOp = nextOp => {
        if (op && !fresh && acc !== null) {
          acc = applyOp(acc, parseFloat(display), op);
          display = fmt(acc);
        } else acc = parseFloat(display);
        op = nextOp; fresh = true; paint();
      };
      const equals = () => {
        if (op === null || acc === null) return;
        const res = applyOp(acc, parseFloat(display), op);
        display = fmt(res); acc = null; op = null; fresh = true; paint();
      };
      const press = k => {
        if (/^[0-9]$/.test(k)) return inputDigit(k);
        if (k === '.') return inputDigit('.');
        if (k === 'AC') { display = '0'; acc = null; op = null; fresh = true; return paint(); }
        if (k === '±') { display = display.startsWith('-') ? display.slice(1) : (display === '0' ? '0' : '-' + display); return paint(); }
        if (k === '%') { display = fmt(parseFloat(display) / 100); return paint(); }
        if (k === '=') return equals();
        if (['+','−','×','÷'].includes(k)) { audio.click(); return setOp(k); }
      };
      view.addEventListener('click', e => {
        const b = e.target.closest('[data-key]'); if (!b) return;
        audio.click(); press(b.dataset.key);
      });
      const onKey = e => {
        if (OldOS.currentApp !== 'calculator') return;
        const map = { '+': '+', '-': '−', '*': '×', '/': '÷', Enter: '=', '=': '=', Escape: 'AC', Backspace: 'back', '%': '%', '.': '.' };
        if (/^[0-9]$/.test(e.key)) { press(e.key); e.preventDefault(); }
        else if (map[e.key]) {
          e.preventDefault();
          if (map[e.key] === 'back') { display = display.length > 1 && display !== 'Error' ? display.slice(0, -1) : '0'; fresh = false; paint(); }
          else press(map[e.key]);
        }
      };
      document.addEventListener('keydown', onKey);
      view._cleanup = () => document.removeEventListener('keydown', onKey);
      paint();
    },
    unmount(view) { if (view._cleanup) view._cleanup(); }
  };
})());

/* ══════════════ CLOCK ══════════════ */
registerApp('clock', (() => {
  const CITIES = [
    { name: 'San Antonio', tz: 'America/Chicago' },
    { name: 'Cupertino', tz: 'America/Los_Angeles' },
    { name: 'London', tz: 'Europe/London' },
    { name: 'Tokyo', tz: 'Asia/Tokyo' }
  ];
  const TAB_ICONS = {
    world: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8.6"/><path d="M3.5 12h17M12 3.4c-5 5.4-5 11.8 0 17.2M12 3.4c5 5.4 5 11.8 0 17.2"/></svg>',
    alarm: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="13" r="7.2"/><path d="M12 9.5V13l2.2 1.6M4.5 4.5L7 7M19.5 4.5L17 7"/></svg>',
    stopwatch: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="13.5" r="7.2"/><path d="M12 9.8v3.8M9.5 2.5h5M12 2.5v3.4"/></svg>',
    timer: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10M8.5 4c0 5-2 6.6-2 10a7.5 7.5 0 0 0 15 0c0-3.4-2-5-2-10"/><path d="M12 13.5v3"/></svg>'
  };
  const TABS = [['world','World Clock'],['alarm','Alarm'],['stopwatch','Stopwatch'],['timer','Timer']];
  let tab = 'world';

  const drawFace = (canvas, date, tz) => {
    const ctx = canvas.getContext('2d');
    const S = canvas.width, r = S / 2;
    ctx.clearRect(0, 0, S, S);
    const g = ctx.createRadialGradient(r * 0.72, r * 0.66, r * 0.2, r, r, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c9c9cf');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(r, r, r - 1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1c1c21'; ctx.lineWidth = 2; ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      ctx.strokeStyle = '#1c1c21'; ctx.lineWidth = i % 3 === 0 ? 2.4 : 1.2;
      ctx.beginPath();
      ctx.moveTo(r + Math.cos(a) * (r - 5), r + Math.sin(a) * (r - 5));
      ctx.lineTo(r + Math.cos(a) * (r - 11), r + Math.sin(a) * (r - 11));
      ctx.stroke();
    }
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }).formatToParts(date);
    const get = t => +parts.find(p => p.type === t).value;
    const s = get('second'), m = get('minute'), h = get('hour') % 12;
    const hand = (angle, len, w, color) => { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(r, r); ctx.lineTo(r + Math.cos(angle - Math.PI / 2) * len, r + Math.sin(angle - Math.PI / 2) * len); ctx.stroke(); };
    hand((h + m / 60) * Math.PI / 6, r * 0.46, 3.4, '#141419');
    hand((m + s / 60) * Math.PI / 30, r * 0.68, 2.2, '#141419');
    hand(s * Math.PI / 30, r * 0.74, 1.1, '#d43a2c');
    ctx.fillStyle = '#141419'; ctx.beginPath(); ctx.arc(r, r, 2.4, 0, Math.PI * 2); ctx.fill();
  };

  const worldHTML = () => '<div class="app-scroll" style="background:#0d0d10" id="worldList">'
    + CITIES.map(c => '<div class="wc-row"><canvas width="52" height="52" data-tz="' + esc(c.tz) + '" style="width:52px;height:52px"></canvas><span><span class="wc-city">' + esc(c.name) + '</span><br><span class="wc-off" data-off="' + esc(c.tz) + '"></span></span><span class="wc-time"><span class="wc-hm" data-hm="' + esc(c.tz) + '"></span><br><span class="wc-ap" data-ap="' + esc(c.tz) + '"></span></span></div>').join('')
    + '<p class="center-note">Four time zones. One deeply analog heart.</p></div>';

  const alarmHTML = () => {
    const alarms = store.get('alarms', []);
    return '<div class="app-scroll" style="background:#0d0d10">'
      + '<div style="display:flex;justify-content:flex-end;padding:8px 12px 0"><button class="nav-btn" data-action="add-alarm">+</button></div>'
      + '<div id="alarmList">'
      + (alarms.length ? alarms.map(a => '<div class="row" style="background:#15151a;border-bottom:1px solid #23232a;padding:10px 14px"><div><div class="alarm-time">' + esc(a.label12) + '<small style="font-size:13px;color:#8f8f99"> ' + esc(a.ap) + '</small></div><div class="alarm-label">' + esc(a.label || 'Alarm') + '</div></div><button class="ios-switch' + (a.on ? ' on' : '') + '" data-alarm-toggle="' + esc(a.id) + '" role="switch" aria-checked="' + a.on + '" style="margin-left:auto"><span class="knob"></span></button></div>').join('') : '<p class="center-note" style="padding:26px 16px">No alarms. Living dangerously. Tap + to change that.</p>')
      + '</div>'
      + '<form id="alarmAddForm" style="display:none;padding:10px 14px;border-top:1px solid #23232a;background:#101015"><input type="time" id="alarmTimeInput" class="ios-input" value="07:30" required style="margin-bottom:8px" aria-label="Alarm time"><input type="text" id="alarmLabelInput" class="ios-input" placeholder="Label (e.g. Rise and shine)" style="margin-bottom:8px" aria-label="Label"><button type="submit" class="btn-pill" style="width:100%">Set Alarm</button></form>'
      + '</div>';
  };

  const stopwatchHTML = () => '<div style="flex:1;display:flex;flex-direction:column;background:#050507">'
    + '<div class="sw-display" id="swTime">00:00.00</div>'
    + '<div style="display:flex;justify-content:center;gap:22px;padding:6px 0 12px"><button class="nav-btn" id="swLap" style="width:74px;height:34px;border-radius:17px">Lap</button><button class="nav-btn" id="swStart" style="width:74px;height:34px;border-radius:17px;background:linear-gradient(180deg,#8fe06e,#2da81e 55%,#177a10);border-color:#0b3d12;color:#04280a;font-weight:900">Start</button></div>'
    + '<div class="app-scroll" id="swLaps" style="border-top:1px solid #1c1c22"></div>'
    + '</div>';

  const timerHTML = () => '<div style="flex:1;display:flex;flex-direction:column;background:#050507">'
    + '<div class="timer-display" id="timerDisplay">0:00</div>'
    + '<div style="display:flex;justify-content:center;gap:18px;padding-bottom:10px">'
    + [['h', 'Hours', 23], ['m', 'Minutes', 59], ['s', 'Seconds', 59]].map(([k, label, max]) => '<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><button class="nav-btn" data-step="' + k + ':1" style="width:46px">▲</button><div id="timer-' + k + '" style="font-size:34px;color:#fff;font-weight:200;min-width:52px;text-align:center;font-variant-numeric:tabular-nums">0</div><button class="nav-btn" data-step="' + k + ':-1" style="width:46px">▼</button><div style="font-size:9px;color:#6f6f78;letter-spacing:.18em;text-transform:uppercase">' + label + '</div></div>').join('')
    + '</div>'
    + '<div style="display:flex;justify-content:center;gap:22px"><button class="nav-btn" id="timerClear" style="width:74px;height:34px;border-radius:17px">Clear</button><button class="nav-btn" id="timerStart" style="width:74px;height:34px;border-radius:17px;background:linear-gradient(180deg,#8fe06e,#2da81e 55%,#177a10);border-color:#0b3d12;color:#04280a;font-weight:900">Start</button></div>'
    + '</div>';

  const contentFor = () => tab === 'world' ? worldHTML() : tab === 'alarm' ? alarmHTML() : tab === 'stopwatch' ? stopwatchHTML() : timerHTML();

  return {
    render() {
      return '<div class="app-inner" style="background:#050507"><div class="nav-bar"><span class="nav-title">Clock</span></div>'
        + '<div id="clockContent" style="flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative">' + contentFor() + '</div>'
        + '<div class="tab-bar">' + TABS.map(([k, label]) => '<button class="tab-item' + (k === tab ? ' active' : '') + '" data-ctab="' + k + '">' + TAB_ICONS[k] + esc(label) + '</button>').join('') + '</div>'
        + '</div>';
    },
    mount(view) {
      const content = $('#clockContent', view);
      let intervals = [];
      const clearAll = () => { intervals.forEach(clearInterval); intervals = []; };

      const bindWorld = () => {
        const paint = () => {
          const now = new Date();
          view.querySelectorAll('canvas[data-tz]').forEach(c => drawFace(c, now, c.dataset.tz));
          view.querySelectorAll('[data-hm]').forEach(el => {
            el.textContent = new Intl.DateTimeFormat('en-US', { timeZone: el.dataset.hm, hour: 'numeric', minute: '2-digit', hour12: false }).format(now);
          });
          view.querySelectorAll('[data-ap]').forEach(el => {
            const p = new Intl.DateTimeFormat('en-US', { timeZone: el.dataset.ap, hour: 'numeric', hour12: true }).formatToParts(now).find(p => p.type === 'dayPeriod');
            el.textContent = p ? p.value.toUpperCase() : '';
          });
          view.querySelectorAll('[data-off]').forEach(el => {
            const tzNow = new Date(now.toLocaleString('en-US', { timeZone: el.dataset.off }));
            const diffH = Math.round((tzNow - new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }))) / 3600000);
            const dayName = tzNow.toDateString() === now.toDateString() ? 'Today' : (tzNow > now ? 'Tomorrow' : 'Yesterday');
            el.textContent = dayName + (diffH === 0 ? '' : (diffH > 0 ? ', +' : ', ') + diffH + 'HRS');
          });
        };
        paint();
        intervals.push(setInterval(paint, 1000));
      };

      const bindAlarm = () => {
        const list = $('#alarmList', view);
        const paintAlarms = () => {
          const alarms = store.get('alarms', []);
          if (!list) return;
          list.innerHTML = alarms.length ? alarms.map(a => '<div class="row" style="background:#15151a;border-bottom:1px solid #23232a;padding:8px 14px"><div><div class="alarm-time">' + esc(a.label12) + '<small style="font-size:13px;color:#8f8f99"> ' + esc(a.ap) + '</small></div><div class="alarm-label">' + esc(a.label || 'Alarm') + '</div></div><button class="ios-switch' + (a.on ? ' on' : '') + '" data-alarm-toggle="' + esc(a.id) + '" role="switch" aria-checked="' + a.on + '" style="margin-left:auto"><span class="knob"></span></button></div>').join('') : '<p class="center-note" style="padding:26px 16px">No alarms. Tap + to change that.</p>';
        };
        view.querySelector('[data-action="add-alarm"]').addEventListener('click', () => {
          const form = $('#alarmAddForm', view);
          form.style.display = form.style.display === 'none' ? 'block' : 'none';
        });
        $('#alarmAddForm', view).addEventListener('submit', e => {
          e.preventDefault();
          const t = $('#alarmTimeInput', view).value; if (!t) return;
          const [hRaw, mRaw] = t.split(':').map(Number);
          const ap = hRaw >= 12 ? 'PM' : 'AM';
          let h12 = hRaw % 12; if (h12 === 0) h12 = 12;
          const alarms = store.get('alarms', []);
          alarms.push({ id: 'al-' + Date.now(), h: hRaw, m: mRaw, label12: h12 + ':' + OldOS.pad2(mRaw), ap, label: $('#alarmLabelInput', view).value.trim(), on: true });
          store.set('alarms', alarms);
          $('#alarmLabelInput', view).value = '';
          $('#alarmAddForm', view).style.display = 'none';
          paintAlarms();
          showBanner('Clock', 'Alarm set for ' + h12 + ':' + OldOS.pad2(mRaw) + ' ' + ap);
        });
        content.addEventListener('click', e => {
          const sw = e.target.closest('[data-alarm-toggle]'); if (!sw) return;
          const alarms = store.get('alarms', []);
          const a = alarms.find(x => x.id === sw.dataset.alarmToggle); if (!a) return;
          a.on = !a.on; store.set('alarms', alarms);
          sw.classList.toggle('on', a.on);
        });
        /* firing engine */
        const check = () => {
          const now = new Date();
          const alarms = store.get('alarms', []);
          alarms.forEach(a => {
            if (!a.on) return;
            if (a.h === now.getHours() && a.m === now.getMinutes() && now.getSeconds() < 2) {
              const fireKey = 'alarmFired-' + a.id + '-' + now.toDateString() + '-' + a.h + ':' + a.m;
              if (sessionStorage.getItem(fireKey)) return;
              sessionStorage.setItem(fireKey, '1');
              fireAlarmOverlay(a);
            }
          });
          /* snooze */
          const snooze = store.get('snooze', null);
          if (snooze && Date.now() >= snooze.ts) {
            store.remove('snooze');
            fireAlarmOverlay({ label12: 'Snooze', ap: '', label: snooze.label || 'Snoozed', id: 'snooze' });
          }
        };
        const fireAlarmOverlay = a => {
          if (content.querySelector('.alarm-fire')) return;
          const overlay = document.createElement('div');
          overlay.className = 'alarm-fire';
          overlay.style.cssText = 'position:absolute;inset:0;z-index:10;background:radial-gradient(120% 100% at 50% 0%, #2c1608 0%, #050202 78%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center';
          overlay.innerHTML = '<div style="font-size:11px;letter-spacing:.3em;color:#ffb27a;text-transform:uppercase">Alarm</div><div style="font-size:64px;font-weight:100;color:#fff;font-variant-numeric:tabular-nums">' + esc(a.label12 || '7:30') + '</div><div style="font-size:13px;color:#d8a67e">' + esc(a.label || '') + '</div><button class="btn-pill" id="alarmStop" style="margin-top:18px;padding:12px 34px;font-size:15px">Stop</button><button class="btn-silver" id="alarmSnooze" style="margin-top:8px">Snooze 9 minutes</button>';
          content.appendChild(overlay);
          const ring = setInterval(() => audio.alarmChime(), 2100);
          audio.alarmChime();
          overlay.querySelector('#alarmStop').addEventListener('click', () => { clearInterval(ring); overlay.remove(); });
          overlay.querySelector('#alarmSnooze').addEventListener('click', () => { clearInterval(ring); store.set('snooze', { ts: Date.now() + 9 * 60 * 1000, label: a.label }); overlay.remove(); });
        };
        intervals.push(setInterval(check, 1000));
      };

      const bindStopwatch = () => {
        let elapsed = 0, running = false, startTs = 0, lapBase = 0;
        const laps = [];
        const disp = $('#swTime', view);
        const startBtn = $('#swStart', view);
        const paint = () => {
          const total = elapsed + (running ? Date.now() - startTs : 0);
          const m = Math.floor(total / 60000), s = Math.floor((total % 60000) / 1000), cs = Math.floor((total % 1000) / 10);
          disp.textContent = OldOS.pad2(m) + ':' + OldOS.pad2(s) + '.' + OldOS.pad2(cs);
        };
        intervals.push(setInterval(paint, 33));
        startBtn.addEventListener('click', () => {
          audio.click();
          if (running) { elapsed += Date.now() - startTs; running = false; startBtn.textContent = 'Start'; startBtn.style.background = 'linear-gradient(180deg,#8fe06e,#2da81e 55%,#177a10)'; startBtn.style.color = '#04280a'; }
          else { startTs = Date.now(); running = true; startBtn.textContent = 'Stop'; startBtn.style.background = 'linear-gradient(180deg,#f48d80,#d43a2c 55%,#8f1a0f)'; startBtn.style.color = '#fff'; }
        });
        $('#swLap', view).addEventListener('click', () => {
          audio.click();
          const total = elapsed + (running ? Date.now() - startTs : 0);
          laps.unshift({ n: laps.length + 1, lap: total - lapBase, total });
          lapBase = total;
          $('#swLaps', view).innerHTML = laps.map(l => '<div class="lap-row"><span>Lap ' + l.n + '</span><span>' + OldOS.fmtDuration(l.lap / 1000) + '</span><span>' + OldOS.fmtDuration(l.total / 1000) + '</span></div>').join('');
        });
      };

      const bindTimer = () => {
        const cfg = { h: 0, m: 0, s: 0 };
        let remaining = 0, running = false, endTs = 0;
        const disp = $('#timerDisplay', view);
        const startBtn = $('#timerStart', view);
        const paintCfg = () => { $('#timer-h', view).textContent = cfg.h; $('#timer-m', view).textContent = cfg.m; $('#timer-s', view).textContent = cfg.s; if (!running) disp.textContent = fmtTimer(cfg.h * 3600 + cfg.m * 60 + cfg.s); };
        const fmtTimer = total => { const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = Math.floor(total % 60); return (h ? h + ':' + OldOS.pad2(m) : m) + ':' + OldOS.pad2(s); };
        view.querySelectorAll('[data-step]').forEach(btn => btn.addEventListener('click', () => {
          const [k, d] = btn.dataset.step.split(':');
          const max = k === 'h' ? 23 : 59;
          cfg[k] = (cfg[k] + (+d) + max + 1) % (max + 1);
          audio.click(); paintCfg();
        }));
        intervals.push(setInterval(() => {
          if (!running) return;
          const left = Math.max(0, Math.round((endTs - Date.now()) / 1000));
          remaining = left;
          disp.textContent = fmtTimer(left);
          if (left <= 0) {
            running = false; clearAll();
            disp.classList.add('ringing');
            audio.timerRing();
            startBtn.textContent = 'Start';
            showBanner('Timer', 'Time! The countdown has counted.');
          }
        }, 200));
        startBtn.addEventListener('click', () => {
          audio.click();
          if (running) { running = false; startBtn.textContent = 'Start'; return; }
          const total = cfg.h * 3600 + cfg.m * 60 + cfg.s;
          if (total <= 0) { showBanner('Timer', 'Pick a duration first.'); return; }
          endTs = Date.now() + total * 1000;
          running = true; disp.classList.remove('ringing');
          startBtn.textContent = 'Pause';
        });
        $('#timerClear', view).addEventListener('click', () => { running = false; cfg.h = cfg.m = cfg.s = 0; disp.classList.remove('ringing'); startBtn.textContent = 'Start'; paintCfg(); });
        paintCfg();
      };

      const switchTab = next => {
        clearAll();
        tab = next;
        view.querySelectorAll('[data-ctab]').forEach(b => b.classList.toggle('active', b.dataset.ctab === tab));
        content.innerHTML = contentFor();
        if (tab === 'world') bindWorld();
        else if (tab === 'alarm') bindAlarm();
        else if (tab === 'stopwatch') bindStopwatch();
        else bindTimer();
      };
      view.querySelectorAll('[data-ctab]').forEach(btn => btn.addEventListener('click', () => { audio.click(); switchTab(btn.dataset.ctab); }));
      switchTab(tab);
      view._cleanup = () => clearAll();
    },
    unmount(view) { if (view._cleanup) view._cleanup(); }
  };
})());

})(window.OldOS);
