import Link from 'next/link';
import { Calendar, MapPin } from 'lucide-react';

export default function EventCard({ event }) {
  // Usar una imagen real de placeholder basada en el id para variedad
  const imageUrl = `https://picsum.photos/seed/${event.id}/600/340`;

  return (
    <div className="card group">
      <div className="aspect-video relative overflow-hidden bg-slate-100">
        <img
          src={imageUrl}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }}
        />
        {/* Fallback gradient si falla la imagen */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-primary-500/30 to-primary-800/30"
          style={{ display: 'none' }}
        />
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-primary-700">
          {event.category || 'Destacado'}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-2 text-xs font-medium text-primary-600 mb-2">
          <Calendar className="w-3.5 h-3.5" />
          {event.date}
        </div>

        <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-1 group-hover:text-primary-600 transition-colors">
          {event.title}
        </h3>

        <p className="text-sm text-slate-500 mb-4 line-clamp-2">
          {event.description}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="w-3.5 h-3.5" />
            {event.location}
          </div>
          <Link
            href={`/detalle-evento?id=${event.id}`}
            className="text-sm font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 group/link"
          >
            Ver detalles
            <span className="group-hover/link:translate-x-1 transition-transform inline-block">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
