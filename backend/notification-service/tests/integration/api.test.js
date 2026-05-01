/**
 * 6 PRUEBAS DE INTEGRACIÓN — notification-service
 * Mocks: sequelize (BD) + axios (servicios externos) + jwt + cron + nodemailer
 * Matchers: toBe, toEqual, toHaveProperty, toMatch, toContain
 */

// MOCK 1 — Sequelize
jest.mock('sequelize', () => {
  const makeModel = () => ({
    findAll: jest.fn(), create: jest.fn(), update: jest.fn(),
    findOne: jest.fn(), count: jest.fn(), findOrCreate: jest.fn(), destroy: jest.fn()
  });
  const models = {};
  return {
    Sequelize: jest.fn(() => ({
      define: jest.fn((name) => { models[name] = makeModel(); return models[name]; }),
      sync: jest.fn().mockResolvedValue(),
      authenticate: jest.fn().mockResolvedValue()
    })),
    DataTypes: {
      INTEGER: 'INTEGER', STRING: 'STRING', TEXT: 'TEXT', DATE: 'DATE',
      ENUM: () => 'ENUM', BOOLEAN: 'BOOLEAN'
    },
    Op: { gte: 'gte' },
    __models: models
  };
});

// MOCK 2 — axios
jest.mock('axios');

jest.mock('node-cron', () => ({ schedule: jest.fn() }));
jest.mock('jsonwebtoken', () => ({ verify: jest.fn() }));
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: jest.fn().mockResolvedValue({}) }))
}));

const request = require('supertest');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const sequelizeMock = require('sequelize');
const { app } = require('../../index');

const Notification = sequelizeMock.__models.Notification;
const PushToken = sequelizeMock.__models.PushToken;
const EmailLog = sequelizeMock.__models.EmailLog;

const allowAdmin = () => jwt.verify.mockReturnValue({ role: 'admin', id: 1 });

