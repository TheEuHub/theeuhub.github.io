/* ═══════════════════════════════════════════════════════════════
   OldOS · Web Edition — landing page behavior
   Nav state · marquee · apps grid · screenshots rail · fullscreen
   ═══════════════════════════════════════════════════════════════ */
'use strict';
(function () {
const $ = (s, ctx) => (ctx || document).querySelector(s);
const $$ = (s, ctx) => Array.from((ctx || document).querySelectorAll(s));
const safeScroll = (el, opts) => { try { if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView(opts || { behavior: 'smooth', block: 'start' }); } catch (e) { /* ancient webviews */ } };
const encodeIcon = name => 'assets/icons/' + encodeURIComponent(name);

/* ══════════ 1 · NAV — frosted bar gains a solid state on scroll ══════════ */
const nav = $('#siteNav');
const paintNav = () => { if (nav) nav.classList.toggle('scrolled', window.scrollY > 40); };
window.addEventListener('scroll', paintNav, { passive: true });
paintNav();

/* smooth-scroll for in-page nav links */
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const target = document.querySelector(a.getAttribute('href'));
  if (target) { e.preventDefault(); safeScroll(target, { behavior: 'smooth', block: 'start' }); }
}));

/* ══════════ 2 · MARQUEE — duplicate the track for a seamless -50% loop ══════════ */
const marqueeTrack = $('#marqueeTrack');
if (marqueeTrack && !marqueeTrack.dataset.duplicated) {
  marqueeTrack.dataset.duplicated = '1';
  marqueeTrack.innerHTML += marqueeTrack.innerHTML + marqueeTrack.innerHTML;
}

/* ══════════ 3 · APPS GRID — every stock app, tap to launch it in the phone ══════════ */
const APPS = [
  ['messages', 'Messages', 'Messages.png', 'SMS with a very stubborn chatbot'],
  ['calendar', 'Calendar', 'Calendar.png', 'Month view, events, dots'],
  ['photos', 'Photos', 'Photos.png', 'Camera Roll, fully browsable'],
  ['camera', 'Camera', 'Camera.png', 'Live viewfinder, real snapshots'],
  ['youtube', 'YouTube', 'YouTube.png', 'The 2010 app, real embeds'],
  ['stocks', 'Stocks', 'Stocks.png', 'Live quotes via stooq'],
  ['maps', 'Maps', 'Maps.png', 'OpenStreetMap + routing'],
  ['weather', 'Weather', 'Weather Fahrenheit.png', 'open-meteo, live + 5-day'],
  ['notes', 'Notes', 'Notes.png', 'Yellow pad, never forgets'],
  ['clock', 'Clock', 'Clock.png', 'World faces, alarms, stopwatch'],
  ['calculator', 'Calculator', 'Calculator.png', 'Dangerously satisfying'],
  ['compass', 'Compass', 'Compass.png', 'Real deviceorientation'],
  ['voicememos', 'Voice Memos', 'Voice Memos.png', 'Records to IndexedDB'],
  ['itunes', 'iTunes', 'iTunes.png', 'Buy chiptunes, they land in iPod'],
  ['appstore', 'App Store', 'App Store.png', 'Actually installs to your springboard'],
  ['gamecenter', 'Game Center', 'Game Center.png', 'Tic-Tac-Toe · Memory · Snake'],
  ['settings', 'Settings', 'Settings.png', 'Wi-Fi, wallpaper, passcode…'],
  ['contacts', 'Contacts', 'Contacts.png', 'A–Z, star-to-favorite'],
  ['phone', 'Phone', 'Phone.png', 'DTMF keypad + voicemail'],
  ['mail', 'Mail', 'Mail.png', 'Check for Mail, compose, trash'],
  ['safari', 'Safari', 'Safari.png', 'Real web, in a 2010 chrome'],
  ['ipod', 'iPod', 'iPod.png', 'Live Web Audio chiptunes']
];

const appsGrid = $('#appsGrid');
const launchInPhone = id => {
  const stage = $('#iphone4');
  safeScroll(stage, { behavior: 'smooth', block: 'center' });
  setTimeout(() => {
    if (window.OldOS && typeof window.OldOS.requestUnlock === 'function') window.OldOS.requestUnlock(id);
    else if (window.OldOS && window.OldOS.launchApp) window.OldOS.launchApp(id);
  }, 320);
};

if (appsGrid) {
  appsGrid.innerHTML = APPS.map(([id, name, icon, tag]) =>
    '<button class="app-tile" data-launch="' + id + '" aria-label="Open ' + name + ' in the simulator">'
    + '<img src="' + encodeIcon(icon) + '" alt="' + name + ' icon" width="74" height="75" loading="lazy" onerror="this.onerror=null;this.src=&quot;assets/icons/Utilities.png&quot;">'
    + '<b>' + name + '</b><span>' + tag + '</span>'
    + '</button>').join('');
  appsGrid.addEventListener('click', e => {
    const tile = e.target.closest('[data-launch]');
    if (tile) { e.preventDefault(); launchInPhone(tile.dataset.launch); }
  });
}

