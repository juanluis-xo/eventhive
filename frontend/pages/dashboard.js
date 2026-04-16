import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Ticket, Calendar, User, Settings, LogOut, ChevronRight, QrCode,
  Plus, Loader2, PackageOpen, X, MapPin, Tag, Info, BarChart3,
  Star, MessageSquare, Wallet, Edit2, Trash2, ChevronDown, ChevronUp,
  Building, CreditCard, Save, Image as ImageIcon, Users
} from 'lucide-react';

const PAISES_CIUDADES = {
  'Colombia':     ['Bogotá','Medellín','Cali','Barranquilla','Cartagena','Montería','Bucaramanga','Pereira','Manizales','Santa Marta'],
  'España':       ['Madrid','Barcelona','Valencia','Sevilla','Bilbao','Málaga','Zaragoza','Alicante'],
  'México':       ['Ciudad de México','Guadalajara','Monterrey','Puebla','Cancún','Tijuana'],
  'Argentina':    ['Buenos Aires','Córdoba','Rosario','Mendoza','La Plata'],
  'Chile':        ['Santiago','Valparaíso','Concepción','Antofagasta'],
  'Perú':         ['Lima','Cusco','Arequipa','Trujillo'],
  'Venezuela':    ['Caracas','Maracaibo','Valencia','Barquisimeto'],
  'Ecuador':      ['Quito','Guayaquil','Cuenca','Ambato'],
  'Bolivia':      ['La Paz','Santa Cruz','Cochabamba','Sucre'],
  'Costa Rica':   ['San José','Alajuela','Heredia','Liberia'],
  'Panamá':       ['Ciudad de Panamá','Colón','David'],
  'Estados Unidos':['Miami','New York','Los Angeles','Chicago','Houston'],
  'Remoto':       ['Online'],
};

const EMPTY_CATEGORY = { name: '', price: '', capacity: '' };
const EMPTY_EVENT = {
  title:'', date:'', country:'Colombia', city:'',
  description:'', fullDescription:'', category:'Tecnología',
  price:'0', imageUrl:'',
  categories:[{ ...EMPTY_CATEGORY }]
};

