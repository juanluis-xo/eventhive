const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
const PORT = process.env.PORT || 5005;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

const sequelize = new Sequelize(
  process.env.DB_NAME || 'payment_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || 'root',
  { host: process.env.DB_HOST || 'localhost', dialect: 'mysql', logging: false }
);

const Payment = sequelize.define('Payment', {
  userId: { type: DataTypes.INTEGER, allowNull: false },
  eventId: { type: DataTypes.INTEGER, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  method: { type: DataTypes.ENUM('paypal', 'credit_card', 'debit_card'), allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'completed' },
  transactionId: { type: DataTypes.STRING, allowNull: false }
});

// Endpoint to process payment
app.post('/process', async (req, res) => {
  try {
    const { userId, eventId, amount, method } = req.body;
    
    // Simulate payment processing
    console.log(`[PaymentService] Processing ${method} payment for user ${userId}, event ${eventId}, amount ${amount}`);
    
    const payment = await Payment.create({
      userId,
      eventId,
      amount,
      method,
      transactionId: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    });

    res.status(201).json({
      success: true,
      message: 'Pago procesado exitosamente',
      payment
    });
  } catch (error) {
    console.error('[PaymentService] Error processing payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get payment history for a user
app.get('/user/:userId', async (req, res) => {
  try {
    const payments = await Payment.findAll({ where: { userId: req.params.userId } });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Payment Service is running' });
});

sequelize.sync().then(() => {
  app.listen(PORT, () => console.log(`Payment Service running on port ${PORT}`));
}).catch(err => console.error('Database connection failed:', err));
