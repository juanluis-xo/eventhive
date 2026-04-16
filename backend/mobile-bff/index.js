const express     = require('express');
const cors        = require('cors');
const morgan      = require('morgan');
const compression = require('compression');
const axios       = require('axios');
const { Sequelize, DataTypes, Op } = require('sequelize');

const app  = express();
const PORT = process.env.PORT || 5008;

// ── Base de datos propia ──────────────────────────────────────────────────────
const sequelize = new Sequelize(
  process.env.DB_NAME || 'mobile_bff_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || 'root',
  { host: process.env.DB_HOST || 'localhost', dialect: 'mysql', logging: false }
);

// Modelo 1: Dispositivos móviles registrados (push notifications por dispositivo)
const Device = sequelize.define('Device', {
  userId:     { type: DataTypes.INTEGER, allowNull: false },
  deviceId:   { type: DataTypes.STRING,  allowNull: false, unique: true },  // UUID del dispositivo
  platform:   { type: DataTypes.ENUM('ios', 'android', 'web'), defaultValue: 'android' },
  appVersion: { type: DataTypes.STRING,  allowNull: true },
  pushToken:  { type: DataTypes.STRING,  allowNull: true },  // FCM/APNs token
  lastSeen:   { type: DataTypes.DATE,    defaultValue: DataTypes.NOW },
  active:     { type: DataTypes.BOOLEAN, defaultValue: true }
});

// Modelo 2: Preferencias del usuario para la app móvil
const MobilePreference = sequelize.define('MobilePreference', {
  userId:             { type: DataTypes.INTEGER, allowNull: false, unique: true },
  theme:              { type: DataTypes.ENUM('light', 'dark', 'auto'), defaultValue: 'auto' },
  language:           { type: DataTypes.STRING,  defaultValue: 'es' },
  notifyPush:         { type: DataTypes.BOOLEAN, defaultValue: true },
  notifyEmail:        { type: DataTypes.BOOLEAN, defaultValue: true },
  notifyReminders:    { type: DataTypes.BOOLEAN, defaultValue: true },
  notifyAnnouncements:{ type: DataTypes.BOOLEAN, defaultValue: true }
});

// Modelo 3: Métricas de uso de endpoints móviles
const ApiMetric = sequelize.define('ApiMetric', {
  endpoint:     { type: DataTypes.STRING,  allowNull: false },
  method:       { type: DataTypes.STRING,  allowNull: false },
  userId:       { type: DataTypes.INTEGER, allowNull: true },
  responseTime: { type: DataTypes.INTEGER, allowNull: false },  // ms
  statusCode:   { type: DataTypes.INTEGER, allowNull: false },
  cacheHit:     { type: DataTypes.BOOLEAN, defaultValue: false }
});

// ── URLs de servicios internos ────────────────────────────────────────────────
const SVC = {
  users:   process.env.USER_SERVICE_URL         || 'http://user-service:5001',
  events:  process.env.EVENTS_SERVICE_URL       || 'http://events-service:5002',
  tickets: process.env.TICKETS_SERVICE_URL      || 'http://ticket-service:5003',
  reviews: process.env.REVIEWS_SERVICE_URL      || 'http://review-service:5004',
  payment: process.env.PAYMENT_SERVICE_URL      || 'http://payment-service:5005',
  notifs:  process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:5007',
};

// Fallback localhost para cuando el BFF corre fuera de Docker
const LOCAL = {
  users:   'http://localhost:5001',
  events:  'http://localhost:5002',
  tickets: 'http://localhost:5003',
  reviews: 'http://localhost:5004',
  payment: 'http://localhost:5005',
  notifs:  'http://localhost:5007',
};

