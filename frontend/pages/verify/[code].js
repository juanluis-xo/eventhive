import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  CheckCircle2, XCircle, Calendar, MapPin,
  Hash, Loader2, ShieldCheck, ShieldX, Tag
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────── */

export default function VerifyTicketPage() {
  const router = useRouter();
  const { code } = router.query;

  const [status, setStatus]   = useState('loading'); // 'loading' | 'valid' | 'invalid' | 'error'
  const [data,   setData]     = useState(null);
  const [errMsg, setErrMsg]   = useState('');

  useEffect(() => {
    if (!router.isReady || !code) return;
    verifyTicket(code);
  }, [router.isReady, code]);

  const verifyTicket = async (ticketCode) => {
    setStatus('loading');
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tickets/verify/${encodeURIComponent(ticketCode)}`
      );
      const json = await res.json();

      if (res.ok && json.valid) {
        setData(json);
        setStatus('valid');
      } else {
        setErrMsg(json.error || 'Ticket no encontrado o inválido.');
        setStatus('invalid');
      }
    } catch (err) {
      setErrMsg('No se pudo conectar con el servidor.');
      setStatus('error');
    }
  };

  /* ── LOADING ── */
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="w-14 h-14 text-primary-500 animate-spin" />
        <p className="text-slate-500 font-semibold text-lg">Verificando ticket…</p>
      </div>
    );
  }

  /* ── VÁLIDO ── */
  if (status === 'valid' && data) {
    const { event, ticket } = data;
    const purchaseDate = new Date(ticket.purchaseDate).toLocaleDateString('es-ES', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50
                      flex items-center justify-center p-4">
        <div className="w-full max-w-md">

          {/* ── Tarjeta principal ── */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-green-100">

            {/* Header verde */}
            <div className="bg-gradient-to-r from-emerald-500 to-green-500
                            px-8 py-8 text-center relative overflow-hidden">
              {/* Círculos decorativos */}
              <div className="absolute -top-8 -left-8 w-32 h-32 bg-white/10 rounded-full" />
              <div className="absolute -bottom-10 -right-6 w-40 h-40 bg-white/10 rounded-full" />

              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-20 h-20
                                bg-white/25 rounded-full mb-4 ring-4 ring-white/40">
                  <CheckCircle2 className="w-11 h-11 text-white" />
                </div>
                <h1 className="text-2xl font-extrabold text-white mb-1">
                  Ticket Verificado
                </h1>
                <p className="text-green-100 text-sm font-medium">
                  Este ticket es válido y auténtico
                </p>
              </div>
            </div>

            {/* Badge VÁLIDO */}
            <div className="flex justify-center -mt-4 relative z-10">
              <span className="inline-flex items-center gap-2 bg-green-500 text-white
                               font-bold text-xs uppercase tracking-widest px-5 py-2
                               rounded-full shadow-lg shadow-green-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                Acceso Permitido
              </span>
            </div>

            {/* Detalles del evento y ticket */}
            <div className="px-7 py-7 space-y-4">

              {/* Nombre del evento */}
              <div className="bg-slate-900 rounded-2xl p-5 text-center">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">
                  Evento
                </p>
                <h2 className="text-white font-extrabold text-lg leading-tight">
                  {event?.title ?? '—'}
                </h2>
              </div>

              {/* Grid de detalles */}
              <div className="grid grid-cols-2 gap-3">

                {/* Código */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Hash className="w-3.5 h-3.5 text-primary-500" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Código
                    </span>
                  </div>
                  <p className="font-mono text-slate-800 font-bold text-sm">{data.code}</p>
                </div>

                {/* Sección */}
                {data.categoryName && (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Tag className="w-3.5 h-3.5 text-primary-500" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Sección
                      </span>
                    </div>
                    <p className="text-slate-800 font-bold text-sm">{data.categoryName}</p>
                  </div>
                )}

                {/* Fecha evento */}
                {event?.date && (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-primary-500" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Fecha evento
                      </span>
                    </div>
                    <p className="text-slate-800 font-bold text-sm">{event.date}</p>
                  </div>
                )}

                {/* Ubicación */}
                {event?.location && (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-primary-500" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Lugar
                      </span>
                    </div>
                    <p className="text-slate-800 font-bold text-sm">{event.location}</p>
                  </div>
                )}
              </div>

              {/* Fecha de compra */}
              <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3
                              flex items-center justify-between">
                <span className="text-green-700 text-xs font-semibold">Fecha de compra</span>
                <span className="text-green-800 text-xs font-bold capitalize">{purchaseDate}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-100 px-7 py-4 text-center">
              <p className="text-slate-400 text-xs italic">
                Verificado por EventHive · Ticket personal e intransferible
              </p>
            </div>
          </div>

          {/* Timestamp */}
          <p className="text-center text-slate-400 text-xs mt-4">
            Verificado el {new Date().toLocaleString('es-ES', {
              day: '2-digit', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })}
          </p>

        </div>
      </div>
    );
  }

  /* ── INVÁLIDO / ERROR ── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-orange-50
                    flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-red-100">

          {/* Header rojo */}
          <div className="bg-gradient-to-r from-red-500 to-rose-500
                          px-8 py-8 text-center relative overflow-hidden">
            <div className="absolute -top-8 -left-8 w-32 h-32 bg-white/10 rounded-full" />
            <div className="absolute -bottom-10 -right-6 w-40 h-40 bg-white/10 rounded-full" />

            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-20 h-20
                              bg-white/25 rounded-full mb-4 ring-4 ring-white/40">
                <XCircle className="w-11 h-11 text-white" />
              </div>
              <h1 className="text-2xl font-extrabold text-white mb-1">
                Ticket No Válido
              </h1>
              <p className="text-red-100 text-sm font-medium">
                No se pudo verificar este ticket
              </p>
            </div>
          </div>

          {/* Badge INVÁLIDO */}
          <div className="flex justify-center -mt-4 relative z-10">
            <span className="inline-flex items-center gap-2 bg-red-500 text-white
                             font-bold text-xs uppercase tracking-widest px-5 py-2
                             rounded-full shadow-lg shadow-red-500/30">
              <ShieldX className="w-3.5 h-3.5" />
              Acceso Denegado
            </span>
          </div>

          <div className="px-7 py-7 space-y-4">
            {/* Código escaneado */}
            {code && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">
                  Código escaneado
                </p>
                <p className="font-mono text-slate-700 font-bold">{code}</p>
              </div>
            )}

            {/* Mensaje de error */}
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-4">
              <p className="text-red-700 text-sm font-medium text-center leading-relaxed">
                {errMsg || 'Este ticket no existe, ha sido cancelado o el código es incorrecto.'}
              </p>
            </div>

            {/* Sugerencia */}
            <p className="text-slate-400 text-xs text-center italic">
              Si crees que es un error, contacta al organizador del evento.
            </p>
          </div>

          <div className="bg-slate-50 border-t border-slate-100 px-7 py-4 text-center">
            <p className="text-slate-400 text-xs italic">
              EventHive · Sistema de Verificación de Tickets
            </p>
          </div>
        </div>

        <div className="flex justify-center mt-5">
          <Link href="/"
            className="text-slate-500 hover:text-slate-700 text-sm font-medium
                       underline underline-offset-2 transition-colors">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