/* ══════════ 4 · SCREENSHOTS RAIL — original marketing renders ══════════ */
const SHOTS = [
  ['assets/img/Market_1.jpg', 'Introducing OldOS — the home screen'],
  ['assets/img/Market_2.jpg', 'iPod — every app, built for real'],
  ['assets/img/Market_3.jpg', 'Pixel-perfect weather, day after day'],
  ['assets/img/Market_4.jpg', 'Game Center, woven into the OS'],
  ['assets/img/Market_5.jpg', 'An entire OS, packed into an app']
];
const shotsRail = $('#shotsRail');
if (shotsRail) {
  shotsRail.innerHTML = SHOTS.map(([src, caption]) =>
    '<figure class="shot-card"><img src="' + src + '" alt="' + caption + '" loading="lazy"><figcaption>' + caption + '</figcaption></figure>').join('');
  /* wheel → horizontal scroll, like a proper 2010 carousel */
  shotsRail.addEventListener('wheel', e => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      shotsRail.scrollLeft += e.deltaY;
    }
  }, { passive: false });
}

/* ══════════ 5 · FULLSCREEN OVERLAY — the phone, unbound ══════════ */
const overlay = $('#fullscreenOverlay');
const openBtn = $('#fullscreenBtn');
const closeBtn = $('#fsClose');
const ctaUnlock = $('#ctaUnlock');
const phoneScale = $('#phoneScale');
const heroStage = $('#heroStage');

const fitFullscreen = () => {
  if (!phoneScale) return;
  const s = Math.min((window.innerHeight - 84) / 702, (window.innerWidth - 48) / 342, 1.35);
  phoneScale.style.transform = 'scale(' + s.toFixed(3) + ')';
};
const PHONE_HOME = document.createComment('phone-home');
let fsOpen = false;

const openFullscreen = () => {
  if (fsOpen || !overlay || !phoneScale || !heroStage) return;
  fsOpen = true;
  heroStage.insertBefore(PHONE_HOME, phoneScale);
  overlay.appendChild(phoneScale);
  overlay.hidden = false;
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  fitFullscreen();
  window.addEventListener('resize', fitFullscreen);
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('open')));
  if (closeBtn) closeBtn.focus({ preventScroll: true });
};
const closeFullscreen = () => {
  if (!fsOpen) return;
  fsOpen = false;
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  window.removeEventListener('resize', fitFullscreen);
  phoneScale.style.transform = '';
  if (PHONE_HOME.parentNode) PHONE_HOME.parentNode.insertBefore(phoneScale, PHONE_HOME);
  PHONE_HOME.remove();
  overlay.hidden = true;
  document.body.style.overflow = '';
  if (openBtn) openBtn.focus({ preventScroll: true });
};
if (openBtn) openBtn.addEventListener('click', openFullscreen);
if (closeBtn) closeBtn.addEventListener('click', closeFullscreen);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeFullscreen(); });

/* hero CTA: glide to the phone and actually unlock it */
if (ctaUnlock) ctaUnlock.addEventListener('click', () => {
  const ph = $('#iphone4');
  safeScroll(ph, { behavior: 'smooth', block: 'center' });
  setTimeout(() => { if (window.OldOS && window.OldOS.requestUnlock) window.OldOS.requestUnlock(); }, 350);
});

/* ══════════ 6 · RESET PHONE — wipe every trace of the simulation ══════════ */
const resetBtn = $('#resetPhoneBtn');
if (resetBtn) resetBtn.addEventListener('click', () => {
  const sure = window.confirm('Reset OldOS?\n\nThis wipes the demo phone completely — wallpaper, notes, mail, photos, contacts, App Store installs, everything — and returns it to factory condition.');
  if (!sure) return;
  try { if (window.OldOS && window.OldOS.store && window.OldOS.store.clearAll) window.OldOS.store.clearAll(); } catch (e) { /* best effort */ }
  try { indexedDB.deleteDatabase('oldos-memos'); } catch (e) { /* best effort */ }
  window.location.reload();
});

/* ══════════ 7 · FOOTER YEAR — eternally 2010-ish, honestly dated ══════════ */
$$('.footer-year').forEach(el => { el.textContent = new Date().getFullYear(); });

/* ══════════ 8 · Subtle phone parallax on hero mousemove (desktop only) ══════════ */
const hero = $('.hero');
const fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
if (hero && phoneScale && fine) {
  let raf = null;
  hero.addEventListener('mousemove', e => {
    if (fsOpen) return;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      const r = hero.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      phoneScale.style.transform = 'perspective(1400px) rotateY(' + (nx * 7).toFixed(2) + 'deg) rotateX(' + (-ny * 6).toFixed(2) + 'deg)';
    });
  });
  hero.addEventListener('mouseleave', () => { if (!fsOpen) phoneScale.style.transform = ''; });
}
})();