// ── Middlewares ───────────────────────────────────────────────────────────────
app.use(compression());   // gzip → respuestas ~70 % más pequeñas
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[MobileBFF] ${req.method} ${req.url}`);
  next();
});

// ── Cache en memoria (TTL simple, sin dependencias externas) ──────────────────
const _cache = new Map();

function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.exp) { _cache.delete(key); return null; }
  return entry.data;
}

function cacheSet(key, data, ttlMs = 30_000) {
  _cache.set(key, { data, exp: Date.now() + ttlMs });
}

// ── Helper: llamada HTTP con fallback Docker → localhost ──────────────────────
async function get(svcKey, path) {
  try {
    const r = await axios.get(`${SVC[svcKey]}${path}`, { timeout: 5000 });
    return r.data;
  } catch {
    const r = await axios.get(`${LOCAL[svcKey]}${path}`, { timeout: 5000 });
    return r.data;
  }
}

// Versión que nunca lanza — devuelve null si falla
async function safeGet(svcKey, path, fallback = null) {
  try { return await get(svcKey, path); }
  catch { return fallback; }
}

// ── Helper: código de ticket ──────────────────────────────────────────────────
function ticketCode(id, purchaseDate) {
  const year = purchaseDate ? new Date(purchaseDate).getFullYear() : new Date().getFullYear();
  return `EH-${year}-X${String(id).padStart(4, '0')}`;
}

// ── Helper: URL de verificación ──────────────────────────────────────────────
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
function verifyUrl(code) {
  return `${APP_URL}/verify/${code}`;
}

// ── Helper: separar tickets en próximos / pasados ─────────────────────────────
function splitByDate(tickets) {
  const now = new Date();
  const upcoming = [];
  const past     = [];

  tickets.forEach(t => {
    const eventDate = t.event?.date ? new Date(t.event.date) : null;
    const slot = (eventDate && eventDate >= now) ? upcoming : past;
    slot.push(t);
  });

  upcoming.sort((a, b) => new Date(a.event?.date) - new Date(b.event?.date));
  past.sort((a, b)     => new Date(b.event?.date) - new Date(a.event?.date));
  return { upcoming, past };
}

// ─────────────────────────────────────────────────────────────────────────────
//  ENDPOINTS PARA ASISTENTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /home/:userId
 * Pantalla de inicio del asistente — una sola llamada devuelve:
 *   • Perfil del usuario
 *   • Próximos 2 tickets  (con datos del evento)
 *   • Contador de notificaciones no leídas
 *   • Hasta 6 eventos destacados
 */
app.get('/home/:userId', async (req, res) => {
  const { userId } = req.params;
  const cacheKey = `home:${userId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return res.json({ ...cached, _cache: true });

  try {
    // Llamadas en paralelo a 4 servicios simultáneamente
    const [profile, allTickets, allEvents, unread] = await Promise.all([
      safeGet('users',   `/profile/${userId}`,         {}),
      safeGet('tickets', `/user/${userId}`,             []),
      safeGet('events',  '/',                           []),
      safeGet('notifs',  `/unread/${userId}`,           { count: 0 }),
    ]);

    // Próximos 2 tickets (con evento futuro)
    const now = new Date();
    const upcomingTickets = allTickets
      .filter(t => t.event?.date && new Date(t.event.date) >= now)
      .sort((a, b) => new Date(a.event.date) - new Date(b.event.date))
      .slice(0, 2)
      .map(t => {
        const code = ticketCode(t.id, t.purchaseDate);
        return {
          ticketId:    t.id,
          code,
          verifyUrl:   verifyUrl(code),
          purchaseDate: t.purchaseDate,
          event: {
            id:       t.event.id,
            title:    t.event.title,
            date:     t.event.date,
            location: t.event.location,
            imageUrl: t.event.imageUrl || null,
          },
        };
      });

    // Hasta 6 eventos destacados (próximos, precio más bajo primero)
    const featuredEvents = (Array.isArray(allEvents) ? allEvents : [])
      .filter(e => e.date && new Date(e.date) >= now)
      .sort((a, b) => parseFloat(a.price || 0) - parseFloat(b.price || 0))
      .slice(0, 6)
      .map(e => ({
        id:          e.id,
        title:       e.title,
        date:        e.date,
        location:    e.location,
        category:    e.category,
        price:       parseFloat(e.price || 0),
        imageUrl:    e.imageUrl || null,
        totalTickets: e.categories?.reduce((s, c) => s + (c.capacity || 0), 0) || null,
        available:    e.categories?.reduce((s, c) => s + Math.max(0, (c.capacity || 0) - (c.sold || 0)), 0) || null,
      }));

    const payload = {
      user: {
        id:       profile.id,
        username: profile.username,
        email:    profile.email,
        role:     profile.role,
      },
      upcomingTickets,
      totalTickets:          allTickets.length,
      unreadNotifications:   unread?.count ?? 0,
      featuredEvents,
      _generatedAt: new Date().toISOString(),
    };

    cacheSet(cacheKey, payload, 30_000);   // 30 s de caché
    res.json(payload);

  } catch (err) {
    console.error('[MobileBFF /home]', err.message);
    res.status(500).json({ error: 'Error al construir la pantalla de inicio.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /agenda/:userId
 * Agenda completa del asistente — separa tickets en próximos y pasados.
 */
app.get('/agenda/:userId', async (req, res) => {
  const { userId } = req.params;
  const cacheKey = `agenda:${userId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return res.json({ ...cached, _cache: true });

  try {
    const allTickets = await get('tickets', `/user/${userId}`);

    const mapped = allTickets.map(t => {
      const code = ticketCode(t.id, t.purchaseDate);
      return {
        ticketId:     t.id,
        code,
        verifyUrl:    verifyUrl(code),
        purchaseDate: t.purchaseDate,
        section:      'Premium',
        event: {
          id:       t.event?.id,
          title:    t.event?.title    || 'Evento',
          date:     t.event?.date     || null,
          location: t.event?.location || null,
          imageUrl: t.event?.imageUrl || null,
          category: t.event?.category || null,
        },
      };
    });

    const { upcoming, past } = splitByDate(mapped);
    const payload = { upcoming, past, total: mapped.length };

    cacheSet(cacheKey, payload, 30_000);
    res.json(payload);

  } catch (err) {
    console.error('[MobileBFF /agenda]', err.message);
    res.status(500).json({ error: 'No se pudo obtener la agenda.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /credential/:ticketId
 * Credencial digital del ticket — todo lo necesario para mostrar el QR offline.
 */
app.get('/credential/:ticketId', async (req, res) => {
  const { ticketId } = req.params;

  try {
    const ticket = await get('tickets', `/details/${ticketId}`);
    const code   = ticketCode(ticket.id, ticket.purchaseDate);
    const url    = verifyUrl(code);

    const payload = {
      ticketId:     ticket.id,
      code,
      verifyUrl:    url,
      qrPayload:    url,                   // lo que el QR debe codificar
      purchaseDate: ticket.purchaseDate,
      userId:       ticket.userId,
      section:      'Premium',
      event: {
        id:       ticket.event?.id,
        title:    ticket.event?.title    || 'Evento',
        date:     ticket.event?.date     || null,
        location: ticket.event?.location || null,
        imageUrl: ticket.event?.imageUrl || null,
      },
    };

    res.json(payload);

  } catch (err) {
    console.error('[MobileBFF /credential]', err.message);
    res.status(404).json({ error: 'Ticket no encontrado.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /notifications/:userId
 * Notificaciones del usuario con contador de no leídas.
 */
app.get('/notifications/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const [notifs, unread] = await Promise.all([
      safeGet('notifs', `/user/${userId}`,   []),
      safeGet('notifs', `/unread/${userId}`, { count: 0 }),
    ]);

    const items = (Array.isArray(notifs) ? notifs : []).map(n => ({
      id:        n.id,
      type:      n.type,
      title:     n.title,
      body:      n.body,
      read:      !!n.readAt,
      createdAt: n.createdAt,
    }));

    res.json({
      items,
      unreadCount: unread?.count ?? 0,
      total:       items.length,
    });

  } catch (err) {
    console.error('[MobileBFF /notifications]', err.message);
    res.status(500).json({ error: 'No se pudieron obtener las notificaciones.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /event/:eventId
 * Detalle completo de un evento optimizado para móvil —
 * combina datos del evento, reseñas y disponibilidad.
 */
app.get('/event/:eventId', async (req, res) => {
  const { eventId } = req.params;
  const cacheKey = `event:${eventId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return res.json({ ...cached, _cache: true });

  try {
    const [event, reviewsData] = await Promise.all([
      get('events',  `/${eventId}`),
      safeGet('reviews', `/event/${eventId}`, { count: 0, average: 0, reviews: [] }),
    ]);

    const categories = (event.categories || []).map(c => ({
      id:        c.id,
      name:      c.name,
      price:     parseFloat(c.price || 0),
      capacity:  c.capacity,
      sold:      c.sold || 0,
      available: Math.max(0, c.capacity - (c.sold || 0)),
    }));

    const totalCapacity  = categories.reduce((s, c) => s + c.capacity,  0);
    const totalSold      = categories.reduce((s, c) => s + c.sold,      0);
    const totalAvailable = categories.reduce((s, c) => s + c.available, 0);
    const soldOutPct     = totalCapacity > 0
      ? Math.round((totalSold / totalCapacity) * 100)
      : 0;

    // Últimas 5 reseñas para la vista mobile
    const recentReviews = (reviewsData.reviews || []).slice(0, 5).map(r => ({
      id:       r.id,
      username: r.username,
      rating:   r.rating,
      comment:  r.comment,
      date:     r.createdAt,
    }));

    const payload = {
      id:              event.id,
      title:           event.title,
      date:            event.date,
      location:        event.location,
      category:        event.category,
      description:     event.description,
      fullDescription: event.fullDescription,
      organizer:       event.organizer,
      imageUrl:        event.imageUrl || null,
      priceFrom:       categories.length > 0
                         ? Math.min(...categories.map(c => c.price))
                         : parseFloat(event.price || 0),
      categories,
      availability: {
        totalCapacity,
        totalSold,
        totalAvailable,
        soldOutPct,
        isSoldOut: totalAvailable === 0 && totalCapacity > 0,
      },
      reviews: {
        count:   reviewsData.count   || 0,
        average: reviewsData.average || 0,
        recent:  recentReviews,
      },
    };

    cacheSet(cacheKey, payload, 60_000);   // 1 min caché para eventos
    res.json(payload);

  } catch (err) {
    console.error('[MobileBFF /event]', err.message);
    res.status(500).json({ error: 'No se pudo obtener el evento.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /search?q=&category=&location=&page=1
 * Búsqueda de eventos optimizada para móvil (paginada, 10 por página).
 */
app.get('/search', async (req, res) => {
  const { q = '', category = '', location = '', page = '1' } = req.query;
  const PAGE_SIZE = 10;
  const pageNum   = Math.max(1, parseInt(page, 10));

  try {
    const allEvents = await get('events', '/');
    const now = new Date();

    let results = (Array.isArray(allEvents) ? allEvents : [])
      .filter(e => new Date(e.date) >= now); // solo eventos futuros

    if (q)        results = results.filter(e =>
      e.title?.toLowerCase().includes(q.toLowerCase()) ||
      e.description?.toLowerCase().includes(q.toLowerCase())
    );
    if (category) results = results.filter(e =>
      e.category?.toLowerCase() === category.toLowerCase()
    );
    if (location) results = results.filter(e =>
      e.location?.toLowerCase().includes(location.toLowerCase())
    );

    const total    = results.length;
    const pages    = Math.ceil(total / PAGE_SIZE);
    const paginated = results
      .slice((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE)
      .map(e => ({
        id:       e.id,
        title:    e.title,
        date:     e.date,
        location: e.location,
        category: e.category,
        price:    parseFloat(e.price || 0),
        imageUrl: e.imageUrl || null,
        available: e.categories
          ? e.categories.reduce((s, c) => s + Math.max(0, (c.capacity || 0) - (c.sold || 0)), 0)
          : null,
      }));

    res.json({
      results:  paginated,
      total,
      page:     pageNum,
      pages,
      hasNext:  pageNum < pages,
      hasPrev:  pageNum > 1,
    });

  } catch (err) {
    console.error('[MobileBFF /search]', err.message);
    res.status(500).json({ error: 'Error en la búsqueda.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  ENDPOINTS PARA ORGANIZADORES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /organizer/dashboard/:username
 * Panel del organizador — mis eventos con estadísticas de tickets y reseñas.
 */
app.get('/organizer/dashboard/:username', async (req, res) => {
  const { username } = req.params;
  const cacheKey = `org-dashboard:${username}`;
  const cached = cacheGet(cacheKey);
  if (cached) return res.json({ ...cached, _cache: true });

  try {
    // 1. Eventos del organizador
    const myEvents = await get('events', `/organizer/${username}`);
    const events   = Array.isArray(myEvents) ? myEvents : [];

    // 2. Para cada evento: estadísticas de tickets + últimas reseñas (en paralelo)
    const enriched = await Promise.all(
      events.map(async e => {
        const [stats, reviewsData] = await Promise.all([
          safeGet('tickets', `/event-stats/${e.id}`, { total: 0, byCategory: {} }),
          safeGet('reviews', `/event/${e.id}`,        { count: 0, average: 0, reviews: [] }),
        ]);

        const categories = (e.categories || []).map(c => ({
          id:        c.id,
          name:      c.name,
          price:     parseFloat(c.price || 0),
          capacity:  c.capacity,
          sold:      stats.byCategory?.[String(c.id)] || c.sold || 0,
          available: Math.max(0, c.capacity - (stats.byCategory?.[String(c.id)] || c.sold || 0)),
        }));

        const totalCapacity = categories.reduce((s, c) => s + c.capacity, 0);

        return {
          id:           e.id,
          title:        e.title,
          date:         e.date,
          location:     e.location,
          category:     e.category,
          imageUrl:     e.imageUrl || null,
          isUpcoming:   e.date ? new Date(e.date) >= new Date() : false,
          categories,
          stats: {
            totalTicketsSold: stats.total || 0,
            totalCapacity,
            occupancyPct: totalCapacity > 0
              ? Math.round(((stats.total || 0) / totalCapacity) * 100)
              : 0,
          },
          reviews: {
            count:   reviewsData.count   || 0,
            average: reviewsData.average || 0,
            latest:  (reviewsData.reviews || []).slice(0, 3).map(r => ({
              username: r.username,
              rating:   r.rating,
              comment:  r.comment,
              date:     r.createdAt,
            })),
          },
        };
      })
    );

    // Totales globales
    const totalAttendees = enriched.reduce((s, e) => s + e.stats.totalTicketsSold, 0);
    const activeEvents   = enriched.filter(e => e.isUpcoming).length;

    const payload = {
      username,
      summary: {
        totalEvents:    enriched.length,
        activeEvents,
        totalAttendees,
        avgRating: enriched.length > 0
          ? parseFloat(
              (enriched.reduce((s, e) => s + (e.reviews.average || 0), 0) / enriched.length)
              .toFixed(1)
            )
          : 0,
      },
      events:      enriched,
      _generatedAt: new Date().toISOString(),
    };

    cacheSet(cacheKey, payload, 45_000);   // 45 s caché
    res.json(payload);

  } catch (err) {
    console.error('[MobileBFF /organizer/dashboard]', err.message);
    res.status(500).json({ error: 'No se pudo construir el panel del organizador.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /organizer/event/:eventId
 * Vista de gestión de un evento específico para el organizador.
 */
app.get('/organizer/event/:eventId', async (req, res) => {
  const { eventId } = req.params;

  try {
    const [event, stats, reviewsData, attendeeData] = await Promise.all([
      get('events',  `/${eventId}`),
      safeGet('tickets', `/event-stats/${eventId}`,    { total: 0, byCategory: {} }),
      safeGet('reviews', `/event/${eventId}`,          { count: 0, average: 0, reviews: [] }),
      safeGet('tickets', `/event-users/${eventId}`,    { userIds: [] }),
    ]);

    const categories = (event.categories || []).map(c => ({
      id:        c.id,
      name:      c.name,
      price:     parseFloat(c.price || 0),
      capacity:  c.capacity,
      sold:      stats.byCategory?.[String(c.id)] || c.sold || 0,
      available: Math.max(0, c.capacity - (stats.byCategory?.[String(c.id)] || c.sold || 0)),
      revenue:   parseFloat(c.price || 0) * (stats.byCategory?.[String(c.id)] || c.sold || 0),
    }));

    const totalCapacity  = categories.reduce((s, c) => s + c.capacity, 0);
    const totalSold      = stats.total || 0;
    const totalRevenue   = categories.reduce((s, c) => s + c.revenue, 0);

    res.json({
      id:       event.id,
      title:    event.title,
      date:     event.date,
      location: event.location,
      imageUrl: event.imageUrl || null,
      categories,
      stats: {
        totalSold,
        totalCapacity,
        totalAttendees: (attendeeData?.userIds || []).length,
        totalRevenue:   parseFloat(totalRevenue.toFixed(2)),
        occupancyPct:   totalCapacity > 0
          ? Math.round((totalSold / totalCapacity) * 100)
          : 0,
      },
      reviews: {
        count:   reviewsData.count   || 0,
        average: reviewsData.average || 0,
        items:   (reviewsData.reviews || []).map(r => ({
          id:       r.id,
          username: r.username,
          rating:   r.rating,
          comment:  r.comment,
          date:     r.createdAt,
        })),
      },
    });

  } catch (err) {
    console.error('[MobileBFF /organizer/event]', err.message);
    res.status(500).json({ error: 'No se pudo obtener el evento.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  MARCAR NOTIFICACIÓN COMO LEÍDA (proxy ligero)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PATCH /notifications/:id/read
 * Marca una notificación como leída (proxy al notification-service).
 */
app.patch('/notifications/:id/read', async (req, res) => {
  try {
    const r = await axios.patch(
      `${SVC.notifs}/${req.params.id}/read`,
      {}, { timeout: 5000 }
    ).catch(() =>
      axios.patch(`${LOCAL.notifs}/${req.params.id}/read`, {}, { timeout: 5000 })
    );
    res.json(r.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /notifications/user/:userId/read-all
 * Marca todas las notificaciones del usuario como leídas.
 */
app.patch('/notifications/user/:userId/read-all', async (req, res) => {
  try {
    const r = await axios.patch(
      `${SVC.notifs}/user/${req.params.userId}/read-all`,
      {}, { timeout: 5000 }
    ).catch(() =>
      axios.patch(`${LOCAL.notifs}/user/${req.params.userId}/read-all`, {}, { timeout: 5000 })
    );
    res.json(r.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  HEALTH & INFO
// ─────────────────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status:    'Mobile BFF running',
    port:      PORT,
    cacheSize: _cache.size,
    services:  Object.keys(SVC),
    endpoints: {
      attendee: [
        'GET /home/:userId         → pantalla de inicio (perfil + tickets + eventos + notifs)',
        'GET /agenda/:userId       → agenda completa (próximos + pasados)',
        'GET /credential/:ticketId → credencial QR del ticket',
        'GET /notifications/:userId→ notificaciones con contador',
        'GET /event/:eventId       → detalle de evento con reseñas y disponibilidad',
        'GET /search?q=&category=&location=&page= → búsqueda paginada',
      ],
      organizer: [
        'GET /organizer/dashboard/:username → panel con todos los eventos + stats',
        'GET /organizer/event/:eventId      → gestión de un evento específico',
      ],
      utils: [
        'PATCH /notifications/:id/read',
        'PATCH /notifications/user/:userId/read-all',
      ],
    },
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada en Mobile BFF', url: req.url });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Mobile BFF corriendo en puerto ${PORT}`);
  console.log(`   Compresión gzip:  ✅ activa`);
  console.log(`   Caché en memoria: ✅ activa (TTL 30-60 s)`);
  console.log(`   Servicios:        ${Object.entries(SVC).map(([k,v]) => `${k}→${v}`).join(' | ')}\n`);
});
