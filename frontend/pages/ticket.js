import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Calendar, MapPin, User, Download,
  ArrowLeft, Loader2, CheckCircle2, Clock, Tag, Hash
} from 'lucide-react';

/* ─── Helpers QR ─────────────────────────────────────────────────── */
function buildQrPayload(ticket) {
  const code = ticketCode(ticket);
  const baseUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}`
    : 'http://localhost:3000';
  return `${baseUrl}/verify/${code}`;
}
function buildQrUrl(payload, size = 280) {
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(payload)}&size=${size}x${size}&format=png&margin=12`;
}
function ticketCode(ticket) {
  return `EH-${new Date(ticket.purchaseDate).getFullYear()}-X${ticket.id.toString().padStart(4, '0')}`;
}

/* ─── HTML de un ticket individual para el PDF ───────────────────── */
function singleTicketHTML({ ticket, username, qrSrc, code, purchaseDate, categoryName, isLast }) {
  const { event } = ticket;
  const pageBreak = isLast ? '' : 'page-break-after:always;';

  const blocks = [
    { label: 'ASISTENTE',    value: username,                   mono: false },
    { label: 'Nº DE TICKET', value: code,                        mono: true  },
    { label: 'UBICACIÓN',    value: event.location,             mono: false },
    { label: 'FECHA',        value: event.date,                  mono: false },
    { label: 'COMPRA',       value: purchaseDate,                mono: false },
    { label: 'SECCIÓN',      value: categoryName || 'General',   mono: false },
  ];

  const blockHTMLs = blocks.map(b => `
    <div style="background:#0f172a;border-radius:12px;padding:10px 14px;">
      <div style="font-size:8px;color:#94a3b8;font-weight:700;letter-spacing:2px;
                  text-transform:uppercase;margin-bottom:5px;">${b.label}</div>
      <div style="color:#fff;font-weight:700;font-size:13px;
                  font-family:${b.mono ? 'monospace' : 'inherit'};">${b.value}</div>
    </div>`).join('');

  return `
  <div style="${pageBreak} display:flex;align-items:center;justify-content:center;padding:20px;min-height:100vh;box-sizing:border-box;">
    <div style="width:100%;max-width:620px;background:white;border-radius:20px;
                border:1.5px solid #e2e8f0;overflow:hidden;
                box-shadow:0 20px 60px rgba(0,0,0,.12);">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;
                  padding:28px 30px 24px;position:relative;">
        <div style="position:absolute;top:24px;right:24px;z-index:2;
                    background:rgba(255,255,255,.18);backdrop-filter:blur(8px);
                    border-radius:10px;padding:7px 14px;text-align:center;">
          <span style="font-size:8px;font-weight:700;letter-spacing:2px;
                       text-transform:uppercase;opacity:.7;display:block;">Sección</span>
          <span style="font-size:15px;font-weight:900;font-style:italic;">
            ${(categoryName || 'General').toUpperCase()}
          </span>
        </div>
        <div style="font-size:9px;font-weight:700;letter-spacing:3px;
                    text-transform:uppercase;opacity:.7;margin-bottom:8px;">
          &#9632; EventHive Ticket
        </div>
        <div style="font-size:24px;font-weight:900;line-height:1.2;margin-bottom:6px;">
          ${event.title}
        </div>
        <div style="font-size:13px;color:#ddd6fe;">&#128197; ${event.date}</div>
      </div>

      <!-- Separador -->
      <div style="display:flex;align-items:center;padding:0 20px;">
        <div style="width:18px;height:18px;border-radius:50%;background:#f1f5f9;
                    border:1.5px solid #e2e8f0;flex-shrink:0;"></div>
        <div style="flex:1;border-top:2px dashed #e2e8f0;"></div>
        <div style="width:18px;height:18px;border-radius:50%;background:#f1f5f9;
                    border:1.5px solid #e2e8f0;flex-shrink:0;"></div>
      </div>

      <!-- Body -->
      <div style="padding:24px 28px 20px;">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px;">
          ${blockHTMLs}
        </div>
        <div style="display:flex;align-items:center;justify-content:center;gap:6px;
                    background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;
                    border-radius:999px;padding:6px 18px;font-size:11px;font-weight:700;
                    margin-bottom:20px;width:fit-content;margin-left:auto;margin-right:auto;">
          &#10003; Ticket confirmado &middot; Válido para 1 persona
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;
                    background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:16px;
                    padding:22px 0 18px;margin-bottom:16px;">
          <img src="${qrSrc}" alt="QR"
               style="width:180px;height:180px;border-radius:10px;
                      background:white;padding:8px;border:1px solid #e2e8f0;"/>
          <div style="font-size:9px;font-weight:700;letter-spacing:3px;
                      text-transform:uppercase;color:#94a3b8;margin-top:10px;">
            Escanear al llegar
          </div>
          <div style="font-family:monospace;font-size:9px;color:#cbd5e1;margin-top:3px;">
            ${code}
          </div>
        </div>
        <div style="text-align:center;font-size:9px;color:#94a3b8;
                    font-style:italic;line-height:1.5;padding:0 10px;">
          Este ticket es personal e intransferible.<br/>
          Presenta el código QR al ingreso del evento de forma digital o impresa.
        </div>
      </div>
    </div>
  </div>`;
}

