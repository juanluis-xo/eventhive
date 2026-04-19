import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import EventCard from '@/components/EventCard';
import { ArrowRight, Calendar, Users, Shield, Loader2, Star, Zap, Lock } from 'lucide-react';

// ── Datos estáticos ───────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Calendar,
    title: 'Gestión Simplificada',
    desc: 'Crea y publica tus eventos en cuestión de minutos con nuestra interfaz intuitiva.',
    gradient: 'from-violet-500 to-purple-600',
    glow: 'rgba(124,58,237,0.35)',
  },
  {
    icon: Users,
    title: 'Escalabilidad Total',
    desc: 'Preparado para eventos desde 10 hasta 100,000 asistentes sin latencia.',
    gradient: 'from-blue-500 to-cyan-500',
    glow: 'rgba(59,130,246,0.35)',
  },
  {
    icon: Shield,
    title: 'Seguridad Garantizada',
    desc: 'Tickets digitales encriptados y acceso seguro con códigos QR únicos.',
    gradient: 'from-emerald-500 to-teal-500',
    glow: 'rgba(16,185,129,0.35)',
  },
];

const TICKER_ITEMS = [
  '🎵 Conciertos', '🎭 Teatro', '🏟️ Deportes', '🎨 Arte & Cultura',
  '💻 Tecnología', '🎪 Festivales', '🎬 Cine', '🍕 Gastronomía',
];

const STATS = [
  { label: 'Eventos publicados', to: 1200, suffix: '+' },
  { label: 'Asistentes felices', to: 50000, suffix: '+' },
  { label: 'Ciudades',           to: 30,    suffix: '+' },
  { label: 'Satisfacción',       to: 98,    suffix: '%' },
];

// ── Hook: scroll Y ────────────────────────────────────────────────────────────
function useScrollY() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handle = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handle, { passive: true });
    return () => window.removeEventListener('scroll', handle);
  }, []);
  return scrollY;
}

