# TheEuHub GitHub Repositories Overview

The `TheEuHub` GitHub organization/user maintains two public static-first web repositories:

1. **`TheEuHub/theeuhub.github.io`** — **proton**, a pure static browser desktop shell (`https://theeuhub.github.io/`) disguised behind a working **Math Helper** cover site, containing 65 built-in apps across System, Productivity, Media, Tools, and Games, a virtual filesystem, a built-in repository search engine, the **Mox** private browser AI workspace, WebAssembly VLC playback, and user-ROM-only Web Retro emulation.
2. **`TheEuHub/Ampler-launcher`** — **Ampler Launcher**, a standalone static browser launcher and offline archive for **Eaglercraft** (browser Minecraft builds), containing 110 client folders across 311 committed files, modded and assisted builds, 22 EaglerForge mods, skin management, an offline server bundle, hash-verified upstream client recovery, and automated offline/browser tests.

## Quick Comparison

| Repository | Primary Project | Language / Stack | Size & Scope | Live / Entry Point |
| --- | --- | --- | --- | --- |
| `TheEuHub/theeuhub.github.io` | **proton** browser desktop | Static HTML, CSS, JavaScript, WebAssembly | 65 apps (6 System, 6 Productivity, 4 Media, 4 Tools, 45 Games) + Math Helper cover + VFS + search index | `index.html` (`https://theeuhub.github.io/`) |
| `TheEuHub/Ampler-launcher` | **Ampler Launcher** | Static HTML, CSS, JavaScript, Python & Node tooling | 110 Eaglercraft client folders (55 base, 6 alpha, 14 beta, 35 modded, 3 assisted), 22 mods, Blockhop cover | `index.html` (Blockhop cover) -> `app/index.html` (launcher) |

## Shared Design Principles across Both Repositories

- **Zero backend server required:** Both repositories run directly from static hosting such as GitHub Pages or `python3 -m http.server` / `tools/serve.py`, with no Node/PHP/database server at runtime.
- **Cover-page pattern:** Both projects place an innocuous, functional public landing site at the repository root `index.html` — **Math Helper** in `theeuhub.github.io` and **Blockhop** in `Ampler-launcher` — with a subtle entry point into the full application.
- **Offline and local-first assets:** Games, emulators, skins, fonts, WebAssembly engines (`wllama`, `libvlc-wasm`, `ruffle`, `webretro`), and language-model weights live inside the repositories rather than relying on remote third-party CDNs or embedded external iframes.
- **Cross-origin isolation when WASM threads need it:** `theeuhub.github.io` ships `coi-serviceworker.js` for `SharedArrayBuffer`-backed VLC WebAssembly playback, while `Ampler-launcher` ships `tools/serve.py` setting `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` for WASM Eaglercraft builds.
- **Automated integrity and DOM tests:** Both repositories maintain deterministic verification suites (`npm test` with `node --test` + JSDOM in `theeuhub.github.io`; `python3 -m unittest`, `verify-offline.mjs`, and `browser-test.mjs` in `Ampler-launcher`).

## How the Two Repositories Connect

`TheEuHub/theeuhub.github.io` includes a compact **Ampler Launcher** app inside its desktop Games menu (`apps/games/ampler-launcher/`) with 7 offline Eaglercraft builds (`1.12.2-u3`, `1.12.2-u3 WASM`, `1.8.8-u53`, `1.8.8-u53 WASM-GC`, `1.5.2-sp2.01`, `Beta 1.3`, and `Alpha 1.2.6`). The separate `TheEuHub/Ampler-launcher` repository is the full standalone edition with all 110 client folders, 35 modded clients, 22 EaglerForge mods, and SHA-verified recovery tooling (`tools/recover_upstream.py`).
