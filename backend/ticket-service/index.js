const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5003;
const EVENTS_SERVICE_URL = process.env.EVENTS_SERVICE_URL || 'http://events-service:5002';

app.use(cors());
app.use(express.json());

// Log de depuración para ver qué llega exactamente
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
  userId: { type: DataTypes.INTEGER, allowNull: false },
  eventId: { type: DataTypes.INTEGER, allowNull: false },
  purchaseDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// 1. RUTA DE DETALLES
app.get('/details/:id', async (req, res) => {
  try {
    const ticketId = req.params.id;
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });

    try {
      let eventUrl = `${EVENTS_SERVICE_URL}/${ticket.eventId}`;
      const eventRes = await axios.get(eventUrl).catch(async () => {
        const localUrl = `http://localhost:5002/${ticket.eventId}`;
        return await axios.get(localUrl);
      });
      res.json({ id: ticket.id, purchaseDate: ticket.purchaseDate, userId: ticket.userId, event: eventRes.data });
    } catch (e) {
      res.json({ id: ticket.id, purchaseDate: ticket.purchaseDate, userId: ticket.userId, event: { title: "Evento no disponible" } });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. RUTA DE USUARIO (DASHBOARD)
app.get('/user/:userId', async (req, res) => {
  try {
    const tickets = await Ticket.findAll({ where: { userId: req.params.userId } });
    const ticketsWithDetails = await Promise.all(tickets.map(async (t) => {
      try {
        let eventUrl = `${EVENTS_SERVICE_URL}/${t.eventId}`;
        const eventRes = await axios.get(eventUrl).catch(async () => {
          const localUrl = `http://localhost:5002/${t.eventId}`;
          return await axios.get(localUrl);
        });
        return { id: t.id, purchaseDate: t.purchaseDate, event: eventRes.data };
      } catch (e) {
        return { id: t.id, purchaseDate: t.purchaseDate, event: { title: "Evento no disponible" } };
      }
    }));
    res.json(ticketsWithDetails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. RUTA COMPRAR
app.post('/', async (req, res) => {
  try {
    const ticket = await Ticket.create(req.body);
    res.status(201).json(ticket);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// CAPTURADOR DE 404 PARA DIAGNÓSTICO EN TICKET SERVICE
app.use((req, res) => {
  console.log(`[TicketService] 404 en: ${req.method} ${req.url}`);
  res.status(404).json({ 
    error: 'Ruta no encontrada en TICKET SERVICE',
    urlReceived: req.url,
    method: req.method
  });
});

sequelize.sync().then(() => {
  app.listen(PORT, () => console.log(`Ticket Service running on port ${PORT}`));
}).catch(err => console.error('Database connection failed:', err));
