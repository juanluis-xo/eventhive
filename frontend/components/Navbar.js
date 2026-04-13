import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Search, User, Menu, LogOut, LayoutDashboard, X } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setMenuOpen(false);
    router.push('/');
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-18 py-3">
            {/* Logo + Links */}
            <div className="flex items-center gap-10">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white font-extrabold text-lg group-hover:rotate-12 transition-all shadow-lg shadow-primary-600/20">
                  E
                </div>
                <span className="text-2xl font-black tracking-tighter text-slate-900 group-hover:text-primary-600 transition-colors">
                  EventHive
                </span>
              </Link>

              <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-500">
                <Link href="/eventos" className="hover:text-primary-600 transition-colors tracking-wide uppercase text-xs">Explorar</Link>
                {user && (
                  <Link href="/dashboard" className="hover:text-primary-600 transition-colors tracking-wide uppercase text-xs">Mis Tickets</Link>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="hidden md:flex items-center gap-4 flex-1 max-w-md mx-12">
              <div className="relative w-full group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                <input
                  type="text"
                  placeholder="¿Qué quieres vivir hoy?"
                  className="w-full pl-12 pr-4 py-2.5 bg-slate-100/50 border border-transparent rounded-2xl text-sm font-medium focus:bg-white focus:border-primary-100 focus:ring-4 focus:ring-primary-500/5 transition-all outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      router.push(`/eventos?q=${encodeURIComponent(e.target.value.trim())}`);
                    }
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {user ? (
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex flex-col items-end mr-2">
                    <span className="text-sm font-bold text-slate-900 leading-none mb-1">{user.username}</span>
                    <span className="text-[10px] font-bold text-primary-600 uppercase tracking-widest leading-none">{user.role}</span>
                  </div>

                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-primary-50 hover:text-primary-600 transition-all border border-slate-200"
                    >
                      <User className="w-5 h-5" />
                    </button>

                    {dropdownOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50">
                        <Link
                          href="/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-primary-600"
                        >
                          <LayoutDashboard className="w-4 h-4" /> Dashboard
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" /> Cerrar Sesión
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <Link href="/login" className="hidden sm:block text-sm font-bold text-slate-500 hover:text-primary-600 transition-colors px-4 py-2 tracking-wide uppercase text-xs">
                    Iniciar sesión
                  </Link>
                  <Link href="/register" className="btn-primary text-xs font-black uppercase tracking-widest px-6 py-2.5 rounded-xl shadow-lg shadow-primary-600/20">
                    Unirse
                  </Link>
                </>
              )}

              {/* Hamburguesa móvil */}
              <button
                className="md:hidden p-2 text-slate-600 ml-2"
                onClick={() => setMenuOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Drawer móvil */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] flex">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          {/* Panel */}
          <div className="relative ml-auto w-72 h-full bg-white shadow-2xl flex flex-col p-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-8">
              <span className="text-xl font-black text-slate-900">Menú</span>
              <button onClick={() => setMenuOpen(false)} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <Link href="/eventos" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl font-bold text-slate-700 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                Explorar eventos
              </Link>
              {user ? (
                <>
                  <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl font-bold text-slate-700 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                    Mis Tickets
                  </Link>
                  <button onClick={handleLogout} className="mt-4 w-full px-4 py-3 rounded-xl font-bold text-red-600 hover:bg-red-50 transition-colors text-left">
                    Cerrar Sesión
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-xl font-bold text-slate-700 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                    Iniciar sesión
                  </Link>
                  <Link href="/register" onClick={() => setMenuOpen(false)} className="mt-2 w-full btn-primary text-center py-3 font-bold">
                    Crear cuenta
                  </Link>
                </>
              )}
            </div>

            {user && (
              <div className="mt-auto pt-6 border-t border-slate-100">
                <p className="text-xs text-slate-400 font-medium">Sesión activa como</p>
                <p className="font-bold text-slate-800">{user.username}</p>
                <span className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">{user.role}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
