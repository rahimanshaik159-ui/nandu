# Nandu thammudu — Cinematic Sunset Birthday Website

A personal birthday surprise built with plain **HTML5, CSS3 and vanilla JavaScript** — no frameworks, no build step, no backend, no API keys.

Eight connected screens, in order:

1. Welcome → 2. Birthday Wishes → 3. Personal Letter → 4. Cake & Music → 5. Candle Blowing → 6. Fireworks → 7. Cake Cutting → 8. Final Greeting (with Replay)

Music starts only when the visitor presses **Click to Start**, and keeps playing (one shared `<audio>` element) across every screen.

## File structure

```
birthday-website/
├── index.html            ← all 8 screens (semantic sections)
├── css/style.css         ← mobile-first styles
├── js/script.js          ← navigation, audio, candles, fireworks, cake cutting, replay
├── assets/
│   ├── main_image.jpg    ← welcome + finale photo
│   ├── img1.jpg          ← wishes screen photo
│   ├── img2.jpg          ← letter + finale photo
│   ├── img3.jpg          ← letter + finale photo
│   ├── audio.mp3         ← birthday music
│   └── fonts/            ← Playfair Display, DM Sans, Caveat (local .woff2)
└── README.md
```

The cake is drawn in SVG by `js/script.js`, so no cake photograph is needed.

## Run locally

**Quickest:** double-click `index.html`. Everything uses relative paths.

**Recommended** (best audio/font behaviour in every browser) — start a tiny static server in this folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

(or `npx serve .`)

## Replace the photographs

Overwrite the files in `assets/` and keep the same filenames — nothing else needs to change.

| File | Used on | Notes |
|---|---|---|
| `main_image.jpg` | Welcome (hero) and Finale | Tall/portrait photo works best; subject near the upper half |
| `img1.jpg` | Wishes (Polaroid) | |
| `img2.jpg`, `img3.jpg` | Letter (small Polaroids) and Finale | |

Tips:
- Use JPEG, ~1200–1500 px on the long edge (keeps the page fast on phones).
- To use a PNG instead, change the extension in `index.html` (search for `main_image.jpg`).
- If a face is cropped awkwardly, adjust that photo's focal point. In `index.html` each Polaroid has `--pos:50% 38%` (horizontal vertical). Change the second number (0% = top, 100% = bottom). The hero focal point is `object-position` on `.hero__photo img` in `css/style.css`.

## Replace the music

Replace `assets/audio.mp3` with your own MP3 (same filename). The track loops automatically. To use another filename, edit the `src` of `<audio id="bgm">` in `index.html`.

## Change names / text

All text is in `index.html`. The name appears as **Nandu thammudu** (header label: *For Nandu Thammudu*). Use find-and-replace to change it.

## Deploy to static hosting

Upload the folder contents (keep the structure) to any static host:

- **Netlify:** drag-and-drop the folder at app.netlify.com/drop
- **GitHub Pages:** push to a repo → Settings → Pages → deploy from branch
- **Cloudflare Pages / Vercel / Firebase Hosting:** point at this folder; no build command, output directory `.`

Audio autoplay is intentionally never used — browsers require the visitor's click, which the Start button provides. Serve over HTTPS (all of the hosts above do).

## Features

- Header navigation (active item highlighted), progress dots to jump to any of the 8 screens, Next buttons, and ← / → keyboard navigation
- Persistent music play/pause button; friendly retry message if playback fails
- Candle blowing (button-triggered flames out + smoke), canvas fireworks (bounded particles, pauses when the tab is hidden), cake-cutting animation with confetti
- Replay resets every interaction and restarts the song from the beginning
- Respects `prefers-reduced-motion`; visible keyboard focus; alt text on all photos
- Mobile-first layouts verified from 320 px up to 1440 px
