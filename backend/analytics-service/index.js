const express = require('express');
const cors    = require('cors');
const jwt     = require('jsonwebtoken');
const { Sequelize, DataTypes, Op } = require('sequelize');
const axios   = require('axios');
const cron    = require('node-cron');

const app        = express();
const PORT       = process.env.PORT       || 5006;
const JWT_SECRET = process.env.JWT_SECRET || 'eventhive_secret_key_2026';
const EVENTS_URL  = process.env.EVENTS_SERVICE_URL  || 'http://events-service:5002';
const TICKETS_URL = process.env.TICKETS_SERVICE_URL || 'http://ticket-service:5003';
const REVIEWS_URL = process.env.REVIEWS_SERVICE_URL || 'http://review-service:5004';

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[Analytics] ${req.method} ${req.url}`);
  next();
});

// ── MIDDLEWARE ADMIN ──────────────────────────────────────────────────────────
function verifyAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No autorizado. Se requiere token.' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token no proporcionado.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin')
      return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

// ── BASE DE DATOS PROPIA ──────────────────────────────────────────────────────
const sequelize = new Sequelize(
  process.env.DB_NAME || 'analytics_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || 'root',
  { host: process.env.DB_HOST || 'localhost', dialect: 'mysql', logging: false }
);

// Snapshot global por evento (se sobreescribe en cada ciclo)
const EventSnapshot = sequelize.define('EventSnapshot', {
  eventId:      { type: DataTypes.INTEGER,        allowNull: false, unique: true },
  title:        { type: DataTypes.STRING,          allowNull: true },
  category:     { type: DataTypes.STRING,          allowNull: true },
  eventDate:    { type: DataTypes.STRING,          allowNull: true },
  location:     { type: DataTypes.STRING,          allowNull: true },
  totalRevenue: { type: DataTypes.DECIMAL(12, 2),  defaultValue: 0 },
  totalCapacity:{ type: DataTypes.INTEGER,         defaultValue: 0 },
  totalSold:    { type: DataTypes.INTEGER,         defaultValue: 0 },
  occupancyPct: { type: DataTypes.DECIMAL(5, 2),   defaultValue: 0 },
  avgRating:    { type: DataTypes.DECIMAL(3, 2),   defaultValue: 0 },
  reviewCount:  { type: DataTypes.INTEGER,         defaultValue: 0 },
  lastUpdatedAt:{ type: DataTypes.DATE,            defaultValue: DataTypes.NOW }
});

// Snapshot por categoría de cada evento
const CategorySnapshot = sequelize.define('CategorySnapshot', {
  eventId:    { type: DataTypes.INTEGER,       allowNull: false },
  categoryId: { type: DataTypes.INTEGER,       allowNull: false },
  name:       { type: DataTypes.STRING,        allowNull: true },
  price:      { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  capacity:   { type: DataTypes.INTEGER,       defaultValue: 0 },
  sold:       { type: DataTypes.INTEGER,       defaultValue: 0 },
  revenue:    { type: DataTypes.DECIMAL(12,2), defaultValue: 0 }
});

// Serie temporal diaria de ventas por evento
const DailySale = sequelize.define('DailySale', {
  eventId:   { type: DataTypes.INTEGER,  allowNull: false },
  saleDate:  { type: DataTypes.DATEONLY, allowNull: false },
  totalSold: { type: DataTypes.INTEGER,  defaultValue: 0 }
});

// ── HELPER: llamada con fallback Docker → localhost ───────────────────────────
const safeGet = async (dockerUrl, fallbackPort, path) => {
  try {
    return await axios.get(dockerUrl);
  } catch {
    return await axios.get(`http://localhost:${fallbackPort}${path}`);
  }
};

