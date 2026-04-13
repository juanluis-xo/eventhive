import Link from 'next/link';
import EventCard from '@/components/EventCard';
import { mockEvents } from '@/data/mockEvents';
import { ArrowRight, Calendar, Users, Shield, Zap } from 'lucide-react';

const FEATURES = [
  {
    icon: Calendar,
    title: 'Gestión Simplificada',
    desc: 'Crea y publica tus eventos en cuestión de minutos con nuestra interfaz intuitiva.',
  },
  {
    icon: Users,
    title: 'Escalabilidad Total',
    desc: 'Preparado para eventos desde 10 hasta 100,000 asistentes sin latencia.',
  },
  {
    icon: Shield,
    title: 'Seguridad Garantizada',
    desc: 'Tickets digitales encriptados y acceso seguro con códigos QR únicos.',
  },
];

const BRANDS = [
  { name: 'TechCorp', icon: Zap },
  { name: 'MusicLive', icon: Calendar },
  { name: 'DesignPro', icon: Shield },
  { name: 'StartupInc', icon: Users },
];

export default function Home() {
  const featuredEvents = mockEvents.slice(0, 3);

  return (
    <div className="space-y-24 pb-24">
      {/* ── Hero ── */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-primary-50/60 to-transparent -z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6 animate-fade-in-up">
            Gestiona tus eventos <br />
            <span className="text-primary-600 italic">sin complicaciones</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up-delay-1">
            La plataforma más moderna para organizar, vender tickets y descubrir experiencias únicas. Todo en un solo lugar.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-up-delay-2">
            <Link href="/eventos" className="btn-primary text-lg px-8 py-4 flex items-center justify-center gap-2 hover:scale-105 transition-transform">
              Explorar Eventos <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/register" className="btn-secondary text-lg px-8 py-4 hover:scale-105 transition-transform">
              Empezar Gratis
            </Link>
          </div>

          {/* Sponsors / Partners */}
          <div className="mt-16 animate-fade-in-up-delay-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
              Con la confianza de líderes de la industria
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              {BRANDS.map(({ name, icon: Icon }) => (
                <div
                  key={name}
                  className="flex items-center gap-2.5 px-5 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-primary-200 hover:-translate-y-0.5 transition-all cursor-default opacity-70 hover:opacity-100"
                >
                  <Icon className="w-4 h-4 text-primary-500" />
                  <span className="text-sm font-bold text-slate-600">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Events ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-10 animate-fade-in-up">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Eventos Destacados</h2>
            <p className="text-slate-500">Descubre las mejores experiencias seleccionadas para ti.</p>
          </div>
          <Link href="/eventos" className="hidden sm:flex items-center gap-2 text-primary-600 font-semibold hover:underline">
            Ver todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featuredEvents.map((event, i) => (
            <div key={event.id} className={`animate-fade-in-up-delay-${i + 1}`}>
              <EventCard event={event} />
            </div>
          ))}
        </div>

        <div className="sm:hidden mt-8 text-center">
          <Link href="/eventos" className="btn-secondary px-8 py-3 font-bold inline-flex items-center gap-2">
            Ver todos los eventos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-gradient-to-br from-slate-900 to-primary-950 py-24 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl font-bold mb-4">¿Por qué elegir EventHive?</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Nuestra tecnología está diseñada para que tú solo te preocupes de vivir la experiencia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <div
                key={title}
                className={`flex flex-col items-center text-center group animate-fade-in-up-delay-${i + 1}`}
              >
                <div className="w-16 h-16 bg-primary-600/20 rounded-2xl flex items-center justify-center mb-6 border border-primary-500/30 group-hover:scale-110 group-hover:bg-primary-600/30 transition-all duration-300">
                  <Icon className="w-8 h-8 text-primary-400" />
                </div>
                <h3 className="text-xl font-bold mb-3">{title}</h3>
                <p className="text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in-up">
        <div className="bg-primary-600 rounded-3xl p-8 md:p-16 text-center text-white relative overflow-hidden shadow-2xl hover:shadow-primary-200 transition-shadow">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -mr-36 -mt-36 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24 blur-2xl" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">¿Listo para crear tu próximo gran evento?</h2>
            <p className="text-primary-100 mb-10 text-lg max-w-xl mx-auto">
              Empieza hoy mismo y descubre por qué miles de organizadores confían en EventHive.
            </p>
            <Link
              href="/register"
              className="bg-white text-primary-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-primary-50 hover:scale-105 transition-all inline-block shadow-lg"
            >
              Crear mi primer evento
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
