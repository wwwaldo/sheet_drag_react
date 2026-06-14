import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_LAYOUT,
  SHEET_H,
  SHEET_W,
  STORAGE_KEY,
  WOODLAND_CREATURE_VARIANTS,
  clamp,
  downloadJSON,
  loadInitialLayout,
  normalizeLayout,
} from "./data.js";

function VariantPicker({ variants, value, onChange }) {
  return (
    <div className="variantPicker">
      {variants.map((variant) => (
        <button
          key={variant.src}
          type="button"
          className={"variantOption" + (variant.src === value ? " active" : "")}
          title={variant.label}
          aria-pressed={variant.src === value}
          onClick={() => onChange(variant.src)}
        >
          <img src={variant.src} alt={variant.label} draggable={false} />
          <span>{variant.label}</span>
        </button>
      ))}
    </div>
  );
}

function SheetPiece({ item, selected, showLabels, variants, onVariant, onSelect, onMove, onUpdate }) {
  const dragRef = useRef(null);

  function pointerDown(ev) {
    ev.preventDefault();
    onSelect(item.id);
    dragRef.current = { pointerId: ev.pointerId, sx: ev.clientX, sy: ev.clientY, x: item.x, y: item.y };
    ev.currentTarget.setPointerCapture(ev.pointerId);
  }
  function pointerMove(ev) {
    const d = dragRef.current;
    if (!d || d.pointerId !== ev.pointerId) return;
    const nextX = clamp(Math.round(d.x + ev.clientX - d.sx), 0, SHEET_W - item.width);
    const nextY = clamp(Math.round(d.y + ev.clientY - d.sy), 0, SHEET_H - item.height);
    onMove(item.id, nextX, nextY);
  }
  function pointerUp() {
    dragRef.current = null;
    onUpdate();
  }
  function cycle(dir, ev) {
    ev.preventDefault();
    ev.stopPropagation();
    onVariant(item.id, dir);
  }

  const hasVariants = variants && variants.length > 1;
  const currentVariant = hasVariants ? variants.find((v) => v.src === item.src) : null;
  const stop = (ev) => ev.stopPropagation();

  return (
    <div
      className={"piece" + (selected ? " selected" : "")}
      style={{ left: item.x, top: item.y, width: item.width, height: item.height }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
      title={item.label}
    >
      <img src={item.src} alt={item.label} draggable={false} />
      {showLabels ? <span className="badge">{item.label}</span> : null}
      {hasVariants ? (
        <button type="button" className="arrow left" title="Previous outfit" onPointerDown={stop} onClick={(ev) => cycle(-1, ev)}>
          ‹
        </button>
      ) : null}
      {hasVariants ? (
        <button type="button" className="arrow right" title="Next outfit" onPointerDown={stop} onClick={(ev) => cycle(1, ev)}>
          ›
        </button>
      ) : null}
      {hasVariants && currentVariant ? <span className="outfitTag">{currentVariant.label}</span> : null}
    </div>
  );
}

function Sheet({ layout, setLayout, selectedId, setSelectedId, guideOpacity, showLabels, scale, variantsById, onVariant }) {
  function move(id, x, y) {
    setLayout((prev) => prev.map((it) => (it.id === id ? { ...it, x, y } : it)));
  }
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  }
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  }, [layout]);

  return (
    <div className="stageOuter" style={{ transform: `scale(${scale})` }}>
      <div className="sheet" style={{ width: SHEET_W, height: SHEET_H }} onPointerDown={() => setSelectedId(null)}>
        <img className="guide" src="/assets/full-sheet-guide.jpg" style={{ opacity: guideOpacity }} alt="Full sheet background guide" />
        {layout.map((item) => (
          <SheetPiece
            key={item.id}
            item={item}
            selected={selectedId === item.id}
            showLabels={showLabels}
            variants={variantsById[item.id]}
            onVariant={onVariant}
            onSelect={setSelectedId}
            onMove={move}
            onUpdate={save}
          />
        ))}
      </div>
    </div>
  );
}

