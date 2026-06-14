# Human + Agent Notes

Practical guidance for working on this project — for whoever (human or AI) picks it up next.
For full project state/architecture see [CLAUDE.md](CLAUDE.md).

---

## index.html is now an inline editable sheet (not draggable pieces)

`index.html` was rebuilt: instead of the old draggable-PNG-pieces sheet, it renders ONE
inline `<svg>` (viewBox `0 0 1122 1630`) with:
- the clean background art `assets/outer_bg.png` (the transparent knockout extracted from
  `outer.svg`), stretched to fill the viewBox;
- the **character portrait** as an `<image>` placed by the `PORTRAIT = {x,y,w,h}` constant —
  it lives *inside* the SVG and is swapped by the variant picker (`WOODLAND_CREATURE_VARIANTS`);
- **71 editable text fields** as `<foreignObject>` HTML `<input>`s, defined by the `FIELDS`
  array (each `{id,x,y,w,h,label}`). Values + portrait choice autosave to localStorage
  (`bearington-outer-fields-v1`, `bearington-portrait-v1`).

### Repositioning fields / portrait
Two ways:
- **In-browser: Shift+drag** a field to move it (plain click = type). Positions save to
  localStorage `bearington-outer-layout-v1`; "Reset positions" in the sidebar clears them.
  Drag math uses the SVG `getScreenCTM()` so it's correct at any zoom.
- **In code:** edit `index.html` — a field's default `{x,y,w,h}` in the `FIELDS` array, or
  the `PORTRAIT` constant.

### Position precedence (which wins)
`localStorage (per-user drags)` → `field-layout.json (committed site default)` → `FIELDS code defaults`.

### Publishing positions site-wide ("save to website")
localStorage is per-browser, so to make a layout the default for ALL visitors:
1. Drag fields to taste, click **Export positions** in the sidebar → downloads `field-layout.json`
   (every field's current x/y).
2. Commit that file to the repo root and push. On load the page `fetch`es `field-layout.json`
   and uses it as the default layout for any client (overridden only by that client's own drags).
3. **Import positions** loads a JSON back into localStorage to preview before committing.
There is no backend — publishing = committing the file (the "via clood code" loop: user exports,
hands the JSON to an agent, agent commits `field-layout.json` and pushes).
The `FIELDS` array was generated from `outer.svg`'s `<g class="field" data-id data-default-x/y>`
groups (x,y already include the hitbox offset: `x = default-x - 4`, `y = default-y - 22`,
w=270/h=26 typical). The viewBox height is 1630 because the field coords were authored in a
taller space than the 1402-tall embedded PNG; stretching the bg to 1630 realigns them.
Regenerate by re-parsing `outer.svg` if its field layout changes.

## Moving the text fields in `outer.svg` (the standalone interactive file)

(Applies to opening `outer.svg` directly — index.html no longer embeds the interactive svg.)


`assets/outer.svg` is a **self-contained interactive fillable sheet**, not a plain image. It
has an embedded `<script>` (CDATA) that lets you fill and reposition the form fields. Each
field is a `<g class="field" data-id="..." data-default-x="X" data-default-y="Y"
transform="translate(X,Y)">` containing a `.hitbox` rect and `.value` / `.placeholder` text.

### To move fields around (easiest)
1. Open `outer.svg` **directly as its own page** in a web browser (Chrome/Firefox/Safari) —
   e.g. drag the file onto the browser, or File → Open. It must be the top-level document.
2. **Shift + drag** a field to move it. (Plain click + type fills it in.)
3. Positions persist to that browser's `localStorage` under key
   `woodland_outer_sheet_svg_layout_v2` (typed text under `woodland_outer_sheet_svg_text_v2`).

No special program is needed — dragging is built into the SVG.

### Important caveats
- **Top-level only.** On the live site, `index.html` loads the SVG via `<img>`, which
  disables scripts — so dragging only works when you open the `.svg` file directly, not in
  the embedded/deployed view.
- **localStorage ≠ the file.** Dragging saves in your browser only. It does NOT modify
  `outer.svg` on disk, so moves won't show for other people or on the deployed site until
  they're baked into the file.

### To make new positions permanent (bake into the file)
Option A — **text editor (VS Code)**: edit the `data-default-x` / `data-default-y` (and the
matching `transform="translate(x,y)"`) on each `<g class="field">`. Safe; preserves the
script. Tedious but precise.

Option B — **drag-then-bake (recommended)**:
1. Shift-drag all fields in the browser until you like the layout.
2. In DevTools console run: `copy(localStorage.getItem("woodland_outer_sheet_svg_layout_v2"))`
3. Hand that JSON (a map of `data-id -> {x,y}`) to an agent and ask it to bake the values
   into `outer.svg`'s `data-default-x/y` (and transforms) and push.

### What to avoid
**Do not edit `outer.svg` in Inkscape / Illustrator / Figma.** They rewrite and reformat
SVG on save and will likely strip or break the embedded `<script>`/CDATA (and choke on the
~3 MB embedded base64 image), destroying the interactivity. Those tools are fine for static
SVGs — wrong tool for this interactive one.

### Re-running the background knockout
If a card or `outer.svg` ships with an opaque/near-white (or faint baked-in checkerboard)
background, knock it out with the flood-fill-from-edges script documented in CLAUDE.md
(uses Jimp; for the SVG, it extracts/transparentizes/re-embeds the base64 PNG). Threshold
235 catches white and faint near-white checkers; flood-fill-from-edges preserves the
cream/parchment interiors.
