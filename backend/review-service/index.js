const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5004;

app.use(cors());
app.use(express.json());

// Database connection
const sequelize = new Sequelize(
  process.env.DB_NAME || 'reviews_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || 'root',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false
  }
);

// Review Model
const Review = sequelize.define('Review', {
  userId: { type: DataTypes.INTEGER, allowNull: false },
  username: { type: DataTypes.STRING, allowNull: false },
  eventId: { type: DataTypes.INTEGER, allowNull: false },
  rating: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
  comment: { type: DataTypes.TEXT, allowNull: false }
});

// ── HELPERS PUROS (testables) ────────────────────────────────────────────────
// Calcula el promedio de ratings (devuelve 0 si la lista está vacía)
const calculateAverage = (reviews) => {
  if (!Array.isArray(reviews) || reviews.length === 0) return 0;
  const total = reviews.reduce((acc, curr) => acc + (curr.rating || 0), 0);
  return parseFloat((total / reviews.length).toFixed(1));
};

// Parsea una query string "1,2,3" en un array de números: [1, 2, 3]
const parseEventIds = (queryString) => {
  if (!queryString || typeof queryString !== 'string') return [];
  return queryString.split(',')
    .map(id => parseInt(id, 10))
    .filter(id => !Number.isNaN(id));
};

// Formatea el objeto de estadísticas de un evento (devuelve una Promise)
const formatEventStats = async (eventId, reviews) => ({
  eventId,
  count: reviews.length,
  average: calculateAverage(reviews)
});

// Routes
// Crear reseña
app.post('/', async (req, res) => {
  try {
    const { userId, username, eventId, rating, comment } = req.body;
    const review = await Review.create({ userId, username, eventId, rating, comment });
    res.status(201).json(review);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Obtener reseñas por evento
app.get('/event/:eventId', async (req, res) => {
  try {
    const reviews = await Review.findAll({
      where: { eventId: req.params.eventId },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      count: reviews.length,
      average: calculateAverage(reviews),
      reviews
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Nueva ruta: Obtener estadísticas para múltiples eventos
app.get('/stats', async (req, res) => {
  try {
    const { eventIds } = req.query;
    const ids = parseEventIds(eventIds);
    if (ids.length === 0) return res.json([]);

    const stats = await Promise.all(ids.map(async (id) => {
      const reviews = await Review.findAll({ where: { eventId: id } });
      return formatEventStats(id, reviews);
    }));

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'Review Service is running' });
});

// Solo arranca el servidor si este archivo se ejecuta directamente (no en tests).
/* istanbul ignore next */
if (require.main === module) {
  sequelize.sync().then(() => {
    console.log('Reviews Database synced');
    app.listen(PORT, () => {
      console.log(`Review Service running on port ${PORT}`);
    });
  }).catch(err => {
    console.error('Unable to connect to the database:', err);
  });
}

module.exports = {
  app,
  Review,
  sequelize,
  calculateAverage,
  parseEventIds,
  formatEventStats
};
