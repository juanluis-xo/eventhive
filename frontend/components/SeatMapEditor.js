/**
 * SeatMapEditor — editor interactivo de zonas para el administrador.
 *
 * Herramientas:
 *   ↖  Seleccionar — arrastra zonas/escenario, redimensiona con esquinas
 *   ▭  Rectángulo  — clic + arrastrar
 *   ◯  Elipse      — clic + arrastrar
 *   ✦  Polígono    — clic para vértices, botón ✓ para cerrar
 *
 * Props:
 *   categories            — array de categorías del evento
 *   onSave({ zones, stage }) — callback al guardar
 *   onClose()             — cerrar editor
 */
import { useState, useRef, useCallback } from 'react';
import { Save, X, Square, Circle, Pen, MousePointer } from 'lucide-react';

const VW = 800;
const VH = 520;
const MIN_SIZE = 20;
const PRESET_COLORS = [
  '#7c3aed', '#2563eb', '#dc2626', '#d97706',
  '#16a34a', '#db2777', '#0891b2', '#65a30d',
  '#9f1239', '#334155',
];

function toSVG(svgEl, clientX, clientY) {
  const rect = svgEl.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * VW,
    y: ((clientY - rect.top) / rect.height) * VH,
  };
}

function normRect(ax, ay, bx, by) {
  return {
    x: Math.min(ax, bx), y: Math.min(ay, by),
    w: Math.abs(bx - ax), h: Math.abs(by - ay),
  };
}

