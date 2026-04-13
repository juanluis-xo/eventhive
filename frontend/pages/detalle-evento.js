import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Ticket, Shield, Share2, Heart, ArrowLeft, Users, Loader2, CheckCircle, Star, MessageSquare, BarChart3 } from 'lucide-react';

export default function DetalleEvento() {
  const router = useRouter();
  const { id } = router.query;
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  // Estados para reseñas
  const [reviewsData, setReviewsData] = useState({ count: 0, average: 0, reviews: [] });
  const [reviewLoading, setReviewLoading] = useState(true);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [sendingReview, setSendingReview] = useState(false);

  // Estados para estadísticas del organizador
  const [organizerStats, setOrganizerStats] = useState([]);
  const [organizerLoading, setOrganizerLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        // Cargar Evento
        const eventResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/${id}`);
        if (!eventResponse.ok) throw new Error('Evento no encontrado');
        const eventData = await eventResponse.json();
        setEvent(eventData);

        // Una vez tenemos el evento, cargamos las estadísticas del organizador
        fetchOrganizerStats(eventData.organizer);

        // Cargar Reseñas
        fetchReviews();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const fetchOrganizerStats = async (username) => {
    setOrganizerLoading(true);
    try {
      // 1. Obtener todos los eventos del organizador
      const eventRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/organizer/${username}`);
      const eventData = await eventRes.json();

      if (eventData.length > 0) {
        // 2. Obtener estadísticas de reseñas para esos eventos
        const eventIds = eventData.map(e => e.id).join(',');
        const statsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reviews/stats?eventIds=${eventIds}`);
        const statsData = await statsRes.json();
        
        // 3. Combinar y ordenar
        const merged = eventData.map(e => {
          const stat = statsData.find(s => s.eventId === e.id);
          return {
            ...e,
            average: stat ? stat.average : 0,
            reviewCount: stat ? stat.count : 0
          };
        }).sort((a, b) => b.average - a.average);

        setOrganizerStats(merged);
      }
    } catch (err) {
      console.error('Error loading organizer stats:', err);
    } finally {
      setOrganizerLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reviews/event/${id}`);
      if (response.ok) {
        const data = await response.json();
        setReviewsData(data);
      }
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleBuyTicket = async () => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      router.push('/login');
      return;
    }

    // Redirigir a la nueva página de pago
    router.push({
      pathname: '/payment',
      query: { 
        eventId: event.id,
        price: event.price,
        title: event.title
      }
    });
  };

  const handlePostReview = async (e) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }

    setSendingReview(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          username: user.username,
          eventId: parseInt(id),
          rating: newReview.rating,
          comment: newReview.comment
        }),
      });

      if (!response.ok) throw new Error('Error al enviar la reseña');
      
      setNewReview({ rating: 5, comment: '' });
      fetchReviews(); // Recargar reseñas
      alert('¡Gracias por tu opinión!');
    } catch (err) {
      alert(err.message);
    } finally {
      setSendingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-20 bg-slate-50">
        <Loader2 className="w-16 h-16 text-primary-600 animate-spin mb-6" />
        <p className="text-slate-600 font-bold text-xl">Preparando los detalles del evento...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">¡Ops! El evento no está disponible</h1>
        <p className="text-slate-500 mb-8 text-lg">Es posible que el evento haya sido cancelado o que el enlace sea incorrecto.</p>
        <Link href="/eventos" className="btn-primary px-8 py-3 font-bold inline-flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" />
          Volver a la cartelera
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Header / Hero */}
      <div className="relative h-[400px] md:h-[500px] overflow-hidden">
        <div className="absolute inset-0 bg-slate-900">
           <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10" />
           <div className="absolute inset-0 bg-primary-600/30 blur-3xl opacity-50" />
        </div>
        
        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-full max-w-7xl px-4 z-20">
           <Link href="/eventos" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 backdrop-blur-md bg-white/10 px-4 py-2 rounded-full transition-all font-medium">
             <ArrowLeft className="w-4 h-4" />
             Volver a eventos
           </Link>
        </div>

        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-7xl px-4 z-20">
          <div className="inline-block bg-primary-600 px-3 py-1 rounded-full text-xs font-bold text-white mb-4 tracking-wider uppercase shadow-lg shadow-primary-600/20">
            {event.category}
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 max-w-4xl tracking-tight leading-tight">
            {event.title}
          </h1>
          <div className="flex flex-wrap items-center gap-6 text-white/90">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-400" />
              <span className="font-semibold text-lg">{event.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary-400" />
              <span className="font-semibold text-lg">{event.location}</span>
            </div>
            {reviewsData.count > 0 && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <span className="font-bold text-lg">{reviewsData.average}</span>
                <span className="text-sm opacity-70">({reviewsData.count} reseñas)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <span className="w-1.5 h-8 bg-primary-600 rounded-full"></span>
                Sobre este evento
              </h2>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed text-lg">
                <p className="mb-6">{event.fullDescription}</p>
                <div className="bg-primary-50 border-l-4 border-primary-500 p-6 rounded-r-2xl">
                  <p className="text-primary-900 font-medium italic">"No te pierdas esta oportunidad única de aprender, conectar y crecer profesionalmente. Las plazas son limitadas y se asignarán por orden de inscripción."</p>
                </div>
              </div>
            </section>
            
            <section className="bg-slate-50 rounded-3xl p-8 border border-slate-200">
               <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                 <Users className="w-5 h-5 text-primary-600" />
                 Organizador
               </h3>
               <div className="flex items-center gap-4">
                 <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center font-extrabold text-primary-600 text-2xl shadow-sm">
                    {event.organizer.charAt(0)}
                 </div>
                 <div>
                    <h4 className="font-bold text-slate-900 text-lg">{event.organizer}</h4>
                    <p className="text-sm text-slate-500 mb-2">Empresa verificada por EventHive</p>
                    <button className="text-sm font-bold text-primary-600 hover:text-primary-700">Ver perfil completo</button>
                 </div>
               </div>
            </section>

            {/* Sección de Reseñas */}
            <section className="pt-12 border-t border-slate-200">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <MessageSquare className="w-6 h-6 text-primary-600" />
                  Reseñas de la comunidad
                </h2>
                {reviewsData.count > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-4 h-4 ${s <= Math.round(reviewsData.average) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`} />
                      ))}
                    </div>
                    <span className="font-bold text-slate-900">{reviewsData.average}</span>
                  </div>
                )}
              </div>

              {/* Estadísticas del Organizador (VISIBLE PARA TODOS) */}
              {!organizerLoading && organizerStats.length > 0 && (
                <div className="mb-12 bg-slate-900 rounded-[2.5rem] p-8 text-white overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/20 -mr-32 -mt-32 rounded-full blur-3xl group-hover:bg-primary-600/30 transition-colors duration-500"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-primary-600 rounded-xl">
                        <BarChart3 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black uppercase tracking-wider text-white">Ranking de {event.organizer}</h3>
                        <p className="text-primary-300 text-[10px] font-bold uppercase tracking-widest">Eventos mejor valorados del organizador</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {organizerStats.slice(0, 5).map((e, index) => (
                        <div key={e.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/5">
                          <div className="flex items-center gap-4">
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                              index === 0 ? 'bg-yellow-500 text-slate-900' : 
                              index === 1 ? 'bg-slate-300 text-slate-900' :
                              index === 2 ? 'bg-orange-500 text-slate-900' :
                              'bg-white/10 text-white/50'
                            }`}>
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-bold text-sm text-white">{e.title}</p>
                              <p className="text-[10px] text-white/40 font-medium">{e.category} • {e.reviewCount} reseñas</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span className="font-black text-white">{e.average.toFixed(1)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Formulario de Reseña */}
              {user ? (
                <form onSubmit={handlePostReview} className="bg-white border border-slate-200 rounded-3xl p-6 mb-10 shadow-sm">
                  <h4 className="font-bold text-slate-900 mb-4">¿Asististe a este evento? Deja tu opinión</h4>
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-sm font-bold text-slate-500">Tu calificación:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setNewReview({ ...newReview, rating: s })}
                          className="focus:outline-none transition-transform active:scale-90"
                        >
                          <Star className={`w-6 h-6 ${s <= newReview.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 hover:text-yellow-200'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={newReview.comment}
                    onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                    placeholder="Cuéntanos qué te pareció el evento..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-600 focus:ring-2 focus:ring-primary-600 focus:bg-white outline-none transition-all mb-4 min-h-[100px]"
                    required
                  ></textarea>
                  <button
                    type="submit"
                    disabled={sendingReview}
                    className="btn-primary py-3 px-8 font-bold flex items-center gap-2 disabled:opacity-50"
                  >
                    {sendingReview ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Publicar mi reseña'}
                  </button>
                </form>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center mb-10">
                  <p className="text-slate-600 font-medium mb-4">Inicia sesión para compartir tu experiencia con otros usuarios.</p>
                  <Link href="/login" className="btn-secondary py-2 px-6 inline-block font-bold">Iniciar Sesión</Link>
                </div>
              )}

              {/* Lista de Reseñas */}
              <div className="space-y-6">
                {reviewLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                  </div>
                ) : reviewsData.reviews.length > 0 ? (
                  reviewsData.reviews.map((rev) => (
                    <div key={rev.id} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center font-bold text-primary-700">
                            {rev.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-900">{rev.username}</h5>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(rev.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`w-3 h-3 ${s <= rev.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-slate-600 text-sm leading-relaxed">{rev.comment}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Aún no hay reseñas para este evento. ¡Sé el primero en opinar!</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar / Ticket */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/50 overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 -mr-8 -mt-8 rounded-full blur-2xl"></div>
               <div className="mb-6 relative">
                 <span className="text-slate-500 text-sm font-medium">Precio por ticket</span>
                 <div className="text-4xl font-extrabold text-slate-900 tracking-tight">
                   {Number(event.price).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                 </div>
               </div>

               {purchased ? (
                 <div className="w-full bg-green-50 text-green-700 p-4 rounded-2xl flex flex-col items-center gap-2 border border-green-200 animate-in fade-in zoom-in duration-300">
                    <CheckCircle className="w-10 h-10" />
                    <span className="font-bold">¡Entrada Comprada!</span>
                    <span className="text-xs">Redirigiendo a tus tickets...</span>
                 </div>
               ) : (
                 <button 
                   onClick={handleBuyTicket}
                   disabled={buying}
                   className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-3 mb-4 font-bold shadow-lg shadow-primary-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70"
                 >
                   {buying ? (
                     <>
                       <Loader2 className="w-6 h-6 animate-spin" />
                       Procesando...
                     </>
                   ) : (
                     <>
                       <Ticket className="w-6 h-6" />
                       Comprar Ticket Ahora
                     </>
                   )}
                 </button>
               )}

               <div className="space-y-4 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Shield className="w-5 h-5 text-green-500 shrink-0" />
                    <span>Compra protegida y 100% segura</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Calendar className="w-5 h-5 text-primary-600 shrink-0" />
                    <span>Reembolso disponible hasta 7 días antes</span>
                  </div>
               </div>

               <div className="flex gap-4 mt-8">
                 <button className="flex-1 btn-secondary py-3 flex items-center justify-center gap-2 text-sm font-bold">
                   <Heart className="w-4 h-4" /> Guardar
                 </button>
                 <button className="flex-1 btn-secondary py-3 flex items-center justify-center gap-2 text-sm font-bold">
                   <Share2 className="w-4 h-4" /> Compartir
                 </button>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
