const express = require('express');
const cors    = require('cors');
const jwt     = require('jsonwebtoken');
const { Sequelize, DataTypes, Op } = require('sequelize');
const axios   = require('axios');
const cron    = require('node-cron');

const app        = express();
const PORT       = process.env.PORT        || 5007;
const JWT_SECRET = process.env.JWT_SECRET  || 'eventhive_secret_key_2026';
const EVENTS_URL  = process.env.EVENTS_SERVICE_URL  || 'http://events-service:5002';
const TICKETS_URL = process.env.TICKETS_SERVICE_URL || 'http://ticket-service:5003';

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[Notifications] ${req.method} ${req.url}`);
  next();
});

// ── MIDDLEWARE ADMIN ──────────────────────────────────────────────────────────
function verifyAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No autorizado.' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Solo administradores.' });
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido.' });
  }
}

// ── BASE DE DATOS PROPIA ──────────────────────────────────────────────────────
const sequelize = new Sequelize(
  process.env.DB_NAME || 'notifications_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || 'root',
  { host: process.env.DB_HOST || 'localhost', dialect: 'mysql', logging: false }
);

// Historial de notificaciones
const Notification = sequelize.define('Notification', {
  userId:   { type: DataTypes.INTEGER, allowNull: false },
  eventId:  { type: DataTypes.INTEGER, allowNull: true  },
  ticketId: { type: DataTypes.INTEGER, allowNull: true  },
  type: {
    type: DataTypes.ENUM('ticket.purchased', 'session.reminder', 'event.announcement'),
    allowNull: false,
    defaultValue: 'ticket.purchased'
  },
  title:   { type: DataTypes.STRING, allowNull: false },
  body:    { type: DataTypes.TEXT,   allowNull: false },
  channel: { type: DataTypes.ENUM('email', 'push', 'in-app'), defaultValue: 'in-app' },
  status:  { type: DataTypes.ENUM('pending', 'sent', 'failed'),  defaultValue: 'sent' },
  readAt:  { type: DataTypes.DATE, allowNull: true }
});

// Tokens FCM de dispositivos móviles
const PushToken = sequelize.define('PushToken', {
  userId:   { type: DataTypes.INTEGER, allowNull: false },
  token:    { type: DataTypes.STRING,  allowNull: false, unique: true },
  platform: { type: DataTypes.ENUM('ios', 'android', 'web'), defaultValue: 'web' },
  active:   { type: DataTypes.BOOLEAN, defaultValue: true }
});

// Log de emails enviados (real o simulado)
const EmailLog = sequelize.define('EmailLog', {
  notificationId: { type: DataTypes.INTEGER, allowNull: false },
  toEmail: { type: DataTypes.STRING, allowNull: false },
  subject: { type: DataTypes.STRING },
  body:    { type: DataTypes.TEXT   },
  status:  { type: DataTypes.ENUM('sent', 'simulated', 'failed'), defaultValue: 'simulated' }
});

// ── HELPERS ───────────────────────────────────────────────────────────────────

// Axios con fallback Docker → localhost
const safeGet = async (dockerUrl, localhostPort, path) => {
  try { return await axios.get(dockerUrl); }
  catch { return await axios.get(`http://localhost:${localhostPort}${path}`); }
};

// Email: real si hay credenciales, simulado si no
const sendEmail = async (notificationId, toEmail, subject, body) => {
  if (process.env.EMAIL_USER) {
    // Envío real con SMTP (requiere EMAIL_USER, EMAIL_PASS, EMAIL_HOST en .env)
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });
      await transporter.sendMail({
        from: `EventHive <${process.env.EMAIL_USER}>`,
        to: toEmail, subject,
        html: `<div style="font-family:sans-serif;max-width:520px;margin:auto">
          <h2 style="color:#7c3aed">${subject}</h2>
          <p>${body}</p>
          <p style="color:#aaa;font-size:12px">EventHive · No respondas a este correo</p>
        </div>`
      });
      await EmailLog.create({ notificationId, toEmail, subject, body, status: 'sent' });
      console.log(`[Notifications] EMAIL ENVIADO → ${toEmail}`);
    } catch (e) {
      await EmailLog.create({ notificationId, toEmail, subject, body, status: 'failed' });
      console.error(`[Notifications] Email error: ${e.message}`);
    }
  } else {
    // Simulación: se guarda en BD (evidencia para el profe)
    await EmailLog.create({ notificationId, toEmail, subject, body, status: 'simulated' });
    console.log(`[Notifications] EMAIL SIMULADO → ${toEmail} | ${subject}`);
  }
};

