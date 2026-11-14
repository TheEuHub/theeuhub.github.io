/* ═══════════════════════════════════════════════════════════════
   OldOS · Web Edition — apps, part D
   Compass · Voice Memos · iPod · YouTube
   ═══════════════════════════════════════════════════════════════ */
'use strict';
(function (OldOS) {
const { $, $$, esc, store, audio, registerApp, launchApp, showBanner } = OldOS;

/* ══════════════ COMPASS ══════════════ */
registerApp('compass', (() => {
  const CARDINALS = ['N','NE','E','SE','S','SW','W','NW'];
  return {
    render() {
      return '<div class="app-inner compass-app">'
        + '<div class="nav-bar" style="justify-content:center"><span class="nav-title" style="font-weight:400;font-size:17px">Compass</span></div>'
        + '<div class="compass-stage">'
        +   '<img src="assets/compass/CompassFace.png" alt="" style="filter:brightness(.9)">'
        +   '<img class="compass-face" id="compassFace" src="assets/compass/CompassFaceDirection.png" alt="Compass dial" onerror="this.onerror=null;this.style.opacity=0">'
        +   '<img src="assets/compass/DeviceArrow.png" alt="" style="z-index:3" onerror="this.onerror=null;this.style.display=&quot;none&quot;">'
        +   '<img src="assets/compass/CompassBezel.png" alt="" style="z-index:4;pointer-events:none" onerror="this.onerror=null;this.style.opacity=0">'
        +   '<span class="compass-demo" id="compassMode">SIMULATED</span>'
        + '</div>'
        + '<div class="compass-readout"><div class="compass-deg" id="compassDeg">128°</div><div class="compass-card" id="compassCardinal">SE</div></div>'
        + '<button class="nav-btn blue" id="compassEnable" style="margin:10px auto 2px;display:none">Enable Compass</button>'
        + '<p class="center-note" id="compassCoords" style="color:#6f6258">San Antonio, TX — 29.42° N · 98.49° W</p>'
        + '</div>';
    },
    mount(view) {
      const face = $('#compassFace', view);
      const degEl = $('#compassDeg', view);
      const cardEl = $('#compassCardinal', view);
      const modeEl = $('#compassMode', view);
      const enableBtn = $('#compassEnable', view);
      const coordsEl = $('#compassCoords', view);
      let heading = 128, raf = null, lastSensor = 0, listenerAttached = false;

      const paint = () => {
        face.style.transform = 'rotate(' + (-heading) + 'deg)';
        degEl.textContent = String(Math.round(heading)).padStart(3, '0') + '°';
        cardEl.textContent = CARDINALS[Math.round(heading / 45) % 8];
      };
      const simulate = () => {
        if (raf) cancelAnimationFrame(raf);
        modeEl.textContent = 'SIMULATED';
        const t0 = performance.now();
        const tick = now => {
          heading = (128 + 115 * Math.sin((now - t0) / 7000) + 40 * Math.sin((now - t0) / 1730) + 360) % 360;
          paint();
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      };
      const handleSensor = e => {
        let h = null;
        if (typeof e.webkitCompassHeading === 'number' && !isNaN(e.webkitCompassHeading)) h = e.webkitCompassHeading;
        else if (e.absolute && typeof e.alpha === 'number') h = (360 - e.alpha) % 360;
        else if (typeof e.alpha === 'number') h = (360 - e.alpha) % 360;
        if (h == null) return;
        lastSensor = Date.now();
        heading = h;
        modeEl.textContent = 'TRUE NORTH';
        paint();
      };
      const attach = () => {
        if (listenerAttached) return;
        listenerAttached = true;
        window.addEventListener('deviceorientationabsolute', handleSensor, true);
        window.addEventListener('deviceorientation', handleSensor, true);
        /* if no sensor data shows up, fall back to simulation */
        setTimeout(() => { if (Date.now() - lastSensor > 1500) simulate(); }, 2200);
      };
      const request = async () => {
        audio.click();
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
          try {
            const res = await DeviceOrientationEvent.requestPermission();
            if (res === 'granted') { enableBtn.style.display = 'none'; attach(); }
            else showBanner('Compass', 'Permission denied — enjoying the scenic fake-out.');
          } catch (e) { simulate(); }
        } else attach();
      };
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        enableBtn.style.display = 'inline-flex';
        simulate(); /* animate behind the button */
      } else if ('DeviceOrientationEvent' in window) {
        attach();
        setTimeout(() => { if (Date.now() - lastSensor > 1500) simulate(); }, 2400);
      } else simulate();
      enableBtn.addEventListener('click', request);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          const la = pos.coords.latitude, lo = pos.coords.longitude;
          coordsEl.textContent = Math.abs(la).toFixed(2) + '° ' + (la >= 0 ? 'N' : 'S') + ' · ' + Math.abs(lo).toFixed(2) + '° ' + (lo >= 0 ? 'E' : 'W') + ' — you are here-ish';
        }, () => {}, { timeout: 4000 });
      }
      paint();
      view._cleanup = () => {
        if (raf) cancelAnimationFrame(raf);
        window.removeEventListener('deviceorientationabsolute', handleSensor, true);
        window.removeEventListener('deviceorientation', handleSensor, true);
      };
    },
    unmount(view) { if (view._cleanup) view._cleanup(); }
  };
})());

