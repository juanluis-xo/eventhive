import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Mail, Lock, ArrowRight, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';

/* ─── Partículas flotantes (canvas) ────────────────────────────── */
function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Crear partículas: tickets, círculos, hexágonos
    const COLORS = ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#6d28d9'];
    const particles = Array.from({ length: 38 }, () => ({
      x:    Math.random() * canvas.width,
      y:    Math.random() * canvas.height,
      r:    Math.random() * 18 + 4,
      dx:   (Math.random() - 0.5) * 0.5,
      dy:   -(Math.random() * 0.6 + 0.2),
      alpha:Math.random() * 0.5 + 0.15,
      color:COLORS[Math.floor(Math.random() * COLORS.length)],
      shape:['circle','rect','ring'][Math.floor(Math.random() * 3)],
      rot:  Math.random() * Math.PI * 2,
      drot: (Math.random() - 0.5) * 0.02,
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.strokeStyle = p.color;
        ctx.fillStyle   = p.color;
        ctx.lineWidth   = 1.5;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.r, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'ring') {
          ctx.beginPath();
          ctx.arc(0, 0, p.r, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // ticket-like rect con bordes redondeados
          const w = p.r * 2.8, h = p.r * 1.4;
          ctx.beginPath();
          ctx.roundRect(-w / 2, -h / 2, w, h, 4);
          ctx.stroke();
        }

        ctx.restore();

        // mover
        p.x   += p.dx;
        p.y   += p.dy;
        p.rot += p.drot;

        // reciclar cuando sale por arriba
        if (p.y + p.r < 0) {
          p.y  = canvas.height + p.r;
          p.x  = Math.random() * canvas.width;
        }
        if (p.x < -p.r * 3)  p.x = canvas.width  + p.r;
        if (p.x > canvas.width  + p.r * 3) p.x = -p.r;
      });

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ display: 'block' }}
    />
  );
}

