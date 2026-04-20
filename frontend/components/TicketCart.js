/**
 * TicketCart — carrito flotante para compra multi-zona.
 *
 * Props:
 *   items        — [{ zone, quantity }]
 *   onRemove(i)  — eliminar item por índice
 *   onCheckout() — proceder al pago
 *   event        — objeto evento
 */
import { ShoppingCart, Trash2, X, Ticket, ChevronUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export default function TicketCart({ items = [], onRemove, onCheckout, event }) {
  const [open, setOpen] = useState(true);

  const total      = items.reduce((s, i) => s + Number(i.zone.price) * i.quantity, 0);
  const totalQty   = items.reduce((s, i) => s + i.quantity, 0);
  const isEmpty    = items.length === 0;

  if (isEmpty) return null;

  return (
    <div className="sticky top-28">
      <div className="bg-white border-2 border-violet-200 rounded-2xl shadow-xl shadow-violet-100 overflow-hidden">

        {/* Header del carrito */}
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4 bg-violet-600 text-white"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            <span className="font-extrabold">Tu selección</span>
            <span className="bg-white text-violet-700 text-xs font-extrabold rounded-full w-6 h-6 flex items-center justify-center">
              {totalQty}
            </span>
          </div>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {open && (
          <>
            {/* Lista de items */}
            <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.zone.color }} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{item.zone.name}</p>
                      <p className="text-xs text-slate-400">{item.quantity} × ${Number(item.zone.price).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-extrabold text-slate-900">
                      ${(Number(item.zone.price) * item.quantity).toFixed(2)}
                    </span>
                    <button onClick={() => onRemove(i)}
                      className="p-1 text-slate-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total y CTA */}
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-500 text-sm font-medium">Total ({totalQty} {totalQty === 1 ? 'ticket' : 'tickets'})</span>
                <span className="text-2xl font-extrabold text-slate-900">${total.toFixed(2)}</span>
              </div>
              <button
                onClick={onCheckout}
                className="w-full bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white py-3.5 rounded-xl font-extrabold text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/30"
              >
                <Ticket className="w-5 h-5" />
                Proceder al pago →
              </button>
              <p className="text-[10px] text-slate-400 text-center mt-2 font-medium">🔒 Compra 100% segura</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