// ── COLECTOR PRINCIPAL ────────────────────────────────────────────────────────
const collect = async () => {
  try {
    console.log('[Analytics] Iniciando recolección de datos...');

    // 1. Obtener todos los eventos con sus categorías
    const eventsRes = await safeGet(`${EVENTS_URL}/`, 5002, '/');
    const events = eventsRes.data;
    if (!Array.isArray(events) || events.length === 0) {
      console.log('[Analytics] No hay eventos todavía.');
      return;
    }

    // 2. Obtener reseñas de todos los eventos
    const eventIds = events.map(e => e.id).join(',');
    let reviewsMap = {};
    try {
      const reviewsRes = await safeGet(`${REVIEWS_URL}/stats?eventIds=${eventIds}`, 5004, `/stats?eventIds=${eventIds}`);
      if (Array.isArray(reviewsRes.data)) {
        reviewsRes.data.forEach(r => { reviewsMap[r.eventId] = r; });
      }
    } catch (e) {
      console.log('[Analytics] No se pudo obtener reseñas:', e.message);
    }

    const today = new Date().toISOString().split('T')[0];

    // 3. Procesar cada evento
    for (const event of events) {
      const cats         = event.categories || [];
      const totalRevenue = cats.reduce((s, c) => s + (c.sold * parseFloat(c.price || 0)), 0);
      const totalCapacity= cats.reduce((s, c) => s + (parseInt(c.capacity) || 0), 0);
      const totalSold    = cats.reduce((s, c) => s + (parseInt(c.sold) || 0), 0);
      const occupancyPct = totalCapacity > 0 ? (totalSold / totalCapacity) * 100 : 0;
      const review       = reviewsMap[event.id] || { average: 0, count: 0 };

      // Upsert EventSnapshot
      const existSnap = await EventSnapshot.findOne({ where: { eventId: event.id } });
      const snapData = {
        title: event.title, category: event.category,
        eventDate: event.date, location: event.location,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalCapacity, totalSold,
        occupancyPct: parseFloat(occupancyPct.toFixed(2)),
        avgRating: parseFloat(review.average || 0),
        reviewCount: parseInt(review.count || 0),
        lastUpdatedAt: new Date()
      };
      if (existSnap) {
        await existSnap.update(snapData);
      } else {
        await EventSnapshot.create({ eventId: event.id, ...snapData });
      }

      // Refrescar CategorySnapshots
      await CategorySnapshot.destroy({ where: { eventId: event.id } });
      for (const cat of cats) {
        await CategorySnapshot.create({
          eventId:    event.id,
          categoryId: cat.id,
          name:       cat.name,
          price:      parseFloat(cat.price || 0),
          capacity:   parseInt(cat.capacity) || 0,
          sold:       parseInt(cat.sold) || 0,
          revenue:    parseFloat(((cat.sold || 0) * parseFloat(cat.price || 0)).toFixed(2))
        });
      }

      // Upsert DailySale (serie temporal)
      const existDay = await DailySale.findOne({ where: { eventId: event.id, saleDate: today } });
      if (existDay) {
        await existDay.update({ totalSold });
      } else {
        await DailySale.create({ eventId: event.id, saleDate: today, totalSold });
      }
    }

    console.log(`[Analytics] Recolección completada: ${events.length} eventos procesados.`);
  } catch (err) {
    console.error('[Analytics] Error en recolección:', err.message);
  }
};

// Cron: cada 3 minutos (no se programa en tests)
/* istanbul ignore next */
if (require.main === module) {
  cron.schedule('*/3 * * * *', collect);
}

// ── ENDPOINTS ─────────────────────────────────────────────────────────────────

app.get('/health', (req, res) =>
  res.json({ status: 'Analytics Service is running', port: PORT })
);

