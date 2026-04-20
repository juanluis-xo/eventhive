const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
const PORT = process.env.PORT || 5002;
const JWT_SECRET = process.env.JWT_SECRET || 'eventhive_secret_key_2026';

app.use(cors());
app.use(express.json());

function verifyAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No autorizado. Se requiere token.' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token no proporcionado.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado. Solo administradores pueden realizar esta acción.' });
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

const sequelize = new Sequelize(
  process.env.DB_NAME || 'events_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || 'root',
  { host: process.env.DB_HOST || 'localhost', dialect: 'mysql', logging: false }
);

const Event = sequelize.define('Event', {
  title:           { type: DataTypes.STRING, allowNull: false },
  date:            { type: DataTypes.STRING, allowNull: false },
  location:        { type: DataTypes.STRING, allowNull: false },
  description:     { type: DataTypes.TEXT,   allowNull: false },
  fullDescription: { type: DataTypes.TEXT,   allowNull: false },
  category:        { type: DataTypes.STRING, allowNull: false },
  price:           { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  organizer:       { type: DataTypes.STRING, allowNull: false },
  imageUrl:        { type: DataTypes.TEXT,   allowNull: true }
});

const EventCategory = sequelize.define('EventCategory', {
  eventId:  { type: DataTypes.INTEGER,       allowNull: false },
  name:     { type: DataTypes.STRING,        allowNull: false },
  price:    { type: DataTypes.DECIMAL(10,2), allowNull: false },
  capacity: { type: DataTypes.INTEGER,       allowNull: false },
  sold:     { type: DataTypes.INTEGER,       defaultValue: 0 },
  // ── Mapa de zonas ──────────────────────────────────────────
  color:    { type: DataTypes.STRING,        allowNull: true },  // ej. "#ec4899"
  shape:    { type: DataTypes.ENUM('rect','polygon'), allowNull: true },
  coords:   { type: DataTypes.JSON,          allowNull: true },  // {x,y,w,h} o {points:"x1,y1 x2,y2..."}
});

const EventWallet = sequelize.define('EventWallet', {
  eventId:       { type: DataTypes.INTEGER, allowNull: false, unique: true },
  bankName:      { type: DataTypes.STRING,  allowNull: true },
  accountHolder: { type: DataTypes.STRING,  allowNull: true },
  accountNumber: { type: DataTypes.STRING,  allowNull: true },
  accountType:   { type: DataTypes.STRING,  defaultValue: 'savings' }
});

const attachCategories = async (events) => {
  const ids = Array.isArray(events) ? events.map(e => e.id) : [events.id];
  const cats = await EventCategory.findAll({ where: { eventId: ids } });
  if (!Array.isArray(events)) {
    return { ...events.toJSON(), categories: cats.map(c => c.toJSON()) };
  }
  return events.map(e => ({
    ...e.toJSON(),
    categories: cats.filter(c => c.eventId === e.id).map(c => c.toJSON())
  }));
};

// ── RUTAS ESPECÍFICAS ANTES QUE LAS GENÉRICAS ──────────────────────────────

app.get('/health', (req, res) => res.json({ status: 'Events Service is running' }));

app.get('/organizer/:username', async (req, res) => {
  try {
    const events = await Event.findAll({ where: { organizer: req.params.username } });
    res.json(await attachCategories(events));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rutas de categorías (deben ir ANTES de /:id para evitar conflictos)
app.put('/categories/:catId', verifyAdmin, async (req, res) => {
  try {
    await EventCategory.update(req.body, { where: { id: req.params.catId } });
    const cat = await EventCategory.findByPk(req.params.catId);
    res.json(cat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/categories/:catId', verifyAdmin, async (req, res) => {
  try {
    await EventCategory.destroy({ where: { id: req.params.catId } });
    res.json({ message: 'Categoría eliminada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/categories/:catId/increment', async (req, res) => {
  try {
    await EventCategory.increment('sold', { where: { id: req.params.catId } });
    const cat = await EventCategory.findByPk(req.params.catId);
    res.json(cat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── CRUD DE EVENTOS ────────────────────────────────────────────────────────

app.get('/', async (req, res) => {
  try {
    const events = await Event.findAll();
    res.json(await attachCategories(events));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/', verifyAdmin, async (req, res) => {
  try {
    const { categories, ...eventData } = req.body;
    const event = await Event.create(eventData);
    if (categories && categories.length > 0) {
      await Promise.all(categories.map(cat =>
        EventCategory.create({ name: cat.name, price: parseFloat(cat.price), capacity: parseInt(cat.capacity), sold: 0, eventId: event.id, color: cat.color || null, shape: cat.shape || null, coords: cat.coords || null })
      ));
    }
    const cats = await EventCategory.findAll({ where: { eventId: event.id } });
    res.status(201).json({ ...event.toJSON(), categories: cats.map(c => c.toJSON()) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Sub-rutas de /:id (ANTES de GET /:id genérico)
app.get('/:id/categories', async (req, res) => {
  try {
    const cats = await EventCategory.findAll({ where: { eventId: req.params.id } });
    res.json(cats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/:id/categories', verifyAdmin, async (req, res) => {
  try {
    const cat = await EventCategory.create({ ...req.body, eventId: parseInt(req.params.id) });
    res.status(201).json(cat);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/:id/wallet', async (req, res) => {
  try {
    const wallet = await EventWallet.findOne({ where: { eventId: req.params.id } });
    res.json(wallet || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/:id/wallet', verifyAdmin, async (req, res) => {
  try {
    const existing = await EventWallet.findOne({ where: { eventId: req.params.id } });
    if (existing) {
      await existing.update({ ...req.body, eventId: parseInt(req.params.id) });
      res.json(existing);
    } else {
      const wallet = await EventWallet.create({ ...req.body, eventId: parseInt(req.params.id) });
      res.json(wallet);
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET y acciones sobre un evento por ID
app.get('/:id', async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(await attachCategories(event));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/:id', verifyAdmin, async (req, res) => {
  try {
    const { categories, ...eventData } = req.body;
    await Event.update(eventData, { where: { id: req.params.id } });
    if (categories !== undefined) {
      // Conservar sold de categorías existentes al editar
      const existingCats = await EventCategory.findAll({ where: { eventId: req.params.id } });
      await EventCategory.destroy({ where: { eventId: req.params.id } });
      if (categories.length > 0) {
        await Promise.all(categories.map(cat => {
          const old = existingCats.find(ec => ec.name === cat.name);
          return EventCategory.create({
            name: cat.name,
            price: parseFloat(cat.price),
            capacity: parseInt(cat.capacity),
            sold: old ? old.sold : (cat.sold || 0),
            eventId: parseInt(req.params.id)
          });
        }));
      }
    }
    const updated = await Event.findByPk(req.params.id);
    const cats = await EventCategory.findAll({ where: { eventId: req.params.id } });
    res.json({ ...updated.toJSON(), categories: cats.map(c => c.toJSON()) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const result = await Event.destroy({ where: { id: req.params.id } });
    if (result) {
      await EventCategory.destroy({ where: { eventId: req.params.id } });
      await EventWallet.destroy({ where: { eventId: req.params.id } });
      res.json({ message: 'Event deleted' });
    } else {
      res.status(404).json({ error: 'Event not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

sequelize.sync({ alter: true }).then(() => {
  console.log('Events Database synced');
  app.listen(PORT, () => console.log(`Events Service running on port ${PORT}`));
}).catch(err => console.error('Unable to connect to the database:', err));