/* ══════════════ VOICE MEMOS ══════════════ */
registerApp('voicememos', (() => {
  const DB_NAME = 'oldos-memos', STORE = 'memos';
  const idb = () => new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const idbAll = async () => {
    const db = await idb();
    return new Promise((resolve, reject) => {
      const out = [];
      db.transaction(STORE).objectStore(STORE).openCursor().onsuccess = e => {
        const cur = e.target.result;
        if (cur) { out.push(cur.value); cur.continue(); } else resolve(out.sort((a, b) => b.ts - a.ts));
      };
    });
  };
  const idbPut = async rec => { const db = await idb(); return new Promise((res, rej) => { const t = db.transaction(STORE, 'readwrite'); t.objectStore(STORE).put(rec); t.oncomplete = res; t.onerror = rej; }); };
  const idbDelete = async id => { const db = await idb(); return new Promise((res, rej) => { const t = db.transaction(STORE, 'readwrite'); t.objectStore(STORE).delete(id); t.oncomplete = res; t.onerror = rej; }); };

  return {
    render() {
      return '<div class="app-inner" style="background:#0d0d10"><div class="nav-bar"><span class="nav-title">Voice Memos</span><span class="nav-btn" style="pointer-events:none;opacity:.7;font-size:10px">60s MAX</span></div>'
        + '<div class="app-scroll" id="vmList"><p class="center-note" style="padding:30px">Loading memos…</p></div>'
        + '<div style="flex:0 0 74px;display:flex;align-items:center;justify-content:space-between;padding:0 18px;background:linear-gradient(180deg,#1c1c22,#0c0c0f);border-top:1px solid #26262d">'
        +   '<canvas id="vmWave" width="96" height="38" style="width:96px;height:38px;border-radius:6px;background:#050507"></canvas>'
        +   '<div id="vmTimer" style="font-size:24px;color:#e8e8ec;font-variant-numeric:tabular-nums;font-weight:200">0:00</div>'
        +   '<button id="vmRecordBtn" aria-label="Record" style="width:52px;height:52px;border-radius:50%;border:3px solid #e8e8ec;background:radial-gradient(circle at 50% 40%, #ff6f5e, #c41e12 75%);box-shadow:0 2px 8px rgba(0,0,0,.5)"></button>'
        + '</div></div>';
    },
    mount(view) {
      const list = $('#vmList', view);
      const recordBtn = $('#vmRecordBtn', view);
      const timerEl = $('#vmTimer', view);
      const wave = $('#vmWave', view);
      let mediaRecorder = null, chunks = [], recording = false, recStart = 0, recTimer = null, waveRaf = null, audioCtx = null, analyser = null, currentAudio = null, currentPlayingId = null;

      const fmt = s => Math.floor(s / 60) + ':' + OldOS.pad2(Math.floor(s % 60));
      const paintList = async () => {
        try {
          const memos = await idbAll();
          list.innerHTML = memos.length ? memos.map(m =>
            '<div class="vm-row" data-id="' + esc(m.id) + '">'
            + '<button class="vm-play" data-vm-play="' + esc(m.id) + '" aria-label="Play memo"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button>'
            + '<div style="min-width:0;flex:1"><div style="color:#f2f2f4;font-size:12.5px;font-weight:600">' + esc(new Date(m.ts).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + ', ' + new Date(m.ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })) + '</div>'
            + '<div style="color:#8f8f99;font-size:10.5px;font-variant-numeric:tabular-nums">' + fmt(m.duration) + ' · memo</div></div>'
            + '<button class="vm-play" data-vm-del="' + esc(m.id) + '" aria-label="Delete memo" style="border-color:#4a2320;color:#ff8d7a"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l1 13a2 2 0 0 0 2 1.8h5a2 2 0 0 0 2-1.8l1-13"/></svg></button>'
            + '</div>').join('') : '<p class="center-note" style="padding:30px 16px">No memos yet. Hit the red button and tell the future what you had for lunch.</p>';
        } catch (e) {
          list.innerHTML = '<p class="center-note" style="padding:24px">Voice Memos storage unavailable in this browser.</p>';
        }
      };
      paintList();

      const drawWave = () => {
        const ctx = wave.getContext('2d');
        ctx.fillStyle = '#050507'; ctx.fillRect(0, 0, wave.width, wave.height);
        if (analyser) {
          const data = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(data);
          const bars = 24;
          for (let i = 0; i < bars; i++) {
            const v = data[Math.floor(i * data.length / bars / 2)] / 255;
            const h = Math.max(2, v * wave.height);
            ctx.fillStyle = 'hsl(' + (110 - v * 110) + ',85%,' + (45 + v * 25) + '%)';
            ctx.fillRect(i * 4 + 1, wave.height - h, 3, h);
          }
        }
        waveRaf = requestAnimationFrame(drawWave);
      };

      const startRecording = async () => {
        if (recording) return;
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          chunks = [];
          mediaRecorder = new MediaRecorder(stream);
          mediaRecorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
          mediaRecorder.onstop = async () => {
            stream.getTracks().forEach(t => t.stop());
            if (audioCtx) { audioCtx.close(); audioCtx = null; analyser = null; }
            if (waveRaf) cancelAnimationFrame(waveRaf);
            const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
            const rec = { id: 'vm-' + Date.now(), ts: Date.now(), duration: Math.round((Date.now() - recStart) / 1000), blob };
            await idbPut(rec);
            showBanner('Voice Memos', 'Memo saved (' + fmt(rec.duration) + ').');
            paintList();
          };
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 128;
          audioCtx.createMediaStreamSource(stream).connect(analyser);
          mediaRecorder.start();
          recording = true; recStart = Date.now();
          recordBtn.style.background = 'radial-gradient(circle at 50% 40%, #ffd9d4, #8a140a 75%)';
          recTimer = setInterval(() => {
            const s = (Date.now() - recStart) / 1000;
            timerEl.textContent = fmt(s);
            if (s >= 60) stopRecording();
          }, 200);
          drawWave();
        } catch (e) {
          showBanner('Voice Memos', 'Microphone access denied or unavailable.');
        }
      };
      const stopRecording = () => {
        if (!recording) return;
        recording = false;
        clearInterval(recTimer);
        recordBtn.style.background = 'radial-gradient(circle at 50% 40%, #ff6f5e, #c41e12 75%)';
        timerEl.textContent = '0:00';
        try { mediaRecorder.stop(); } catch (e) {}
      };
      recordBtn.addEventListener('click', () => { audio.click(); recording ? stopRecording() : startRecording(); });

      list.addEventListener('click', async e => {
        const playBtn = e.target.closest('[data-vm-play]');
        if (playBtn) {
          audio.click();
          const id = playBtn.dataset.vmPlay;
          const memos = await idbAll();
          const memo = memos.find(m => m.id === id); if (!memo) return;
          if (currentAudio) { currentAudio.pause(); currentAudio = null; if (currentPlayingId === id) { currentPlayingId = null; return; } }
          currentAudio = new Audio(URL.createObjectURL(memo.blob));
          currentPlayingId = id;
          currentAudio.play();
          currentAudio.onended = () => { currentPlayingId = null; };
          return;
        }
        const delBtn = e.target.closest('[data-vm-del]');
        if (delBtn) {
          await idbDelete(delBtn.dataset.vmDel);
          showBanner('Voice Memos', 'Memo deleted.');
          paintList();
        }
      });
      view._cleanup = () => {
        clearInterval(recTimer);
        if (waveRaf) cancelAnimationFrame(waveRaf);
        if (recording) { try { mediaRecorder.stop(); } catch (e) {} }
        if (currentAudio) currentAudio.pause();
      };
    },
    unmount(view) { if (view._cleanup) view._cleanup(); }
  };
})());

