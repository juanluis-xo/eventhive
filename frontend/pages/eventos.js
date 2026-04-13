import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import EventCard from '@/components/EventCard';
import { Search, SlidersHorizontal, Loader2, X } from 'lucide-react';

const CATEGORIES = ['Todos', 'Tecnología', 'Música', 'Diseño', 'Emprendimiento', 'Deportes', 'Culinaria'];

export default function Eventos() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState(router.query.q || '');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events`);
        if (!response.ok) throw new Error('Error al cargar eventos');
        const data = await response.json();
        setEvents(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Sincronizar el query param de búsqueda con el input
  useEffect(() => {
    if (router.query.q) setSearchQuery(router.query.q);
    if (router.query.cat) {
      const match = CATEGORIES.find(c => c.toLowerCase() === router.query.cat.toLowerCase());
      if (match) setSelectedCategory(match);
    }
  }, [router.query]);

  // Filtrado combinado: categoría + búsqueda de texto
  const filteredEvents = events.filter((event) => {
    const matchesCategory =
      selectedCategory === 'Todos' ||
      (event.category || '').toLowerCase() === selectedCategory.toLowerCase();

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      (event.title || '').toLowerCase().includes(q) ||
      (event.location || '').toLowerCase().includes(q) ||
      (event.category || '').toLowerCase().includes(q);

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 animate-fade-in-up">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Explorar Eventos</h1>
          <p className="text-slate-500">Encuentra tu próxima experiencia inolvidable.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nombre, ciudad o categoría..."
              className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all shadow-sm outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
            <SlidersHorizontal className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2 no-scrollbar animate-fade-in-up-delay-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === cat
                ? 'bg-primary-600 text-white shadow-md shadow-primary-200 scale-105'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-primary-400 hover:text-primary-600'
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Resultados */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mb-4" />
          <p className="text-slate-500 font-medium text-lg">Cargando eventos increíbles...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl text-center">
          <p className="font-bold mb-1 text-lg">¡Vaya! Algo salió mal</p>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          {/* Contador de resultados */}
          {(searchQuery || selectedCategory !== 'Todos') && (
            <p className="text-sm text-slate-500 mb-4 font-medium">
              {filteredEvents.length} resultado{filteredEvents.length !== 1 ? 's' : ''}
              {searchQuery && <> para <span className="font-bold text-slate-700">"{searchQuery}"</span></>}
              {selectedCategory !== 'Todos' && <> en <span className="font-bold text-slate-700">{selectedCategory}</span></>}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event, i) => (
                <div key={event.id} className={`animate-fade-in-up-delay-${Math.min(i % 4 + 1, 4)}`}>
                  <EventCard event={event} />
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-400 text-4xl mb-4">🔍</p>
                <p className="text-slate-600 font-bold text-lg mb-2">No se encontraron eventos</p>
                <p className="text-slate-400 text-sm">Intenta con otra búsqueda o categoría.</p>
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCategory('Todos'); }}
                  className="mt-6 btn-primary text-sm"
                >
                  Ver todos los eventos
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