export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab]           = useState('tickets');
  const [user, setUser]                     = useState(null);

  // Datos generales
  const [tickets, setTickets]               = useState([]);
  const [myEvents, setMyEvents]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [eventStats, setEventStats]         = useState([]);

  // Crear evento
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEvent, setNewEvent]             = useState({ ...EMPTY_EVENT, categories:[{ ...EMPTY_CATEGORY }] });
  const [creating, setCreating]             = useState(false);

  // Editar evento
  const [showEditModal, setShowEditModal]   = useState(false);
  const [editForm, setEditForm]             = useState(null);
  const [saving, setSaving]                 = useState(false);

  // Cartera
  const [ticketStats, setTicketStats]       = useState({});
  const [walletForms, setWalletForms]       = useState({});
  const [expandedWallet, setExpandedWallet] = useState(null);
  const [savingWallet, setSavingWallet]     = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) { router.push('/login'); return; }
    const userData = JSON.parse(savedUser);
    setUser(userData);
    // Admin ve cartera por defecto
    if (userData.role === 'admin') setActiveTab('cartera');
    fetchData(userData);
  }, [router]);

  const fetchData = async (userData) => {
    setLoading(true);
    try {
      if (userData.role !== 'admin') {
        const ticketRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/user/${userData.id}`);
        setTickets(await ticketRes.json());
      }

      const eventRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/organizer/${userData.username}`);
      const eventData = await eventRes.json();
      setMyEvents(eventData);

      if (userData.role === 'admin' && eventData.length > 0) {
        // Estadísticas de reseñas
        const eventIds = eventData.map(e => e.id).join(',');
        const statsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reviews/stats?eventIds=${eventIds}`);
        const statsData = await statsRes.json();
        const mergedStats = eventData.map(e => {
          const stat = statsData.find(s => s.eventId === e.id);
          return { ...e, average: stat ? stat.average : 0, reviewCount: stat ? stat.count : 0 };
        }).sort((a, b) => b.average - a.average);
        setEventStats(mergedStats);

        // Estadísticas de tickets para Cartera
        const token = localStorage.getItem('token');
        const statsMap = {};
        const walletMap = {};
        await Promise.all(eventData.map(async (event) => {
          try {
            const tsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/event-stats/${event.id}`);
            statsMap[event.id] = await tsRes.json();
          } catch { statsMap[event.id] = { total: 0, byCategory: {} }; }
          try {
            const wRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/${event.id}/wallet`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            walletMap[event.id] = await wRes.json();
          } catch { walletMap[event.id] = {}; }
        }));
        setTicketStats(statsMap);
        setWalletForms(walletMap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  // ── CREAR EVENTO ──────────────────────────────────────────────────────────
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      const location = newEvent.city ? `${newEvent.city}, ${newEvent.country}` : newEvent.country;
      const minPrice = newEvent.categories.length > 0
        ? Math.min(...newEvent.categories.map(c => parseFloat(c.price) || 0))
        : parseFloat(newEvent.price) || 0;

      const payload = {
        title: newEvent.title, date: newEvent.date, location,
        description: newEvent.description, fullDescription: newEvent.fullDescription,
        category: newEvent.category, price: minPrice,
        organizer: user.username, imageUrl: newEvent.imageUrl || null,
        categories: newEvent.categories.filter(c => c.name && c.price && c.capacity).map(c => ({
          name: c.name, price: parseFloat(c.price), capacity: parseInt(c.capacity)
        }))
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Error al crear el evento');

      setShowCreateModal(false);
      setNewEvent({ ...EMPTY_EVENT, categories:[{ ...EMPTY_CATEGORY }] });
      await fetchData(user);
      setActiveTab('events');
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  // ── EDITAR EVENTO ─────────────────────────────────────────────────────────
  const handleOpenEdit = (event) => {
    const [city='', ...rest] = (event.location || '').split(', ');
    const country = rest.join(', ') || 'Colombia';
    setEditForm({
      ...event,
      country, city,
      imageUrl: event.imageUrl || '',
      categories: event.categories && event.categories.length > 0
        ? event.categories.map(c => ({ name: c.name, price: String(c.price), capacity: String(c.capacity), sold: c.sold || 0 }))
        : [{ ...EMPTY_CATEGORY }]
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const location = editForm.city ? `${editForm.city}, ${editForm.country}` : editForm.country;
      const minPrice = editForm.categories.length > 0
        ? Math.min(...editForm.categories.map(c => parseFloat(c.price) || 0))
        : parseFloat(editForm.price) || 0;

      const payload = {
        title: editForm.title, date: editForm.date, location,
        description: editForm.description, fullDescription: editForm.fullDescription,
        category: editForm.category, price: minPrice,
        organizer: user.username, imageUrl: editForm.imageUrl || null,
        categories: editForm.categories.filter(c => c.name && c.price && c.capacity).map(c => ({
          name: c.name, price: parseFloat(c.price), capacity: parseInt(c.capacity), sold: c.sold || 0
        }))
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/${editForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Error al guardar los cambios');

      setShowEditModal(false);
      setEditForm(null);
      await fetchData(user);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── ELIMINAR EVENTO ───────────────────────────────────────────────────────
  const handleDeleteEvent = async (id) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este evento?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/${id}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) { setMyEvents(myEvents.filter(e => e.id !== id)); }
    } catch (err) { alert('Error al eliminar'); }
  };

  // ── GUARDAR WALLET ────────────────────────────────────────────────────────
  const handleSaveWallet = async (eventId) => {
    setSavingWallet(eventId);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/${eventId}/wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(walletForms[eventId] || {})
      });
      alert('Cuenta guardada correctamente.');
    } catch (err) {
      alert('Error al guardar la cuenta.');
    } finally {
      setSavingWallet(null);
    }
  };

  if (!user) return null;

  // ── FORMULARIO DE EVENTO (compartido por Crear y Editar) ──────────────────
  const EventForm = ({ data, onChange, onCatChange, onAddCat, onRemoveCat, onSubmit, submitting, submitLabel }) => (
    <form onSubmit={onSubmit} className="p-8 max-h-[72vh] overflow-y-auto custom-scrollbar space-y-5">
      {/* Título */}
      <div>
        <label className="form-label">Título del Evento</label>
        <div className="relative">
          <Info className="form-icon" />
          <input type="text" required className="input-field pl-10 bg-slate-50 border-none rounded-2xl py-3.5 font-bold"
            placeholder="Ej: Festival de Música 2026"
            value={data.title} onChange={e => onChange('title', e.target.value)} />
        </div>
      </div>

      {/* Fecha */}
      <div>
        <label className="form-label">Fecha y Hora</label>
        <div className="relative">
          <Calendar className="form-icon" />
          <input type="date" required className="input-field pl-10 bg-slate-50 border-none rounded-2xl py-3.5 font-bold"
            value={data.date} onChange={e => onChange('date', e.target.value)} />
        </div>
      </div>

      {/* País + Ciudad */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">País</label>
          <div className="relative">
            <MapPin className="form-icon" />
            <select className="input-field pl-10 bg-slate-50 border-none rounded-2xl py-3.5 font-bold appearance-none"
              value={data.country}
              onChange={e => { onChange('country', e.target.value); onChange('city', ''); }}>
              {Object.keys(PAISES_CIUDADES).map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="form-label">Ciudad</label>
          <div className="relative">
            <MapPin className="form-icon" />
            <select className="input-field pl-10 bg-slate-50 border-none rounded-2xl py-3.5 font-bold appearance-none"
              value={data.city} onChange={e => onChange('city', e.target.value)}>
              <option value="">Selecciona una ciudad</option>
              {(PAISES_CIUDADES[data.country] || []).map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Imagen */}
      <div>
        <label className="form-label">URL de Imagen del Evento</label>
        <div className="relative">
          <ImageIcon className="form-icon" />
          <input type="url" className="input-field pl-10 bg-slate-50 border-none rounded-2xl py-3.5 font-bold"
            placeholder="https://ejemplo.com/imagen.jpg"
            value={data.imageUrl} onChange={e => onChange('imageUrl', e.target.value)} />
        </div>
        {data.imageUrl && (
          <img src={data.imageUrl} alt="Preview" className="mt-2 w-full h-32 object-cover rounded-xl border border-slate-200" onError={e => e.target.style.display='none'} />
        )}
      </div>

      {/* Categoría del evento + Tipo */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">Tipo de Evento</label>
          <div className="relative">
            <Tag className="form-icon" />
            <select className="input-field pl-10 bg-slate-50 border-none rounded-2xl py-3.5 font-bold appearance-none"
              value={data.category} onChange={e => onChange('category', e.target.value)}>
              {['Tecnología','Música','Diseño','Emprendimiento','Deportes','Culinaria'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Descripciones */}
      <div>
        <label className="form-label">Descripción Corta</label>
        <textarea required rows={2} className="input-field bg-slate-50 border-none rounded-2xl py-3.5 font-bold resize-none w-full"
          placeholder="Resumen breve que aparecerá en la tarjeta..."
          value={data.description} onChange={e => onChange('description', e.target.value)} />
      </div>
      <div>
        <label className="form-label">Descripción Completa</label>
        <textarea required rows={3} className="input-field bg-slate-50 border-none rounded-2xl py-3.5 font-bold resize-none w-full"
          placeholder="Todos los detalles del evento..."
          value={data.fullDescription} onChange={e => onChange('fullDescription', e.target.value)} />
      </div>

      {/* Categorías de tickets */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="form-label mb-0">Categorías de Tickets</label>
          <button type="button" onClick={onAddCat}
            className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700 px-3 py-1.5 bg-primary-50 rounded-xl transition-colors">
            <Plus className="w-3.5 h-3.5" /> Añadir categoría
          </button>
        </div>
        <div className="space-y-3">
          {data.categories.map((cat, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_100px_100px_36px] gap-2 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <input type="text" required placeholder="Nombre (ej: VIP, General)"
                className="input-field bg-white border-none rounded-xl py-2 text-sm font-bold"
                value={cat.name} onChange={e => onCatChange(idx, 'name', e.target.value)} />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">€</span>
                <input type="number" required min="0" step="0.01" placeholder="0.00"
                  className="input-field bg-white border-none rounded-xl py-2 pl-7 text-sm font-bold"
                  value={cat.price} onChange={e => onCatChange(idx, 'price', e.target.value)} />
              </div>
              <div className="relative">
                <Users className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <input type="number" required min="1" placeholder="Cupos"
                  className="input-field bg-white border-none rounded-xl py-2 pl-7 text-sm font-bold"
                  value={cat.capacity} onChange={e => onCatChange(idx, 'capacity', e.target.value)} />
              </div>
              <button type="button" onClick={() => onRemoveCat(idx)}
                disabled={data.categories.length === 1}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-30 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4 pt-2">
        <button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
          className="flex-1 py-4 rounded-2xl font-black text-sm tracking-widest uppercase border-2 border-slate-100 text-slate-400 hover:bg-slate-50">
          Cancelar
        </button>
        <button type="submit" disabled={submitting}
          className="flex-[2] btn-primary py-4 rounded-2xl font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2">
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );

  // ── HELPERS PARA FORMULARIOS ──────────────────────────────────────────────
  const handleNewEventChange = (field, val) => setNewEvent(p => ({ ...p, [field]: val }));
  const handleNewCatChange = (idx, field, val) => setNewEvent(p => {
    const cats = [...p.categories]; cats[idx] = { ...cats[idx], [field]: val }; return { ...p, categories: cats };
  });
  const handleAddNewCat = () => setNewEvent(p => ({ ...p, categories: [...p.categories, { ...EMPTY_CATEGORY }] }));
  const handleRemoveNewCat = (idx) => setNewEvent(p => ({ ...p, categories: p.categories.filter((_, i) => i !== idx) }));

  const handleEditChange = (field, val) => setEditForm(p => ({ ...p, [field]: val }));
  const handleEditCatChange = (idx, field, val) => setEditForm(p => {
    const cats = [...p.categories]; cats[idx] = { ...cats[idx], [field]: val }; return { ...p, categories: cats };
  });
  const handleAddEditCat = () => setEditForm(p => ({ ...p, categories: [...p.categories, { ...EMPTY_CATEGORY }] }));
  const handleRemoveEditCat = (idx) => setEditForm(p => ({ ...p, categories: p.categories.filter((_, i) => i !== idx) }));

  // ── TABS ──────────────────────────────────────────────────────────────────
  const adminTabs = [
    { id: 'cartera',  label: 'Cartera',       icon: Wallet },
    { id: 'events',   label: 'Mis Eventos',   icon: Calendar },
    { id: 'stats',    label: 'Estadísticas',  icon: BarChart3 },
    { id: 'profile',  label: 'Mi Perfil',     icon: User },
    { id: 'settings', label: 'Ajustes',       icon: Settings },
  ];
  const userTabs = [
    { id: 'tickets',  label: 'Mis Tickets',   icon: Ticket },
    { id: 'profile',  label: 'Mi Perfil',     icon: User },
    { id: 'settings', label: 'Ajustes',       icon: Settings },
  ];
  const tabs = user.role === 'admin' ? adminTabs : userTabs;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* ── MODAL CREAR ─────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Crear Nuevo Evento</h2>
                <p className="text-sm text-slate-500 font-medium">Completa todos los detalles del evento.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <EventForm
              data={newEvent} onChange={handleNewEventChange}
              onCatChange={handleNewCatChange} onAddCat={handleAddNewCat} onRemoveCat={handleRemoveNewCat}
              onSubmit={handleCreateEvent} submitting={creating} submitLabel="Publicar Evento"
            />
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR ─────────────────────────────────────────────────── */}
      {showEditModal && editForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Editar Evento</h2>
                <p className="text-sm text-slate-500 font-medium">Modifica los detalles del evento.</p>
              </div>
              <button onClick={() => { setShowEditModal(false); setEditForm(null); }} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <EventForm
              data={editForm} onChange={handleEditChange}
              onCatChange={handleEditCatChange} onAddCat={handleAddEditCat} onRemoveCat={handleRemoveEditCat}
              onSubmit={handleSaveEdit} submitting={saving} submitLabel="Guardar Cambios"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        {/* ── SIDEBAR ───────────────────────────────────────────────────── */}
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
            {tabs.map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all ${
                  activeTab === item.id ? 'bg-primary-600 text-white shadow-xl shadow-primary-600/20' : 'text-slate-500 hover:bg-slate-50 hover:text-primary-600'
                }`}>
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-slate-400'}`} />
                {item.label}
              </button>
            ))}
            <button onClick={handleLogout} className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all mt-4">
              <LogOut className="w-5 h-5" /> Cerrar Sesión
            </button>
          </div>
        </div>

        {/* ── CONTENIDO PRINCIPAL ───────────────────────────────────────── */}
        <div className="flex-1">

          {/* TAB: MIS TICKETS (usuarios normales) */}
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
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 -mr-8 -mt-8 rounded-full blur-2xl" />
                      <div>
                        <div className="flex justify-between items-start mb-6 relative">
                          <span className="px-3 py-1 bg-primary-50 text-primary-700 text-[10px] font-black uppercase tracking-widest rounded-lg border border-primary-100">
                            Ticket Confirmado
                          </span>
                          <span className="text-xs text-slate-400 font-bold font-mono">ID: {ticket.id.toString().padStart(5,'0')}</span>
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-900 mb-2 group-hover:text-primary-600 transition-colors leading-tight">{ticket.event?.title}</h3>
                        <div className="text-sm text-slate-500 font-bold flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-primary-500" /> {ticket.event?.date}
                        </div>
                        {ticket.categoryId && ticket.event?.categories && (
                          <div className="text-xs text-primary-600 font-bold bg-primary-50 px-2 py-1 rounded-lg inline-block mt-1">
                            {ticket.event.categories.find(c => c.id === ticket.categoryId)?.name || 'Categoría'}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-6 border-t border-slate-100 relative mt-4">
                        <div>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Comprado el</p>
                          <p className="text-xs text-slate-600 font-bold">{new Date(ticket.purchaseDate).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'})}</p>
                        </div>
                        <Link href={`/ticket?id=${ticket.id}`} className="flex items-center gap-2 text-sm font-extrabold bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-primary-600 transition-all shadow-lg">
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
                  <p className="text-slate-500 mb-8 max-w-sm mx-auto font-medium">¡Empieza a explorar eventos y compra tu primera entrada!</p>
                  <Link href="/eventos" className="btn-primary py-4 px-10 font-black text-sm tracking-widest uppercase inline-block shadow-xl shadow-primary-600/30">
                    Ir a la cartelera
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* TAB: CARTERA (solo admin) */}
          {activeTab === 'cartera' && user.role === 'admin' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Cartera</h2>
                <p className="text-slate-500 font-medium">Gestiona la venta de tickets y los fondos de cada evento.</p>
              </div>

              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-12 h-12 text-primary-600 animate-spin" /></div>
              ) : myEvents.length > 0 ? (
                <div className="space-y-6">
                  {myEvents.map(event => {
                    const stats = ticketStats[event.id] || { total: 0, byCategory: {} };
                    const cats  = event.categories || [];
                    const totalCapacity = cats.reduce((acc, c) => acc + c.capacity, 0);
                    const totalRevenue  = cats.reduce((acc, c) => acc + (c.sold * parseFloat(c.price)), 0);
                    const wf = walletForms[event.id] || {};
                    const isExpanded = expandedWallet === event.id;

                    return (
                      <div key={event.id} className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        {/* Cabecera evento */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">{event.title}</h3>
                            <div className="flex items-center gap-4 mt-1 text-xs text-slate-400 font-bold">
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{event.date}</span>
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Ingresos totales</p>
                            <p className="text-2xl font-black text-primary-600">{totalRevenue.toLocaleString('es-ES',{style:'currency',currency:'EUR'})}</p>
                          </div>
                        </div>

                        {/* Categorías */}
                        <div className="p-6">
                          {cats.length > 0 ? (
                            <div className="space-y-3">
                              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Tickets por categoría</p>
                              {cats.map(cat => {
                                const pct = cat.capacity > 0 ? Math.round((cat.sold / cat.capacity) * 100) : 0;
                                const remaining = cat.capacity - cat.sold;
                                return (
                                  <div key={cat.id} className="bg-slate-50 rounded-2xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-3">
                                        <span className="font-black text-slate-900 text-sm">{cat.name}</span>
                                        <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-lg">
                                          {Number(cat.price).toLocaleString('es-ES',{style:'currency',currency:'EUR'})}
                                        </span>
                                      </div>
                                      <div className="text-right">
                                        <span className={`text-xs font-black ${remaining === 0 ? 'text-red-600' : 'text-green-600'}`}>
                                          {remaining === 0 ? 'AGOTADO' : `${remaining} disponibles`}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                        style={{ width: `${Math.min(pct,100)}%` }} />
                                    </div>
                                    <div className="flex justify-between mt-1 text-[10px] font-bold text-slate-400">
                                      <span>{cat.sold} vendidos</span>
                                      <span>{cat.capacity} total • {pct}%</span>
                                    </div>
                                  </div>
                                );
                              })}
                              <div className="flex justify-between items-center pt-2 text-sm font-bold text-slate-600 border-t border-slate-100 mt-4">
                                <span>Total general</span>
                                <span>{stats.total} tickets vendidos de {totalCapacity} disponibles</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-slate-400 text-sm font-medium text-center py-4">Este evento no tiene categorías de tickets definidas.</p>
                          )}
                        </div>

                        {/* Cuenta bancaria */}
                        <div className="border-t border-slate-100">
                          <button
                            onClick={() => setExpandedWallet(isExpanded ? null : event.id)}
                            className="w-full p-5 flex items-center justify-between text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <Building className="w-4 h-4 text-primary-600" />
                              <span>Cuenta bancaria de destino</span>
                              {wf.bankName && <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-lg font-black">Configurada</span>}
                            </div>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>

                          {isExpanded && (
                            <div className="p-6 pt-0 space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="form-label">Nombre del Banco</label>
                                  <input type="text" placeholder="Ej: Bancolombia, BBVA..."
                                    className="input-field bg-slate-50 border-none rounded-xl py-2.5 text-sm font-bold w-full"
                                    value={wf.bankName || ''}
                                    onChange={e => setWalletForms(p => ({ ...p, [event.id]: { ...p[event.id], bankName: e.target.value } }))} />
                                </div>
                                <div>
                                  <label className="form-label">Tipo de cuenta</label>
                                  <select className="input-field bg-slate-50 border-none rounded-xl py-2.5 text-sm font-bold w-full appearance-none"
                                    value={wf.accountType || 'savings'}
                                    onChange={e => setWalletForms(p => ({ ...p, [event.id]: { ...p[event.id], accountType: e.target.value } }))}>
                                    <option value="savings">Ahorros</option>
                                    <option value="checking">Corriente</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="form-label">Titular de la cuenta</label>
                                  <input type="text" placeholder="Nombre del titular"
                                    className="input-field bg-slate-50 border-none rounded-xl py-2.5 text-sm font-bold w-full"
                                    value={wf.accountHolder || ''}
                                    onChange={e => setWalletForms(p => ({ ...p, [event.id]: { ...p[event.id], accountHolder: e.target.value } }))} />
                                </div>
                                <div>
                                  <label className="form-label">Número de cuenta</label>
                                  <input type="text" placeholder="Número de cuenta bancaria"
                                    className="input-field bg-slate-50 border-none rounded-xl py-2.5 text-sm font-bold w-full"
                                    value={wf.accountNumber || ''}
                                    onChange={e => setWalletForms(p => ({ ...p, [event.id]: { ...p[event.id], accountNumber: e.target.value } }))} />
                                </div>
                              </div>
                              <button onClick={() => handleSaveWallet(event.id)} disabled={savingWallet === event.id}
                                className="btn-primary py-3 px-8 font-black text-sm rounded-2xl flex items-center gap-2 disabled:opacity-70">
                                {savingWallet === event.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Guardar cuenta
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] p-16 text-center">
                  <Wallet className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-2xl font-black text-slate-900 mb-3">No hay eventos aún</h3>
                  <p className="text-slate-500 mb-8 font-medium">Crea tu primer evento para ver las ventas aquí.</p>
                  <button onClick={() => setShowCreateModal(true)} className="btn-primary py-4 px-10 font-black text-sm uppercase">
                    Crear primer evento
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB: MIS EVENTOS (admin) */}
          {activeTab === 'events' && user.role === 'admin' && (
            <div className="space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Eventos que organizo</h2>
                  <p className="text-slate-500 font-medium">Gestiona y edita tus eventos.</p>
                </div>
                <button onClick={() => setShowCreateModal(true)}
                  className="btn-primary py-3 px-6 flex items-center gap-2 text-sm font-black tracking-widest uppercase shadow-lg">
                  <Plus className="w-5 h-5" /> Crear Evento
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-12 h-12 text-primary-600 animate-spin" /></div>
              ) : myEvents.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {myEvents.map(event => {
                    const cats = event.categories || [];
                    const totalSold = cats.reduce((a, c) => a + c.sold, 0);
                    const totalCap  = cats.reduce((a, c) => a + c.capacity, 0);
                    return (
                      <div key={event.id} className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-xl transition-all group">
                        <div className="flex items-center gap-6 w-full md:w-auto">
                          {event.imageUrl ? (
                            <img src={event.imageUrl} alt={event.title} className="w-20 h-20 object-cover rounded-2xl border border-slate-100 shrink-0" onError={e => e.target.style.display='none'} />
                          ) : (
                            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex flex-col items-center justify-center border border-slate-100 shrink-0">
                              <span className="text-xs font-black text-primary-600 uppercase tracking-tighter">{event.category}</span>
                              <span className="text-lg font-black text-slate-900 leading-none mt-1">€{event.price}</span>
                            </div>
                          )}
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary-600 transition-colors">{event.title}</h3>
                            <div className="flex flex-wrap items-center gap-4 mt-1">
                              <span className="flex items-center gap-1 text-xs font-bold text-slate-400"><Calendar className="w-3.5 h-3.5" />{event.date}</span>
                              <span className="flex items-center gap-1 text-xs font-bold text-slate-400"><MapPin className="w-3.5 h-3.5" />{event.location}</span>
                            </div>
                            {cats.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {cats.map(c => (
                                  <span key={c.id} className="text-[10px] font-black bg-primary-50 text-primary-700 px-2 py-0.5 rounded-lg">
                                    {c.name} · €{c.price} · {c.sold}/{c.capacity}
                                  </span>
                                ))}
                              </div>
                            )}
                            {totalCap > 0 && (
                              <p className="text-[10px] text-slate-400 font-bold mt-1">{totalSold} tickets vendidos de {totalCap}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                          <Link href={`/detalle-evento?id=${event.id}`} className="flex-1 md:flex-none text-center px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                            Ver Detalle
                          </Link>
                          <button onClick={() => handleOpenEdit(event)}
                            className="flex-1 md:flex-none flex items-center justify-center gap-1 text-center px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-all">
                            <Edit2 className="w-3.5 h-3.5" /> Editar
                          </button>
                          <button onClick={() => handleDeleteEvent(event.id)}
                            className="flex-1 md:flex-none flex items-center justify-center gap-1 text-center px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-all">
                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] p-16 text-center">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-6" />
                  <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Crea tu primer evento</h3>
                  <p className="text-slate-500 mb-8 max-w-sm mx-auto font-medium">Empieza hoy y llega a miles de personas en EventHive.</p>
                  <button onClick={() => setShowCreateModal(true)} className="btn-secondary py-4 px-10 font-black text-sm uppercase">
                    Empezar ahora
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB: ESTADÍSTICAS */}
          {activeTab === 'stats' && user.role === 'admin' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Estadísticas de Reseñas</h2>
                <p className="text-slate-500 font-medium">Análisis de rendimiento basado en la opinión de los asistentes.</p>
              </div>
              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-12 h-12 text-primary-600 animate-spin" /></div>
              ) : eventStats.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-primary-600 rounded-[2rem] p-8 text-white shadow-xl shadow-primary-600/20">
                      <p className="text-primary-100 text-xs font-black uppercase tracking-widest mb-2">Promedio Global</p>
                      <div className="flex items-center gap-3">
                        <span className="text-5xl font-black">
                          {(eventStats.reduce((acc,curr) => acc+curr.average,0)/(eventStats.filter(e=>e.reviewCount>0).length||1)).toFixed(1)}
                        </span>
                        <Star className="w-8 h-8 fill-white text-white" />
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
                      <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2">Total Reseñas</p>
                      <div className="flex items-center gap-3">
                        <span className="text-5xl font-black text-slate-900">{eventStats.reduce((acc,curr) => acc+curr.reviewCount,0)}</span>
                        <MessageSquare className="w-8 h-8 text-primary-600" />
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
                      <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2">Eventos Calificados</p>
                      <div className="flex items-center gap-3">
                        <span className="text-5xl font-black text-slate-900">{eventStats.filter(e=>e.reviewCount>0).length}</span>
                        <Calendar className="w-8 h-8 text-primary-600" />
                      </div>
                    </div>
                  </div>
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
                              index===0?'bg-yellow-100 text-yellow-700':index===1?'bg-slate-100 text-slate-600':index===2?'bg-orange-100 text-orange-700':'bg-slate-50 text-slate-400'}`}>
                              {index+1}
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
                                <Star className={`w-4 h-4 ${event.average>0?'text-yellow-400 fill-yellow-400':'text-slate-200'}`} />
                              </div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{event.reviewCount} reseñas</p>
                            </div>
                            <div className="w-32 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
                              <div className={`h-full rounded-full ${event.average>=4?'bg-green-500':event.average>=3?'bg-yellow-500':'bg-red-500'}`}
                                style={{width:`${(event.average/5)*100}%`}} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] p-16 text-center">
                  <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-6" />
                  <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">No hay datos suficientes</h3>
                  <p className="text-slate-500 mb-8 max-w-sm mx-auto font-medium">Tus eventos aún no han recibido reseñas.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: PERFIL / AJUSTES */}
          {(activeTab === 'profile' || activeTab === 'settings') && user && (
            <div className="max-w-2xl bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary-500/5 -mr-24 -mt-24 rounded-full blur-3xl" />
              <h2 className="text-xs font-black text-primary-600 mb-8 uppercase tracking-widest relative">Información de tu Perfil</h2>
              <div className="space-y-8 relative">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Nombre de usuario</label>
                    <input type="text" className="input-field bg-slate-50 font-bold text-slate-900 border-none rounded-2xl py-3.5" defaultValue={user.username} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Rol actual</label>
                    <input type="text" className="input-field bg-slate-50 font-bold text-primary-600 border-none rounded-2xl py-3.5 uppercase text-xs tracking-widest" defaultValue={user.role} readOnly />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Correo electrónico</label>
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

      {/* Estilos auxiliares inline para las etiquetas del formulario */}
      <style jsx global>{`
        .form-label { display: block; font-size: 10px; font-weight: 900; color: #94a3b8; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.1em; }
        .form-icon  { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: #a78bfa; }
      `}</style>
    </div>
  );
}
