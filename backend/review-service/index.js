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
    
    // Calcular promedio
    const average = reviews.length > 0 
      ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length 
      : 0;

    res.json({
      count: reviews.length,
      average: parseFloat(average.toFixed(1)),
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
    if (!eventIds) return res.json([]);
    
    const ids = eventIds.split(',').map(id => parseInt(id));
    
    const stats = await Promise.all(ids.map(async (id) => {
      const reviews = await Review.findAll({ where: { eventId: id } });
      const average = reviews.length > 0 
        ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length 
        : 0;
      
      return {
        eventId: id,
        count: reviews.length,
        average: parseFloat(average.toFixed(1))
      };
    }));
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'Review Service is running' });
});

// Sync and Start
sequelize.sync().then(() => {
  console.log('Reviews Database synced');
  app.listen(PORT, () => {
    console.log(`Review Service running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Unable to connect to the database:', err);
});
