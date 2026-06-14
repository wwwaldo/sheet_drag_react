# Human + Agent Notes

Practical guidance for working on this project — for whoever (human or AI) picks it up next.
For full project state/architecture see [CLAUDE.md](CLAUDE.md).

---

## Moving the text fields in `outer.svg`

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
