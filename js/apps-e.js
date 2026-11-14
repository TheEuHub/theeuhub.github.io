/* ═══════════════════════════════════════════════════════════════
   OldOS · Web Edition — apps, part E
   iTunes Store · App Store · Game Center
   ═══════════════════════════════════════════════════════════════ */
'use strict';
(function (OldOS) {
const { $, $$, esc, store, audio, registerApp, showBanner } = OldOS;

const IT_STORE_TRACKS = [
  { title: 'Neon Skyline', artist: 'Vista Heights', album: 'After Midnight', price: '1.29', hue: 262, tag: 'NEWLY LAUNCHED' },
  { title: 'Caramel Static', artist: 'The Lunchables', album: 'Mall Food Court Ballads', price: '0.99', hue: 28, tag: 'FEATURED' },
  { title: 'Satellite Heart', artist: 'Kepler Youth', album: 'Low Orbit', price: '1.29', hue: 205, tag: 'TOP CHARTS' },
  { title: 'Polaroid Summer', artist: 'Faded Instant', album: 'Chemical Romance', price: '0.99', hue: 340, tag: 'SINGLE' },
  { title: 'Analog Ghosts', artist: 'Tape Hiss Collective', album: 'Rewind Forever', price: '1.29', hue: 130, tag: 'ALBUM OF THE WEEK' },
  { title: 'Crimson Arcade', artist: 'Player One Reborn', album: 'Continue? Y/N (Remastered)', price: '0.99', hue: 0, tag: 'TOP CHARTS' }
];

/* ══════════════ iTUNES STORE ══════════════ */
registerApp('itunes', (() => {
  const boughtList = () => store.get('ipodLibrary', []);
  const featuredHTML = () =>
      '<div class="itunes-hero"><div class="itunes-hero-kicker">iTunes Festival · London 2010</div><div class="itunes-hero-title">Vier Millionen Songs.<br>Wegzuspielen.</div><div class="itunes-hero-sub">“Every song ever made is one tap away.”</div></div>'
    + '<div class="store-section-title" style="color:#8f92a8">NEW MUSIC · FEATURED</div>'
    + IT_STORE_TRACKS.map((t, i) => '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid #17171e">'
        + '<canvas width="56" height="56" data-itunes-art="' + i + '" style="border-radius:4px;flex:0 0 56px;box-shadow:0 3px 8px rgba(0,0,0,.6)"></canvas>'
        + '<div style="min-width:0;flex:1"><div style="color:#e8e8ec;font-size:11.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(t.title) + '</div><div style="color:#8f92a8;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(t.artist) + ' — ' + esc(t.album) + '</div>'
        + '<div style="color:#c837ab;font-size:8px;letter-spacing:.18em;margin-top:2px;font-weight:700">' + esc(t.tag) + '</div></div>'
        + '<button class="nav-btn blue" data-itunes-buy="' + i + '" style="min-width:44px;padding:4px 8px;font-size:11px">$' + t.price + '</button>'
        + '</div>').join('')
    + '<p class="center-note" style="color:#44465a">Purchases appear instantly in your iPod app library —<br>free, legally questionable, and synthesized live.</p>';
  const purchasedHTML = (lib) =>
      '<div class="store-section-title" style="color:#8f92a8">PURCHASED</div>'
    + (lib.length ? lib.map((t, i) => '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid #17171e"><canvas width="44" height="44" data-bought-art="' + i + '" style="border-radius:4px"></canvas><div style="min-width:0"><div style="color:#e8e8ec;font-size:11px;font-weight:700">' + esc(t.title) + '</div><div style="color:#8f92a8;font-size:9px">' + esc(t.artist) + '</div></div></div>').join('') : '<p class="center-note" style="color:#44465a">Nothing yet.<br>Go on, spoil your library a little.</p>');
  return {
    render() {
      return '<div class="app-inner" style="background:#07070a;position:relative">'
        + '<div class="nav-bar itunes-nav" style="justify-content:center"><span class="nav-title itunes-wordmark">iTunes</span><span style="font-size:10px;color:#8f92a8;font-style:normal;font-weight:400;margin-left:6px;letter-spacing:.28em;margin-top:4px">STORE</span></div>'
        + '<div class="app-scroll" id="itunesScroll">'
        + featuredHTML()
        + '</div>'
        + '<div class="tab-bar" id="itunesTabs"><button class="tab-item active" data-itunes-tab="featured"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M9 18.5V6l10-2v11.5"/><circle cx="6.5" cy="18.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/></svg>Music</button>'
        + '<button class="tab-item" data-itunes-tab="bought"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>Purchased</button></div>'
        + '<div id="itunesModal" style="position:absolute;inset:0;background:rgba(2,2,8,.82);z-index:9;display:none;align-items:center;justify-content:center"><div style="background:linear-gradient(180deg,#f7f7fa,#dcdce2);border-radius:12px;width:212px;padding:18px 14px 12px;text-align:center;box-shadow:0 14px 40px rgba(0,0,0,.6)"><div id="itunesModalArt" style="width:96px;height:96px;margin:0 auto 10px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:34px;color:#fff;font-weight:800">♪</div><div id="itunesModalTitle" style="font-size:12.5px;font-weight:700;color:#111"></div><div id="itunesModalSub" style="font-size:10px;color:#555;margin:4px 0 12px"></div><button class="btn-pill" id="itunesModalBtn" style="width:100%;margin-bottom:6px">Buy Now</button><button class="btn-pill secondary" id="itunesModalCancel" style="width:100%">Cancel</button></div></div>'
        + '</div>';
    },
    mount(view) {
      let pending = null;
      const scroll = $('#itunesScroll', view);
      const artworkPreview = i => {
        const c = view.querySelector('[data-itunes-art="' + i + '"]'); if (!c) return;
        const ctx = c.getContext('2d'); const t = IT_STORE_TRACKS[i];
        const g = ctx.createLinearGradient(0, 0, 56, 56);
        g.addColorStop(0, 'hsl(' + t.hue + ',62%,58%)'); g.addColorStop(1, '#0a0a10');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 56, 56);
        ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.font = '800 22px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(t.title.charAt(0), 28, 29);
      };
      const paintBought = () => {
        scroll.querySelectorAll('[data-bought-art]').forEach(c => {
          const t = boughtList()[+c.dataset.boughtArt]; if (!t) return;
          const ctx = c.getContext('2d'); const g = ctx.createLinearGradient(0, 0, 44, 44);
          g.addColorStop(0, 'hsl(' + t.hue + ',62%,56%)'); g.addColorStop(1, '#0a0a10');
          ctx.fillStyle = g; ctx.fillRect(0, 0, 44, 44);
          ctx.fillStyle = '#fff'; ctx.font = '800 17px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(String(t.title).charAt(0), 22, 23);
        });
      };
      const paintFeatured = () => IT_STORE_TRACKS.forEach((_, i) => artworkPreview(i));
      const bindBuyButtons = () => {
        scroll.querySelectorAll('[data-itunes-buy]').forEach(btn => {
        btn.addEventListener('click', () => {
          audio.click();
          pending = +btn.dataset.itunesBuy;
          const t = IT_STORE_TRACKS[pending];
          const modal = $('#itunesModal', view);
          $('#itunesModalArt', view).style.background = 'linear-gradient(140deg,hsl(' + t.hue + ',62%,56%),hsl(' + ((t.hue + 50) % 360) + ',60%,24%))';
          $('#itunesModalTitle', view).textContent = t.title;
          $('#itunesModalSub', view).textContent = t.artist + ' · $' + t.price + ' · 128 kbps AAC';
          $('#itunesModalBtn', view).textContent = 'Buy Now — $' + t.price;
          modal.style.display = 'flex';
        });
        });
      };
      paintFeatured();
      bindBuyButtons();
      $('#itunesModalCancel', view).addEventListener('click', () => { $('#itunesModal', view).style.display = 'none'; });
      $('#itunesModalBtn', view).addEventListener('click', () => {
        audio.marimba();
        const t = IT_STORE_TRACKS[pending];
        const lib = boughtList();
        lib.push({
          title: t.title, artist: t.artist, album: t.album, hue: t.hue, bpm: 100 + (t.hue % 40),
          wave: 'triangle', bassWave: 'triangle',
          lead: [[60,.5],[64,.5],[67,.5],[72,.5],[71,.5],[67,.5],[64,.5],[62,.5],[60,.75],[0,.25],[62,.5],[64,.5],[67,1],[64,.5],[62,.5],[60,1.5]],
          bass: [[36,.75],[36,.25],[43,.5],[48,.5],[36,.75],[36,.25],[43,.5],[41,.5]]
        });
        store.set('ipodLibrary', lib);
        $('#itunesModal', view).style.display = 'none';
        showBanner('iTunes', 'Purchased! “' + t.title + '” added to your iPod library.');
      });
      view.querySelectorAll('[data-itunes-tab]').forEach(btn => btn.addEventListener('click', () => {
        audio.click();
        view.querySelectorAll('[data-itunes-tab]').forEach(b => b.classList.toggle('active', b === btn));
        if (btn.dataset.itunesTab === 'bought') { scroll.innerHTML = purchasedHTML(boughtList()); paintBought(); }
        else { scroll.innerHTML = featuredHTML(); paintFeatured(); bindBuyButtons(); }
      }));
    }
  };
})());

/* ══════════════ APP STORE ══════════════ */
const STORE_CATALOG = [
  { id: 'solitaire', name: 'Solitaire!', seller: 'Retro Bits Co.', price: 0, hue: 200, glyph: '♠', desc: 'The undisputed king of meeting-sized focus.', category: 'Cards', rating: 4.5, ratings: '1.2M' },
  { id: 'stacks', name: 'Stack the Blocks', seller: 'Physics Pals', price: 0.99, hue: 130, glyph: '▣', desc: 'A Tetris-adjacent physics puzzler that apologizes for nothing.', category: 'Puzzle', rating: 4, ratings: '84K' },
  { id: 'moonbase', name: 'Moon Base Alpha', seller: 'Dome Labs', price: 1.99, hue: 220, glyph: '☾', desc: 'Build a lunar colony, negotiate with a sentient airlock.', category: 'Strategy', rating: 5, ratings: '31K' },
  { id: 'pixelracer', name: 'Pixel Racer Turbo', seller: 'Apex Pixel Works', price: 0, hue: 0, glyph: '🏎', desc: 'Low-poly lightning. Procedural synthwave included free.', category: 'Racing', rating: 4.5, ratings: '402K' },
  { id: 'wordvault', name: 'Word Vault', seller: 'Lexicon Labs', price: 0.99, hue: 48, glyph: 'A', desc: 'Crack lexical combinations under pressure. Boggle but polite.', category: 'Word', rating: 4, ratings: '19K' },
  { id: 'starfarmer', name: 'Star Farmer 3000', seller: 'Andromeda Agronomy', price: 2.99, hue: 96, glyph: '✷', desc: 'Grow zero-G wheat on Ceres. Water sparingly. Regret nothing.', category: 'Simulation', rating: 4.5, ratings: '57K' },
  { id: 'dungeonnote', name: 'Dungeon Note', seller: 'Graphite Guild', price: 0, hue: 280, glyph: '✎', desc: 'A grid-paper dungeon mapper for the adventurer who takes notes.', category: 'Utilities', rating: 4, ratings: '12K' },
  { id: 'radiofm', name: 'Radio FM Paradise', seller: 'Airwaves Inc.', price: 0, hue: 340, glyph: '📻', desc: 'Hand-tuned internet radio: surf 30 stations from 1997.', category: 'Music', rating: 4.5, ratings: '233K' }
];

registerApp('appstore', (() => {
  const renderCatalog = (list) => list.map(a =>
    '<button class="store-row" data-store-detail="' + a.id + '">'
    + '<span class="store-icon" style="background:linear-gradient(160deg,hsl(' + a.hue + ',60%,55%),hsl(' + ((a.hue + 30) % 360) + ',55%,25%))">' + a.glyph + '</span>'
    + '<span class="store-meta"><span class="store-name">' + esc(a.name) + '</span><span class="store-seller">' + esc(a.seller) + ' · ' + esc(a.category) + '</span><span class="store-stars">' + '★'.repeat(Math.round(a.rating)) + '<span style="color:#c8c8d0">' + '★'.repeat(5 - Math.round(a.rating)) + '</span> <span style="color:#8a8a92">(' + a.ratings + ')</span></span></span>'
    + '<span class="store-price" data-store-price="' + a.id + '">' + (a.price === 0 ? 'FREE' : '$' + a.price.toFixed(2)) + '</span>'
    + '</button>').join('');

  return {
    render() {
      return '<div class="app-inner" style="background:#f4f4f7;position:relative">'
        + '<div class="nav-bar store-nav" style="justify-content:center"><span class="nav-title" style="letter-spacing:-.01em">App Store</span></div>'
        + '<div class="app-scroll" id="storeHome">'
        + '<div class="store-hero"><div class="store-hero-kicker">TODAY · FEATURED</div><div class="store-hero-title">Apps of the Week</div><div class="store-hero-sub">Hand-picked by a curator who has never played any of them.</div></div>'
        + '<div class="store-section-title">TOP FREE</div>'
        + renderCatalog(STORE_CATALOG.filter(a => a.price === 0))
        + '<div class="store-section-title">TOP PAID</div>'
        + renderCatalog(STORE_CATALOG.filter(a => a.price > 0))
        + '<p class="center-note" style="color:#9a9aa2">Everything here installs instantly onto your home screen.<br>Yes, instantly. The 2010 toy-sorting nightmare is over.</p>'
        + '</div>'
        + '<div id="storeDetail" style="position:absolute;inset:0;background:#f4f4f7;z-index:8;display:none;flex-direction:column"><div class="nav-bar"><button class="nav-back" id="storeBack">Store</button><span class="nav-title" id="storeDetailNav">Details</span><span style="width:44px"></span></div>'
        + '<div class="app-scroll" id="storeDetailBody"></div></div>'
        + '<div class="store-installed-toast" id="storeToast" style="position:absolute;left:50%;top:16%;transform:translate(-50%,-12px);background:rgba(20,20,26,.92);color:#fff;font-size:11px;padding:8px 16px;border-radius:18px;opacity:0;pointer-events:none;transition:all .3s ease;z-index:12">Installed onto your home screen!</div>'
        + '</div>';
    },
    mount(view) {
      const toast = $('#storeToast', view);
      let toastTimer = null;
      const showToast = msg => {
        if (toastTimer) clearTimeout(toastTimer);
        toast.textContent = msg;
        toast.style.opacity = '1'; toast.style.transform = 'translate(-50%,0)';
        toastTimer = setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translate(-50%,-12px)'; }, 2400);
      };
      const setBtnState = (id, state) => {
        view.querySelectorAll('[data-store-detail="' + id + '"] .store-price').forEach(el => {
          if (state === 'installed') { el.textContent = 'OPEN'; el.classList.add('owned'); }
        });
      };
      const openDetail = a => {
        const installed = store.get('installed', []).some(r => r.id === a.id);
        $('#storeDetailNav', view).textContent = a.name;
        $('#storeDetailBody', view).innerHTML =
          '<div style="padding:20px 16px 8px;display:flex;gap:14px;align-items:center;background:linear-gradient(180deg,#fff,#ececf1)">'
          + '<span class="store-icon big" style="background:linear-gradient(160deg,hsl(' + a.hue + ',60%,55%),hsl(' + ((a.hue + 30) % 360) + ',55%,25%))">' + a.glyph + '</span>'
          + '<div style="min-width:0"><div style="font-size:17px;font-weight:800;color:#111;letter-spacing:-.01em">' + esc(a.name) + '</div><div style="font-size:11px;color:#666">' + esc(a.seller) + '</div><div style="font-size:10px;color:#8a8a92;margin-top:2px">' + esc(a.category) + ' · Rated 4+ · ' + a.ratings + ' ratings</div></div></div>'
          + '<div style="padding:12px 16px"><button class="btn-pill" id="storeDetailBtn" style="width:100%;font-size:15px;padding:11px">' + (installed ? 'OPEN' : (a.price === 0 ? 'GET — FREE' : 'BUY — $' + a.price.toFixed(2))) + '</button>'
          + (installed ? '<button class="btn-pill secondary" id="storeUninstallBtn" style="width:100%;margin-top:8px;color:#c0190e">Remove from Home Screen</button>' : '')
          + '</div>'
          + '<div style="padding:6px 16px 4px;font-size:9px;letter-spacing:.22em;color:#8a8a92;text-transform:uppercase">Description</div>'
          + '<div style="padding:0 16px 16px;font-size:12.5px;color:#2a2a30;line-height:1.55;background:#fff;margin:0 10px;border-radius:10px;box-shadow:0 1px 2px rgba(0,0,0,.08);padding:12px 14px">' + esc(a.desc) + ' Built with a full heart and approximately zero QA cycles. Runs beautifully on iPhone 4.</div>'
          + '<div style="padding:2px 16px 4px;font-size:9px;letter-spacing:.22em;color:#8a8a92;text-transform:uppercase">Information</div>'
          + '<div style="margin:0 10px 20px;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.08)">'
          + [['Seller', a.seller], ['Size', (8 + (a.name.length * 7) % 40) + '.0 MB'], ['Category', a.category], ['Compatibility', 'Requires iPhone 4 · oldOS 4.0'], ['Copyright', '© ' + esc(a.seller) + ' 2010']].map(([k, v]) => '<div style="display:flex;justify-content:space-between;padding:9px 12px;border-bottom:1px solid #ececf1;font-size:11px"><span style="color:#888">' + k + '</span><span style="color:#222;font-weight:600">' + esc(v) + '</span></div>').join('') + '</div>';
        $('#storeDetail', view).style.display = 'flex';
        const detailBtn = $('#storeDetailBtn', view);
        detailBtn.addEventListener('click', () => {
          const owned = store.get('installed', []).some(r => r.id === a.id);
          if (owned) { OldOS.closeApp(); return; }
          detailBtn.textContent = '…INSTALLING…';
          audio.click();
          setTimeout(() => {
            OldOS.installApp({ id: a.id, name: a.name, hue: a.hue, price: a.price });
            setBtnState(a.id, 'installed');
            showToast('“' + a.name + '” installed to your home screen');
            detailBtn.textContent = 'OPEN';
            const existing = view.querySelector('#storeUninstallBtn');
            if (!existing) {
              const u = document.createElement('button');
              u.className = 'btn-pill secondary'; u.id = 'storeUninstallBtn'; u.style.cssText = 'width:100%;margin-top:8px;color:#c0190e';
              u.textContent = 'Remove from Home Screen';
              detailBtn.parentElement.appendChild(u);
              u.addEventListener('click', () => { uninstall(); });
            }
          }, 900);
        });
        const uninstall = () => {
          OldOS.uninstallApp(a.id);
          setBtnState(a.id, 'available');
          showToast('“' + a.name + '” removed from your home screen');
          $('#storeDetail', view).style.display = 'none';
        };
        const unBtn = $('#storeUninstallBtn', view);
        if (unBtn) unBtn.addEventListener('click', uninstall);
      };
      view.querySelectorAll('[data-store-detail]').forEach(btn => btn.addEventListener('click', () => {
        audio.click();
        const a = STORE_CATALOG.find(x => x.id === btn.dataset.storeDetail);
        if (a) openDetail(a);
      }));
      $('#storeBack', view).addEventListener('click', () => { audio.click(); $('#storeDetail', view).style.display = 'none'; });
    }
  };
})());

/* ══════════════ GAME CENTER ══════════════ */
const GC_ACHIEVEMENTS = [
  { id: 'gc-first', title: 'Hello, Player', desc: 'Open Game Center for the first time.', points: 10, tier: 1 },
  { id: 'gc-caro', title: 'Tic Tac No Chance', desc: 'Win a game of Tic-Tac-Toe.', points: 25, tier: 1 },
  { id: 'gc-caro3', title: 'Caromania', desc: 'Win three games of Tic-Tac-Toe.', points: 50, tier: 2 },
  { id: 'gc-memory', title: 'Total Recall', desc: 'Clear the Memory Match board.', points: 40, tier: 1 },
  { id: 'gc-memory-flawless', title: 'Photographic Floppy', desc: 'Clear Memory Match in 12 or fewer moves.', points: 75, tier: 2 },
  { id: 'gc-snake', title: 'Snake Oil Salesman', desc: 'Score 8 or more points in Snake.', points: 50, tier: 1 },
  { id: 'gc-snake-ace', title: 'Certified Ouroboros', desc: 'Score 16 or more points in Snake.', points: 100, tier: 2 },
  { id: 'gc-points', title: 'Point Collector', desc: 'Accumulate 200 total achievement points.', points: 30, tier: 1 },
  { id: 'gc-veteran', title: 'OldOS Veteran', desc: 'Accumulate 250 total achievement points.', points: 100, tier: 3 }
];
const MEMORY_GLYPHS = ['🍎','🍊','🍋','🍇','🍉','🍒','🥝','🍍'];

registerApp('gamecenter', (() => {
  const GC_DEFAULT = { points: 0, earned: [], caroWins: 0, caroLosses: 0, caroDraws: 0, memoryBest: null, snakeBest: 0, matches: 0 };
  const getGC = () => Object.assign({}, GC_DEFAULT, store.get('gamecenter', {}));
  const saveGC = gc => store.set('gamecenter', gc);

  const award = (gc, id) => {
    if (gc.earned.includes(id)) return null;
    const a = GC_ACHIEVEMENTS.find(x => x.id === id);
    if (!a) return null;
    gc.earned.push(id);
    gc.points += a.points;
    return a;
  };
  const checkMetaAchievements = gc => {
    const unlocked = [];
    if (gc.points >= 200) { const a = award(gc, 'gc-points'); if (a) unlocked.push(a); }
    if (gc.points >= 250) { const a = award(gc, 'gc-veteran'); if (a) unlocked.push(a); }
    return unlocked;
  };

  return {
    render() {
      const gc = getGC();
      const pct = Math.min(100, Math.round((gc.earned.length / GC_ACHIEVEMENTS.length) * 100));
      return '<div class="app-inner gc-app" style="position:relative">'
        + '<div class="nav-bar gc-nav"><span class="nav-title" style="letter-spacing:.02em">Game Center</span><button class="nav-btn" id="gcSignIn" style="font-size:10px">Account</button></div>'
        + '<div class="app-scroll" id="gcHome">'
        + '<div class="gc-profile">'
        + '<div class="gc-avatar">OS</div>'
        + '<div style="min-width:0;flex:1"><div class="gc-name">Player One</div><div class="gc-nick">@player_one · San Antonio, TX</div>'
        + '<div class="gc-progress"><div class="gc-progress-fill" style="width:' + pct + '%"></div></div>'
        + '<div class="gc-progress-label">' + gc.earned.length + ' of ' + GC_ACHIEVEMENTS.length + ' achievements · ' + gc.points + ' points</div></div>'
        + '</div>'
        + '<div class="gc-section-title">ME</div>'
        + '<div class="gc-stat-grid">'
        + '<div class="gc-stat"><div class="gc-stat-num">' + gc.points + '</div><div class="gc-stat-label">Points</div></div>'
        + '<div class="gc-stat"><div class="gc-stat-num">' + gc.caroWins + '</div><div class="gc-stat-label">Tic-Tac-Toe Wins</div></div>'
        + '<div class="gc-stat"><div class="gc-stat-num">' + (gc.memoryBest || '—') + '</div><div class="gc-stat-label">Best Memory (moves)</div></div>'
        + '<div class="gc-stat"><div class="gc-stat-num">' + gc.snakeBest + '</div><div class="gc-stat-label">Snake Best</div></div>'
        + '</div>'
        + '<div class="gc-section-title">GAMES</div>'
        + [['caro', 'Tic-Tac-Toe', 'Classical strategy vs. the machine’s mounting confidence.', '✕', '#ff5f4a'],
           ['memory', 'Memory Match', 'Flip fruit. Keep your cool. Break the curse.', '⌘', '#4aa8ff'],
           ['snake', 'Snake', 'The original time-management sim. Eat the apple, dodge yourself.', '◈', '#51d88a']].map(([g, n, d, glyph, hue]) =>
          '<button class="gc-game-row" data-gc-game="' + g + '"><span class="gc-game-icon" style="background:linear-gradient(160deg,' + hue + ',rgba(0,0,0,.55))">' + glyph + '</span>'
          + '<span style="min-width:0;text-align:left"><span class="gc-game-name">' + n + '</span><span class="gc-game-desc">' + esc(d) + '</span></span>'
          + '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#8a8a92" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>').join('')
        + '<div class="gc-section-title">ACHIEVEMENTS</div>'
        + GC_ACHIEVEMENTS.map(a => '<div class="gc-achv' + (gc.earned.includes(a.id) ? ' earned' : '') + '"><span class="gc-achv-badge tier' + a.tier + '">' + (gc.earned.includes(a.id) ? '✓' : '?') + '</span><span style="min-width:0;flex:1"><span class="gc-achv-title">' + esc(a.title) + '</span><span class="gc-achv-desc">' + esc(a.desc) + '</span></span><span class="gc-achv-pts">' + a.points + '</span></div>').join('')
        + '<p class="center-note" style="color:#6f6f77">Signed in with your OldOS Game Center account.<br>Apple Store approval status: perpetually pending.</p>'
        + '</div>'
        + /* ─── TIC-TAC-TOE ─── */
        '<div class="gc-game-pane" id="gcCaro" style="position:absolute;inset:0;background:#0b0f1a;z-index:8;display:none;flex-direction:column">'
        + '<div class="nav-bar gc-nav"><button class="nav-back" data-gc-back>Game Center</button><span class="nav-title" style="font-size:13px">Tic-Tac-Toe</span><button class="nav-btn" id="caroReset" style="font-size:10px">Reset</button></div>'
        + '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:14px">'
        + '<div id="caroStatus" style="color:#cfe2ff;font-size:13px;font-weight:600;letter-spacing:.06em">Your move, human.</div>'
        + '<div id="caroBoard" style="display:grid;grid-template-columns:repeat(3,86px);gap:7px"></div>'
        + '<div id="caroScore" style="color:#7d8598;font-size:10.5px;letter-spacing:.14em;font-variant-numeric:tabular-nums">W ' + gc.caroWins + ' · L ' + gc.caroLosses + ' · D ' + gc.caroDraws + '</div>'
        + '</div></div>'
        + /* ─── MEMORY MATCH ─── */
        '<div class="gc-game-pane" id="gcMemory" style="position:absolute;inset:0;background:#101426;z-index:8;display:none;flex-direction:column">'
        + '<div class="nav-bar gc-nav"><button class="nav-back" data-gc-back>Game Center</button><span class="nav-title" style="font-size:13px">Memory Match</span><button class="nav-btn" id="memoryReset" style="font-size:10px">Shuffle</button></div>'
        + '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:10px">'
        + '<div id="memoryStatus" style="color:#cfe2ff;font-size:12px;font-weight:600">Find the pairs. 16 cards. No take-backs.</div>'
        + '<div id="memoryBoard" style="display:grid;grid-template-columns:repeat(4,64px);gap:8px"></div>'
        + '<div id="memoryMoves" style="color:#7d8598;font-size:10.5px;letter-spacing:.14em;font-variant-numeric:tabular-nums">Moves: 0</div>'
        + '</div></div>'
        + /* ─── SNAKE ─── */
        '<div class="gc-game-pane" id="gcSnake" style="position:absolute;inset:0;background:#07170d;z-index:8;display:none;flex-direction:column">'
        + '<div class="nav-bar gc-nav"><button class="nav-back" data-gc-back>Game Center</button><span class="nav-title" style="font-size:13px">Snake</span><button class="nav-btn" id="snakeRestart" style="font-size:10px">Restart</button></div>'
        + '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:10px">'
        + '<div id="snakeScore" style="color:#a7f3c7;font-size:13px;font-weight:700;letter-spacing:.14em;font-variant-numeric:tabular-nums">SCORE 0 · BEST ' + gc.snakeBest + '</div>'
        + '<canvas id="snakeCanvas" width="260" height="260" style="background:#031108;border:2px solid #1c4a2c;border-radius:8px;touch-action:none"></canvas>'
        + '<div style="display:flex;gap:8px;opacity:.9"><button class="nav-btn" data-snake-dir="up" style="padding:8px 14px">▲</button></div>'
        + '<div style="display:flex;gap:8px;opacity:.9"><button class="nav-btn" data-snake-dir="left" style="padding:8px 14px">◀</button><button class="nav-btn" data-snake-dir="down" style="padding:8px 14px">▼</button><button class="nav-btn" data-snake-dir="right" style="padding:8px 14px">▶</button></div>'
        + '<p class="center-note" style="color:#3d6b4c;margin:0">Arrow keys work too. WASD as well, because we are classy.</p>'
        + '</div></div>'
        + '</div>';
    },
    mount(view) {
      const gc = getGC();
      /* First-open achievement */
      if (!gc.earned.includes('gc-first')) {
        const a = award(gc, 'gc-first');
        checkMetaAchievements(gc);
        saveGC(gc);
        if (a) setTimeout(() => showBanner('Game Center', 'Achievement unlocked: ' + a.title + ' +' + a.points + ' pts'), 350);
      }
      const refreshHome = () => {
        const pct = Math.min(100, Math.round((gc.earned.length / GC_ACHIEVEMENTS.length) * 100));
        const fill = view.querySelector('.gc-progress-fill');
        if (fill) fill.style.width = pct + '%';
        const label = view.querySelector('.gc-progress-label');
        if (label) label.textContent = gc.earned.length + ' of ' + GC_ACHIEVEMENTS.length + ' achievements · ' + gc.points + ' points';
        view.querySelectorAll('.gc-stat')[0].querySelector('.gc-stat-num').textContent = gc.points;
        view.querySelectorAll('.gc-stat')[1].querySelector('.gc-stat-num').textContent = gc.caroWins;
        view.querySelectorAll('.gc-stat')[2].querySelector('.gc-stat-num').textContent = gc.memoryBest || '—';
        view.querySelectorAll('.gc-stat')[3].querySelector('.gc-stat-num').textContent = gc.snakeBest;
        view.querySelectorAll('.gc-achv').forEach((el, i) => {
          const a = GC_ACHIEVEMENTS[i];
          const earned = gc.earned.includes(a.id);
          el.classList.toggle('earned', earned);
          el.querySelector('.gc-achv-badge').textContent = earned ? '✓' : '?';
        });
        const scoreLine = $('#caroScore', view);
        if (scoreLine) scoreLine.textContent = 'W ' + gc.caroWins + ' · L ' + gc.caroLosses + ' · D ' + gc.caroDraws;
        const snakeBestLine = $('#snakeScore', view);
        if (snakeBestLine) snakeBestLine.textContent = 'SCORE 0 · BEST ' + gc.snakeBest;
      };
      const finishAchievements = (...ids) => {
        const newly = [];
        ids.forEach(id => { const a = award(gc, id); if (a) newly.push(a); });
        newly.push(...checkMetaAchievements(gc));
        if (newly.length) {
          saveGC(gc);
          newly.forEach((a, i) => setTimeout(() => { audio.marimba(); showBanner('Game Center', 'Achievement unlocked: ' + a.title + ' +' + a.points + ' pts'); }, 250 * (i + 1)));
          refreshHome();
        } else saveGC(gc);
      };
      $('#gcSignIn', view).addEventListener('click', () => { audio.click(); showBanner('Game Center', 'Already signed in as Player One (@player_one).'); });
      view.querySelectorAll('[data-gc-back]').forEach(b => b.addEventListener('click', () => {
        audio.click();
        view.querySelectorAll('.gc-game-pane').forEach(p => p.style.display = 'none');
      }));

      /* ───────── Tic-Tac-Toe ───────── */
      const boardEl = $('#caroBoard', view);
      let board = Array(9).fill(null), caroOver = false;
      const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      const winnerOf = b => { for (const [a,c,d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a]; return b.every(Boolean) ? 'draw' : null; };
      const minimax = (b, turn) => {
        const w = winnerOf(b);
        if (w) return { score: w === 'O' ? 10 : w === 'X' ? -10 : 0 };
        let best = turn === 'O' ? { score: -Infinity } : { score: Infinity };
        for (let i = 0; i < 9; i++) {
          if (b[i]) continue;
          b[i] = turn;
          const s = minimax(b, turn === 'O' ? 'X' : 'O').score;
          b[i] = null;
          if (turn === 'O' ? s > best.score : s < best.score) best = { score: s, move: i };
        }
        return best;
      };
      const renderBoard = () => {
        boardEl.innerHTML = board.map((v, i) => '<button class="caro-cell" data-cell="' + i + '">' + (v || '') + '</button>').join('');
        boardEl.querySelectorAll('[data-cell]').forEach(cell => cell.addEventListener('click', () => humanMove(+cell.dataset.cell)));
      };
      const setStatus = t => { $('#caroStatus', view).textContent = t; };
      const humanMove = i => {
        if (board[i] || caroOver) return;
        audio.click();
        board[i] = 'X'; renderBoard();
        let w = winnerOf(board);
        if (w) return endCaro(w);
        setStatus('The machine considers…');
        setTimeout(() => {
          const { move } = minimax(board.slice(), 'O');
          if (move != null) board[move] = 'O';
          renderBoard();
          w = winnerOf(board);
          if (w) endCaro(w); else setStatus('Your move, human.');
        }, 260);
      };
      const endCaro = w => {
        caroOver = true;
        if (w === 'X') { gc.caroWins++; setStatus('You beat a perfect algorithm. Suspicious.'); finishAchievements('gc-caro'); }
        else if (w === 'O') { gc.caroLosses++; setStatus('The machine prevails. As it does.'); }
        else { gc.caroDraws++; setStatus('A draw. Both sides pretend to be satisfied.'); }
        if (gc.caroWins >= 3) finishAchievements('gc-caro3');
        refreshHome(); saveGC(gc);
        setTimeout(() => {
          board = Array(9).fill(null); caroOver = false;
          renderBoard(); setStatus('Your move, human.');
        }, 1600);
      };
      $('#caroReset', view).addEventListener('click', () => { audio.click(); board = Array(9).fill(null); caroOver = false; renderBoard(); setStatus('Your move, human.'); });

      /* ───────── Memory Match ───────── */
      const memoryBoard = $('#memoryBoard', view);
      let memCards = [], memFlipped = [], memLock = false, memMoves = 0, memMatched = 0;
      const newMemoryGame = () => {
        const deck = MEMORY_GLYPHS.concat(MEMORY_GLYPHS).sort(() => Math.random() - 0.5).map((glyph, i) => ({ id: i, glyph, matched: false }));
        memCards = deck; memFlipped = []; memLock = false; memMoves = 0; memMatched = 0;
        $('#memoryMoves', view).textContent = 'Moves: 0';
        $('#memoryStatus', view).textContent = 'Find the pairs. 16 cards. No take-backs.';
        memoryBoard.innerHTML = deck.map((c, i) => '<button class="memory-cell" data-mem="' + i + '"><span class="memory-card">?</span></button>').join('');
        memoryBoard.querySelectorAll('[data-mem]').forEach(btn => btn.addEventListener('click', () => flipMem(+btn.dataset.mem, btn)));
      };
      const flipMem = (i, btn) => {
        if (memLock || memCards[i].matched || memFlipped.includes(i)) return;
        audio.click();
        btn.classList.add('flipped');
        btn.querySelector('.memory-card').textContent = memCards[i].glyph;
        memFlipped.push(i);
        if (memFlipped.length === 2) {
          memMoves++;
          $('#memoryMoves', view).textContent = 'Moves: ' + memMoves;
          const [a, b] = memFlipped;
          memLock = true;
          if (memCards[a].glyph === memCards[b].glyph) {
            setTimeout(() => {
              memCards[a].matched = memCards[b].matched = true;
              memoryBoard.querySelectorAll('[data-mem]')[a].classList.add('matched');
              memoryBoard.querySelectorAll('[data-mem]')[b].classList.add('matched');
              memMatched += 2; memFlipped = []; memLock = false;
              audio.marimba();
              if (memMatched === memCards.length) {
                $('#memoryStatus', view).textContent = 'Cleared in ' + memMoves + ' moves.';
                if (!gc.memoryBest || memMoves < gc.memoryBest) gc.memoryBest = memMoves;
                finishAchievements('gc-memory');
                if (memMoves <= 12) finishAchievements('gc-memory-flawless');
                refreshHome(); saveGC(gc);
              }
            }, 350);
          } else {
            setTimeout(() => {
              [a, b].forEach(j => { const btn2 = memoryBoard.querySelectorAll('[data-mem]')[j]; btn2.classList.remove('flipped'); btn2.querySelector('.memory-card').textContent = '?'; });
              memFlipped = []; memLock = false;
            }, 720);
          }
        }
      };
      $('#memoryReset', view).addEventListener('click', () => { audio.click(); newMemoryGame(); });

      /* ───────── Snake ───────── */
      const canvas = $('#snakeCanvas', view);
      const ctx = canvas.getContext('2d');
      const CELL = 13, COLS = 20, ROWS = 20;
      let snake = [], dir = { x: 1, y: 0 }, pendingDir = null, apple = null, snakeScore = 0, snakeTimer = null, snakeRunning = false;
      const resetSnake = () => {
        snake = [{ x: 4, y: 10 }, { x: 3, y: 10 }, { x: 2, y: 10 }];
        dir = { x: 1, y: 0 }; pendingDir = null; snakeScore = 0;
        placeApple();
        $('#snakeScore', view).textContent = 'SCORE 0 · BEST ' + gc.snakeBest;
        drawSnake();
        startSnake();
      };
      const placeApple = () => { do { apple = { x: (Math.random() * COLS) | 0, y: (Math.random() * ROWS) | 0 }; } while (snake.some(s => s.x === apple.x && s.y === apple.y)); };
      const startSnake = () => {
        clearInterval(snakeTimer); snakeRunning = true;
        snakeTimer = setInterval(tickSnake, 115);
      };
      const tickSnake = () => {
        if (pendingDir) { dir = pendingDir; pendingDir = null; }
        const head = { x: (snake[0].x + dir.x + COLS) % COLS, y: (snake[0].y + dir.y + ROWS) % ROWS };
        if (snake.some(s => s.x === head.x && s.y === head.y)) return endSnake();
        snake.unshift(head);
        if (head.x === apple.x && head.y === apple.y) {
          snakeScore++;
          audio.key(1200);
          placeApple();
          $('#snakeScore', view).textContent = 'SCORE ' + snakeScore + ' · BEST ' + Math.max(gc.snakeBest, snakeScore);
        } else snake.pop();
        drawSnake();
      };
      const endSnake = () => {
        clearInterval(snakeTimer); snakeRunning = false;
        if (snakeScore > gc.snakeBest) gc.snakeBest = snakeScore;
        if (snakeScore >= 8) finishAchievements('gc-snake');
        if (snakeScore >= 16) finishAchievements('gc-snake-ace');
        refreshHome(); saveGC(gc);
        ctx.fillStyle = 'rgba(0,0,0,.62)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#a7f3c7'; ctx.font = '800 22px Georgia'; ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 10);
        ctx.font = '12px Helvetica Neue, sans-serif';
        ctx.fillText('Score ' + snakeScore + ' — tap Restart', canvas.width / 2, canvas.height / 2 + 16);
        $('#snakeScore', view).textContent = 'SCORE ' + snakeScore + ' · BEST ' + gc.snakeBest;
      };
      const drawSnake = () => {
        ctx.fillStyle = '#031108'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        /* subtle grid */
        ctx.strokeStyle = 'rgba(81,216,138,.07)';
        for (let i = 1; i < COLS; i++) { ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height); ctx.stroke(); }
        for (let i = 1; i < ROWS; i++) { ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(canvas.width, i * CELL); ctx.stroke(); }
        /* apple */
        ctx.fillStyle = '#ff5147'; ctx.shadowColor = '#ff5147'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(apple.x * CELL + CELL / 2, apple.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        /* snake */
        snake.forEach((s, i) => {
          ctx.fillStyle = i === 0 ? '#7dffab' : 'hsl(140,62%,' + Math.max(28, 52 - i * 1.6) + '%)';
          ctx.beginPath(); ctx.roundRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, 3); ctx.fill();
        });
      };
      const requestDir = nd => {
        const map = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
        const d = map[nd]; if (!d) return;
        if (d.x === -dir.x && d.y === -dir.y) return; /* no 180s */
        pendingDir = d;
      };
      const snakeKey = e => {
        const map = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
        const d = map[e.code];
        if (d) { e.preventDefault(); requestDir(d); }
      };
      view.querySelectorAll('[data-snake-dir]').forEach(b => b.addEventListener('click', () => { audio.click(); requestDir(b.dataset.snakeDir); }));
      $('#snakeRestart', view).addEventListener('click', () => { audio.click(); resetSnake(); });

      /* wire game panes */
      view.querySelectorAll('[data-gc-game]').forEach(btn => btn.addEventListener('click', () => {
        audio.click();
        const game = btn.dataset.gcGame;
        view.querySelectorAll('.gc-game-pane').forEach(p => p.style.display = 'none');
        const pane = $(game === 'caro' ? '#gcCaro' : game === 'memory' ? '#gcMemory' : '#gcSnake', view);
        if (pane) pane.style.display = 'flex';
        if (game === 'caro') { board = Array(9).fill(null); caroOver = false; renderBoard(); setStatus('Your move, human.'); }
        if (game === 'memory') newMemoryGame();
        if (game === 'snake') resetSnake();
      }));

      document.addEventListener('keydown', snakeKey);
      view._cleanup = () => {
        clearInterval(snakeTimer);
        document.removeEventListener('keydown', snakeKey);
        saveGC(gc);
      };
    },
    unmount(view) { if (view._cleanup) view._cleanup(); }
  };
})());

})(window.OldOS);
