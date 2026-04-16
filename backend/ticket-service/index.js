const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5003;
const EVENTS_SERVICE_URL        = process.env.EVENTS_SERVICE_URL        || 'http://events-service:5002';
const NOTIFICATION_SERVICE_URL  = process.env.NOTIFICATION_SERVICE_URL  || 'http://notification-service:5007';

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[TicketService] RECIBIDO: ${req.method} ${req.url}`);
  next();
});

const sequelize = new Sequelize(
  process.env.DB_NAME || 'tickets_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || 'root',
  { host: process.env.DB_HOST || 'localhost', dialect: 'mysql', logging: false }
);

const Ticket = sequelize.define('Ticket', {
  userId:       { type: DataTypes.INTEGER, allowNull: false },
  eventId:      { type: DataTypes.INTEGER, allowNull: false },
  categoryId:   { type: DataTypes.INTEGER, allowNull: true },
  purchaseDate: { type: DataTypes.DATE,    defaultValue: DataTypes.NOW }
});

// Helper de fallback Docker → localhost
const getEvent = async (eventId) => {
  try {
    return await axios.get(`${EVENTS_SERVICE_URL}/${eventId}`);
  } catch {
    return await axios.get(`http://localhost:5002/${eventId}`);
  }
};

// 0. IDs de usuarios con ticket en un evento (para notification-service broadcast)
app.get('/event-users/:eventId', async (req, res) => {
  try {
    const tickets = await Ticket.findAll({
      where: { eventId: req.params.eventId },
      attributes: ['userId']
    });
    // Devolver IDs únicos
    const userIds = [...new Set(tickets.map(t => t.userId))];
    res.json({ eventId: parseInt(req.params.eventId), userIds });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 1. Estadísticas de tickets por evento (para Cartera del admin)
app.get('/event-stats/:eventId', async (req, res) => {
  try {
    const tickets = await Ticket.findAll({ where: { eventId: req.params.eventId } });
    const byCategory = {};
    tickets.forEach(t => {
      const key = t.categoryId ? String(t.categoryId) : 'sin_categoria';
      byCategory[key] = (byCategory[key] || 0) + 1;
    });
    res.json({ total: tickets.length, byCategory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Detalles de un ticket
app.get('/details/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });
    try {
      const eventRes = await getEvent(ticket.eventId);
      res.json({ id: ticket.id, purchaseDate: ticket.purchaseDate, userId: ticket.userId, categoryId: ticket.categoryId, event: eventRes.data });
    } catch {
      res.json({ id: ticket.id, purchaseDate: ticket.purchaseDate, userId: ticket.userId, categoryId: ticket.categoryId, event: { title: "Evento no disponible" } });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Tickets de un usuario (dashboard)
app.get('/user/:userId', async (req, res) => {
  try {
    const tickets = await Ticket.findAll({ where: { userId: req.params.userId } });
    const ticketsWithDetails = await Promise.all(tickets.map(async (t) => {
      try {
        const eventRes = await getEvent(t.eventId);
        return { id: t.id, purchaseDate: t.purchaseDate, categoryId: t.categoryId, event: eventRes.data };
      } catch {
        return { id: t.id, purchaseDate: t.purchaseDate, categoryId: t.categoryId, event: { title: "Evento no disponible" } };
      }
    }));
    res.json(ticketsWithDetails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Comprar ticket
app.post('/', async (req, res) => {
  try {
    const ticket = await Ticket.create(req.body);
    // Si tiene categoryId, incrementar sold en events-service
    if (req.body.categoryId) {
      try {
        const incUrl = `${EVENTS_SERVICE_URL}/categories/${req.body.categoryId}/increment`;
        await axios.patch(incUrl).catch(() => axios.patch(`http://localhost:5002/categories/${req.body.categoryId}/increment`));
      } catch (e) {
        console.log('[TicketService] No se pudo incrementar sold de categoría:', e.message);
      }
    }
    res.status(201).json(ticket);

    // Disparar notificación ticket.purchased (no bloqueante — si falla, el ticket ya está creado)
    axios.post(`${NOTIFICATION_SERVICE_URL}/notify`, {
      type:     'ticket.purchased',
      userId:   ticket.userId,
      eventId:  ticket.eventId,
      ticketId: ticket.id
    }).catch(e => console.log('[TicketService] Notificación no enviada (no crítico):', e.message));

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.use((req, res) => {
  console.log(`[TicketService] 404 en: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Ruta no encontrada en TICKET SERVICE', urlReceived: req.url });
});

sequelize.sync({ alter: true }).then(() => {
  app.listen(PORT, () => console.log(`Ticket Service running on port ${PORT}`));
}).catch(err => console.error('Database connection failed:', err));