/* ─── Componente principal ──────────────────────────────────────── */
export default function Login() {
  const router = useRouter();
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [justRegistered, setJustRegistered] = useState(false);

  useEffect(() => {
    if (router.query.registered) setJustRegistered(true);
  }, [router.query]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Credenciales incorrectas.');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Keyframes CSS */}
      <style>{`
        @keyframes eh-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-18px) rotate(3deg); }
          66%       { transform: translateY(-8px) rotate(-2deg); }
        }
        @keyframes eh-pulse-ring {
          0%   { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes eh-drift {
          0%, 100% { transform: translateX(0) translateY(0); }
          50%       { transform: translateX(15px) translateY(-10px); }
        }
        @keyframes eh-slide-in {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes eh-fade-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .eh-float-1 { animation: eh-float 6s ease-in-out infinite; }
        .eh-float-2 { animation: eh-float 8s ease-in-out infinite 1s; }
        .eh-float-3 { animation: eh-float 7s ease-in-out infinite 2.5s; }
        .eh-float-4 { animation: eh-float 5s ease-in-out infinite 0.5s; }
        .eh-drift-1 { animation: eh-drift 9s ease-in-out infinite; }
        .eh-drift-2 { animation: eh-drift 12s ease-in-out infinite 3s; }
        .eh-ring    { animation: eh-pulse-ring 3s ease-out infinite; }
        .eh-ring-2  { animation: eh-pulse-ring 3s ease-out infinite 1.5s; }
        .eh-form-in { animation: eh-slide-in 0.6s cubic-bezier(0.22,1,0.36,1) both; }
        .eh-fade-up { animation: eh-fade-up 0.5s ease both; }
      `}</style>

      <div className="min-h-[calc(100vh-64px)] flex">

        {/* ══ PANEL IZQUIERDO — animado ══════════════════════════════ */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden
                        bg-gradient-to-br from-[#3b0764] via-[#5b21b6] to-[#7c3aed]
                        flex-col items-center justify-center p-12 select-none">

          {/* Canvas de partículas */}
          <ParticleCanvas />

          {/* Anillos de pulso de fondo */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 rounded-full border border-white/10 eh-ring"  />
            <div className="w-64 h-64 rounded-full border border-white/10 eh-ring-2 absolute" />
          </div>

          {/* Blob decorativo */}
          <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full
                          bg-purple-400/10 blur-3xl eh-drift-1 pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-56 h-56 rounded-full
                          bg-violet-300/10 blur-3xl eh-drift-2 pointer-events-none" />

          {/* Tarjetas flotantes decorativas */}
          <div className="absolute top-16 left-10 eh-float-1 pointer-events-none">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20
                            rounded-2xl px-5 py-3 text-white shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">🎫 Ticket</p>
              <p className="text-sm font-bold">Concierto en vivo</p>
              <p className="text-[10px] opacity-60 mt-0.5">VIP · Fila A</p>
            </div>
          </div>

          <div className="absolute top-28 right-8 eh-float-2 pointer-events-none">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20
                            rounded-2xl px-4 py-2.5 text-white shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">📅 Próximo</p>
              <p className="text-sm font-bold">02 May 2026</p>
            </div>
          </div>

          <div className="absolute bottom-24 left-12 eh-float-3 pointer-events-none">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20
                            rounded-2xl px-4 py-2.5 text-white shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">✅ Verificado</p>
              <p className="text-sm font-bold">EH-2026-X0008</p>
            </div>
          </div>

          <div className="absolute bottom-16 right-10 eh-float-4 pointer-events-none">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20
                            rounded-xl px-3 py-2 text-white shadow-lg">
              <p className="text-lg">🎶</p>
            </div>
          </div>

          {/* Contenido central */}
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20
                            bg-white/15 backdrop-blur rounded-3xl mb-6
                            border border-white/25 shadow-2xl eh-float-1">
              <span className="text-4xl font-extrabold text-white">E</span>
            </div>
            <h2 className="text-4xl font-extrabold text-white mb-4 leading-tight">
              Tu próxima<br />experiencia<br />
              <span className="text-violet-300 italic">te espera</span>
            </h2>
            <p className="text-white/70 text-base max-w-xs mx-auto leading-relaxed">
              Accede a tus tickets, descubre eventos y vive momentos únicos.
            </p>

            {/* Stats rápidas */}
            <div className="flex justify-center gap-8 mt-10">
              {[
                { num: '🎫', label: 'Tickets digitales' },
                { num: '🔒', label: 'Acceso seguro'    },
                { num: '📱', label: 'QR al instante'   },
              ].map(({ num, label }) => (
                <div key={label} className="text-center">
                  <p className="text-2xl mb-1">{num}</p>
                  <p className="text-white/60 text-[11px] font-semibold">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══ PANEL DERECHO — formulario ═════════════════════════════ */}
        <div className="w-full lg:w-1/2 flex items-center justify-center
                        px-6 py-12 bg-white eh-form-in">
          <div className="w-full max-w-md">

            {/* Logo mobile */}
            <div className="text-center mb-8 lg:mb-10">
              <Link href="/" className="inline-flex items-center gap-3 mb-6 group">
                <div className="w-11 h-11 bg-primary-600 rounded-2xl flex items-center
                                justify-center text-white font-extrabold text-xl
                                group-hover:rotate-12 transition-all shadow-lg shadow-primary-600/30">
                  E
                </div>
                <span className="text-2xl font-extrabold text-slate-900 tracking-tight">EventHive</span>
              </Link>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">¡Hola de nuevo!</h1>
              <p className="text-slate-500 mt-2 font-medium">Ingresa tus datos para acceder a tu cuenta.</p>
            </div>

            {justRegistered && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700
                              text-sm font-bold rounded-xl flex items-center gap-3 eh-fade-up">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                ¡Cuenta creada correctamente! Ya puedes iniciar sesión.
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-10
                            shadow-2xl shadow-slate-200/40 relative overflow-hidden">
              {/* Acento decorativo */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary-50
                              rounded-full -mr-20 -mt-20 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-violet-50
                              rounded-full -ml-12 -mb-12 pointer-events-none" />

              <form className="space-y-6 relative" onSubmit={handleSubmit}>
                {error && (
                  <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700
                                  text-sm font-bold rounded-r-lg eh-fade-up">
                    {error}
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-widest">
                    Correo electrónico
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5
                                    text-slate-400 group-focus-within:text-primary-500
                                    transition-colors" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="input-field pl-11 py-3.5 text-sm bg-slate-50 border-slate-200
                                 focus:bg-white focus:ring-2 focus:ring-primary-500/30 transition-all"
                      placeholder="tu@email.com"
                      required
                    />
                  </div>
                </div>

                {/* Contraseña */}
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                      Contraseña
                    </label>
                    <Link href="#"
                      className="text-xs font-bold text-primary-600 hover:text-primary-700
                                 underline underline-offset-4 decoration-primary-600/30">
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5
                                    text-slate-400 group-focus-within:text-primary-500
                                    transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="input-field pl-11 pr-11 py-3.5 text-sm bg-slate-50 border-slate-200
                                 focus:bg-white focus:ring-2 focus:ring-primary-500/30 transition-all"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2
                                 text-slate-400 hover:text-primary-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-4 text-base flex items-center justify-center
                             gap-3 mt-2 font-bold shadow-xl shadow-primary-600/25
                             disabled:opacity-70 disabled:cursor-not-allowed
                             hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Verificando…</>
                  ) : (
                    <>Iniciar Sesión <ArrowRight className="w-5 h-5" /></>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-7 border-t border-slate-100 text-center">
                <p className="text-sm text-slate-500 font-medium">
                  ¿Eres nuevo en EventHive?{' '}
                  <Link href="/register"
                    className="font-bold text-primary-600 hover:text-primary-700
                               underline decoration-2 underline-offset-4 decoration-primary-600/30">
                    Regístrate gratis
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