// Push: real con Firebase si hay SERVER_KEY, simulado si no
const sendPush = async (userId, title, body, data = {}) => {
  const tokens = await PushToken.findAll({ where: { userId, active: true } });
  if (tokens.length === 0) {
    console.log(`[Notifications] PUSH SIMULADO (sin token registrado) → userId:${userId} | ${title}`);
    return;
  }
  for (const t of tokens) {
    if (process.env.FIREBASE_SERVER_KEY) {
      try {
        await axios.post('https://fcm.googleapis.com/fcm/send', {
          to: t.token,
          notification: { title, body },
          data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' }
        }, { headers: { 'Authorization': `key=${process.env.FIREBASE_SERVER_KEY}`, 'Content-Type': 'application/json' } });
        console.log(`[Notifications] PUSH FCM enviado → userId:${userId} (${t.platform})`);
      } catch (e) {
        console.error(`[Notifications] PUSH FCM error: ${e.message}`);
      }
    } else {
      console.log(`[Notifications] PUSH SIMULADO → userId:${userId} (${t.platform}) | ${title}`);
    }
  }
};

// Núcleo: crear notificación + disparar email y push
const dispatch = async ({ userId, eventId, ticketId, type, title, body, email }) => {
  const notif = await Notification.create({
    userId, eventId, ticketId, type, title, body,
    channel: 'in-app', status: 'sent'
  });
  if (email) await sendEmail(notif.id, email, title, body);
  await sendPush(userId, title, body, {
    type,
    eventId:  String(eventId  || ''),
    ticketId: String(ticketId || '')
  });
  return notif;
};

// Obtener título del evento con fallback
const getEventTitle = async (eventId) => {
  try {
    const res = await safeGet(`${EVENTS_URL}/${eventId}`, 5002, `/${eventId}`);
    return res.data.title || 'tu evento';
  } catch { return 'tu evento'; }
};

// ── ENDPOINTS ─────────────────────────────────────────────────────────────────

app.get('/health', (req, res) =>
  res.json({ status: 'Notification Service running', port: PORT })
);

