const express = require('express');
const proxy = require('express-http-proxy');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(morgan('dev'));

const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:5001';
const eventsServiceUrl = process.env.EVENTS_SERVICE_URL || 'http://localhost:5002';
const ticketsServiceUrl = process.env.TICKETS_SERVICE_URL || 'http://localhost:5003';
const reviewsServiceUrl = process.env.REVIEWS_SERVICE_URL || 'http://localhost:5004';
const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://localhost:5005';

// Proxies simples (por defecto eliminan el prefijo /users, /events, /tickets)
app.use('/users', proxy(userServiceUrl));
app.use('/events', proxy(eventsServiceUrl));
app.use('/tickets', proxy(ticketsServiceUrl));
app.use('/reviews', proxy(reviewsServiceUrl));
app.use('/payments', proxy(paymentServiceUrl));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'API Gateway is running' });
});

// CAPTURADOR DE 404 PARA DIAGNÓSTICO
app.use((req, res) => {
  console.log(`[Gateway] 404 en: ${req.method} ${req.url}`);
  res.status(404).json({ 
    error: 'Ruta no encontrada en el API GATEWAY',
    requestedUrl: req.url,
    method: req.method
  });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
