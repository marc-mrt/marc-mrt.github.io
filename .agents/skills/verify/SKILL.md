---
name: verify
description: How to launch and drive marc-mrt.github.io to verify a change live.
---

## Launch
`hugo server --port <free-port> --bind 127.0.0.1 --disableLiveReload --renderToMemory`. Ready when Hugo prints `Web Server is available at`; use that URL, including its `localhost` host and actual port.

## Drive
Browse `/`, `/about/`, and `/blog/` with Chromium. Use DevTools Protocol `Emulation.setEmulatedMedia` with the `prefers-color-scheme` feature set to `light` or `dark`, then inspect computed styles and save `Page.captureScreenshot` output. For the automated behavior check, run `CHROME_BIN=/path/to/chromium node --test tests/theme.test.mjs`.

## Teardown
Stop the Hugo process and Chromium. For the launch above, `pkill -TERM -f '^hugo server --port <free-port>'` stops Hugo cleanly.
