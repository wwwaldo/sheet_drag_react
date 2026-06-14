import { useRef, useState } from "react";
import { clamp, downloadBlob, downloadJSON } from "./data.js";

const FIT_WIDTH = 860; // px the source preview fits into while drawing
const uid = () => "r" + Math.random().toString(36).slice(2, 8);

function dataURLtoBlob(dataURL) {
  const [head, b64] = dataURL.split(",");
  const mime = head.match(/:(.*?);/)[1];
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// Crop a region (natural-px rect) out of an HTMLImageElement -> transparent PNG data URL
function cropToPNG(img, box) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(box.w));
  c.height = Math.max(1, Math.round(box.h));
  const ctx = c.getContext("2d");
  ctx.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, c.width, c.height);
  return c.toDataURL("image/png");
}

/* ---------------- DEFINE MODE: draw region boxes on the source image ---------------- */
function DefineStage({ img, disp, boxes, setBoxes, selectedId, setSelectedId }) {
  const surfRef = useRef(null);
  const drag = useRef(null);
  const [draft, setDraft] = useState(null);

  const toNat = (ev) => {
    const r = surfRef.current.getBoundingClientRect();
    return {
      x: clamp((ev.clientX - r.left) / disp, 0, img.naturalWidth),
      y: clamp((ev.clientY - r.top) / disp, 0, img.naturalHeight),
    };
  };

  function surfaceDown(ev) {
    if (ev.target !== surfRef.current) return; // clicked a box, not empty space
    ev.preventDefault();
    setSelectedId(null);
    const p = toNat(ev);
    drag.current = { mode: "draw", ox: p.x, oy: p.y };
    surfRef.current.setPointerCapture(ev.pointerId);
    setDraft({ x: p.x, y: p.y, w: 0, h: 0 });
  }
  function boxDown(ev, box, mode) {
    ev.preventDefault();
    ev.stopPropagation();
    setSelectedId(box.id);
    const p = toNat(ev);
    drag.current = { mode, id: box.id, ox: p.x, oy: p.y, start: { ...box } };
    surfRef.current.setPointerCapture(ev.pointerId);
  }
  function move(ev) {
    const d = drag.current;
    if (!d) return;
    const p = toNat(ev);
    if (d.mode === "draw") {
      setDraft({ x: Math.min(d.ox, p.x), y: Math.min(d.oy, p.y), w: Math.abs(p.x - d.ox), h: Math.abs(p.y - d.oy) });
    } else if (d.mode === "moveBox") {
      const dx = p.x - d.ox;
      const dy = p.y - d.oy;
      const nx = clamp(d.start.x + dx, 0, img.naturalWidth - d.start.w);
      const ny = clamp(d.start.y + dy, 0, img.naturalHeight - d.start.h);
      setBoxes((prev) => prev.map((b) => (b.id === d.id ? { ...b, x: nx, y: ny } : b)));
    } else if (d.mode === "resizeBox") {
      const nw = clamp(p.x - d.start.x, 8, img.naturalWidth - d.start.x);
      const nh = clamp(p.y - d.start.y, 8, img.naturalHeight - d.start.y);
      setBoxes((prev) => prev.map((b) => (b.id === d.id ? { ...b, w: nw, h: nh } : b)));
    }
  }
  function up() {
    const d = drag.current;
    drag.current = null;
    if (d && d.mode === "draw" && draft && draft.w > 6 && draft.h > 6) {
      const n = boxes.length + 1;
      const box = {
        id: uid(),
        label: "Region " + n,
        x: Math.round(draft.x),
        y: Math.round(draft.y),
        w: Math.round(draft.w),
        h: Math.round(draft.h),
      };
      setBoxes((prev) => [...prev, box]);
      setSelectedId(box.id);
    }
    setDraft(null);
  }

  const px = (n) => n * disp;
  return (
    <div className="canvasWrap" style={{ width: px(img.naturalWidth), height: px(img.naturalHeight) }}>
      <img className="srcImg" src={img.src} width={px(img.naturalWidth)} height={px(img.naturalHeight)} draggable={false} alt="source" />
      <div
        className="drawSurface"
        ref={surfRef}
        onPointerDown={surfaceDown}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        {boxes.map((b) => (
          <div
            key={b.id}
            className={"box" + (b.id === selectedId ? " selected" : "")}
            style={{ left: px(b.x), top: px(b.y), width: px(b.w), height: px(b.h) }}
            onPointerDown={(ev) => boxDown(ev, b, "moveBox")}
          >
            <span className="tag">{b.label}</span>
            <div className="handle" onPointerDown={(ev) => boxDown(ev, b, "resizeBox")} />
          </div>
        ))}
        {draft ? (
          <div className="box draft" style={{ left: px(draft.x), top: px(draft.y), width: px(draft.w), height: px(draft.h) }} />
        ) : null}
      </div>
    </div>
  );
}

