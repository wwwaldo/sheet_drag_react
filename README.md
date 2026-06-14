# Bearington Draggable Sheet

Open `index.html` in a browser. It uses React from a CDN, so internet access is needed for the no-build version.

Drag sheet subcomponents around the full-sheet guide. Layout autosaves to localStorage. Export/import layout JSON from the sidebar.

## Layout Lab

`layout-lab.html` is a general-purpose layout library: load any image (PNG/JPG/SVG/WebP),
draw rectangular regions over it, then **segment** it into transparent PNG pieces you can
click, drag, and reposition on screen.

Workflow:
1. **Source image** — load the image you want to slice.
2. **Define regions** — drag on the image to draw a box per region; drag boxes to move,
   use the corner handle to resize, rename them in the sidebar.
3. **Segment** — crops each region into a PNG; switches to Arrange mode.
4. **Arrange** — drag the pieces around (the original sits faintly behind as a guide).

Reusable presets and arrangements:
- **Export/Import preset** — save the set of regions as JSON to reapply to other images.
- **Download PNGs** — save each segmented region as an individual transparent PNG.
- **Export layout** — save the current arrangement (ids/positions/sizes) as JSON.

Live: https://wwwaldo.github.io/sheet_drag_react/layout-lab.html

Files:
- `index.html` — no-build React app (Bearington sheet demo)
- `layout-lab.html` — no-build image-segmentation + drag layout library
- `layout.json` — default layout data
- `assets/` — full sheet guide and component PNGs