export default function BearingtonSheet() {
  const [layout, setLayout] = useState(loadInitialLayout);
  const [selectedId, setSelectedId] = useState(null);
  const [guideOpacity, setGuideOpacity] = useState(0.28);
  const [showLabels, setShowLabels] = useState(true);
  const [scale, setScale] = useState(0.7);

  const selected = layout.find((x) => x.id === selectedId);
  const portrait = layout.find((x) => x.id === "portraitFrame");
  const portraitSrc = portrait ? portrait.src : WOODLAND_CREATURE_VARIANTS[0].src;
  const variantsById = { portraitFrame: WOODLAND_CREATURE_VARIANTS };

  function setVariant(src) {
    setLayout((prev) => prev.map((it) => (it.id === "portraitFrame" ? { ...it, src } : it)));
  }
  function cycleVariant(id, dir) {
    const variants = variantsById[id];
    if (!variants) return;
    setLayout((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const i = variants.findIndex((v) => v.src === it.src);
        const next = variants[((((i < 0 ? 0 : i) + dir) % variants.length) + variants.length) % variants.length];
        return { ...it, src: next.src };
      })
    );
  }
  function reset() {
    setLayout(DEFAULT_LAYOUT.map((x) => ({ ...x })));
    localStorage.removeItem(STORAGE_KEY);
  }
  function patchSelected(patch) {
    if (!selected) return;
    setLayout((prev) => prev.map((it) => (it.id === selected.id ? { ...it, ...patch } : it)));
  }
  function importFile(ev) {
    const file = ev.target.files[0];
    if (!file) return;
    file.text().then((text) => {
      const data = normalizeLayout(JSON.parse(text));
      setLayout(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    });
  }

  return (
    <div className="layout">
      <aside>
        <h2>Bearington Sheet Layout</h2>
        <p className="hint">Drag components inside the Sheet. Positions and sizes autosave to localStorage.</p>
        <div className="row">
          <button onClick={() => downloadJSON("bearington-layout.json", layout)}>Export Layout</button>
          <button onClick={reset}>Reset Layout</button>
          <button onClick={() => localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))}>Save Now</button>
        </div>
        <label>
          Import Layout JSON <input type="file" accept="application/json" onChange={importFile} />
        </label>
        <label>
          Background guide opacity
          <input type="range" min={0} max={1} step={0.01} value={guideOpacity} onChange={(ev) => setGuideOpacity(Number(ev.target.value))} />
        </label>
        <label>
          Canvas zoom
          <input type="range" min={0.25} max={1.25} step={0.05} value={scale} onChange={(ev) => setScale(Number(ev.target.value))} />
        </label>
        <label>
          <input type="checkbox" checked={showLabels} onChange={(ev) => setShowLabels(ev.target.checked)} /> Show labels
        </label>

        <h3>Woodland Creature</h3>
        <p className="hint">Pick the artwork loaded into the portrait frame, or use the ‹ › arrows on the card.</p>
        <VariantPicker variants={WOODLAND_CREATURE_VARIANTS} value={portraitSrc} onChange={setVariant} />

        {selected ? (
          <div>
            <h3>Selected: {selected.label}</h3>
            <div className="resizePanel">
              {["x", "y", "width", "height"].map((key) => (
                <label key={key}>
                  {key}
                  <input type="number" value={selected[key]} onChange={(ev) => patchSelected({ [key]: Number(ev.target.value) })} />
                </label>
              ))}
            </div>
          </div>
        ) : (
          <p className="hint">Select a piece to edit exact x/y/width/height.</p>
        )}

        <h3>Subcomponents</h3>
        {layout.map((item) => (
          <div
            key={item.id}
            className={"layer" + (item.id === selectedId ? " active" : "")}
            onClick={() => setSelectedId(item.id)}
          >
            <strong>{item.label}</strong>
            <button
              onClick={(ev) => {
                ev.stopPropagation();
                setSelectedId(item.id);
              }}
            >
              Select
            </button>
            <div className="coords">{`x:${item.x} y:${item.y} w:${item.width} h:${item.height}`}</div>
          </div>
        ))}
      </aside>
      <main>
        <Sheet
          layout={layout}
          setLayout={setLayout}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          guideOpacity={guideOpacity}
          showLabels={showLabels}
          scale={scale}
          variantsById={variantsById}
          onVariant={cycleVariant}
        />
      </main>
    </div>
  );
}