/* ══════════════ iPod ══════════════ */
const IPOD_BASE_TRACKS = [
  { title: 'Silicon Sunrise', artist: 'The Web Audio Ensemble', album: 'Chiptunes for a Decade', hue: 262, bpm: 132, wave: 'square', bassWave: 'triangle',
    lead: [[60,.5],[64,.5],[67,.5],[72,.5],[71,.5],[67,.5],[64,.5],[62,.5],[60,.75],[0,.25],[62,.5],[64,.5],[67,1],[64,.5],[62,.5],[60,1.5]],
    bass: [[36,.75],[36,.25],[43,.5],[48,.5],[36,.75],[36,.25],[43,.5],[41,.5]] },
  { title: 'Pocket Symphony No. 4', artist: '8-Bit Heart', album: 'Monochrome Dreams', hue: 340, bpm: 96, wave: 'triangle', bassWave: 'sine',
    lead: [[57,.5],[57,.5],[60,.5],[64,1],[62,.5],[60,.5],[57,1.5],[0,.5],[64,.5],[64,.5],[67,.5],[71,1],[69,.5],[67,.5],[64,.5],[62,.5],[60,2]],
    bass: [[33,1],[33,1],[40,1],[38,1],[33,1],[33,.5],[31,.5],[40,2]] },
  { title: 'Neon Dunes', artist: 'Marquee', album: 'Midnight Arcade', hue: 16, bpm: 74, wave: 'sine', bassWave: 'sine',
    lead: [[69,1],[72,.5],[74,.5],[76,1.5],[74,.5],[72,1],[69,2],[67,1],[69,.5],[71,.5],[72,3]],
    bass: [[45,2],[41,2],[36,2],[43,2],[45,4]] },
  { title: 'Dial-Up Dreams', artist: 'Modem Choir', album: '56k Forever', hue: 130, bpm: 118, wave: 'square', bassWave: 'square',
    lead: [[72,.25],[76,.25],[79,.25],[84,.25],[79,.25],[76,.25],[72,.25],[67,.25],[72,.5],[76,.5],[79,.5],[76,.5],[72,1.5]],
    bass: [[48,.5],[48,.5],[43,.5],[43,.5],[36,.5],[36,.5],[41,.5],[43,.5]] },
  { title: 'Asteroid Belt Ballet', artist: 'Voyager Klein', album: 'Gravity Wells', hue: 200, bpm: 88, wave: 'triangle', bassWave: 'triangle',
    lead: [[64,.75],[67,.25],[71,.5],[76,1],[74,.5],[71,.5],[67,1.5],[0,.25],[64,.5],[62,.5],[59,.5],[64,2]],
    bass: [[40,1.5],[35,.5],[43,1.5],[38,.5],[40,3]] },
  { title: 'High Score Hero', artist: 'Player One', album: 'Continue? Y/N', hue: 48, bpm: 148, wave: 'square', bassWave: 'square',
    lead: [[76,.25],[72,.25],[76,.25],[79,.25],[81,.5],[79,.25],[76,.25],[72,.25],[74,.25],[71,.25],[74,.25],[79,.25],[76,.75],[72,.25],[67,.75],[0,.25],[72,.25],[76,.25],[79,.75],[84,1.5]],
    bass: [[52,.5],[52,.5],[47,.5],[47,.5],[48,.5],[48,.5],[43,.5],[45,.5]] }
];
window.IPOD_BASE_TRACKS = IPOD_BASE_TRACKS; /* shared with iTunes Store */