// POST /notify — disparar una notificación (llamado por ticket-service u otros)
app.post('/notify', async (req, res) => {
  try {
    const { type, userId, eventId, ticketId, email, message } = req.body;
    if (!userId || !type) return res.status(400).json({ error: 'userId y type son requeridos.' });

    let title, body;
    switch (type) {
      case 'ticket.purchased':
        const evTitle = await getEventTitle(eventId);
        title = '🎫 ¡Ticket confirmado!';
        body  = `Tu entrada para "${evTitle}" ha sido procesada correctamente. ¡Nos vemos pronto!`;
        break;
      case 'session.reminder':
        title = '⏰ Recordatorio de evento';
        body  = message || '¡Tu evento comienza pronto! Revisa todos los detalles.';
        break;
      case 'event.announcement':
        title = '📢 Mensaje del organizador';
        body  = message || 'El organizador tiene un mensaje importante para ti.';
        break;
      default:
        title = '🔔 EventHive';
        body  = message || 'Tienes una nueva notificación.';
    }

    const notif = await dispatch({ userId, eventId, ticketId, type, title, body, email });
    res.status(201).json(notif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /broadcast — admin envía anuncio a todos los asistentes de un evento
app.post('/broadcast', verifyAdmin, async (req, res) => {
  try {
    const { eventId, message } = req.body;
    if (!eventId || !message) return res.status(400).json({ error: 'eventId y message son requeridos.' });

    // Obtener IDs de usuarios con ticket en ese evento
    let userIds = [];
    try {
      const usersRes = await safeGet(
        `${TICKETS_URL}/event-users/${eventId}`, 5003, `/event-users/${eventId}`
      );
      userIds = usersRes.data.userIds || [];
    } catch (e) {
      return res.status(502).json({ error: 'No se pudieron obtener los asistentes.', detail: e.message });
    }

    if (userIds.length === 0) {
      return res.json({ message: 'No hay asistentes con tickets para este evento.', count: 0 });
    }

    const evTitle = await getEventTitle(eventId);
    const title   = '📢 Mensaje del organizador';

    const results = await Promise.all(
      userIds.map(uid =>
        dispatch({ userId: uid, eventId, type: 'event.announcement', title, body: message })
      )
    );

    res.json({
      message: `Anuncio enviado a ${results.length} asistentes de "${evTitle}"`,
      count: results.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /user/:userId — notificaciones de un usuario (últimas 50)
app.get('/user/:userId', async (req, res) => {
  try {
    const notifs = await Notification.findAll({
      where:  { userId: req.params.userId },
      order:  [['createdAt', 'DESC']],
      limit:  50
    });
    res.json(notifs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /unread/:userId — contador de no leídas
app.get('/unread/:userId', async (req, res) => {
  try {
    const count = await Notification.count({
      where: { userId: req.params.userId, readAt: null }
    });
    res.json({ count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /:id/read — marcar una como leída
app.patch('/:id/read', async (req, res) => {
  try {
    await Notification.update({ readAt: new Date() }, { where: { id: req.params.id } });
    res.json({ message: 'Marcada como leída' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /user/:userId/read-all — marcar todas como leídas
app.patch('/user/:userId/read-all', async (req, res) => {
  try {
    await Notification.update(
      { readAt: new Date() },
      { where: { userId: req.params.userId, readAt: null } }
    );
    res.json({ message: 'Todas marcadas como leídas' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /tokens — registrar token FCM del dispositivo
app.post('/tokens', async (req, res) => {
  try {
    const { userId, token, platform } = req.body;
    const [record] = await PushToken.findOrCreate({
      where: { token },
      defaults: { userId, platform: platform || 'web', active: true }
    });
    if (!record.active) await record.update({ active: true, userId });
    res.status(201).json(record);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /tokens/:token — desregistrar token
app.delete('/tokens/:token', async (req, res) => {
  try {
    await PushToken.update({ active: false }, { where: { token: req.params.token } });
    res.json({ message: 'Token desactivado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 404
app.use((req, res) => {
  console.log(`[Notifications] 404: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Ruta no encontrada en NOTIFICATION SERVICE', url: req.url });
});

// ── CRON: session.reminder cada hora ─────────────────────────────────────────
cron.schedule('0 * * * *', async () => {
  try {
    console.log('[Notifications] Verificando recordatorios de sesiones...');
    const eventsRes = await safeGet(`${EVENTS_URL}/`, 5002, '/');
    const events    = Array.isArray(eventsRes.data) ? eventsRes.data : [];
    const now       = new Date();
    const in24h     = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const today     = now.toISOString().split('T')[0];

    for (const event of events) {
      const eventDate = new Date(event.date);
      if (!(eventDate > now && eventDate <= in24h)) continue;

      // Evitar duplicados: solo 1 recordatorio por evento por día
      const exists = await Notification.findOne({
        where: {
          eventId: event.id,
          type: 'session.reminder',
          createdAt: { [Op.gte]: new Date(today) }
        }
      });
      if (exists) continue;

      try {
        const usersRes = await safeGet(
          `${TICKETS_URL}/event-users/${event.id}`, 5003, `/event-users/${event.id}`
        );
        const userIds = usersRes.data.userIds || [];
        for (const uid of userIds) {
          await dispatch({
            userId:  uid,
            eventId: event.id,
            type:    'session.reminder',
            title:   `⏰ Recordatorio: ${event.title}`,
            body:    `Tu evento "${event.title}" es mañana (${event.date}). ¡Prepárate!`
          });
        }
        console.log(`[Notifications] Recordatorio enviado para "${event.title}" → ${userIds.length} asistentes.`);
      } catch (e) {
        console.log(`[Notifications] Sin asistentes para evento ${event.id}:`, e.message);
      }
    }
  } catch (err) {
    console.error('[Notifications] Error en cron de recordatorios:', err.message);
  }
});

// ── ARRANQUE CON REINTENTOS ───────────────────────────────────────────────────
const startWithRetry = async (attempt = 1) => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log('Notifications DB sincronizada');
    app.listen(PORT, () => console.log(`Notification Service running on port ${PORT}`));
  } catch (err) {
    if (attempt >= 20) {
      console.error('[Notifications] No se pudo conectar a BD tras 20 intentos.', err.message);
      process.exit(1);
    }
    console.log(`[Notifications] BD no lista (intento ${attempt}/20). Reintentando en 3s...`);
    setTimeout(() => startWithRetry(attempt + 1), 3000);
  }
};

startWithRetry();