/* ─── HTML completo del PDF (todos los tickets) ─────────────────── */
function buildMultiPrintHTML(ticketsData) {
  // ticketsData: [{ ticket, username, qrSrc, code, purchaseDate, categoryName }]
  const ticketPages = ticketsData.map((d, i) =>
    singleTicketHTML({ ...d, isLast: i === ticketsData.length - 1 })
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Tickets EventHive</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; }
    @media print {
      body { background: white; }
      @page { size: A4 portrait; margin: 10mm; }
    }
  </style>
</head>
<body>
  ${ticketPages}
  <script>
    // Esperar a que todos los QR carguen, luego imprimir
    var imgs = Array.from(document.querySelectorAll('img'));
    var loaded = 0;
    function checkDone() {
      loaded++;
      if (loaded >= imgs.length) {
        setTimeout(function(){ window.print(); window.close(); }, 500);
      }
    }
    if (imgs.length === 0) {
      setTimeout(function(){ window.print(); window.close(); }, 500);
    } else {
      imgs.forEach(function(img) {
        if (img.complete) { checkDone(); }
        else { img.onload = checkDone; img.onerror = checkDone; }
      });
    }
  </script>
</body>
</html>`;
}

/* ─── Componente principal ──────────────────────────────────────── */
export default function TicketPage() {
  const router = useRouter();
  const { id, ids } = router.query;

  const [tickets,  setTickets]  = useState([]);   // array (1 o varios)
  const [loading,  setLoading]  = useState(true);
  const [user,     setUser]     = useState(null);
  const [qrLoaded, setQrLoaded] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    const savedUser = localStorage.getItem('user');
    if (!savedUser) { router.push('/login'); return; }
    setUser(JSON.parse(savedUser));

    if (ids) {
      // Multi-ticket: ids = "1,2,3"
      const idList = ids.split(',').map(s => s.trim()).filter(Boolean);
      fetchMultiple(idList);
    } else if (id) {
      fetchSingle(id);
    } else {
      setLoading(false);
    }
  }, [id, ids, router.isReady]);

  const fetchSingle = async (ticketId) => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/details/${ticketId}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setTickets([await res.json()]);
    } catch (err) {
      console.error('[Ticket]', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMultiple = async (idList) => {
    setLoading(true);
    try {
      const results = await Promise.all(
        idList.map(tid =>
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/details/${tid}`)
            .then(r => r.ok ? r.json() : null)
            .catch(() => null)
        )
      );
      setTickets(results.filter(Boolean));
    } catch (err) {
      console.error('[Tickets]', err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Generar PDF (uno o varios tickets, un ticket por página) ── */
  const handleDownloadPDF = () => {
    if (tickets.length === 0) return;

    const ticketsData = tickets.map(ticket => {
      const code          = ticketCode(ticket);
      const payload       = buildQrPayload(ticket);
      const qrSrc         = buildQrUrl(payload, 400);
      const purchaseDate  = new Date(ticket.purchaseDate).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'long', year: 'numeric'
      });
      const categoryName  =
        ticket.event?.categories?.find(c => c.id === ticket.categoryId)?.name ||
        ticket.zoneLabel ||
        null;
      return { ticket, username: user?.username, qrSrc, code, purchaseDate, categoryName };
    });

    const html = buildMultiPrintHTML(ticketsData);
    const win  = window.open('', '_blank', 'width=700,height=900');
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  /* ── Loading / Error ── */
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="w-12 h-12 text-primary-600 animate-spin mb-4" />
      <p className="text-slate-500 font-bold">Generando tus tickets…</p>
    </div>
  );

  if (tickets.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <h1 className="text-2xl font-black text-slate-900">Ticket no encontrado</h1>
      <Link href="/dashboard" className="btn-primary py-3 px-8">Volver al Dashboard</Link>
    </div>
  );

  /* ── Render cada ticket ── */
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/dashboard"
        className="inline-flex items-center gap-2 text-slate-500 hover:text-primary-600 mb-8 transition-colors font-medium">
        <ArrowLeft className="w-4 h-4" /> Volver a mi dashboard
      </Link>

      {/* Cabecera cuando son múltiples tickets */}
      {tickets.length > 1 && (
        <div className="mb-6 bg-violet-50 border border-violet-200 rounded-2xl px-5 py-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-violet-600 shrink-0" />
          <p className="text-sm font-bold text-violet-800">
            ¡Compra exitosa! Tienes <span className="text-violet-600">{tickets.length} tickets</span> para este evento.
            El PDF incluirá un ticket por página.
          </p>
        </div>
      )}

      {/* Lista de tickets */}
      <div className="space-y-8">
        {tickets.map((ticket, idx) => {
          const { event } = ticket;
          const code         = ticketCode(ticket);
          const purchaseDate = new Date(ticket.purchaseDate).toLocaleDateString('es-ES', {
            day: '2-digit', month: 'long', year: 'numeric'
          });
          const qrUrl        = buildQrUrl(buildQrPayload(ticket));
          const categoryName =
            event.categories?.find(c => c.id === ticket.categoryId)?.name ||
            ticket.zoneLabel ||
            null;

          const infoBlocks = [
            { label: 'ASISTENTE',    value: user?.username,            icon: User,     mono: false },
            { label: 'Nº DE TICKET', value: code,                       icon: Hash,     mono: true  },
            { label: 'UBICACIÓN',    value: event.location,            icon: MapPin,   mono: false },
            { label: 'FECHA',        value: event.date,                 icon: Calendar, mono: false },
            { label: 'COMPRA',       value: purchaseDate,               icon: Clock,    mono: false },
            { label: 'SECCIÓN',      value: categoryName || 'General',  icon: Tag,      mono: false },
          ];

          return (
            <div key={ticket.id} className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-2xl">

              {/* Número si hay varios */}
              {tickets.length > 1 && (
                <div className="bg-slate-100 px-6 py-2 flex items-center gap-2">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Ticket {idx + 1} de {tickets.length}
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="bg-primary-600 px-8 py-7 text-white relative">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl pointer-events-none" />
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-3 opacity-75">
                      <div className="w-5 h-5 bg-white/25 rounded flex items-center justify-center font-bold text-[10px]">E</div>
                      <span className="text-xs font-bold tracking-widest uppercase">EventHive Ticket</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold leading-tight mb-1">{event.title}</h1>
                    <p className="text-primary-200 text-sm flex items-center gap-1.5 mt-2">
                      <Calendar className="w-3.5 h-3.5" /> {event.date}
                    </p>
                  </div>
                  <div className="shrink-0 bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-center">
                    <span className="block text-[9px] font-bold uppercase tracking-widest opacity-70 mb-0.5">Sección</span>
                    <span className="text-base font-black italic">{(categoryName || 'General').toUpperCase()}</span>
                  </div>
                </div>
              </div>

              {/* Separador perforado */}
              <div className="relative flex items-center px-6">
                <div className="w-5 h-5 bg-slate-100 border border-slate-200 rounded-full -ml-8 shrink-0" />
                <div className="flex-1 border-t-2 border-dashed border-slate-200 mx-1" />
                <div className="w-5 h-5 bg-slate-100 border border-slate-200 rounded-full -mr-8 shrink-0" />
              </div>

              {/* Body */}
              <div className="px-8 py-8">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-7">
                  {infoBlocks.map(({ label, value, icon: Icon, mono }) => (
                    <div key={label} className="bg-slate-900 rounded-xl px-4 py-3 flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                        <span className={`text-white font-bold text-sm leading-tight ${mono ? 'font-mono' : ''}`}>
                          {value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center mb-7">
                  <span className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-1.5 rounded-full text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ticket confirmado · Válido para 1 persona
                  </span>
                </div>

                <div className="flex flex-col items-center bg-slate-50 rounded-2xl border border-slate-100 py-8 px-6">
                  <div className="relative bg-white p-3 rounded-xl shadow-inner mb-3">
                    {!qrLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white">
                        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                      </div>
                    )}
                    <img
                      src={qrUrl}
                      alt={`QR ${code}`}
                      width={200} height={200}
                      className={`w-48 h-48 transition-opacity duration-300 ${qrLoaded ? 'opacity-100' : 'opacity-0'}`}
                      onLoad={() => setQrLoaded(true)}
                      onError={() => setQrLoaded(true)}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                    Escanear al llegar
                  </span>
                  <span className="text-[10px] font-mono text-slate-300">{code}</span>
                </div>

                <p className="text-center text-[10px] text-slate-400 mt-5 italic leading-relaxed">
                  Este ticket es personal e intransferible. Presenta el código QR al ingreso del evento de forma digital o impresa.
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Botón descargar PDF */}
      <div className="flex justify-center mt-10">
        <button
          onClick={handleDownloadPDF}
          disabled={!qrLoaded}
          className="btn-primary py-3.5 px-10 flex items-center gap-3 font-bold text-base shadow-xl shadow-primary-600/25 disabled:opacity-60 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all"
        >
          <Download className="w-5 h-5" />
          {!qrLoaded
            ? 'Cargando QR…'
            : tickets.length > 1
              ? `Descargar ${tickets.length} Tickets (PDF)`
              : 'Descargar Ticket (PDF)'
          }
        </button>
      </div>

      <p className="text-center text-xs text-slate-400 mt-3">
        Se abrirá una ventana — elige{' '}
        <span className="font-bold text-slate-500">Guardar como PDF</span> como destino.
        {tickets.length > 1 && (
          <span className="block mt-1 text-violet-500 font-semibold">
            Cada ticket ocupará una página del PDF.
          </span>
        )}
      </p>
    </div>
  );
}