registerApp('ipod', (() => {
  let view2 = 'songs'; /* songs | nowplaying */
  let queue = [], qIndex = 0, playing = false, volume = store.get('ipodVolume', 0.8), shuffle = false, repeat = false;
  let audioCtx = null, masterGain = null, schedulerId = null, nextNoteTime = 0, beatPos = 0, songEndTimer = null, songStartTs = 0, songDuration = 0;

  const allTracks = () => IPOD_BASE_TRACKS.concat(store.get('ipodLibrary', []));
  const midiToFreq = m => 440 * Math.pow(2, (m - 69) / 12);
  const songBeats = t => t.lead.reduce((s, [, b]) => s + b, 0);
  const songSeconds = t => songBeats(t) * 60 / t.bpm;

  const ensureCtx = () => {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const comp = audioCtx.createDynamicsCompressor();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(comp);
      comp.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
  };
  const noteOn = (midi, when, dur, wave, vol) => {
    if (!midi) return;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = wave; o.frequency.value = midiToFreq(midi);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(0.05, dur * 0.92));
    o.connect(g).connect(masterGain);
    o.start(when); o.stop(when + dur + 0.03);
  };
  const scheduleSong = track => {
    const spb = 60 / track.bpm;
    /* lead */
    let t = nextNoteTime;
    track.lead.forEach(([m, beats]) => { noteOn(m, t, beats * spb, track.wave, 0.16); t += beats * spb; });
    /* bass */
    t = nextNoteTime;
    const leadTotal = songBeats(track);
    const bassBeats = track.bass.reduce((s, [, b]) => s + b, 0);
    const reps = Math.ceil(leadTotal / bassBeats);
    for (let r = 0; r < reps && t < nextNoteTime + leadTotal * spb; r++) {
      track.bass.forEach(([m, beats]) => { noteOn(m, t, beats * spb, track.bassWave || 'triangle', 0.22); t += beats * spb; });
    }
    /* hats */
    t = nextNoteTime;
    for (let b = 0; b < leadTotal; b += 0.5) {
      const isBeat = b % 1 === 0;
      const src = audioCtx.createBufferSource();
      const buf = audioCtx.createBuffer(1, 1024, audioCtx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < 1024; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / 1024);
      src.buffer = buf;
      const f = audioCtx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7500;
      const g = audioCtx.createGain(); g.gain.setValueAtTime(isBeat ? 0.09 : 0.045, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      src.connect(f).connect(g).connect(masterGain); src.start(t);
      t += spb * 0.5;
    }
  };
  const stopAudio = () => {
    if (schedulerId) clearInterval(schedulerId); schedulerId = null;
    if (songEndTimer) clearTimeout(songEndTimer); songEndTimer = null;
    /* silence immediately by dropping the context */
    if (audioCtx) { try { audioCtx.close(); } catch (e) {} audioCtx = null; masterGain = null; }
    playing = false;
  };
  const playIndex = (i, autoplay = true) => {
    const tracks = allTracks();
    if (!tracks.length) return;
    qIndex = (i + tracks.length) % tracks.length;
    const track = tracks[qIndex];
    stopAudio();
    if (!autoplay) { store.set('nowPlaying', { title: track.title, artist: track.artist }); updateNowPlayingUI(); updateSongsUI(); return; }
    ensureCtx();
    nextNoteTime = audioCtx.currentTime + 0.08;
    songDuration = songSeconds(track);
    songStartTs = Date.now();
    scheduleSong(track);
    playing = true;
    store.set('nowPlaying', { title: track.title, artist: track.artist });
    songEndTimer = setTimeout(() => {
      if (repeat) playIndex(qIndex);
      else if (shuffle) playIndex(Math.floor(Math.random() * allTracks().length));
      else playIndex(qIndex + 1);
    }, (songDuration + 0.35) * 1000);
    updateNowPlayingUI(); updateSongsUI();
    updateMultitaskNote();
  };
  const togglePlay = () => {
    if (playing) { stopAudio(); store.set('nowPlaying', null); updateNowPlayingUI(); updateSongsUI(); updateMultitaskNote(); return; }
    playIndex(qIndex);
  };
  const currentTrack = () => allTracks()[qIndex] || allTracks()[0];
  const updateMultitaskNote = () => {
    const el = document.getElementById('multitaskNowPlaying');
    if (el) { const t = store.get('nowPlaying', null); el.textContent = t ? (t.artist + ' — ' + t.title) : 'iPod · Not Playing'; }
  };

  const artwork = (track, size) => {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, 'hsl(' + track.hue + ',65%,58%)');
    g.addColorStop(0.55, 'hsl(' + ((track.hue + 40) % 360) + ',60%,34%)');
    g.addColorStop(1, '#05060a');
    x.fillStyle = g; x.fillRect(0, 0, size, size);
    x.globalAlpha = 0.32;
    for (let i = 0; i < 7; i++) {
      x.fillStyle = i % 2 ? '#ffffff' : '#000000';
      x.beginPath(); x.arc(size * (0.15 + 0.13 * i), size * (0.3 + 0.4 * Math.abs(Math.sin(i * 2.7 + track.hue))), size * 0.16, 0, Math.PI * 2); x.fill();
    }
    x.globalAlpha = 1;
    /* scanlines */
    x.fillStyle = 'rgba(0,0,0,.28)';
    for (let y = 0; y < size; y += 4) x.fillRect(0, y, size, 1.4);
    x.fillStyle = 'rgba(255,255,255,.94)';
    x.font = '800 ' + Math.round(size * 0.34) + 'px Georgia';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 8;
    x.fillText((track.title || '?').charAt(0).toUpperCase(), size / 2, size / 2 + 2);
    return c;
  };

  const songsHTML = () => {
    const tracks = allTracks();
    return '<div class="app-scroll" id="songList" style="background:#0d0e12">'
      + tracks.map((t, i) => '<button class="track-row" data-track="' + i + '"><canvas class="track-art" width="44" height="44" data-art="' + i + '"></canvas><span style="min-width:0;flex:1"><span style="display:block;font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(t.title) + '</span><span style="display:block;font-size:10px;color:#7d838f">' + esc(t.artist) + ' — ' + esc(t.album) + '</span></span><span style="font-size:9.5px;color:#5f6673;font-variant-numeric:tabular-nums">' + OldOS.fmtDuration(songSeconds(t)) + '</span></button>').join('')
      + '<p class="center-note" style="color:#4c5160">6 originals + whatever you “bought” in iTunes.<br>All synthesized live. No band was hired.</p>'
      + '</div>';
  };
  const nowPlayingHTML = () => {
    const t = currentTrack();
    return '<div style="flex:1;display:flex;flex-direction:column;background:#0d0e12;overflow:hidden;position:relative" id="npPane">'
      + '<canvas class="np-art" id="npArt" width="168" height="168"></canvas>'
      + '<div class="np-title">' + esc(t ? t.title : '—') + '</div>'
      + '<div class="np-artist">' + esc(t ? t.artist + ' · ' + t.album : '') + '</div>'
      + '<div class="np-progress"><i id="npFill"></i></div>'
      + '<div class="np-times"><span id="npElapsed">0:00</span><span id="npTotal">' + OldOS.fmtDuration(songSeconds(t || { lead: [[0, 1]], bpm: 120 })) + '</span></div>'
      + '<div class="np-controls">'
      + '<button class="np-btn" id="npPrev" aria-label="Previous"><svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M6 5h2.6v14H6zM19 5v14L9.5 12z"/></svg></button>'
      + '<button class="np-btn play" id="npPlay" aria-label="Play or pause"><svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" id="npPlayIcon">' + (playing ? '<path d="M7.5 5h3.2v14H7.5zM13.3 5h3.2v14h-3.2z"/>' : '<path d="M8.5 5v14l11-7z"/>') + '</svg></button>'
      + '<button class="np-btn" id="npNext" aria-label="Next"><svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M15.4 5H18v14h-2.6zM5 5v14l9.5-7z"/></svg></button>'
      + '</div>'
      + '<input type="range" class="ios-slider" id="npVolume" min="0" max="100" value="' + Math.round(volume * 100) + '" style="width:200px;margin:12px auto 0" aria-label="Volume">'
      + '<div class="np-toggles"><button class="np-toggle' + (shuffle ? ' on' : '') + '" id="npShuffle">Shuffle</button><button class="np-toggle' + (repeat ? ' on' : '') + '" id="npRepeat">Repeat</button><button class="np-toggle" id="npGenius">Genius</button></div>'
      + '</div>';
  };
  const updateSongsUI = () => {
    const listEl = document.getElementById('songList');
    if (!listEl) return;
    listEl.querySelectorAll('.track-row').forEach((row, i) => {
      const isCurrent = i === qIndex;
      row.classList.toggle('playing', isCurrent && playing);
      const art = row.querySelector('canvas[data-art]');
      if (art && !art._done) { art.getContext('2d').drawImage(artwork(allTracks()[i], 44), 0, 0); art._done = true; }
    });
  };
  const updateNowPlayingUI = () => {
    const art = document.getElementById('npArt');
    if (!art) return;
    const t = currentTrack();
    art.getContext('2d').clearRect(0, 0, 168, 168);
    art.getContext('2d').drawImage(artwork(t, 168), 0, 0);
    document.getElementById('npPlayIcon').innerHTML = playing ? '<path d="M7.5 5h3.2v14H7.5zM13.3 5h3.2v14h-3.2z"/>' : '<path d="M8.5 5v14l11-7z"/>';
  };

  return {
    render() {
      return '<div class="app-inner ipod-app"><div class="nav-bar"><span class="nav-title">iPod</span><span class="nav-btn" style="pointer-events:none;opacity:.7;font-size:9px;letter-spacing:.1em">SYNTH ENGINE</span></div>'
        + '<div id="ipodContent" style="flex:1;display:flex;flex-direction:column;overflow:hidden">' + songsHTML() + '</div>'
        + '<div class="tab-bar"><button class="tab-item active" data-itab="songs"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M9 18.5V6l10-2v11.5"/><circle cx="6.5" cy="18.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/></svg>Songs</button>'
        + '<button class="tab-item" data-itab="nowplaying"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="8" y="2.5" width="8" height="13" rx="2.5"/><circle cx="12" cy="18.8" r="2.6"/></svg>Now Playing</button></div>'
        + '</div>';
    },
    mount(view) {
      const content = $('#ipodContent', view);
      let progressTimer = null;
      const paintProgress = () => {
        const fill = document.getElementById('npFill');
        if (!fill) return;
        if (!playing) { /* keep last */ }
        const elapsed = playing ? (Date.now() - songStartTs) / 1000 : 0;
        const t = currentTrack();
        const total = songSeconds(t);
        fill.style.width = Math.min(100, (elapsed / total) * 100) + '%';
        const eEl = document.getElementById('npElapsed');
        if (eEl) eEl.textContent = OldOS.fmtDuration(elapsed);
      };
      progressTimer = setInterval(paintProgress, 250);

      const bindSongs = () => {
        content.querySelectorAll('[data-track]').forEach(btn => btn.addEventListener('click', () => {
          audio.click();
          playIndex(+btn.dataset.track);
          view2 = 'nowplaying';
          switchTab('nowplaying');
        }));
        updateSongsUI();
      };
      const bindNP = () => {
        updateNowPlayingUI();
        $('#npPlay', view).addEventListener('click', () => { audio.click(); togglePlay(); });
        $('#npPrev', view).addEventListener('click', () => { audio.click(); playIndex(qIndex - 1); updateNowPlayingUI(); });
        $('#npNext', view).addEventListener('click', () => { audio.click(); playIndex(qIndex + 1); updateNowPlayingUI(); });
        $('#npVolume', view).addEventListener('input', e => {
          volume = e.target.value / 100;
          store.set('ipodVolume', volume);
          if (masterGain) masterGain.gain.value = volume;
        });
        $('#npShuffle', view).addEventListener('click', e => { shuffle = !shuffle; e.currentTarget.classList.toggle('on', shuffle); audio.click(); });
        $('#npRepeat', view).addEventListener('click', e => { repeat = !repeat; e.currentTarget.classList.toggle('on', repeat); audio.click(); });
        $('#npGenius', view).addEventListener('click', e => {
          const btn = e.currentTarget;
          btn.textContent = 'Analyzing…'; btn.classList.add('on');
          let ticks = 0;
          const int = setInterval(() => {
            ticks++;
            btn.textContent = ['Analyzing…', 'Shuffling…', 'Matching…', 'Genius!'][Math.min(3, ticks)];
            if (ticks >= 4) {
              clearInterval(int);
              const idx = Math.floor(Math.random() * allTracks().length);
              playIndex(idx);
              updateNowPlayingUI();
              showBanner('Genius', 'Genius has chosen “' + currentTrack().title + '”.');
              btn.textContent = 'Genius';
            }
          }, 330);
        });
      };
      const switchTab = next => {
        view2 = next;
        view.querySelectorAll('[data-itab]').forEach(b => b.classList.toggle('active', b.dataset.itab === next));
        content.innerHTML = next === 'songs' ? songsHTML() : nowPlayingHTML();
        if (next === 'songs') bindSongs(); else bindNP();
      };
      view.querySelectorAll('[data-itab]').forEach(btn => btn.addEventListener('click', () => { audio.click(); switchTab(btn.dataset.itab); }));
      bindSongs();
      view._cleanup = () => {
        clearInterval(progressTimer);
        stopAudio();
        updateMultitaskNote();
      };
    },
    unmount(view) { if (view._cleanup) view._cleanup(); }
  };
})());