// ── Hook: Intersection Observer (dispara 1 sola vez) ─────────────────────────
function useInView(threshold = 0.15) {
  const ref   = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

// ── 3D Tilt Card ──────────────────────────────────────────────────────────────
function TiltCard({ children }) {
  const ref = useRef(null);

  const onMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const r   = el.getBoundingClientRect();
    const rx  = ((e.clientY - r.top)  / r.height - 0.5) * -14;
    const ry  = ((e.clientX - r.left) / r.width  - 0.5) *  14;
    el.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.03,1.03,1.03)`;
  }, []);

  const onLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
  }, []);

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
         style={{ transition: 'transform 0.18s ease', transformStyle: 'preserve-3d', willChange: 'transform' }}>
      {children}
    </div>
  );
}

// ── Count-up animation ────────────────────────────────────────────────────────
function CountUp({ to, suffix = '', duration = 1600 }) {
  const [count, setCount] = useState(0);
  const [ref, inView]     = useInView(0.3);

  useEffect(() => {
    if (!inView) return;
    const start = Date.now();
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);          // easeOutQuart
      setCount(Math.floor(eased * to));
      if (t < 1) requestAnimationFrame(tick);
      else setCount(to);
    };
    requestAnimationFrame(tick);
  }, [inView, to, duration]);

  return <span ref={ref}>{count.toLocaleString('es-ES')}{suffix}</span>;
}

// ── Floating 3D shapes (parallax on scroll) ───────────────────────────────────
const SHAPES = [
  { id: 1, x: 6,  y: 12, size: 90,  color: '#7c3aed', opacity: 0.13, speed: 0.28, rot: 45,  type: 'ring'  },
  { id: 2, x: 83, y: 8,  size: 130, color: '#a855f7', opacity: 0.09, speed: 0.45, rot: 20,  type: 'hex'   },
  { id: 3, x: 14, y: 62, size: 65,  color: '#6d28d9', opacity: 0.18, speed: 0.18, rot: 0,   type: 'ring'  },
  { id: 4, x: 76, y: 52, size: 55,  color: '#8b5cf6', opacity: 0.14, speed: 0.38, rot: 30,  type: 'dot'   },
  { id: 5, x: 48, y: 78, size: 100, color: '#7c3aed', opacity: 0.07, speed: 0.55, rot: 60,  type: 'hex'   },
  { id: 6, x: 91, y: 78, size: 45,  color: '#c4b5fd', opacity: 0.22, speed: 0.32, rot: 0,   type: 'dot'   },
  { id: 7, x: 3,  y: 82, size: 75,  color: '#9333ea', opacity: 0.11, speed: 0.22, rot: 15,  type: 'ring'  },
];

function FloatingShapes({ scrollY }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {SHAPES.map(s => {
        const ty  = scrollY * s.speed * -1;
        const rot = s.rot + scrollY * 0.04;
        const base = {
          position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
          opacity: s.opacity,
          transform: `translateY(${ty}px) rotate(${rot}deg)`,
          transition: 'transform 0.08s linear',
        };

        if (s.type === 'ring') return (
          <div key={s.id} style={{ ...base, width: s.size, height: s.size,
            border: `2.5px solid ${s.color}`, borderRadius: '50%' }} />
        );
        if (s.type === 'hex') return (
          <div key={s.id} style={{ ...base, width: s.size, height: s.size * 0.866,
            background: s.color,
            clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)' }} />
        );
        return (
          <div key={s.id} style={{ ...base, width: s.size, height: s.size,
            borderRadius: '50%', background: s.color, filter: 'blur(10px)' }} />
        );
      })}
    </div>
  );
}

// ── Scroll Progress Bar ───────────────────────────────────────────────────────
function ScrollProgressBar() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const h = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setPct(max > 0 ? (window.scrollY / max) * 100 : 0);
    };
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, height: 3, zIndex: 9999,
      width: `${pct}%`,
      background: 'linear-gradient(90deg,#7c3aed,#a855f7,#ec4899)',
      borderRadius: '0 2px 2px 0',
      boxShadow: '0 0 10px rgba(124,58,237,0.7)',
      transition: 'width 0.08s linear',
    }} />
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  HOME PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function Home() {
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [loading, setLoading]               = useState(true);
  const scrollY = useScrollY();

  const [eventsRef,   eventsInView]   = useInView(0.08);
  const [featuresRef, featuresInView] = useInView(0.08);
  const [ctaRef,      ctaInView]      = useInView(0.15);

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events`);
        const data = await res.json();
        const sorted = Array.isArray(data)
          ? [...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          : [];
        setFeaturedEvents(sorted.slice(0, 3));
      } catch { setFeaturedEvents([]); }
      finally  { setLoading(false); }
    })();
  }, []);

  const heroTY  = scrollY * 0.38;
  const heroOpa = Math.max(0, 1 - scrollY / 520);

  return (
    <>
      {/* ── embedded styles ── */}
      <style>{`
        /* scroll-reveal helper */
        .eh-reveal {
          transition: opacity .75s cubic-bezier(.16,1,.3,1),
                      transform .75s cubic-bezier(.16,1,.3,1);
        }

        /* animated gradient text */
        @keyframes eh-shimmer {
          0%   { background-position:-200% center }
          100% { background-position: 200% center }
        }
        .eh-gradient-text {
          background: linear-gradient(135deg,#7c3aed 0%,#a855f7 45%,#ec4899 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: eh-shimmer 4s linear infinite;
        }

        /* animated gradient CTA button / section */
        @keyframes eh-grad-shift {
          0%,100% { background-position:0% 50% }
          50%      { background-position:100% 50% }
        }
        .eh-grad-btn {
          background: linear-gradient(-45deg,#7c3aed,#6d28d9,#9333ea,#a855f7);
          background-size: 300% 300%;
          animation: eh-grad-shift 4.5s ease infinite;
        }
        .eh-grad-section {
          background: linear-gradient(-45deg,#6d28d9,#7c3aed,#9333ea,#6d28d9);
          background-size: 300% 300%;
          animation: eh-grad-shift 6s ease infinite;
        }

        /* glow dot */
        @keyframes eh-glow {
          0%,100% { box-shadow:0 0 8px 3px rgba(124,58,237,.4) }
          50%      { box-shadow:0 0 16px 6px rgba(168,85,247,.6) }
        }
        .eh-glow-dot {
          display:inline-block; width:8px; height:8px;
          border-radius:50%; background:#7c3aed;
          animation: eh-glow 2s ease infinite;
        }

        /* spinning rings */
        @keyframes eh-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .eh-spin      { animation: eh-spin 22s linear infinite; }
        .eh-spin-rev  { animation: eh-spin 16s linear infinite reverse; }

        /* ticker */
        @keyframes eh-tick { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .eh-ticker { display:flex; width:max-content; animation: eh-tick 22s linear infinite; }
        .eh-ticker:hover { animation-play-state:paused }

        /* float */
        @keyframes eh-float {
          0%,100% { transform:translateY(0) }
          50%      { transform:translateY(-10px) }
        }
        .eh-float { animation: eh-float 3s ease-in-out infinite; }

        /* scroll-indicator dot */
        @keyframes eh-scroll-dot {
          0%,100% { transform:translateY(0); opacity:1 }
          80%      { transform:translateY(10px); opacity:0 }
        }
        .eh-scroll-dot { animation: eh-scroll-dot 1.6s ease-in-out infinite; }

        /* feature icon bounce-in */
        @keyframes eh-bounce-in {
          0%   { transform:scale(0) rotate(-15deg); opacity:0 }
          65%  { transform:scale(1.12) rotate(4deg) }
          100% { transform:scale(1) rotate(0deg); opacity:1 }
        }

        /* 3-D feature card hover */
        .eh-feat-card {
          transition: transform .35s ease, box-shadow .35s ease;
          transform-style: preserve-3d;
        }
        .eh-feat-card:hover {
          transform: perspective(500px) translateZ(24px) translateY(-6px);
        }

        /* progress bar */
        .eh-prog {
          position:fixed; top:0; left:0; height:3px; z-index:9999;
          background: linear-gradient(90deg,#7c3aed,#a855f7,#ec4899);
          border-radius:0 2px 2px 0;
          box-shadow:0 0 10px rgba(124,58,237,.65);
          transition: width .08s linear;
        }
      `}</style>

      <ScrollProgressBar />

      <div className="pb-24 overflow-x-hidden">

        {/* ══════════════════════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════════════════════ */}
        <section className="relative pt-20 pb-32 overflow-hidden min-h-[92vh] flex items-center">

          {/* dot-grid bg */}
          <div className="absolute inset-0 -z-20" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px,rgba(124,58,237,.09) 1px,transparent 0)',
            backgroundSize: '38px 38px',
          }} />

          {/* gradient orbs */}
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] -z-10 pointer-events-none" style={{
            background: 'radial-gradient(circle,rgba(124,58,237,.11) 0%,transparent 70%)',
            transform: `translateY(${scrollY * .18}px)`,
          }} />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 -z-10 pointer-events-none" style={{
            background: 'radial-gradient(circle,rgba(168,85,247,.09) 0%,transparent 70%)',
            transform: `translateY(${scrollY * -.13}px)`,
          }} />

          {/* 3-D parallax shapes */}
          <FloatingShapes scrollY={scrollY} />

          {/* spinning rings */}
          <div className="eh-spin  absolute top-20 right-16 w-36 h-36 rounded-full border border-violet-300/20 pointer-events-none hidden md:block" />
          <div className="eh-spin-rev absolute top-26 right-22 w-20 h-20 rounded-full border border-purple-400/15 pointer-events-none hidden md:block" />
          <div className="eh-spin  absolute bottom-28 left-16 w-28 h-28 rounded-full border border-violet-400/18 pointer-events-none hidden md:block" />

          {/* HERO CONTENT (parallax + fade out) */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center w-full"
               style={{ transform: `translateY(${heroTY}px)`, opacity: heroOpa }}>

            {/* badge */}
            <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-200
                            rounded-full px-4 py-1.5 mb-8 animate-fade-in-up">
              <span className="eh-glow-dot" />
              <span className="text-sm font-bold text-violet-700">La plataforma #1 de eventos</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6 animate-fade-in-up">
              Gestiona tus eventos <br />
              <span className="eh-gradient-text italic">sin complicaciones</span>
            </h1>

            <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up-delay-1">
              La plataforma más moderna para organizar, vender tickets y descubrir experiencias únicas.
              Todo en un solo lugar.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-up-delay-2">
              <Link href="/eventos"
                    className="eh-grad-btn text-white text-lg px-8 py-4 rounded-xl font-bold
                               flex items-center justify-center gap-2
                               shadow-lg shadow-violet-500/30 hover:scale-105 transition-transform">
                Explorar Eventos <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/login"
                    className="btn-secondary text-lg px-8 py-4 hover:scale-105 transition-transform">
                Iniciar Sesión
              </Link>
            </div>

            {/* quick stats */}
            <div className="flex flex-wrap justify-center gap-10 mt-14 animate-fade-in-up-delay-2">
              {[
                { v: '1,200+', l: 'Eventos activos' },
                { v: '50 K+',  l: 'Asistentes' },
                { v: '30+',    l: 'Ciudades' },
              ].map(s => (
                <div key={s.l} className="text-center">
                  <p className="text-2xl font-extrabold text-slate-900">{s.v}</p>
                  <p className="text-sm text-slate-500 font-medium">{s.l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-fade-in-up-delay-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Scroll</span>
            <div style={{
              width: 22, height: 36,
              border: '2px solid rgba(124,58,237,.3)',
              borderRadius: 12,
              display: 'flex', justifyContent: 'center', paddingTop: 6,
            }}>
              <div className="eh-scroll-dot" style={{
                width: 4, height: 8, borderRadius: 4,
                background: 'linear-gradient(180deg,#7c3aed,#a855f7)',
              }} />
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            TICKER
        ══════════════════════════════════════════════════════════════ */}
        <div className="bg-violet-600 py-3 overflow-hidden select-none">
          <div className="eh-ticker">
            {[0, 1].map(n => (
              <span key={n} className="flex gap-10 pr-10">
                {TICKER_ITEMS.map(item => (
                  <span key={item} className="text-white text-sm font-semibold whitespace-nowrap flex items-center gap-3">
                    {item}
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,.45)', display: 'inline-block' }} />
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            EVENTOS DESTACADOS
        ══════════════════════════════════════════════════════════════ */}
        <section ref={eventsRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">

          {/* heading */}
          <div className="flex justify-between items-end mb-12 eh-reveal"
               style={{
                 opacity:   eventsInView ? 1 : 0,
                 transform: eventsInView ? 'none' : 'translateY(30px)',
               }}>
            <div>
              <p className="text-sm font-bold text-violet-600 uppercase tracking-widest mb-2">✦ Destacados</p>
              <h2 className="text-4xl font-extrabold text-slate-900 mb-2">Eventos Destacados</h2>
              <p className="text-slate-500">Descubre las mejores experiencias seleccionadas para ti.</p>
            </div>
            <Link href="/eventos"
                  className="hidden sm:flex items-center gap-2 text-violet-600 font-bold hover:underline group">
              Ver todos <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* cards */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
            </div>
          ) : featuredEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featuredEvents.map((event, i) => (
                <div key={event.id} className="eh-reveal" style={{
                  opacity:   eventsInView ? 1 : 0,
                  transform: eventsInView ? 'none' : 'translateY(50px)',
                  transition: `opacity .75s ${i * 0.13}s cubic-bezier(.16,1,.3,1),
                               transform .75s ${i * 0.13}s cubic-bezier(.16,1,.3,1)`,
                }}>
                  <TiltCard>
                    <EventCard event={event} />
                  </TiltCard>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-slate-400 text-4xl mb-4">🎪</p>
              <p className="text-slate-600 font-bold text-lg mb-2">No hay eventos disponibles aún</p>
              <p className="text-slate-400 text-sm mb-6">Sé el primero en descubrir eventos en EventHive.</p>
              <Link href="/eventos" className="btn-primary text-sm">Explorar eventos</Link>
            </div>
          )}

          <div className="sm:hidden mt-8 text-center">
            <Link href="/eventos" className="btn-secondary px-8 py-3 font-bold inline-flex items-center gap-2">
              Ver todos los eventos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            STATS (count-up)
        ══════════════════════════════════════════════════════════════ */}
        <StatsSection scrollY={scrollY} />

        {/* ══════════════════════════════════════════════════════════════
            FEATURES
        ══════════════════════════════════════════════════════════════ */}
        <section ref={featuresRef}
                 className="relative py-28 text-white overflow-hidden"
                 style={{ background: 'linear-gradient(160deg,#0f0524 0%,#1e1040 50%,#2d1a6e 100%)' }}>

          {/* top line */}
          <div className="absolute top-0 left-0 w-full h-px"
               style={{ background: 'linear-gradient(90deg,transparent,rgba(139,92,246,.5),transparent)' }} />

          {/* dot-grid */}
          <div className="absolute inset-0 pointer-events-none"
               style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,rgba(139,92,246,.07) 1px,transparent 0)', backgroundSize: '30px 30px' }} />

          {/* parallax orbs */}
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full pointer-events-none" style={{
            background: 'radial-gradient(circle,rgba(124,58,237,.18) 0%,transparent 70%)',
            transform: `translateY(${(scrollY - 900) * .1}px)`,
          }} />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full pointer-events-none" style={{
            background: 'radial-gradient(circle,rgba(168,85,247,.14) 0%,transparent 70%)',
            transform: `translateY(${(scrollY - 900) * -.1}px)`,
          }} />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

            {/* heading */}
            <div className="text-center mb-20 eh-reveal" style={{
              opacity:   featuresInView ? 1 : 0,
              transform: featuresInView ? 'none' : 'translateY(30px)',
            }}>
              <p className="text-violet-400 text-sm font-bold uppercase tracking-widest mb-3">¿Por qué EventHive?</p>
              <h2 className="text-4xl font-extrabold mb-4">Tecnología que marca la diferencia</h2>
              <p className="text-slate-400 max-w-xl mx-auto leading-relaxed">
                Diseñada para que tú solo te preocupes de vivir la experiencia.
              </p>
            </div>

            {/* cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {FEATURES.map(({ icon: Icon, title, desc, gradient, glow }, i) => (
                <div key={title}
                     className="eh-feat-card rounded-2xl p-8 text-center eh-reveal"
                     style={{
                       background: 'rgba(255,255,255,0.04)',
                       border: '1px solid rgba(255,255,255,0.08)',
                       opacity:   featuresInView ? 1 : 0,
                       transform: featuresInView ? 'none' : 'translateY(50px)',
                       transition: `opacity .75s ${i * .15}s cubic-bezier(.16,1,.3,1),
                                    transform .75s ${i * .15}s cubic-bezier(.16,1,.3,1)`,
                     }}>
                  {/* icon box */}
                  <div className={`w-16 h-16 bg-gradient-to-br ${gradient} rounded-2xl
                                   flex items-center justify-center mb-6 mx-auto`}
                       style={{
                         boxShadow: featuresInView ? `0 8px 32px ${glow}` : 'none',
                         animation: featuresInView
                           ? `eh-bounce-in .65s ${i * .15 + .3}s both` : 'none',
                       }}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{title}</h3>
                  <p className="text-slate-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            {/* bottom mini-badges */}
            <div className="flex flex-wrap justify-center gap-4 mt-16 eh-reveal" style={{
              opacity:   featuresInView ? 1 : 0,
              transform: featuresInView ? 'none' : 'translateY(20px)',
              transition: 'opacity .7s .5s ease, transform .7s .5s ease',
            }}>
              {['Sin comisiones ocultas', 'Soporte 24/7', 'Setup en 5 minutos', 'Datos en tiempo real'].map(b => (
                <span key={b} style={{
                  background: 'rgba(139,92,246,.15)', border: '1px solid rgba(139,92,246,.3)',
                  borderRadius: 999, padding: '6px 18px', fontSize: 13, fontWeight: 600, color: '#c4b5fd',
                }}>✓ {b}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            CTA
        ══════════════════════════════════════════════════════════════ */}
        <section ref={ctaRef} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="eh-grad-section rounded-3xl p-8 md:p-16 text-center text-white relative overflow-hidden"
               style={{
                 boxShadow: '0 30px 80px rgba(109,40,217,.3)',
                 opacity:   ctaInView ? 1 : 0,
                 transform: ctaInView ? 'scale(1)' : 'scale(0.9)',
                 transition: 'opacity .85s cubic-bezier(.16,1,.3,1), transform .85s cubic-bezier(.16,1,.3,1)',
               }}>

            {/* decorative shapes */}
            <div className="eh-spin absolute top-0 right-0 w-56 h-56 rounded-full border-2 border-white/10
                            -mr-28 -mt-28 pointer-events-none hidden lg:block" />
            <div className="eh-spin-rev absolute bottom-0 left-0 w-40 h-40 rounded-full border border-white/10
                            -ml-20 -mb-20 pointer-events-none hidden lg:block" />
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/8 rounded-full -mr-40 -mt-40 blur-3xl pointer-events-none"
                 style={{ transform: `translateY(${(scrollY - 2000) * .08}px)` }} />
            <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full -ml-28 -mb-28 blur-2xl pointer-events-none"
                 style={{ transform: `translateY(${(scrollY - 2000) * -.08}px)` }} />

            <div className="relative z-10">
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.2)',
                borderRadius: 999, padding: '6px 18px', fontSize: 13, fontWeight: 700, marginBottom: 24,
              }}>
                ✨ Más de 1,200 eventos esperándote
              </span>

              <h2 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight">
                ¿Qué experiencia<br className="hidden md:block" /> vivirás hoy?
              </h2>
              <p className="text-violet-100 mb-10 text-lg max-w-xl mx-auto leading-relaxed">
                Explora todos los eventos disponibles y encuentra tu próxima experiencia inolvidable.
              </p>
              <Link href="/eventos"
                    className="bg-white text-violet-700 px-10 py-4 rounded-xl font-extrabold text-lg
                               hover:bg-violet-50 hover:scale-105 transition-all inline-block
                               shadow-2xl shadow-black/20">
                Ver todos los eventos →
              </Link>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}

