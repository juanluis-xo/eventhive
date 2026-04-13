import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { QrCode, Calendar, MapPin, User, Download, Share2, ArrowLeft, Printer, Loader2 } from 'lucide-react';

export default function TicketPage() {
  const router = useRouter();
  const { id } = router.query;
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!router.isReady) return;

    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(savedUser));

    if (id) {
      console.log('Fetching ticket with ID:', id);
      fetchTicket(id);
    } else {
      console.warn('No ID found in router query');
      setLoading(false);
    }
  }, [id, router.isReady]);

  const fetchTicket = async (ticketId) => {
    setLoading(true);
    try {
      // Usamos /details/ para ser explícitos y evitar problemas de enrutamiento
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/tickets/details/${ticketId}`;
      console.log(`[Frontend] Fetching Ticket ID ${ticketId} from ${apiUrl}`);
      
      const response = await fetch(apiUrl);
      console.log(`[Frontend] Response Status: ${response.status} (${response.statusText})`);
      
      const contentType = response.headers.get("content-type");
      console.log(`[Frontend] Content-Type: ${contentType}`);

      if (!response.ok) {
        let errorMsg = 'Error desconocido';
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } else {
          errorMsg = `Error del servidor (${response.status})`;
        }
        throw new Error(errorMsg);
      }
      
      const data = await response.json();
      console.log('[Frontend] Ticket data received:', data);
      setTicket(data);
    } catch (err) {
      console.error('[Frontend] Error in fetchTicket:', err.message);
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 text-primary-600 animate-spin mb-4" />
        <p className="text-slate-500 font-bold">Generando tu ticket...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <h1 className="text-2xl font-black text-slate-900 mb-4">¡Ups! No encontramos este ticket</h1>
        <Link href="/dashboard" className="btn-primary py-3 px-8">Volver al Dashboard</Link>
      </div>
    );
  }

  const { event } = ticket;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-primary-600 mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Volver a mi dashboard
      </Link>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-2xl">
        {/* Ticket Top */}
        <div className="bg-primary-600 p-8 text-white relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="flex justify-between items-start relative z-10">
             <div>
                <div className="flex items-center gap-2 mb-4 opacity-80">
                   <div className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center font-bold text-xs">E</div>
                   <span className="text-sm font-bold tracking-widest uppercase">EventHive Ticket</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold mb-2">{event.title}</h1>
                <p className="text-primary-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> {event.date}
                </p>
             </div>
             <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-center">
                <span className="block text-[10px] font-bold uppercase tracking-tighter opacity-70">SECCIÓN</span>
                <span className="text-lg font-black italic">PREMIUM</span>
             </div>
          </div>
        </div>

        {/* Ticket Body */}
        <div className="p-8 md:p-12 relative">
           {/* Dashed line for "cut here" effect */}
           <div className="absolute top-0 left-0 w-full flex justify-between px-8 -translate-y-1/2">
              <div className="w-6 h-6 bg-slate-50 border border-slate-200 rounded-full -ml-11" />
              <div className="flex-1 border-t-2 border-dashed border-slate-200/50 mt-3 mx-2" />
              <div className="w-6 h-6 bg-slate-50 border border-slate-200 rounded-full -mr-11" />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              <div className="md:col-span-2 space-y-6">
                 <div className="grid grid-cols-2 gap-6">
                    <div>
                       <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ASISTENTE</span>
                       <p className="font-bold text-slate-900 text-lg flex items-center gap-2">
                         <User className="w-4 h-4 text-primary-600" /> {user?.username}
                       </p>
                    </div>
                    <div>
                       <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nº DE TICKET</span>
                       <p className="font-mono font-bold text-slate-900 text-lg">EH-{new Date(ticket.purchaseDate).getFullYear()}-X{ticket.id.toString().padStart(4, '0')}</p>
                    </div>
                 </div>
                 
                 <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">UBICACIÓN</span>
                    <p className="font-bold text-slate-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary-600" /> {event.location}
                    </p>
                 </div>

                 <div className="pt-6 border-t border-slate-100">
                    <p className="text-xs text-slate-400 leading-relaxed italic">
                      Este ticket es personal e intransferible. Debe presentarse el código QR al ingreso del evento de forma digital o impresa.
                    </p>
                 </div>
              </div>

              <div className="md:col-span-1 flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-100 group">
                 <div className="bg-white p-4 rounded-xl shadow-inner mb-4 group-hover:scale-105 transition-transform duration-500">
                    <QrCode className="w-32 h-32 text-slate-900" />
                 </div>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Escanear al llegar</span>
              </div>
           </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-4 mt-12">
         <button className="btn-secondary py-3 px-8 flex items-center gap-2 font-bold">
            <Download className="w-5 h-5" /> Descargar PDF
         </button>
         <button className="btn-secondary py-3 px-8 flex items-center gap-2 font-bold">
            <Printer className="w-5 h-5" /> Imprimir
         </button>
         <button className="btn-primary py-3 px-8 flex items-center gap-2 font-bold">
            <Share2 className="w-5 h-5" /> Compartir
         </button>
      </div>
    </div>
  );
}
