# OldOS — iOS 4, Rebuilt in HTML5

**The OldOS Project**, the internet's pixel-perfect recreation of iOS 4, reimplemented from SwiftUI as a **100% static web app** — plain HTML, CSS and vanilla JavaScript. No build step, no framework, no backend. Push to `main` and GitHub Pages does the rest.

> Original project: [zzanehip/The-OldOS-Project](https://github.com/zzanehip/The-OldOS-Project) by **Zane (@zzanehip)**, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). This site is an attribution-respecting fan recreation. Apple, iPhone and iOS are trademarks of Apple Inc., who did not endorse this and whose 2010 HR department remains a mystery.

## What is inside

A full working simulator embedded in the landing page — not screenshots:

- **Slide to unlock** with spring physics, passcode support, a boot sequence and a haptic-ish slider
- **The real 2010 springboard**: two pages, Spotlight search, Utilities folder, page dots, long-press jiggle mode, and badges that clear when you actually do your mail
- **22 working apps**, including:
  - **Messages** — threads with a gloriously stubborn chatbot
  - **Mail** — read/compose/trash, "Check for Mail" delivers real mail
  - **Phone** — favorites, recents, a DTMF keypad and a synthesized ringtone voicemail (Web Audio)
  - **Safari** — an actual iframe browser with address bar, bookmarks, history and Most Visited
  - **iPod** — six original chiptunes *synthesized live* with an oscillator graph
  - **iTunes & App Store** — buy music, install apps straight onto your springboard
  - **Game Center** — minimax Tic-Tac-Toe, Memory Match, Snake, and achievements that persist
  - **Voice Memos** — records into IndexedDB with a live waveform
  - **Camera** — getUserMedia viewfinder that saves to the Camera Roll
  - **Stocks / Weather** — live stooq + open-meteo data with offline DEMO fallbacks
  - **Clock** — canvas analog world faces, alarms that ring (even "snoozed"), stopwatch, timer
  - **Settings** — Wi-Fi picker, 27 decoded originals from the OldOS art catalog, brightness, passcode, erase-everything
- **State that persists** — notes, mail, photos, alarms, contacts, app installs, settings, badges, all in `localStorage` (with an in-memory fallback)
- **The hardware** — chrome band, power button, mute switch, volume rockers, home button (double-click for the multitasking tray), earpiece, proximity sensor, screen glare

Everything runs client-side. There is no server. There is only the 2010 dream.

## Run it

```bash
git clone https://github.com/TheEuHub/theeuhub.github.io.git
cd theeuhub.github.io
python3 -m http.server 8080   # or any static server
# open http://localhost:8080
```

Or just visit **https://theeuhub.github.io/**

## Tech

- HTML5 + CSS3 + vanilla ES6 (no frameworks, no bundler)
- Web Audio API (ringtones, chimes, DTMF, chiptunes) · IndexedDB (memos) · localStorage (everything else)
- Canvas 2D (clock faces, iPod artwork, stock charts, snake)
- Geolocation + DeviceOrientation (Maps, Compass) · getUserMedia (Camera, Voice Memos)
- Assets: original OldOS artwork, transcoded from CgBI PNGs and upscaled JPEGs for the web

## Credits & License

- **OldOS** — concept, art direction and the original SwiftUI build: [zzanehip](https://github.com/zzanehip) and contributors
- **This recreation** — TheEuHub, standing on their shoulders
- Original project and artwork used under **Creative Commons Attribution 4.0** — see [License](https://creativecommons.org/licenses/by/4.0/)

If you are Zane: this site is a love letter. Your CSS was not harmed, but your font choices were briefly auditioned.