// ── Stats Section (extracted component) ───────────────────────────────────────
function StatsSection({ scrollY }) {
  const [ref, inView] = useInView(0.12);
  return (
    <section ref={ref} className="relative py-16 overflow-hidden"
             style={{ background: 'linear-gradient(135deg,#5b21b6 0%,#7c3aed 50%,#9333ea 100%)' }}>
      <div className="absolute inset-0 pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,rgba(255,255,255,.06) 1px,transparent 0)', backgroundSize: '26px 26px' }} />

      {/* subtle parallax orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none" style={{
        background: 'radial-gradient(circle,rgba(255,255,255,.04) 0%,transparent 65%)',
        transform: `translate(-50%,-50%) translateY(${(scrollY - 600) * .05}px)`,
      }} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {STATS.map((s, i) => (
            <div key={s.label} style={{
              background: 'rgba(255,255,255,.07)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,.12)',
              borderRadius: 18, padding: '24px 14px', textAlign: 'center',
              opacity:   inView ? 1 : 0,
              transform: inView ? 'none' : 'translateY(35px)',
              transition: `opacity .65s ${i * .1}s ease, transform .65s ${i * .1}s ease`,
            }}>
              <p className="text-3xl font-extrabold text-white mb-1">
                <CountUp to={s.to} suffix={s.suffix} />
              </p>
              <p style={{ color: 'rgba(216,180,254,.85)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
