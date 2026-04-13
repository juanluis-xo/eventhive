import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Mail, Lock, User, ArrowRight, ShieldCheck, Loader2, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden. Por favor verifícalas.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: 'attendee'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al registrar el usuario. Intenta de nuevo.');
      }

      router.push('/login?registered=true');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-12">
      {/* Banner móvil (solo visible en sm) */}
      <div className="md:hidden w-full max-w-xl mb-6 bg-primary-600 rounded-2xl p-5 text-white text-center animate-fade-in-up">
        <div className="font-black text-lg mb-1">Únete a EventHive</div>
        <p className="text-primary-100 text-sm">Tickets seguros · Preventas exclusivas · Gestión profesional</p>
      </div>

      <div className="max-w-xl w-full flex flex-col md:flex-row bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-fade-in-up">
        {/* Sidebar */}
        <div className="hidden md:flex md:w-2/5 bg-primary-600 p-10 flex-col justify-between text-white relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-800" />
          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center gap-2 mb-12 group">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white font-bold backdrop-blur-sm group-hover:rotate-12 transition-all">E</div>
              <span className="text-xl font-bold">EventHive</span>
            </Link>
            <h2 className="text-3xl font-bold leading-tight mb-6 tracking-tight">
              Únete a la mejor comunidad de eventos.
            </h2>
            <ul className="space-y-4 text-primary-100">
              {[
                'Tickets 100% seguros y digitales',
                'Acceso exclusivo a preventas',
                'Gestión de eventos profesional',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm group/item">
                  <ShieldCheck className="w-5 h-5 text-white shrink-0 group-hover/item:scale-110 transition-transform" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative z-10 text-xs text-primary-200 font-medium">
            © {new Date().getFullYear()} EventHive Inc.
          </div>
        </div>

        {/* Form */}
        <div className="p-8 md:p-12 md:w-3/5">
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">Crear cuenta</h1>
            <p className="text-sm text-slate-500 font-medium">Empieza tu aventura en EventHive hoy.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-medium rounded-r-lg">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-widest">Nombre de usuario</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="input-field pl-10 text-sm py-2.5"
                  placeholder="ej: juanperez99"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-widest">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field pl-10 text-sm py-2.5"
                  placeholder="tu@email.com"
                  required
                />
              </div>
            </div>

            {/* Contraseñas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-widest">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="input-field pl-10 pr-10 text-sm py-2.5"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-widest">Confirmar contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="input-field pl-10 pr-10 text-sm py-2.5"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-center gap-2 py-2">
              <input type="checkbox" id="terms" className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500" required />
              <label htmlFor="terms" className="text-xs text-slate-500 font-medium leading-relaxed">
                Acepto los{' '}
                <Link href="#" className="text-primary-600 font-bold hover:underline">términos y condiciones</Link> de servicio.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5 flex items-center justify-center gap-3 font-bold shadow-lg shadow-primary-600/20 disabled:opacity-70 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                <>
                  Crear mi cuenta <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500 font-medium">
              ¿Ya tienes una cuenta?{' '}
              <Link href="/login" className="font-bold text-primary-600 hover:text-primary-700 underline decoration-2 underline-offset-4 decoration-primary-600/30">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