// KPIs globales
app.get('/overview', verifyAdmin, async (req, res) => {
  try {
    const snaps        = await EventSnapshot.findAll();
    const totalRevenue = snaps.reduce((s, e) => s + parseFloat(e.totalRevenue || 0), 0);
    const totalTickets = snaps.reduce((s, e) => s + (e.totalSold    || 0), 0);
    const totalCap     = snaps.reduce((s, e) => s + (e.totalCapacity|| 0), 0);
    const avgOccupancy = totalCap > 0 ? (totalTickets / totalCap) * 100 : 0;
    const rated        = snaps.filter(e => e.reviewCount > 0);
    const avgRating    = rated.length > 0
      ? rated.reduce((s, e) => s + parseFloat(e.avgRating || 0), 0) / rated.length
      : 0;
    const lastUpdated  = snaps.length > 0
      ? snaps.reduce((latest, s) => new Date(s.lastUpdatedAt) > new Date(latest) ? s.lastUpdatedAt : latest, snaps[0].lastUpdatedAt)
      : null;

    res.json({
      totalRevenue:  parseFloat(totalRevenue.toFixed(2)),
      totalTickets,
      totalCapacity: totalCap,
      avgOccupancy:  parseFloat(avgOccupancy.toFixed(1)),
      avgRating:     parseFloat(avgRating.toFixed(1)),
      totalEvents:   snaps.length,
      lastUpdated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Todos los eventos snapshot (para la lista del dashboard)
app.get('/events', verifyAdmin, async (req, res) => {
  try {
    const snaps = await EventSnapshot.findAll({ order: [['totalRevenue', 'DESC']] });
    res.json(snaps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Resumen de un evento
app.get('/events/:id/summary', verifyAdmin, async (req, res) => {
  try {
    const snap = await EventSnapshot.findOne({ where: { eventId: req.params.id } });
    if (!snap) return res.status(404).json({ error: 'Evento no encontrado en analytics' });
    res.json(snap);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Categorías de un evento
app.get('/events/:id/categories', verifyAdmin, async (req, res) => {
  try {
    const cats = await CategorySnapshot.findAll({ where: { eventId: req.params.id } });
    res.json(cats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serie temporal (últimos N días)
app.get('/events/:id/timeseries', verifyAdmin, async (req, res) => {
  try {
    const days  = parseInt(req.query.days) || 7;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const sales = await DailySale.findAll({
      where: { eventId: req.params.id, saleDate: { [Op.gte]: since } },
      order: [['saleDate', 'ASC']]
    });

    const result = sales.map((s, i) => ({
      date:       s.saleDate,
      totalSold:  s.totalSold,
      newTickets: i === 0 ? s.totalSold : Math.max(0, s.totalSold - sales[i - 1].totalSold)
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Forzar recolección inmediata
app.post('/refresh', verifyAdmin, async (req, res) => {
  try {
    await collect();
    res.json({ message: 'Datos actualizados correctamente' });
  } catch (/* istanbul ignore next */ err) {
    /* istanbul ignore next */
    res.status(500).json({ error: err.message });
  }
});

// 404
app.use((req, res) => {
  console.log(`[Analytics] 404: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Ruta no encontrada en ANALYTICS SERVICE', url: req.url });
});

// ── ARRANQUE CON REINTENTOS ───────────────────────────────────────────────────
/* istanbul ignore next */
const startWithRetry = async (attempt = 1) => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log('Analytics DB sincronizada');
    // Primera recolección 15s después (espera a que los otros servicios arranquen)
    setTimeout(collect, 15000);
    app.listen(PORT, () => console.log(`Analytics Service running on port ${PORT}`));
  } catch (err) {
    const MAX = 20;
    if (attempt >= MAX) {
      console.error(`[Analytics] Conexión a BD falló tras ${MAX} intentos. Abortando.`, err.message);
      process.exit(1);
    }
    console.log(`[Analytics] BD aún no lista (intento ${attempt}/${MAX}): ${err.message}. Reintentando en 3s...`);
    setTimeout(() => startWithRetry(attempt + 1), 3000);
  }
};

// Solo arranca si este archivo se ejecuta directamente (no en tests)
/* istanbul ignore next */
if (require.main === module) {
  startWithRetry();
}

module.exports = {
  app,
  EventSnapshot,
  CategorySnapshot,
  DailySale,
  sequelize,
  verifyAdmin,
  safeGet,
  collect
};
