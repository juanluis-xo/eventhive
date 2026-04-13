import Link from 'next/link';
import { Twitter, Linkedin, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-100 border-t border-slate-200 py-12 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4 group">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold group-hover:rotate-12 transition-all">
                E
              </div>
              <span className="text-xl font-bold text-slate-900 group-hover:text-primary-600 transition-colors">
                EventHive
              </span>
            </Link>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
              La plataforma moderna para gestionar y descubrir eventos que importan.
            </p>
            {/* Redes sociales */}
            <div className="flex items-center gap-3 mt-5">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:bg-primary-600 hover:text-white transition-all">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:bg-primary-600 hover:text-white transition-all">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="mailto:hola@eventhive.com"
                className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:bg-primary-600 hover:text-white transition-all">
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Explorar */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Explorar</h4>
            <ul className="space-y-2">
              <li><Link href="/eventos" className="text-sm text-slate-500 hover:text-primary-600 transition-colors">Eventos</Link></li>
              <li><Link href="/eventos?cat=tecnologia" className="text-sm text-slate-500 hover:text-primary-600 transition-colors">Tecnología</Link></li>
              <li><Link href="/eventos?cat=musica" className="text-sm text-slate-500 hover:text-primary-600 transition-colors">Música</Link></li>
            </ul>
          </div>

          {/* Soporte */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Soporte</h4>
            <ul className="space-y-2">
              <li><Link href="#" className="text-sm text-slate-500 hover:text-primary-600 transition-colors">Centro de ayuda</Link></li>
              <li><Link href="mailto:hola@eventhive.com" className="text-sm text-slate-500 hover:text-primary-600 transition-colors">Contacto</Link></li>
              <li><Link href="#" className="text-sm text-slate-500 hover:text-primary-600 transition-colors">Privacidad</Link></li>
            </ul>
          </div>

          {/* Comunidad */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Comunidad</h4>
            <ul className="space-y-2">
              <li><Link href="#" className="text-sm text-slate-500 hover:text-primary-600 transition-colors">Blog</Link></li>
              <li><Link href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:text-primary-600 transition-colors">Twitter / X</Link></li>
              <li><Link href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:text-primary-600 transition-colors">LinkedIn</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} EventHive Inc. Todos los derechos reservados.
          </p>
          <div className="flex gap-6 text-xs text-slate-400">
            <Link href="#" className="hover:text-slate-600 transition-colors">Términos</Link>
            <Link href="#" className="hover:text-slate-600 transition-colors">Privacidad</Link>
            <Link href="#" className="hover:text-slate-600 transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
