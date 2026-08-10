# FLUTTER (working title)

A free, browser-only analog/CRT/VHS degradation tool — built as the companion
tool to "How Fiction Built the Future."

Everything runs client-side. Nothing you upload — source media or overlay —
ever leaves your browser or touches a server. This is what keeps hosting
costs near zero (see the bandwidth note below) and sidesteps any question of
handling other people's copyrighted footage.

## What it does

1. **Upload a source** — image or video clip.
2. **Optionally upload your own overlay** — a grain/glitch/distortion clip or
   image you have the rights to use — and blend it over the source
   (screen / overlay / multiply / add / difference, adjustable opacity).
3. **Dial in the analog degradation** — chromatic aberration, scanlines,
   jitter, tearing, signal loss, barrel curvature, flicker — via the forked
   CRTFilterWebGL engine, or start from a preset (clean / vhs / crt / broken).
4. **Export** — PNG for stills, WEBM for video (client-side `MediaRecorder`,
   capped at 30s for the MVP, silent — see Known limitations).

## Why no bundled overlay library

This tool intentionally ships with **zero pre-loaded overlay assets**. Any
stock VFX pack (CinePunch and similar Envato/marketplace bundles) is licensed
for use *inside your own edited videos*, not for redistribution through a
public tool — see the licensing thread this project came out of. The overlay
slot is BYO on purpose: point it at your own self-shot grain/glitch footage,
or CC0 sources, and you're fully clear.

## Project structure

```
dither-tool/
├── index.html              # single-page app shell
├── css/style.css            # dark, degraded-digital UI (matches visual-style.md)
├── js/
│   ├── app.js               # upload, compositing, export logic
│   ├── CRTFilter.js          # forked from Ichiaka/CRTFilter (MIT)
│   └── CRTFilter-LICENSE.txt # original license, preserved per MIT terms
├── LICENSE                  # project license (MIT) + attribution
└── README.md
```

No build step, no dependencies, no `node_modules`. Open `index.html` directly
or serve the folder statically.

## Local preview

```bash
cd dither-tool
python3 -m http.server 8080
# then open http://localhost:8080
```

## Deploying (bandwidth-safe)

Deploy to **Cloudflare Pages** — free tier, unlimited bandwidth, which avoids
the exact hosting-ban failure mode that prompted this whole project (a
tool that got popular and blew past a host's bandwidth cap).

```bash
npm install -g wrangler
wrangler pages deploy dither-tool --project-name=flutter-tool
```

Or connect the GitHub repo directly in the Cloudflare dashboard for
auto-deploy on push.

## Known limitations (MVP — next passes)

- **Video export is silent.** `captureStream()` only grabs the canvas; audio
  needs a separate `AudioContext` tap from the source `<video>` mixed into
  the recorder stream. Worth adding once the visual pipeline is proven.
- **Export capped at 30s.** Fine for Shorts-length clips; raise the cap once
  file-size/memory behavior is confirmed on real uploads.
- **No mobile-camera capture flow yet** — file upload only.
- **Rebrand before shipping.** "FLUTTER" is a placeholder (tape wow-and-
  flutter) chosen to fit the sampling/DAW naming register in
  visual-style.md — Session, Offset, and Chop are already claimed by other
  parts of the system, so this needs your sign-off or a swap before launch.
- **Update the credit link** in `js/app.js` (`credit-link` href) to point at
  your actual channel/Substack before deploying.

## License

MIT — see `LICENSE`. Includes a modified copy of Ichiaka/CRTFilter (MIT),
attribution preserved in `js/CRTFilter-LICENSE.txt`.
