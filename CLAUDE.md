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
- `index.html` now renders just two pieces: an **`outer`** piece loading `assets/outer.jpg`
  (box 1024×1280, matches its native 1122×1402 aspect 0.800) and the **`portraitFrame`**
  woodland card (still drives the variant picker + arrows).

## Known open items / gotchas

- **Aspect-ratio bug (not yet fixed):** `.piece img` has no `object-fit`, so it defaults to
  `fill` and stretches images to the box's W×H. The **woodland card** box is 500×525
  (aspect 0.95) but the art is 768×1024 (aspect 0.75) → it's squashed ~21% vertically.
  The background `.guide` uses `object-fit: cover` so it is NOT distorted. `outer.jpg` is
  fine (box aspect matches native). Proposed fix: add `object-fit: contain` to `.piece img`
  and/or set the woodland box to 500×667. User was told about this; awaiting go-ahead.
- **React app is OUT OF SYNC with root index.html.** `react-app/src/data.js` still has the
  old 14-piece numbered layout (and its own asset copies in `react-app/public/assets/`).
  The `outer.jpg` change and any woodland fix have NOT been ported there. The last Netlify
  deploy therefore still shows the numbered layout. Port + redeploy if the user wants parity.
- **`layout.json` (root) is stale** — still lists the deleted numbered assets. It's only a
  reference/import file (not auto-loaded by index.html), so it doesn't break anything.

## Assets (`assets/`)

`full-sheet-guide.jpg` (1024×1536, the background guide), `outer.jpg` (1122×1402),
`woodland_cleric_card_variant_a.png` / `_b.png` (both 768×1024). The numbered 01..14 PNGs
were deleted. `react-app/public/assets/` still contains its own copies of everything,
including the numbered PNGs.

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
