# TheEuHub/Ampler-launcher (Eaglercraft Launcher)

`TheEuHub/Ampler-launcher` is a standalone browser launcher and offline client repository for **Eaglercraft** (JavaScript, TeaVM, and WebAssembly browser builds of Minecraft), featuring a cover site, edition catalogs, modded clients, an EaglerForge mod library, skin management, an offline multiplayer server bundle, and hash-pinned recovery tooling.

## Repository Layout

- **`index.html` (Blockhop cover page):** When hosted statically at the repository root, visitors first see **Blockhop**, a standalone creative cover page whose **Settings** popup contains a **continue to site** link leading into `app/`.
- **`app/` (Launcher shell):**
  - `app/index.html` — main launcher interface with Play, Installations, Skins, Mods, Downloads, Patch Notes, Settings, and Credits views.
  - `app/mc/` — **110 committed client folders** containing **311 files** for offline play (`≈1.8 GB` packed / `≈3 GB` catalog).
  - `app/assets/` — stylesheets (`css/`), self-hosted fonts (`fonts/`), icons (`images/`), JavaScript modules (`js/index.js`, `js/jszip-local.js`, `js/skins.js`, `js/skinsview.js`, `js/wispcraft.js`), JSON catalogs (`json/`), skin folders (`skins/`), and the offline multiplayer server (`server/`).
- **`docs/`:** `eaglercraft-reference.md` (comprehensive technical reference covering Eaglercraft engines, relays, TeaVM JS vs WASM-GC targets, and upstream repositories) and `original-readme.md`.
- **`tools/`:** `serve.py`, `recover_upstream.py`, `recover_clients.py`, `bake-skins.py`, `upstream-files.json`, and double-clickable starters (`start-offline.sh`, `start-offline.command`, `start-offline.bat`).
- **`tests/`:** `test_integrity.py`, `verify-offline.mjs`, and `browser-test.mjs`.

## Client Catalogs and Features (`app/assets/json/`)

- **Base releases (`base.json`, 55 entries):** Spans Classic/Pre-Classic (`rd-131655` through `rd-161348`, `0.0.11a`–`0.30`), Indev/Infdev, `1.0`–`1.21.11 WASM`, and modern builds (`1.2.5`, `1.6.4`, `1.8.8`, `1.12.2`, `1.16.5`, `1.20.6`, `1.21.11`, `26.1.2`, `26.2 WASM`) in both JS and WASM variants.
- **Alpha & Beta (`alpha.json` 6 entries, `beta.json` 14 entries):** Alpha `1.0.1_01` through `1.2.6` and Beta `1.0` through `1.9 WASM`.
- **Modded clients (`modded.json`, 35 entries):** Community clients including Astra Client (`1`, `WASM`, `2`), Aero, EB Client, Eaglerforge, Eclipse, EFI, Forge 1.6.4, Huzzium, Kozmo, Larp, Modern, Myven, PixelClient, Precision, Reflex, Resent (`3.8`, `4.0`), Shadow, Starlike, The Broken Script, Tuff Client, Winston Horror, and Z-Client 1.11.
- **Assisted builds & EaglerForge mods (`assisted.json` 3, `mods.json` 22):** Mobile UI builds (FlamedDogo's and Red's Mobile UI, Red's Controller Support) plus 22 client mods (`Auto Clicker`, `AutoFish`, `Blink`, `Blur`, `Chat Commands`, `Chat Shortcuts`, `Eagler Homes`, `Fresh Eagler UI`, `Fullbright`, `Grapple Hook`, `JEI`, `Jetpack`, `No Fall Damage`, `Player Vision`, `Stats Hud`, `Super Speed`, `Xray`, and more).
- **Skins and Offline Multiplayer:** Supports custom skin folders (`<name>.png` and optional `preview.<name>.png`), live 3D/2D skin rendering via `skinsview.js`, `bake-skins.py` for offline skin lists, and a bundled offline multiplayer server in `app/assets/server/`.

## Local Server, Upstream Recovery, and Testing

- **Cross-origin-isolated server:** `python3 tools/serve.py --port 8000 --no-browser` serves `app/` (plus `./tools/upstream-files.json` for the Downloads screen) with `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`, and `Cross-Origin-Resource-Policy: same-origin` headers required by WASM threads.
- **Hash-pinned recovery:** `python3 tools/recover_upstream.py` uses `gh` and `tools/upstream-files.json` (311 files across 10 community mirrors) to verify/restore every `app/mc/` file against its pinned Git blob SHA and writes `app/mc/upstream-availability.json`.
- **Automated verification:**
  - `python3 -m unittest discover -s tests` runs fast structural integrity checks (`test_integrity.py`).
  - `node tests/verify-offline.mjs` runs 178 offline verification checks across catalogs, disk paths, skins, layouts, and JSDOM DOM flow.
  - `node tests/browser-test.mjs` optionally runs a live Chromium pass with `puppeteer-core`.

## Relation to `TheEuHub/theeuhub.github.io`

Inside `TheEuHub/theeuhub.github.io`, `apps/games/ampler-launcher/` embeds a lightweight 7-build version of Ampler Launcher (`1.12.2-u3`, `1.12.2-u3 WASM`, `1.8.8-u53`, `1.8.8-u53 WASM-GC`, `1.5.2-sp2.01`, `Beta 1.3`, and `Alpha 1.2.6` plus EaglerXServer v1.1.1), while `TheEuHub/Ampler-launcher` is the full standalone repository with 110 client folders, 35 modded builds, 22 EaglerForge mods, and the Blockhop cover page.