export default function SeatMapEditor({ categories = [], onSave, onClose }) {

  /* ── Estado principal ─────────────────────────────────────────── */
  const [zones, setZones] = useState(() =>
    categories.map(c => ({
      id: c.id, name: c.name, price: c.price, capacity: c.capacity,
      color: c.color || PRESET_COLORS[0],
      shape: c.shape || null,
      coords: c.coords || null,
    }))
  );
  const [stage, setStage] = useState({ x: VW / 2 - 120, y: 10, w: 240, h: 48 });
  const [tool, setTool]   = useState('select');
  const [selected, setSelected] = useState(null);

  /* ── Estado de dibujo ─────────────────────────────────────────── */
  const [drawStart, setDrawStart] = useState(null);
  const [drawEnd,   setDrawEnd]   = useState(null);
  const [polyPoints, setPolyPoints] = useState([]);
  const [polyMouse,  setPolyMouse]  = useState(null);

  /* ── Refs para drag/resize (sin re-render en cada frame) ────────── */
  // { type:'zone'|'stage', id?, origCoords, origStage?, startPt }
  const draggingRef = useRef(null);
  // { id, handle, origCoords, startPt }
  const resizingRef = useRef(null);
  const svgRef      = useRef(null);

  const selectedZone = zones.find(z => z.id === selected) || null;

  /* ── Helpers ──────────────────────────────────────────────────── */
  const getSVGPt  = useCallback(e => toSVG(svgRef.current, e.clientX, e.clientY), []);
  const setZoneProp = useCallback((id, patch) =>
    setZones(zs => zs.map(z => z.id === id ? { ...z, ...patch } : z)), []);
  const removeZoneMap = useCallback(id => {
    setZones(zs => zs.map(z => z.id === id ? { ...z, shape: null, coords: null } : z));
    setSelected(s => s === id ? null : s);
  }, []);
  const changeTool = useCallback(t => {
    setTool(t);
    setDrawStart(null); setDrawEnd(null);
    setPolyPoints([]); setPolyMouse(null);
  }, []);

  /* ══ Handlers SVG ══════════════════════════════════════════════ */

  /** fondo del canvas */
  const onBgDown = useCallback(e => {
    if (!e.target.dataset.bg && e.target !== svgRef.current) return;
    const pt = getSVGPt(e);
    if (tool === 'rect' || tool === 'ellipse') {
      setDrawStart(pt); setDrawEnd(pt);
    } else if (tool === 'select') {
      setSelected(null);
    }
  }, [tool, getSVGPt]);

  /** mousedown en una zona */
  const onZoneDown = useCallback((e, zone) => {
    e.stopPropagation();
    if (tool !== 'select') return;
    setSelected(zone.id);
    const pt = getSVGPt(e);
    const origCoords = zone.shape === 'polygon'
      ? { points: zone.coords.points.map(p => [...p]) }
      : { ...zone.coords };
    draggingRef.current = { type: 'zone', id: zone.id, origCoords, startPt: pt };
  }, [tool, getSVGPt]);

  /** mousedown en el escenario */
  const onStageDown = useCallback(e => {
    e.stopPropagation();
    if (tool !== 'select') return;
    const pt = getSVGPt(e);
    draggingRef.current = { type: 'stage', origStage: { ...stage }, startPt: pt };
  }, [tool, getSVGPt, stage]);

  /** mousedown en handle de resize */
  const onHandleDown = useCallback((e, zone, handle) => {
    e.stopPropagation();
    const pt = getSVGPt(e);
    resizingRef.current = { id: zone.id, handle, origCoords: { ...zone.coords }, startPt: pt };
  }, [getSVGPt]);

  /** mousemove — drag / resize / preview */
  const onMouseMove = useCallback(e => {
    const pt = getSVGPt(e);

    /* drag */
    if (draggingRef.current) {
      const d = draggingRef.current;
      const dx = pt.x - d.startPt.x;
      const dy = pt.y - d.startPt.y;
      if (d.type === 'stage') {
        setStage({ ...d.origStage, x: d.origStage.x + dx, y: d.origStage.y + dy });
      } else {
        setZones(zs => zs.map(z => {
          if (z.id !== d.id) return z;
          if (z.shape === 'rect')
            return { ...z, coords: { ...d.origCoords, x: d.origCoords.x + dx, y: d.origCoords.y + dy } };
          if (z.shape === 'ellipse')
            return { ...z, coords: { ...d.origCoords, cx: d.origCoords.cx + dx, cy: d.origCoords.cy + dy } };
          if (z.shape === 'polygon')
            return { ...z, coords: { points: d.origCoords.points.map(p => [p[0] + dx, p[1] + dy]) } };
          return z;
        }));
      }
      return;
    }

    /* resize */
    if (resizingRef.current) {
      const { id, handle, origCoords: o, startPt } = resizingRef.current;
      const dx = pt.x - startPt.x;
      const dy = pt.y - startPt.y;
      setZones(zs => zs.map(z => {
        if (z.id !== id) return z;
        if (z.shape === 'rect') {
          let { x, y, w, h } = o;
          if (handle === 'se') { w = Math.max(MIN_SIZE, o.w + dx); h = Math.max(MIN_SIZE, o.h + dy); }
          if (handle === 'sw') { x = o.x + dx; w = Math.max(MIN_SIZE, o.w - dx); h = Math.max(MIN_SIZE, o.h + dy); }
          if (handle === 'ne') { y = o.y + dy; w = Math.max(MIN_SIZE, o.w + dx); h = Math.max(MIN_SIZE, o.h - dy); }
          if (handle === 'nw') { x = o.x + dx; y = o.y + dy; w = Math.max(MIN_SIZE, o.w - dx); h = Math.max(MIN_SIZE, o.h - dy); }
          return { ...z, coords: { x, y, w, h } };
        }
        if (z.shape === 'ellipse') {
          const rx = Math.max(10, o.rx + (handle === 'ne' || handle === 'se' ? dx : -dx));
          const ry = Math.max(10, o.ry + (handle === 'se' || handle === 'sw' ? dy : -dy));
          return { ...z, coords: { ...o, rx, ry } };
        }
        return z;
      }));
      return;
    }

    /* preview de dibujo rect/ellipse */
    if (drawStart && (tool === 'rect' || tool === 'ellipse')) setDrawEnd(pt);
    /* preview polígono */
    if (tool === 'polygon' && polyPoints.length > 0) setPolyMouse(pt);
  }, [getSVGPt, drawStart, tool, polyPoints]);

  /** mouseup — confirma forma dibujada */
  const onMouseUp = useCallback(() => {
    if (draggingRef.current) { draggingRef.current = null; return; }
    if (resizingRef.current) { resizingRef.current = null; return; }

    if (drawStart && drawEnd && (tool === 'rect' || tool === 'ellipse')) {
      const r = normRect(drawStart.x, drawStart.y, drawEnd.x, drawEnd.y);
      if (r.w > MIN_SIZE && r.h > MIN_SIZE) {
        const targetId = selected || zones.find(z => !z.coords)?.id;
        if (targetId) {
          const coords = tool === 'rect'
            ? r
            : { cx: r.x + r.w / 2, cy: r.y + r.h / 2, rx: r.w / 2, ry: r.h / 2 };
          setZones(zs => zs.map(z => z.id === targetId ? { ...z, shape: tool, coords } : z));
          setSelected(targetId);
        }
      }
      setDrawStart(null); setDrawEnd(null);
    }
  }, [drawStart, drawEnd, tool, zones, selected]);

  /** click — agrega vértice en modo polígono */
  const onSVGClick = useCallback(e => {
    if (tool !== 'polygon') return;
    if (!e.target.dataset.bg && e.target !== svgRef.current) return;
    setPolyPoints(pts => [...pts, (() => { const p = getSVGPt(e); return [p.x, p.y]; })()]);
  }, [tool, getSVGPt]);

  /** cierra y confirma el polígono */
  const closePolygon = useCallback(() => {
    if (polyPoints.length < 3) return;
    const targetId = selected || zones.find(z => !z.coords)?.id;
    if (targetId) {
      setZones(zs => zs.map(z =>
        z.id === targetId ? { ...z, shape: 'polygon', coords: { points: [...polyPoints] } } : z
      ));
      setSelected(targetId);
    }
    setPolyPoints([]); setPolyMouse(null); setTool('select');
  }, [polyPoints, zones, selected]);

  /* ══ Render de zonas ══════════════════════════════════════════════ */
  const renderZone = zone => {
    if (!zone.shape || !zone.coords) return null;
    const isSel = zone.id === selected;
    const { shape, coords, color } = zone;
    const baseProps = {
      fill: color, fillOpacity: isSel ? 0.88 : 0.65,
      stroke: isSel ? '#fff' : color, strokeWidth: isSel ? 2.5 : 1.5,
      onMouseDown: e => onZoneDown(e, zone),
      style: { cursor: tool === 'select' ? 'move' : 'default', transition: 'fill-opacity 0.12s' },
    };

    let shapeEl = null, labelX, labelY, fs;

    if (shape === 'rect') {
      const { x, y, w, h } = coords;
      labelX = x + w / 2; labelY = y + h / 2; fs = Math.min(13, w / 7);
      shapeEl = <rect x={x} y={y} width={w} height={h} rx={8} {...baseProps} />;
    } else if (shape === 'ellipse') {
      const { cx, cy, rx, ry } = coords;
      labelX = cx; labelY = cy; fs = Math.min(13, rx / 4);
      shapeEl = <ellipse cx={cx} cy={cy} rx={rx} ry={ry} {...baseProps} />;
    } else if (shape === 'polygon') {
      const { points } = coords;
      const ptStr = points.map(p => p.join(',')).join(' ');
      labelX = points.reduce((s, p) => s + p[0], 0) / points.length;
      labelY = points.reduce((s, p) => s + p[1], 0) / points.length;
      fs = 12;
      shapeEl = <polygon points={ptStr} {...baseProps} />;
    }

    if (!shapeEl) return null;

    return (
      <g key={zone.id}>
        {shapeEl}
        {isSel && shape === 'polygon' && (
          <polygon points={coords.points.map(p => p.join(',')).join(' ')}
            fill="none" stroke="white" strokeWidth={1.5} strokeDasharray="5,3"
            style={{ pointerEvents: 'none' }} />
        )}
        <text x={labelX} y={labelY - 5} textAnchor="middle" fill="white"
          fontSize={Math.max(9, fs)} fontWeight="700" style={{ pointerEvents: 'none' }}>
          {zone.name}
        </text>
        <text x={labelX} y={labelY + 12} textAnchor="middle" fill="rgba(255,255,255,0.85)"
          fontSize={Math.max(8, fs - 3)} style={{ pointerEvents: 'none' }}>
          ${Number(zone.price).toFixed(0)} · {zone.capacity}
        </text>
        {isSel && renderHandles(zone)}
      </g>
    );
  };

  const renderHandles = zone => {
    const H = 9;
    let corners = [];
    if (zone.shape === 'rect') {
      const { x, y, w, h } = zone.coords;
      corners = [
        { id: 'nw', hx: x,     hy: y },
        { id: 'ne', hx: x + w, hy: y },
        { id: 'se', hx: x + w, hy: y + h },
        { id: 'sw', hx: x,     hy: y + h },
      ];
    } else if (zone.shape === 'ellipse') {
      const { cx, cy, rx, ry } = zone.coords;
      corners = [
        { id: 'nw', hx: cx - rx, hy: cy - ry },
        { id: 'ne', hx: cx + rx, hy: cy - ry },
        { id: 'se', hx: cx + rx, hy: cy + ry },
        { id: 'sw', hx: cx - rx, hy: cy + ry },
      ];
    }
    return corners.map(c => (
      <rect key={c.id}
        x={c.hx - H / 2} y={c.hy - H / 2} width={H} height={H}
        fill="white" stroke="#7c3aed" strokeWidth={2} rx={2}
        style={{ cursor: `${c.id}-resize`, pointerEvents: 'all' }}
        onMouseDown={e => onHandleDown(e, zone, c.id)}
      />
    ));
  };

  /* ── Preview mientras dibuja ─────────────────────────────────── */
  const renderDrawPreview = () => {
    if (!drawStart || !drawEnd) return null;
    const r = normRect(drawStart.x, drawStart.y, drawEnd.x, drawEnd.y);
    const pp = { fill: '#7c3aed', fillOpacity: 0.22, stroke: '#7c3aed', strokeWidth: 2, strokeDasharray: '6,3', style: { pointerEvents: 'none' } };
    if (tool === 'rect') return <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={8} {...pp} />;
    if (tool === 'ellipse') return <ellipse cx={r.x + r.w / 2} cy={r.y + r.h / 2} rx={r.w / 2} ry={r.h / 2} {...pp} />;
    return null;
  };

  const renderPolyPreview = () => {
    if (tool !== 'polygon' || polyPoints.length === 0) return null;
    const preview = polyMouse ? [...polyPoints, [polyMouse.x, polyMouse.y]] : polyPoints;
    return (
      <>
        {preview.length > 1 && (
          <polyline points={preview.map(p => p.join(',')).join(' ')}
            fill="none" stroke="#7c3aed" strokeWidth={2} strokeDasharray="6,3"
            style={{ pointerEvents: 'none' }} />
        )}
        {polyPoints.length >= 3 && polyMouse && (
          <line x1={polyMouse.x} y1={polyMouse.y} x2={polyPoints[0][0]} y2={polyPoints[0][1]}
            stroke="#7c3aed" strokeWidth={1.5} strokeDasharray="4,4" strokeOpacity={0.4}
            style={{ pointerEvents: 'none' }} />
        )}
        {polyPoints.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={5}
            fill="#7c3aed" stroke="white" strokeWidth={2}
            style={{ pointerEvents: 'none' }} />
        ))}
      </>
    );
  };

  /* ══ Render ════════════════════════════════════════════════════ */
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[96vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-xl font-extrabold text-slate-900">Editor de Mapa de Zonas</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => onSave({ zones, stage })}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-violet-500/20">
              <Save className="w-4 h-4" /> Guardar mapa
            </button>
            <button onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* Barra de herramientas (izquierda) */}
          <div className="w-14 bg-slate-50 border-r border-slate-100 flex flex-col items-center py-4 gap-2 shrink-0">
            {[
              { id: 'select',  Icon: MousePointer, label: 'Seleccionar / mover' },
              { id: 'rect',    Icon: Square,       label: 'Rectángulo' },
              { id: 'ellipse', Icon: Circle,       label: 'Elipse / círculo' },
              { id: 'polygon', Icon: Pen,          label: 'Polígono libre' },
            ].map(({ id, Icon, label }) => (
              <button key={id} title={label} onClick={() => changeTool(id)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  tool === id
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30'
                    : 'text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                }`}>
                <Icon className="w-5 h-5" />
              </button>
            ))}
            {/* Botón cerrar polígono */}
            {tool === 'polygon' && polyPoints.length >= 3 && (
              <button title="Cerrar polígono" onClick={closePolygon}
                className="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center font-black text-lg transition-colors shadow-md">
                ✓
              </button>
            )}
          </div>

          {/* Canvas SVG */}
          <div className="flex-1 overflow-auto bg-slate-100 p-4 flex items-center justify-center">
            <div className="w-full max-w-4xl">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${VW} ${VH}`}
                className="w-full rounded-xl border border-slate-200 shadow bg-white select-none"
                style={{ aspectRatio: `${VW}/${VH}`, cursor: tool === 'select' ? 'default' : 'crosshair' }}
                onMouseDown={onBgDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onClick={onSVGClick}
              >
                <defs>
                  <pattern id="egrid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(100,116,139,0.1)" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width={VW} height={VH} fill="url(#egrid)" data-bg="1" />

                {/* Escenario — arrastrable */}
                <g onMouseDown={onStageDown}
                  style={{ cursor: tool === 'select' ? 'move' : 'default' }}>
                  <rect x={stage.x} y={stage.y} width={stage.w} height={stage.h} rx={10} fill="#1e293b" />
                  <text x={stage.x + stage.w / 2} y={stage.y + stage.h / 2 + 5}
                    textAnchor="middle" fill="white" fontSize={14} fontWeight="700"
                    style={{ pointerEvents: 'none' }}>
                    ESCENARIO
                  </text>
                </g>

                {zones.map(z => renderZone(z))}
                {renderDrawPreview()}
                {renderPolyPreview()}
              </svg>
            </div>
          </div>

          {/* Panel derecho */}
          <div className="w-64 border-l border-slate-100 overflow-y-auto bg-white shrink-0 flex flex-col">
            <div className="p-4 flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Zonas del evento
              </p>
              <div className="space-y-2">
                {zones.map(z => (
                  <div key={z.id}
                    onClick={() => setSelected(z.id === selected ? null : z.id)}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      z.id === selected
                        ? 'border-violet-400 bg-violet-50'
                        : 'border-slate-100 hover:border-violet-200'
                    }`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: z.color }} />
                      <span className="font-bold text-slate-800 text-sm truncate flex-1">{z.name}</span>
                      {!z.coords
                        ? <span className="text-[9px] font-black bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full shrink-0">Sin mapa</span>
                        : <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full shrink-0">{z.shape}</span>
                      }
                    </div>
                    <p className="text-xs text-slate-400 pl-5">${Number(z.price).toFixed(0)} · {z.capacity} cap.</p>
                    {z.coords && (
                      <button onClick={e => { e.stopPropagation(); removeZoneMap(z.id); }}
                        className="mt-1 pl-5 text-[10px] text-red-400 hover:text-red-600 font-semibold">
                        Quitar del mapa
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Editor zona seleccionada */}
            {selectedZone && (
              <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Editar zona</p>
                <div className="space-y-3">

                  {/* Nombre */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Nombre</label>
                    <input
                      className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-medium focus:outline-none focus:border-violet-400 bg-white"
                      value={selectedZone.name}
                      onChange={e => setZoneProp(selected, { name: e.target.value })}
                    />
                  </div>

                  {/* Precio y Capacidad en fila */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">Precio ($)</label>
                      <input
                        type="number" min="0" step="0.01"
                        className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-medium focus:outline-none focus:border-violet-400 bg-white"
                        value={selectedZone.price}
                        onChange={e => setZoneProp(selected, { price: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">Capacidad</label>
                      <input
                        type="number" min="1" step="1"
                        className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-medium focus:outline-none focus:border-violet-400 bg-white"
                        value={selectedZone.capacity}
                        onChange={e => setZoneProp(selected, { capacity: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Color */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1.5">Color</label>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_COLORS.map(c => (
                        <button key={c} onClick={() => setZoneProp(selected, { color: c })}
                          className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-125"
                          style={{
                            background: c,
                            borderColor: selectedZone.color === c ? 'white' : c,
                            outline: selectedZone.color === c ? `2.5px solid ${c}` : 'none',
                            outlineOffset: '1px',
                          }} />
                      ))}
                    </div>
                  </div>

                  {/* Botón quitar del mapa para la zona seleccionada */}
                  {selectedZone.coords && (
                    <button
                      onClick={() => removeZoneMap(selected)}
                      className="w-full mt-1 py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 text-xs font-bold transition-colors"
                    >
                      🗑 Quitar del mapa
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Barra de ayuda */}
        <div className="px-6 py-2.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 font-medium shrink-0">
          {tool === 'select'  && '↖ Clic en una zona para seleccionarla. Arrástrala para moverla. Esquinas blancas = redimensionar.'}
          {tool === 'rect'    && '▭ Selecciona una zona en el panel derecho (o se asignará la primera sin mapa) → clic y arrastra.'}
          {tool === 'ellipse' && '◯ Selecciona una zona → clic y arrastra para dibujar elipse o círculo.'}
          {tool === 'polygon' && (polyPoints.length === 0
            ? '✦ Selecciona una zona → haz clic en el canvas para agregar vértices del polígono.'
            : `✦ ${polyPoints.length} punto${polyPoints.length !== 1 ? 's' : ''} — sigue haciendo clic. Pulsa ✓ para cerrar (mín. 3 puntos).`)}
        </div>
      </div>
    </div>
  );
}