/* ---------------- ARRANGE MODE: drag segmented PNG pieces ---------------- */
function Piece({ item, selected, showLabels, bounds, scale, onSelect, onMove }) {
  const drag = useRef(null);
  function down(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    onSelect(item.id);
    drag.current = { id: ev.pointerId, sx: ev.clientX, sy: ev.clientY, x: item.x, y: item.y };
    ev.currentTarget.setPointerCapture(ev.pointerId);
  }
  function move(ev) {
    const d = drag.current;
    if (!d || d.id !== ev.pointerId) return;
    const nx = clamp(Math.round(d.x + (ev.clientX - d.sx) / scale), 0, bounds.w - item.width);
    const ny = clamp(Math.round(d.y + (ev.clientY - d.sy) / scale), 0, bounds.h - item.height);
    onMove(item.id, nx, ny);
  }
  function up() {
    drag.current = null;
  }
  return (
    <div
      className={"piece" + (selected ? " selected" : "")}
      style={{ left: item.x, top: item.y, width: item.width, height: item.height }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      title={item.label}
    >
      <img src={item.src} alt={item.label} draggable={false} />
      {showLabels ? <span className="badge">{item.label}</span> : null}
    </div>
  );
}

function ArrangeStage({ pieces, setPieces, bounds, scale, ghost, ghostOpacity, showLabels, selectedId, setSelectedId }) {
  function move(id, x, y) {
    setPieces((prev) => prev.map((p) => (p.id === id ? { ...p, x, y } : p)));
  }
  return (
    <div className="stageOuter" style={{ transform: `scale(${scale})` }}>
      <div className="sheet" style={{ width: bounds.w, height: bounds.h }} onPointerDown={() => setSelectedId(null)}>
        {ghost ? <img className="ghost" src={ghost} style={{ opacity: ghostOpacity }} alt="guide" /> : null}
        {pieces.map((p) => (
          <Piece
            key={p.id}
            item={p}
            selected={selectedId === p.id}
            showLabels={showLabels}
            bounds={bounds}
            scale={scale}
            onSelect={setSelectedId}
            onMove={move}
          />
        ))}
      </div>
    </div>
  );
}

export default function LayoutLab() {
  const [img, setImg] = useState(null); // HTMLImageElement (loaded source)
  const [mode, setMode] = useState("define"); // define | arrange
  const [boxes, setBoxes] = useState([]); // regions in natural px
  const [pieces, setPieces] = useState([]); // segmented draggable pieces
  const [selectedId, setSelectedId] = useState(null);
  const [scale, setScale] = useState(0.7);
  const [showLabels, setShowLabels] = useState(true);
  const [ghostOpacity, setGhostOpacity] = useState(0.15);
  const presetInput = useRef(null);

  const disp = img ? Math.min(1, FIT_WIDTH / img.naturalWidth) : 1;
  const bounds = img ? { w: img.naturalWidth, h: img.naturalHeight } : { w: 0, h: 0 };
  const selBox = boxes.find((b) => b.id === selectedId);

  function loadImageSrc(src) {
    const im = new Image();
    im.onload = () => {
      setImg(im);
      setMode("define");
      setPieces([]);
      setSelectedId(null);
    };
    im.src = src;
  }
  function onImageFile(ev) {
    const f = ev.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => loadImageSrc(reader.result);
    reader.readAsDataURL(f); // data URL keeps the canvas untainted so we can export crops
  }
  function onPresetFile(ev) {
    const f = ev.target.files[0];
    if (!f) return;
    f.text()
      .then((t) => {
        const data = JSON.parse(t);
        const arr = Array.isArray(data) ? data : data.boxes;
        setBoxes(arr.map((b) => ({ id: b.id || uid(), label: b.label || "Region", x: b.x, y: b.y, w: b.w, h: b.h })));
        setSelectedId(null);
      })
      .catch(() => alert("Could not read that preset JSON."));
  }

  function segment() {
    if (!img || !boxes.length) return;
    setPieces(boxes.map((b) => ({ id: b.id, label: b.label, src: cropToPNG(img, b), x: b.x, y: b.y, width: b.w, height: b.h })));
    setSelectedId(null);
    setMode("arrange");
  }
  function resetPositions() {
    setPieces((prev) =>
      prev.map((p) => {
        const b = boxes.find((x) => x.id === p.id);
        return b ? { ...p, x: b.x, y: b.y } : p;
      })
    );
  }
  function downloadAllSegments() {
    pieces.forEach((p) => downloadBlob((p.label || p.id).replace(/[^\w.-]+/g, "_") + ".png", dataURLtoBlob(p.src)));
  }
  function patchBox(id, patch) {
    setBoxes((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }
  function deleteBox(id) {
    setBoxes((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  let stage;
  if (!img) {
    stage = <div className="empty">Load a source image to begin.</div>;
  } else if (mode === "define") {
    stage = <DefineStage img={img} disp={disp} boxes={boxes} setBoxes={setBoxes} selectedId={selectedId} setSelectedId={setSelectedId} />;
  } else {
    stage = (
      <ArrangeStage
        pieces={pieces}
        setPieces={setPieces}
        bounds={bounds}
        scale={scale}
        ghost={img.src}
        ghostOpacity={ghostOpacity}
        showLabels={showLabels}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
      />
    );
  }

  return (
    <div className="layout">
      <aside>
        <h2>Layout Lab</h2>
        <p className="hint">Load an image, draw regions over it, then segment it into PNG pieces you can drag around.</p>

        <h3>1 · Source image</h3>
        <label>
          <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={onImageFile} />
        </label>
        {img ? <p className="hint">{`Loaded ${img.naturalWidth}×${img.naturalHeight}px`}</p> : null}

        {img ? (
          <div className="seg">
            <button className={mode === "define" ? "on" : ""} onClick={() => setMode("define")}>
              Define regions
            </button>
            <button className={mode === "arrange" ? "on" : ""} onClick={() => setMode("arrange")} disabled={!pieces.length}>
              Arrange pieces
            </button>
          </div>
        ) : null}

        {img && mode === "define" ? (
          <div>
            <p className="hint">Drag on the image to draw a region. Drag a box to move it, use its corner handle to resize.</p>
            <div className="row">
              <button className="primary" onClick={segment} disabled={!boxes.length}>
                {`Segment into ${boxes.length} piece${boxes.length === 1 ? "" : "s"} →`}
              </button>
              <button
                onClick={() => {
                  setBoxes([]);
                  setSelectedId(null);
                }}
              >
                Clear all
              </button>
            </div>
            <div className="row">
              <button onClick={() => downloadJSON("preset.json", { image: { w: img.naturalWidth, h: img.naturalHeight }, boxes })} disabled={!boxes.length}>
                Export preset
              </button>
              <button onClick={() => presetInput.current.click()}>Import preset</button>
              <input type="file" accept="application/json" ref={presetInput} style={{ display: "none" }} onChange={onPresetFile} />
            </div>
            <h3>{`Regions (${boxes.length})`}</h3>
            {boxes.length ? (
              boxes.map((b) => (
                <div key={b.id} className={"region" + (b.id === selectedId ? " active" : "")} onClick={() => setSelectedId(b.id)}>
                  <input type="text" value={b.label} onChange={(ev) => patchBox(b.id, { label: ev.target.value })} onClick={(ev) => ev.stopPropagation()} />
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setSelectedId(b.id);
                    }}
                  >
                    •
                  </button>
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      deleteBox(b.id);
                    }}
                  >
                    ✕
                  </button>
                  <div className="coords">{`x:${Math.round(b.x)} y:${Math.round(b.y)} w:${Math.round(b.w)} h:${Math.round(b.h)}`}</div>
                </div>
              ))
            ) : (
              <p className="hint">No regions yet.</p>
            )}
          </div>
        ) : null}

        {img && mode === "arrange" ? (
          <div>
            <p className="hint">Drag pieces to reposition. The faint original sits behind as a guide.</p>
            <div className="row">
              <button onClick={resetPositions}>Reset positions</button>
              <button onClick={downloadAllSegments}>Download PNGs</button>
              <button onClick={() => downloadJSON("layout.json", pieces.map(({ src, ...rest }) => rest))}>Export layout</button>
            </div>
            <label>
              {`Zoom ${scale.toFixed(2)}×`}
              <input type="range" min={0.2} max={1.5} step={0.05} value={scale} onChange={(ev) => setScale(Number(ev.target.value))} />
            </label>
            <label>
              Guide opacity
              <input type="range" min={0} max={1} step={0.01} value={ghostOpacity} onChange={(ev) => setGhostOpacity(Number(ev.target.value))} />
            </label>
            <label>
              <input type="checkbox" checked={showLabels} onChange={(ev) => setShowLabels(ev.target.checked)} /> Show labels
            </label>
          </div>
        ) : null}
      </aside>
      <main>{stage}</main>
    </div>
  );
}