describe('🌐 Pruebas de integración — notification-service', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    [Notification, PushToken, EmailLog].forEach(m =>
      Object.values(m).forEach(fn => fn.mockReset && fn.mockReset())
    );
  });

  // ── 1. POST /notify ──────────────────────────────────────────────────────
  test('1. POST /notify crea notificación tipo ticket.purchased', async () => {
    axios.get.mockResolvedValueOnce({ data: { title: 'Concierto' } });
    Notification.create.mockResolvedValueOnce({ id: 100, userId: 1, type: 'ticket.purchased' });
    PushToken.findAll.mockResolvedValueOnce([]);
    EmailLog.create.mockResolvedValue({});

    const res = await request(app)
      .post('/notify')
      .send({ type: 'ticket.purchased', userId: 1, eventId: 10, ticketId: 50, email: 'a@a.com' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id', 100);
  });

  // ── 2. POST /notify validation ───────────────────────────────────────────
  test('2. POST /notify rechaza con 400 si faltan campos', async () => {
    const res = await request(app).post('/notify').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/userId.*type/);
  });

  // ── 3. GET /user/:userId ─────────────────────────────────────────────────
  test('3. GET /user/:userId devuelve notificaciones', async () => {
    Notification.findAll.mockResolvedValueOnce([
      { id: 1, userId: 5, title: 'Hola' }
    ]);

    const res = await request(app).get('/user/5');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  // ── 4. GET /unread/:userId ───────────────────────────────────────────────
  test('4. GET /unread/:userId devuelve el contador de no leídas', async () => {
    Notification.count.mockResolvedValueOnce(7);

    const res = await request(app).get('/unread/5');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ count: 7 });
  });

  // ── 5. PATCH /:id/read ───────────────────────────────────────────────────
  test('5. PATCH /:id/read marca una notificación como leída', async () => {
    Notification.update.mockResolvedValueOnce();

    const res = await request(app).patch('/100/read');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Marcada');
  });

  // ── 6. POST /broadcast ───────────────────────────────────────────────────
  test('6. POST /broadcast envía anuncio a todos los asistentes (admin)', async () => {
    allowAdmin();
    axios.get
      .mockResolvedValueOnce({ data: { userIds: [1, 2, 3] } })  // tickets/event-users
      .mockResolvedValueOnce({ data: { title: 'Concierto' } })  // events/title
      .mockResolvedValueOnce({ data: { email: 'a@a.com' } })    // user 1 email
      .mockResolvedValueOnce({ data: { email: 'b@b.com' } })    // user 2 email
      .mockResolvedValueOnce({ data: { email: 'c@c.com' } });   // user 3 email
    Notification.create.mockResolvedValue({ id: 1 });
    PushToken.findAll.mockResolvedValue([]);
    EmailLog.create.mockResolvedValue({});

    const res = await request(app)
      .post('/broadcast')
      .set('Authorization', 'Bearer x')
      .send({ eventId: 10, message: 'Anuncio importante' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('count', 3);
  });

  // ── Cobertura adicional ──────────────────────────────────────────────────
  describe('Cobertura adicional', () => {

    test('GET /health devuelve 200', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toContain('Notification Service');
    });

    test('POST /notify con type session.reminder', async () => {
      Notification.create.mockResolvedValueOnce({ id: 1 });
      PushToken.findAll.mockResolvedValueOnce([]);
      EmailLog.create.mockResolvedValue({});

      const res = await request(app)
        .post('/notify')
        .send({ type: 'session.reminder', userId: 1, message: 'Recordatorio', email: 'x@x.com' });
      expect(res.status).toBe(201);
    });

    test('POST /notify con type event.announcement', async () => {
      Notification.create.mockResolvedValueOnce({ id: 1 });
      PushToken.findAll.mockResolvedValueOnce([]);
      EmailLog.create.mockResolvedValue({});

      const res = await request(app)
        .post('/notify')
        .send({ type: 'event.announcement', userId: 1, message: 'Anuncio' });
      expect(res.status).toBe(201);
    });

    test('POST /notify con type desconocido usa default', async () => {
      Notification.create.mockResolvedValueOnce({ id: 1 });
      PushToken.findAll.mockResolvedValueOnce([]);
      EmailLog.create.mockResolvedValue({});

      const res = await request(app)
        .post('/notify')
        .send({ type: 'tipo.raro', userId: 1 });
      expect(res.status).toBe(201);
    });

    test('POST /notify con error 500', async () => {
      Notification.create.mockRejectedValueOnce(new Error('BD caída'));
      const res = await request(app).post('/notify').send({ type: 'a', userId: 1, email: 'x@x.com' });
      expect(res.status).toBe(500);
    });

    test('POST /broadcast rechaza sin token (401)', async () => {
      const res = await request(app).post('/broadcast').send({});
      expect(res.status).toBe(401);
    });

    test('POST /broadcast rechaza con 400 si falta eventId', async () => {
      allowAdmin();
      const res = await request(app).post('/broadcast').set('Authorization', 'Bearer x').send({});
      expect(res.status).toBe(400);
    });

    test('POST /broadcast 502 si tickets-service falla', async () => {
      allowAdmin();
      axios.get
        .mockRejectedValueOnce(new Error('docker'))
        .mockRejectedValueOnce(new Error('localhost'));
      const res = await request(app)
        .post('/broadcast')
        .set('Authorization', 'Bearer x')
        .send({ eventId: 10, message: 'X' });
      expect(res.status).toBe(502);
    });

    test('POST /broadcast con 0 asistentes devuelve mensaje', async () => {
      allowAdmin();
      axios.get.mockResolvedValueOnce({ data: { userIds: [] } });
      const res = await request(app)
        .post('/broadcast')
        .set('Authorization', 'Bearer x')
        .send({ eventId: 10, message: 'X' });
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(0);
    });

    test('POST /broadcast 500 si dispatch falla', async () => {
      allowAdmin();
      axios.get.mockResolvedValueOnce({ data: { userIds: [1] } })
               .mockResolvedValueOnce({ data: { title: 'X' } });
      Notification.create.mockRejectedValueOnce(new Error('e'));
      const res = await request(app)
        .post('/broadcast')
        .set('Authorization', 'Bearer x')
        .send({ eventId: 10, message: 'X' });
      expect(res.status).toBe(500);
    });

    test('GET /user/:userId con error 500', async () => {
      Notification.findAll.mockRejectedValueOnce(new Error('e'));
      const res = await request(app).get('/user/5');
      expect(res.status).toBe(500);
    });

    test('GET /unread/:userId con error 500', async () => {
      Notification.count.mockRejectedValueOnce(new Error('e'));
      const res = await request(app).get('/unread/5');
      expect(res.status).toBe(500);
    });

    test('PATCH /:id/read con error 500', async () => {
      Notification.update.mockRejectedValueOnce(new Error('e'));
      const res = await request(app).patch('/100/read');
      expect(res.status).toBe(500);
    });

    test('PATCH /user/:userId/read-all', async () => {
      Notification.update.mockResolvedValueOnce();
      const res = await request(app).patch('/user/5/read-all');
      expect(res.status).toBe(200);
    });

    test('PATCH /user/:userId/read-all con error 500', async () => {
      Notification.update.mockRejectedValueOnce(new Error('e'));
      const res = await request(app).patch('/user/5/read-all');
      expect(res.status).toBe(500);
    });

    test('POST /tokens registra un token nuevo', async () => {
      const tokenRecord = { active: true, update: jest.fn() };
      PushToken.findOrCreate.mockResolvedValueOnce([tokenRecord, true]);
      const res = await request(app).post('/tokens').send({ userId: 1, token: 'fcm-1', platform: 'ios' });
      expect(res.status).toBe(201);
    });

    test('POST /tokens reactiva un token existente inactivo', async () => {
      const tokenRecord = { active: false, update: jest.fn().mockResolvedValue() };
      PushToken.findOrCreate.mockResolvedValueOnce([tokenRecord, false]);
      const res = await request(app).post('/tokens').send({ userId: 1, token: 'fcm-1' });
      expect(res.status).toBe(201);
      expect(tokenRecord.update).toHaveBeenCalled();
    });

    test('POST /tokens con error 500', async () => {
      PushToken.findOrCreate.mockRejectedValueOnce(new Error('e'));
      const res = await request(app).post('/tokens').send({});
      expect(res.status).toBe(500);
    });

    test('DELETE /tokens/:token desactiva el token', async () => {
      PushToken.update.mockResolvedValueOnce();
      const res = await request(app).delete('/tokens/fcm-xyz');
      expect(res.status).toBe(200);
    });

    test('DELETE /tokens/:token con error 500', async () => {
      PushToken.update.mockRejectedValueOnce(new Error('e'));
      const res = await request(app).delete('/tokens/x');
      expect(res.status).toBe(500);
    });

    test('Ruta inexistente devuelve 404', async () => {
      const res = await request(app).get('/ruta-no-existe');
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('NOTIFICATION SERVICE');
    });

    test('POST /notify usa el getUserEmail cuando no se pasa email', async () => {
      Notification.create.mockResolvedValueOnce({ id: 1 });
      axios.get.mockResolvedValueOnce({ data: { title: 'X' } })           // event title
               .mockResolvedValueOnce({ data: { email: 'fetched@a.com' } }); // user email
      PushToken.findAll.mockResolvedValueOnce([]);
      EmailLog.create.mockResolvedValue({});

      const res = await request(app)
        .post('/notify')
        .send({ type: 'ticket.purchased', userId: 1, eventId: 10 });
      expect(res.status).toBe(201);
    });

    test('POST /notify cuando getUserEmail no encuentra email', async () => {
      Notification.create.mockResolvedValueOnce({ id: 1 });
      axios.get.mockResolvedValueOnce({ data: { title: 'X' } })
               .mockRejectedValue(new Error('user-service'));
      PushToken.findAll.mockResolvedValueOnce([]);

      const res = await request(app).post('/notify').send({
        type: 'ticket.purchased', userId: 1, eventId: 10
      });
      expect(res.status).toBe(201);
    });

    test('sendPush con tokens registrados llama console.log (push simulado)', async () => {
      Notification.create.mockResolvedValueOnce({ id: 1 });
      PushToken.findAll.mockResolvedValueOnce([
        { token: 'tk1', platform: 'ios' }, { token: 'tk2', platform: 'android' }
      ]);
      EmailLog.create.mockResolvedValue({});

      const res = await request(app)
        .post('/notify')
        .send({ type: 'session.reminder', userId: 1, message: 'X', email: 'x@x.com' });
      expect(res.status).toBe(201);
    });
  });
});
