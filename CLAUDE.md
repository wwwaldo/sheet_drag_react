# CLAUDE.md — project checkpoint & handoff

Context for the next Claude session. Last updated: 2026-06-14.

## What this project is

A draggable character-sheet layout tool ("Bearington"), in **two parallel forms**:

1. **No-build, single-file demos at the repo root** — CDN React via `React.createElement`,
   served by **GitHub Pages**.
   - `index.html` — the Bearington sheet (drag pieces, woodland variant picker + on-card
     ‹ › outfit arrows).
   - `layout-lab.html` — generic "Layout Lab": load any image, draw region boxes, segment
     into transparent PNG pieces you can drag; export/import presets, download PNGs.
2. **A real Vite + React build in `react-app/`** — JSX + React Router, deployed to
   **Netlify**. Ports both pages: `/` (sheet) and `/layout-lab`.

## Live URLs

- GitHub Pages (root static): https://wwwaldo.github.io/sheet_drag_react/
  - `/index.html`, `/layout-lab.html`
- Netlify (React app): https://bearington-sheet-react.netlify.app
  - `/` and `/layout-lab`

## Repo / accounts / deploy facts

- GitHub remote: `git@github.com:wwwaldo/sheet_drag_react.git` (account **wwwaldo**, SSH).
- Branches: **`main`** is primary. **`master`** is kept as a mirror — after committing to
  `main` we always run `git branch -f master main && git push origin master`. Keep doing this.
- Commit identity used here: `-c user.email="ruoyi.lin@gmail.com" -c user.name="wwwaldo"`.
  End commit messages with the `Co-Authored-By: Claude ...` trailer.
- GitHub Pages serves from `main` branch root — do not break root `index.html`.
- Netlify CLI is installed + authenticated (user: Waldo Lin / ruoyi.lin@gmail.com, team
  slug `wwwaldo`). Site name: **bearington-sheet-react** (project id
  59f4567b-2815-4529-86b2-e616cc7b2758).
- Netlify is currently **manual CLI deploy**, NOT git-connected. To redeploy:
  `cd react-app && npm run build && netlify deploy --prod --dir=dist`
- `netlify.toml` (repo root) + `react-app/public/_redirects` are set up for git-connected
  continuous deploy IF the user links the repo in the dashboard (base=`react-app`,
  publish=`dist`, NODE_VERSION 20, SPA redirect `/* -> /index.html 200`). Not linked yet.

## Layout / data model

A layout is an array of pieces: `{ id, label, src, x, y, width, height }` in the sheet's
pixel space. Root sheet is **1024×1536**. Pieces are absolutely positioned and dragged via
pointer events; positions autosave to `localStorage`.

- Root `index.html`: `DEFAULT_LAYOUT` + `WOODLAND_CREATURE_VARIANTS` are inline consts.
  localStorage key is **`bearington-sheet-layout-v2`** (bumped from v1 when the layout
  changed; bump again if you change DEFAULT_LAYOUT so stale saves don't override it).
- React app: same data lives in `react-app/src/data.js` (asset paths are `/assets/...`).
  Components: `App.jsx` (router+nav), `BearingtonSheet.jsx`, `LayoutLab.jsx`.

## Current state of `index.html` (root)

- The 14 numbered subcomponent pieces (`01_header`..`14_notes_box`) were **removed**.
  Their PNG files were deleted from `assets/`.
- `index.html` now renders just two pieces: an **`outer`** piece loading `assets/outer.png`
  (box 1024×1280, matches its native 1122×1402 aspect 0.800) and the **`portraitFrame`**
  woodland card (still drives the variant picker + arrows).
- localStorage key is now **`bearington-sheet-layout-v3`**.
- **Transparency done:** `outer.png` and both woodland PNGs now have a real alpha channel —
  the white background was knocked out so lower layers show through. See below.

## Known open items / gotchas

- **Aspect-ratio bug (not yet fixed):** `.piece img` has no `object-fit`, so it defaults to
  `fill` and stretches images to the box's W×H. The **woodland card** box is 500×525
  (aspect 0.95) but the art is 768×1024 (aspect 0.75) → it's squashed ~21% vertically.
  The background `.guide` uses `object-fit: cover` so it is NOT distorted. `outer.jpg` is
  fine (box aspect matches native). Proposed fix: add `object-fit: contain` to `.piece img`
  and/or set the woodland box to 500×667. User was told about this; awaiting go-ahead.
- **React app is OUT OF SYNC with root index.html.** `react-app/src/data.js` still has the
  old 14-piece numbered layout (and its own asset copies in `react-app/public/assets/`).
  NONE of these have been ported there: the `outer.png` piece, the transparency knockout
  (its woodland PNGs are still the old opaque ones; no outer.png), and the woodland
  aspect-ratio fix. The last Netlify deploy therefore still shows the old opaque numbered
  layout. Port + `npm run build` + `netlify deploy --prod --dir=dist` for parity.
- **`layout.json` (root) is stale** — still lists the deleted numbered assets. It's only a
  reference/import file (not auto-loaded by index.html), so it doesn't break anything.

## Assets (`assets/`)

`full-sheet-guide.jpg` (1024×1536, the background guide), `outer.jpg` (1122×1402, the
original opaque source — kept for re-processing), **`outer.png`** (transparent, used by
index.html), `woodland_cleric_card_variant_a.png` / `_b.png` (768×1024, now with alpha).
The numbered 01..14 PNGs were deleted. `react-app/public/assets/` still has its own copies
of everything (numbered PNGs + the OLD opaque woodland PNGs, no outer.png).

### Background-knockout method (transparency)

JPEG has no alpha; the PNGs were exported flat. To make the white background transparent
we ran a **flood-fill-from-edges white knockout** with Jimp (pure JS, reads JPEG+PNG):
load image → flood-fill from every border pixel through connected pixels where R,G,B all
>= 235, setting alpha 0 → feather light fringe pixels adjacent to transparent (kills white
halo). Flood-fill (not global) preserves cream/parchment box interiors (tan, blue<235) that
are enclosed by borders. Script lived at `/tmp/knockout/knockout.js` (scratch, not in repo).
Re-run from `assets/outer.jpg` and the original woodland sources if you need to redo it.

## How to test (no test framework; use headless Chrome)

Chrome is at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. Pattern used:
- Static HTML render check: `chrome --headless --dump-dom "file://.../index.html"` and grep
  the DOM for expected text / `src=` attributes.
- Interaction test: inject a `<script>` (via a temp copy of the file) that runs after mount,
  performs clicks (`.click()`), and writes PASS/FAIL into `document.title`, then read it from
  `--dump-dom`. For the Vite build, serve `npm run preview` and load a same-origin test page
  (cross-origin file://→http:// iframes are blocked).
- JS syntax check: extract the `<script>` and `node --check`.

## Conventions to keep

- Verify changes (headless render + interaction) before declaring done.
- Commit to `main`, mirror to `master`, push both. Only commit/push when asked.
- Don't break the root GitHub Pages site when editing.
