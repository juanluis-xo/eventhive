import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Mail, Lock, ArrowRight, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [justRegistered, setJustRegistered] = useState(false);

  useEffect(() => {
    if (router.query.registered) {
      setJustRegistered(true);
    }
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

      if (!response.ok) {
        throw new Error(data.error || 'Credenciales incorrectas. Por favor verifica tu email y contraseña.');
      }

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
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-slate-50/50">
      <div className="max-w-md w-full animate-fade-in-up">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-3 mb-6 group">
            <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl group-hover:rotate-12 transition-all shadow-lg shadow-primary-600/20">
              E
            </div>
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">EventHive</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">¡Hola de nuevo!</h1>
          <p className="text-slate-500 mt-2 font-medium">Ingresa tus datos para acceder a tu cuenta.</p>
        </div>

        {justRegistered && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 text-sm font-bold rounded-xl flex items-center gap-3 animate-bounce-short">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            ¡Cuenta creada correctamente! Ya puedes iniciar sesión.
          </div>
        )}

        <div className="bg-white p-8 md:p-10 rounded-3xl border border-slate-200 shadow-2xl shadow-slate-200/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 -mr-16 -mt-16 rounded-full blur-3xl" />

          <form className="space-y-6 relative" onSubmit={handleSubmit}>
            {error && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-bold rounded-r-lg">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-widest">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-11 py-3 text-sm bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  placeholder="tu@email.com"
                  required
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Contraseña</label>
                <Link href="#" className="text-xs font-bold text-primary-600 hover:text-primary-700 underline underline-offset-4 decoration-primary-600/30">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-11 pr-11 py-3 text-sm bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-3 mt-4 font-bold shadow-xl shadow-primary-600/30 disabled:opacity-70 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  Iniciar Sesión <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500 font-medium">
              ¿Eres nuevo en EventHive?{' '}
              <Link href="/register" className="font-bold text-primary-600 hover:text-primary-700 underline decoration-2 underline-offset-4 decoration-primary-600/30">
                Regístrate gratis
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
