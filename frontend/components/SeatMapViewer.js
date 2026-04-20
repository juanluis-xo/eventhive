/**
 * SeatMapViewer — mapa interactivo para el usuario.
 * Soporta formas: rect | ellipse | polygon
 * Hover con tooltip, clic para añadir al carrito.
 *
 * Props:
 *   zones    — categorías con shape/coords (array)
 *   onSelect — callback({ zone, quantity }) cuando el usuario elige una zona
 */
import { useState, useRef } from 'react';
import { Minus, Plus, ShoppingCart } from 'lucide-react';

const VW = 800;
const VH = 520;

export default function SeatMapViewer({ zones = [], onSelect }) {
  const [hovered, setHovered] = useState(null);
  const [tooltip, setTooltip] = useState(null);   // { x, y, zone }
  const [panel,   setPanel]   = useState(null);   // zona seleccionada
  const [qty, setQty]         = useState(1);
  const svgRef = useRef(null);

  const mappedZones = zones.filter(z => z.shape && z.coords);

  /* ── Tooltip posicionado respecto al contenedor ─────────────────── */
  const handleMouseMove = (e, zone) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, zone });
    setHovered(zone.id);
  };

  const handleClick = (zone) => {
    if ((zone.capacity - (zone.sold || 0)) <= 0) return;
    setPanel(zone);
    setQty(1);
  };

  const handleAdd = () => {
    if (!panel) return;
    onSelect({ zone: panel, quantity: qty });
    setPanel(null);
  };

  if (mappedZones.length === 0) return null;

  /* ── Centroide de cada forma para las etiquetas ─────────────────── */
  const centroid = (zone) => {
    const { shape, coords } = zone;
    if (shape === 'rect')    return { cx: coords.x + coords.w / 2, cy: coords.y + coords.h / 2 };
    if (shape === 'ellipse') return { cx: coords.cx, cy: coords.cy };
    if (shape === 'polygon') {
      const pts = coords.points;
      return {
        cx: pts.reduce((s, p) => s + p[0], 0) / pts.length,
        cy: pts.reduce((s, p) => s + p[1], 0) / pts.length,
      };
    }
    return { cx: 0, cy: 0 };
  };

  /* ── Render de cada zona ─────────────────────────────────────────── */
  const renderZone = (zone) => {
    const available = zone.capacity - (zone.sold || 0);
    const soldOut   = available <= 0;
    const pct       = zone.capacity > 0 ? (zone.sold || 0) / zone.capacity : 0;
    const isHov     = hovered === zone.id;
    const { shape, coords, color } = zone;

    const fill        = soldOut ? '#94a3b8' : color;
    const fillOpacity = soldOut ? 0.35 : isHov ? 0.88 : 0.65;
    const strokeW     = isHov ? 3 : 1.5;

    const commonProps = {
      fill, fillOpacity,
      stroke: fill, strokeWidth: strokeW,
      onMouseMove: e => handleMouseMove(e, zone),
      onMouseLeave: () => { setHovered(null); setTooltip(null); },
      onClick: () => handleClick(zone),
      style: {
        cursor: soldOut ? 'not-allowed' : 'pointer',
        transition: 'fill-opacity 0.15s, stroke-width 0.15s',
      },
    };

    const { cx, cy } = centroid(zone);

    const labels = !soldOut ? (
      <>
        <text x={cx} y={cy - 7} textAnchor="middle" fill="white"
          fontSize={13} fontWeight="700" style={{ pointerEvents: 'none' }}>
          {zone.name}
        </text>
        <text x={cx} y={cy + 11} textAnchor="middle" fill="rgba(255,255,255,0.9)"
          fontSize={11} style={{ pointerEvents: 'none' }}>
          ${Number(zone.price).toFixed(0)} · {available} disp.
        </text>
      </>
    ) : (
      <>
        <text x={cx} y={cy} textAnchor="middle" fill="rgba(255,255,255,0.75)"
          fontSize={12} fontWeight="700" style={{ pointerEvents: 'none' }}>
          {zone.name}
        </text>
        <text x={cx} y={cy + 15} textAnchor="middle" fill="rgba(255,255,255,0.7)"
          fontSize={11} fontWeight="700" style={{ pointerEvents: 'none' }}>
          AGOTADO
        </text>
      </>
    );

    /* ── rect ── */
    if (shape === 'rect') {
      const { x, y, w, h } = coords;
      return (
        <g key={zone.id}>
          <rect x={x} y={y} width={w} height={h} rx={8} {...commonProps} />
          {!soldOut && (
            <rect x={x + 6} y={y + h - 10} width={(w - 12) * (1 - pct)} height={4} rx={2}
              fill="rgba(255,255,255,0.55)" style={{ pointerEvents: 'none' }} />
          )}
          {soldOut && (
            <line x1={x + 10} y1={y + 10} x2={x + w - 10} y2={y + h - 10}
              stroke="rgba(255,255,255,0.45)" strokeWidth={2} strokeDasharray="6,4"
              style={{ pointerEvents: 'none' }} />
          )}
          {labels}
        </g>
      );
    }

    /* ── ellipse ── */
    if (shape === 'ellipse') {
      const { cx: ecx, cy: ecy, rx, ry } = coords;
      const barW = (rx - 6) * 2 * (1 - pct);
      return (
        <g key={zone.id}>
          <ellipse cx={ecx} cy={ecy} rx={rx} ry={ry} {...commonProps} />
          {!soldOut && barW > 0 && (
            <rect x={ecx - barW / 2} y={ecy + ry - 10} width={barW} height={4} rx={2}
              fill="rgba(255,255,255,0.55)" style={{ pointerEvents: 'none' }} />
          )}
          {soldOut && (
            <line x1={ecx - rx + 10} y1={ecy} x2={ecx + rx - 10} y2={ecy}
              stroke="rgba(255,255,255,0.45)" strokeWidth={2} strokeDasharray="6,4"
              style={{ pointerEvents: 'none' }} />
          )}
          {labels}
        </g>
      );
    }

    /* ── polygon ── */
    if (shape === 'polygon') {
      const ptStr = coords.points.map(p => p.join(',')).join(' ');
      return (
        <g key={zone.id}>
          <polygon points={ptStr} {...commonProps} />
          {soldOut && (
            <line x1={cx - 22} y1={cy} x2={cx + 22} y2={cy}
              stroke="rgba(255,255,255,0.45)" strokeWidth={2} strokeDasharray="6,4"
              style={{ pointerEvents: 'none' }} />
          )}
          {labels}
        </g>
      );
    }

    return null;
  };

  /* ══ Render ════════════════════════════════════════════════════ */
  return (
    <div className="relative">

      {/* SVG Map */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-white">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VW} ${VH}`}
          className="w-full"
          style={{ aspectRatio: `${VW}/${VH}` }}
          onMouseLeave={() => { setHovered(null); setTooltip(null); }}
        >
          <defs>
            <pattern id="vgrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(100,116,139,0.07)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width={VW} height={VH} fill="url(#vgrid)" />

          {/* Escenario (posición base, el viewer no sabe dónde lo movió el admin) */}
          <rect x={VW / 2 - 120} y={10} width={240} height={48} rx={10} fill="#1e293b" />
          <text x={VW / 2} y={40} textAnchor="middle" fill="white" fontSize={14} fontWeight="700"
            style={{ pointerEvents: 'none' }}>
            ESCENARIO
          </text>

          {mappedZones.map(z => renderZone(z))}
        </svg>

        {/* Tooltip flotante */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl"
            style={{ left: tooltip.x + 14, top: tooltip.y - 10, transform: 'translateY(-100%)' }}
          >
            <p className="font-bold text-sm mb-0.5">{tooltip.zone.name}</p>
            <p className="text-slate-300">
              Precio: <strong className="text-white">${Number(tooltip.zone.price).toFixed(2)}</strong>
            </p>
            <p className="text-slate-300">
              Disponibles:{' '}
              <strong className="text-white">
                {Math.max(0, tooltip.zone.capacity - (tooltip.zone.sold || 0))}
              </strong>
            </p>
          </div>
        )}
      </div>

      {/* Panel de selección de cantidad */}
      {panel && (() => {
        const available = panel.capacity - (panel.sold || 0);
        const maxQty    = Math.min(available, 10);
        return (
          <div className="mt-4 bg-white border-2 rounded-2xl p-5 shadow-lg"
            style={{ borderColor: panel.color }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-3 h-3 rounded-full" style={{ background: panel.color }} />
                  <h3 className="font-extrabold text-slate-900 text-lg">{panel.name}</h3>
                </div>
                <p className="text-slate-500 text-sm">{available} entradas disponibles</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold" style={{ color: panel.color }}>
                  ${Number(panel.price).toFixed(2)}
                </p>
                <p className="text-xs text-slate-400">por ticket</p>
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 mb-4">
              <span className="text-sm font-bold text-slate-700">Cantidad:</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1}
                  className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-200 transition-colors disabled:opacity-40">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-extrabold text-lg">{qty}</span>
                <button onClick={() => setQty(q => Math.min(maxQty, q + 1))} disabled={qty >= maxQty}
                  className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-200 transition-colors disabled:opacity-40">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4 px-1">
              <span className="text-sm text-slate-500">Subtotal</span>
              <span className="font-extrabold text-slate-900 text-lg">
                ${(Number(panel.price) * qty).toFixed(2)}
              </span>
            </div>

            <div className="flex gap-2">
              <button onClick={handleAdd}
                className="flex-1 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95"
                style={{ background: panel.color }}>
                <ShoppingCart className="w-4 h-4" />
                Añadir al carrito
              </button>
              <button onClick={() => setPanel(null)}
                className="px-4 py-3 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors text-sm font-medium">
                Cancelar
              </button>
            </div>
          </div>
        );
      })()}

      {/* Leyenda */}
      <div className="mt-3 flex flex-wrap gap-2">
        {mappedZones.map(z => {
          const available = z.capacity - (z.sold || 0);
          return (
            <div key={z.id}
              className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-full px-2.5 py-1">
              <span className="w-2.5 h-2.5 rounded-full"
                style={{ background: available > 0 ? z.color : '#94a3b8' }} />
              <span className="text-xs font-semibold text-slate-600">{z.name}</span>
              {available <= 0 && (
                <span className="text-[9px] font-bold text-red-500 uppercase">Agotado</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
