# Mox — the AI app (and the panel's AI button)

Mox is a private AI workspace by Math-halper: a small language model runs inside
the browser, so it answers without a server, an account or an API key, and
nothing typed into it leaves the device.

## What ships here

- `apps/productivity/mox/website/` contains the static browser bundle from
  `github.com/Math-halper/mox`, including `wllama` (`vendor/wllama/`), `pdf.js`
  (`vendor/pdfjs/`), the 55-document cited knowledge library (`knowledge/`),
  and the quantized `SmolLM2-135M-Instruct` (`Q4_1`) GGUF weights
  (`models/smollm2-135m-instruct-q4_1.gguf`).
- Upstream desktop/deployment launchers, service worker (`sw.js`), tests, and
  build tooling are deliberately left out so proton serves a static, clean
  bundle (`?nosw` disables service worker registration inside frames).
- `apps/productivity/mox/app.html` publishes `APPS.mox.page` so both the Mox
  app window and the desktop panel's Copilot-style AI pane (`Alt+C`) frame the
  same local page without sandboxing.
