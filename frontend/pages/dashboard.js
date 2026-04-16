import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Ticket, Calendar, User, Settings, LogOut, ChevronRight, QrCode, Plus, Loader2, PackageOpen, X, Image as ImageIcon, MapPin, Tag, Info, BarChart3, Star, MessageSquare } from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('tickets');
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Estado para el nuevo evento
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    location: '',
    description: '',
    fullDescription: '',
    category: 'Tecnología',
    price: '',
  });
  const [creating, setCreating] = useState(false);
  const [eventStats, setEventStats] = useState([]);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      router.push('/login');
      return;
    }
    const userData = JSON.parse(savedUser);
    setUser(userData);

    fetchData(userData);
  }, [router]);

  const fetchData = async (userData) => {
    setLoading(true);
    try {
      // Cargar Tickets
      const ticketRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/user/${userData.id}`);
      const ticketData = await ticketRes.json();
      setTickets(ticketData);

      // Cargar Mis Eventos (Organizados)
      const eventRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/organizer/${userData.username}`);
      const eventData = await eventRes.json();
      setMyEvents(eventData);

      // Cargar Estadísticas (si es admin)
      if (userData.role === 'admin' && eventData.length > 0) {
        const eventIds = eventData.map(e => e.id).join(',');
        const statsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reviews/stats?eventIds=${eventIds}`);
        const statsData = await statsRes.json();
        
        // Combinar datos
        const mergedStats = eventData.map(e => {
          const stat = statsData.find(s => s.eventId === e.id);
          return {
            ...e,
            average: stat ? stat.average : 0,
            reviewCount: stat ? stat.count : 0
          };
        }).sort((a, b) => b.average - a.average); // Ordenar de mejor a peor

        setEventStats(mergedStats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este evento?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setMyEvents(myEvents.filter(e => e.id !== id));
      }
    } catch (err) {
      alert('Error al eliminar');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newEvent,
          organizer: user.username, // El organizador es el usuario logueado
          price: parseFloat(newEvent.price)
        }),
      });

      if (!response.ok) throw new Error('Error al crear el evento');
      
      setShowCreateModal(false);
      setNewEvent({ title: '', date: '', location: '', description: '', fullDescription: '', category: 'Tecnología', price: '' });
      alert('¡Evento creado con éxito!');
      router.push('/eventos'); // Redirigir para ver el nuevo evento
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Modal de Crear Evento */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Crear Nuevo Evento</h2>
                <p className="text-sm text-slate-500 font-medium">Completa los detalles para publicar tu experiencia.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleCreateEvent} className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Título del Evento</label>
                  <div className="relative">
                    <Info className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-500" />
                    <input 
                      type="text" 
                      required
                      className="input-field pl-12 bg-slate-50 border-none rounded-2xl py-3.5 font-bold text-slate-900"
                      placeholder="Ej: Masterclass de React Avanzado"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Fecha y Hora</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-500" />
                    <input 
                      type="text" 
                      required
                      className="input-field pl-12 bg-slate-50 border-none rounded-2xl py-3.5 font-bold text-slate-900"
                      placeholder="15 de Mayo, 18:00h"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Ubicación</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-500" />
                    <input 
                      type="text" 
                      required
                      className="input-field pl-12 bg-slate-50 border-none rounded-2xl py-3.5 font-bold text-slate-900"
                      placeholder="Madrid, España (o Remoto)"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Categoría</label>
                  <div className="relative">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-500" />
                    <select 
                      className="input-field pl-12 bg-slate-50 border-none rounded-2xl py-3.5 font-bold text-slate-900 appearance-none"
                      value={newEvent.category}
                      onChange={(e) => setNewEvent({...newEvent, category: e.target.value})}
                    >
                      <option>Tecnología</option>
                      <option>Música</option>
                      <option>Diseño</option>
                      <option>Emprendimiento</option>
                      <option>Deportes</option>
                      <option>Culinaria</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Precio (€)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-primary-500">€</span>
                    <input 
                      type="number" 
                      required
                      className="input-field pl-10 bg-slate-50 border-none rounded-2xl py-3.5 font-bold text-slate-900"
                      placeholder="0.00"
                      value={newEvent.price}
                      onChange={(e) => setNewEvent({...newEvent, price: e.target.value})}
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Descripción Corta</label>
                  <textarea 
                    required
                    className="input-field bg-slate-50 border-none rounded-2xl py-3.5 font-bold text-slate-900 h-20 resize-none"
                    placeholder="Un resumen rápido que aparecerá en la tarjeta..."
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Descripción Completa</label>
                  <textarea 
                    required
                    className="input-field bg-slate-50 border-none rounded-2xl py-3.5 font-bold text-slate-900 h-32 resize-none"
                    placeholder="Detalla todo lo que los asistentes necesitan saber..."
                    value={newEvent.fullDescription}
                    onChange={(e) => setNewEvent({...newEvent, fullDescription: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="mt-10 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-4 px-6 rounded-2xl font-black text-sm tracking-widest uppercase border-2 border-slate-100 text-slate-400 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={creating}
                  className="flex-[2] btn-primary py-4 px-6 rounded-2xl font-black text-sm tracking-widest uppercase shadow-xl shadow-primary-600/30 flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  Publicar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-72 space-y-2">
          <div className="p-6 mb-6 bg-white border border-slate-200 rounded-[2rem] flex items-center gap-4 shadow-sm">
             <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary-600/20">
               {user.username.charAt(0).toUpperCase()}
             </div>
             <div>
                <h2 className="font-extrabold text-slate-900 leading-tight text-lg">{user.username}</h2>
                <p className="text-xs font-bold text-primary-600 uppercase tracking-widest">{user.role}</p>
             </div>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-[2rem] p-3 shadow-sm space-y-1">
            {[
              { id: 'tickets', label: 'Mis Tickets', icon: Ticket },
              { id: 'events', label: 'Mis Eventos', icon: Calendar, show: user.role === 'admin' },
              { id: 'stats', label: 'Estadísticas', icon: BarChart3, show: user.role === 'admin' },
              { id: 'profile', label: 'Mi Perfil', icon: User },
              { id: 'settings', label: 'Ajustes', icon: Settings },
            ].filter(item => item.show !== false).map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all ${
                  activeTab === item.id 
                    ? 'bg-primary-600 text-white shadow-xl shadow-primary-600/20' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-primary-600'
                }`}
              >
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-slate-400'}`} />
                {item.label}
              </button>
            ))}
            
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all mt-4"
            >
              <LogOut className="w-5 h-5" />
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {activeTab === 'tickets' && (
            <div className="space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Mis Tickets</h2>
                  <p className="text-slate-500 font-medium">Gestiona tus entradas para los próximos eventos.</p>
                </div>
                <Link href="/eventos" className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-primary-600 hover:bg-primary-50 px-4 py-2 rounded-xl transition-all">
                  Explorar más eventos <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm">
                  <Loader2 className="w-12 h-12 text-primary-600 animate-spin mb-4" />
                  <p className="text-slate-500 font-bold">Recuperando tus entradas...</p>
                </div>
              ) : tickets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {tickets.map(ticket => (
                    <div key={ticket.id} className="bg-white border border-slate-200 rounded-[2rem] p-8 flex flex-col justify-between hover:shadow-2xl hover:shadow-slate-200/50 transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 -mr-8 -mt-8 rounded-full blur-2xl group-hover:bg-primary-500/10 transition-colors"></div>
                      <div>
                        <div className="flex justify-between items-start mb-6 relative">
                          <span className="px-3 py-1 bg-primary-50 text-primary-700 text-[10px] font-black uppercase tracking-widest rounded-lg border border-primary-100">
                            Ticket Confirmado
                          </span>
                          <span className="text-xs text-slate-400 font-bold font-mono">ID: {ticket.id.toString().padStart(5, '0')}</span>
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-900 mb-2 group-hover:text-primary-600 transition-colors leading-tight">{ticket.event.title}</h3>
                        <div className="text-sm text-slate-500 font-bold flex items-center gap-2 mb-6">
                          <Calendar className="w-4 h-4 text-primary-500" /> {ticket.event.date}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-6 border-t border-slate-100 relative">
                        <div>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Comprado el</p>
                          <p className="text-xs text-slate-600 font-bold">{new Date(ticket.purchaseDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <Link 
                          href={`/ticket?id=${ticket.id}`} 
                          className="flex items-center gap-2 text-sm font-extrabold bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-primary-600 transition-all shadow-lg shadow-slate-900/10"
                        >
                          <QrCode className="w-4 h-4" /> Ver Ticket
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] p-16 text-center">
                   <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-200/50 border border-slate-100">
                      <PackageOpen className="w-10 h-10 text-slate-300" />
                   </div>
                   <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Aún no tienes tickets</h3>
                   <p className="text-slate-500 mb-8 max-w-sm mx-auto font-medium">Parece que aún no has reservado tu lugar en ningún evento. ¡Es hora de empezar a explorar!</p>
                   <Link href="/eventos" className="btn-primary py-4 px-10 font-black text-sm tracking-widest uppercase inline-block shadow-xl shadow-primary-600/30">
                      Ir a la cartelera
                   </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'events' && (
            <div className="space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Eventos que organizo</h2>
                  <p className="text-slate-500 font-medium">Gestiona y analiza el rendimiento de tus eventos.</p>
                </div>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary py-3 px-6 flex items-center gap-2 text-sm font-black tracking-widest uppercase shadow-lg shadow-primary-600/20"
                >
                   <Plus className="w-5 h-5" /> Crear Evento
                </button>
              </div>
              
              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
                </div>
              ) : myEvents.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {myEvents.map(event => (
                    <div key={event.id} className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-xl transition-all group">
                      <div className="flex items-center gap-6 w-full md:w-auto">
                        <div className="w-20 h-20 bg-slate-50 rounded-2xl flex flex-col items-center justify-center border border-slate-100 group-hover:bg-primary-50 transition-colors">
                          <span className="text-xs font-black text-primary-600 uppercase tracking-tighter">{event.category}</span>
                          <span className="text-lg font-black text-slate-900 leading-none mt-1">€{event.price}</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary-600 transition-colors">{event.title}</h3>
                          <div className="flex flex-wrap items-center gap-4 mt-2">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                              <Calendar className="w-3.5 h-3.5" /> {event.date}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                              <MapPin className="w-3.5 h-3.5" /> {event.location}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                        <Link href={`/detalle-evento?id=${event.id}`} className="flex-1 md:flex-none text-center px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                          Ver Detalle
                        </Link>
                        <button 
                          onClick={() => handleDeleteEvent(event.id)}
                          className="flex-1 md:flex-none text-center px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-all"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] p-16 text-center">
                   <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-200/50 border border-slate-100">
                      <Calendar className="w-10 h-10 text-slate-300" />
                   </div>
                   <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Crea tu primer evento</h3>
                   <p className="text-slate-500 mb-8 max-w-sm mx-auto font-medium">Empieza a organizar hoy mismo y llega a miles de personas apasionadas en EventHive.</p>
                   <button 
                    onClick={() => setShowCreateModal(true)}
                    className="btn-secondary py-4 px-10 font-black text-sm tracking-widest uppercase shadow-lg shadow-slate-200/50 border-slate-200"
                  >
                    Empezar ahora
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Estadísticas de Reseñas</h2>
                  <p className="text-slate-500 font-medium">Análisis de rendimiento basado en la opinión de los asistentes.</p>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
                </div>
              ) : eventStats.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {/* Resumen General */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-primary-600 rounded-[2rem] p-8 text-white shadow-xl shadow-primary-600/20">
                      <p className="text-primary-100 text-xs font-black uppercase tracking-widest mb-2">Promedio Global</p>
                      <div className="flex items-center gap-3">
                        <span className="text-5xl font-black">
                          {(eventStats.reduce((acc, curr) => acc + curr.average, 0) / (eventStats.filter(e => e.reviewCount > 0).length || 1)).toFixed(1)}
                        </span>
                        <Star className="w-8 h-8 fill-white text-white" />
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
                      <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2">Total Reseñas</p>
                      <div className="flex items-center gap-3">
                        <span className="text-5xl font-black text-slate-900">
                          {eventStats.reduce((acc, curr) => acc + curr.reviewCount, 0)}
                        </span>
                        <MessageSquare className="w-8 h-8 text-primary-600" />
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
                      <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2">Eventos Calificados</p>
                      <div className="flex items-center gap-3">
                        <span className="text-5xl font-black text-slate-900">
                          {eventStats.filter(e => e.reviewCount > 0).length}
                        </span>
                        <Calendar className="w-8 h-8 text-primary-600" />
                      </div>
                    </div>
                  </div>

                  {/* Ranking de Eventos */}
                  <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                      <h3 className="font-black text-slate-900 uppercase tracking-wider text-sm">Ranking: Mejor a Peor</h3>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Basado en promedio de estrellas</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {eventStats.map((event, index) => (
                        <div key={event.id} className="px-8 py-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                          <div className="flex items-center gap-6">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${
                              index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                              index === 1 ? 'bg-slate-100 text-slate-600' :
                              index === 2 ? 'bg-orange-100 text-orange-700' :
                              'bg-slate-50 text-slate-400'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 group-hover:text-primary-600 transition-colors">{event.title}</h4>
                              <p className="text-xs text-slate-400 font-medium">{event.date} • {event.category}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-8">
                            <div className="text-right">
                              <div className="flex items-center justify-end gap-1.5 mb-0.5">
                                <span className="font-black text-slate-900">{event.average.toFixed(1)}</span>
                                <Star className={`w-4 h-4 ${event.average > 0 ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`} />
                              </div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{event.reviewCount} reseñas</p>
                            </div>
                            <div className="w-32 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
                              <div 
                                className={`h-full rounded-full ${
                                  event.average >= 4 ? 'bg-green-500' : 
                                  event.average >= 3 ? 'bg-yellow-500' : 
                                  'bg-red-500'
                                }`}
                                style={{ width: `${(event.average / 5) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] p-16 text-center">
                   <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-200/50 border border-slate-100">
                      <BarChart3 className="w-10 h-10 text-slate-300" />
                   </div>
                   <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">No hay datos suficientes</h3>
                   <p className="text-slate-500 mb-8 max-w-sm mx-auto font-medium">Tus eventos aún no han recibido reseñas. ¡Anima a tus asistentes a compartir su experiencia!</p>
                </div>
              )}
            </div>
          )}

          {(activeTab === 'profile' || activeTab === 'settings') && user && (
            <div className="max-w-2xl bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 w-48 h-48 bg-primary-500/5 -mr-24 -mt-24 rounded-full blur-3xl"></div>
               <h2 className="text-xs font-black text-primary-600 mb-8 uppercase tracking-widest relative">Información de tu Perfil</h2>
               <div className="space-y-8 relative">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">NOMBRE DE USUARIO</label>
                      <input type="text" className="input-field bg-slate-50 font-bold text-slate-900 border-none rounded-2xl py-3.5" defaultValue={user.username} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">ROL ACTUAL</label>
                      <input type="text" className="input-field bg-slate-50 font-bold text-primary-600 border-none rounded-2xl py-3.5 uppercase text-xs tracking-widest" defaultValue={user.role} readOnly />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">CORREO ELECTRÓNICO</label>
                    <input type="email" className="input-field bg-slate-50 font-bold text-slate-900 border-none rounded-2xl py-3.5" defaultValue={user.email} />
                  </div>
                  <div className="pt-4">
                    <button className="btn-primary py-4 px-10 font-black text-sm tracking-widest uppercase shadow-xl shadow-primary-600/30">Guardar Cambios</button>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