/* ══════════════ YOUTUBE ══════════════ */
registerApp('youtube', (() => {
  const CLASSICS = [
    { id: '9bZkp7q19f0', title: 'PSY — GANGNAM STYLE', by: 'officialpsy', views: '4.7B', len: '4:13', hue: 340 },
    { id: '60ItHLz5WEA', title: 'Rick Astley — Never Gonna Give You Up', by: 'RickAstleyVEVO', views: '1.5B', len: '3:33', hue: 20 },
    { id: 'fJ9rUzIMcZQ', title: 'Queen — Bohemian Rhapsody (Official Video)', by: 'Queen Official', views: '1.9B', len: '5:55', hue: 262 },
    { id: 'OPf0YbXqDm0', title: 'Mark Ronson — Uptown Funk ft. Bruno Mars', by: 'MarkRonsonVEVO', views: '4.6B', len: '4:30', hue: 45 },
    { id: 'JGwWNGJdvx8', title: 'Ed Sheeran — Perfect', by: 'EdSheeranVEVO', views: '6.1B', len: '4:23', hue: 200 },
    { id: 'kJQP7kiw5Fk', title: 'Luis Fonsi — Despacito ft. Daddy Yankee', by: 'LuisFonsiVEVO', views: '8.4B', len: '4:42', hue: 130 },
    { id: 'YQHsXMglC9A', title: 'Adele — Hello', by: 'AdeleVEVO', views: '3.7B', len: '6:07', hue: 300 },
    { id: 'hT_nvWreIhg', title: 'OneRepublic — Counting Stars', by: 'OneRepublicVEVO', views: '3.6B', len: '4:17', hue: 160 }
  ];

  return {
    render() {
      return '<div class="app-inner" style="background:#0f0f12;position:relative">'
        + '<div class="nav-bar" style="justify-content:center;gap:6px"><span style="color:#fff;font-size:19px;font-weight:800;letter-spacing:-.03em">You</span><span style="background:linear-gradient(180deg,#e52d27,#b3120e);color:#fff;font-size:15px;font-weight:800;border-radius:5px;padding:2px 7px 3px;letter-spacing:-.02em;box-shadow:inset 0 1px 0 rgba(255,255,255,.4)">Tube</span></div>'
        + '<div class="app-scroll" id="ytHome">'
        + '<form id="ytForm" style="display:flex;gap:6px;padding:10px 10px 4px"><input id="ytUrl" class="ios-input" placeholder="Paste any YouTube link or video ID…" autocomplete="off" autocapitalize="off" spellcheck="false" style="flex:1" aria-label="YouTube URL"><button type="submit" class="nav-btn">Play</button></form>'
        + '<div style="padding:2px 12px 6px;font-size:9px;letter-spacing:.22em;color:#5f5f68;text-transform:uppercase">Most Viewed · Classic Era</div>'
        + CLASSICS.map(v => '<button class="yt-row" data-yt="' + v.id + '" style="display:flex;gap:9px;width:100%;align-items:center;background:transparent;border:none;border-bottom:1px solid #1d1d22;padding:7px 10px;text-align:left">'
          + '<span style="position:relative;flex:0 0 128px"><img src="https://i.ytimg.com/vi/' + v.id + '/mqdefault.jpg" alt="" width="128" height="72" loading="lazy" style="width:128px;height:72px;object-fit:cover;border-radius:6px;display:block;background:#222" onerror="this.onerror=null;this.src=&quot;data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 4 3%27%3E%3Crect fill=%27%23222%27 width=%274%27 height=%273%27/%3E%3C/svg%27"><span style="position:absolute;right:3px;bottom:3px;background:rgba(0,0,0,.85);color:#fff;font-size:9.5px;padding:1px 4px;border-radius:3px;font-variant-numeric:tabular-nums">' + v.len + '</span></span>'
          + '<span style="min-width:0"><span style="display:block;color:#e8e8ec;font-size:11px;font-weight:700;line-height:1.35;max-height:29px;overflow:hidden">' + esc(v.title) + '</span><span style="display:block;color:#8f8f99;font-size:9px;margin-top:2px">' + esc(v.by) + ' · ' + v.views + ' views</span></span>'
          + '</button>').join('')
        + '<p class="center-note" style="color:#4c4c54">The YouTube app from 2010, reanimated.<br>Videos play through YouTube’s own embed player.</p>'
        + '</div>'
        + '<div id="ytPlayer" style="position:absolute;inset:0;background:#000;z-index:8;display:none;flex-direction:column">'
        + '<div class="nav-bar"><button class="nav-back" id="ytBack">YouTube</button><span class="nav-title" style="font-size:13px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" id="ytNowTitle">Now Playing</span><span style="width:44px"></span></div>'
        + '<div style="flex:1;position:relative;background:#000"><iframe id="ytFrame" title="YouTube player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe></div>'
        + '</div></div>';
    },
    mount(view) {
      const player = $('#ytPlayer', view);
      const frame = $('#ytFrame', view);
      const play = (id, title) => {
        frame.src = 'https://www.youtube.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0';
        $('#ytNowTitle', view).textContent = title || 'Now Playing';
        player.style.display = 'flex';
      };
      view.querySelectorAll('[data-yt]').forEach(b => b.addEventListener('click', () => {
        audio.click();
        const rec = CLASSICS.find(c => c.id === b.dataset.yt);
        play(rec.id, rec.title);
      }));
      $('#ytForm', view).addEventListener('submit', e => {
        e.preventDefault();
        const raw = $('#ytUrl', view).value.trim();
        if (!raw) return;
        const m = raw.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/) || raw.match(/^([A-Za-z0-9_-]{11})$/);
        if (m) play(m[1], 'Now Playing');
        else {
          /* treat as a search — DuckDuckGo !bang, via Safari for reliability */
          OldOS.closeApp();
          setTimeout(() => launchApp('safari', { url: 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent('youtube ' + raw) }), 260);
          showBanner('YouTube', 'Searching DuckDuckGo for “youtube ' + raw + '” — frameable and proud of it.');
        }
      });
      $('#ytBack', view).addEventListener('click', () => { frame.src = 'about:blank'; player.style.display = 'none'; });
    },
    unmount(view) { const f = view.querySelector('#ytFrame'); if (f) f.src = 'about:blank'; }
  };
})());

})(window.OldOS);
