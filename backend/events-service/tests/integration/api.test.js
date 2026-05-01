/**
 * 6 PRUEBAS DE INTEGRACIÓN — events-service (con supertest)
 * Mocks: sequelize (BD) + jsonwebtoken (JWT)
 * Matchers: toBe, toEqual, toHaveProperty, toMatch, toContain, toHaveLength
 */

// MOCK 1 — Sequelize: cada llamada a define() devuelve un mock independiente
jest.mock('sequelize', () => {
  const makeModel = () => ({
    findAll: jest.fn(), create: jest.fn(), update: jest.fn(),
    findByPk: jest.fn(), destroy: jest.fn(), findOne: jest.fn(),
    increment: jest.fn()
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
      DECIMAL: () => 'DECIMAL', JSON: 'JSON', ENUM: () => 'ENUM'
    },
    __models: models
  };
});

// MOCK 2 — jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
  sign: jest.fn(() => 'jwt-token')
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const sequelizeMock = require('sequelize');
const { app } = require('../../index');

const Event = sequelizeMock.__models.Event;
const EventCategory = sequelizeMock.__models.EventCategory;
const EventWallet = sequelizeMock.__models.EventWallet;

const adminToken = 'admin-jwt';
const allowAdmin = () => jwt.verify.mockReturnValue({ id: 1, role: 'admin' });

describe('🌐 Pruebas de integración — events-service', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    [Event, EventCategory, EventWallet].forEach(m =>
      Object.values(m).forEach(fn => fn.mockReset && fn.mockReset())
    );
  });

  // ── GET / ────────────────────────────────────────────────────────────────
  describe('GET /', () => {

    test('1. lista todos los eventos con sus categorías', async () => {
      const events = [{ id: 1, toJSON: () => ({ id: 1, title: 'Concierto' }) }];
      Event.findAll.mockResolvedValueOnce(events);
      EventCategory.findAll.mockResolvedValueOnce([{ eventId: 1, toJSON: () => ({ eventId: 1, name: 'VIP' }) }]);

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toHaveProperty('categories');
    });

    test('2. devuelve 500 si Event.findAll falla', async () => {
      Event.findAll.mockRejectedValueOnce(new Error('BD caída'));

      const res = await request(app).get('/');

      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/BD caída/);
    });
  });

  // ── GET /:id ─────────────────────────────────────────────────────────────
  describe('GET /:id', () => {

    test('3. devuelve un evento con sus categorías', async () => {
      const ev = { id: 5, toJSON: () => ({ id: 5, title: 'Festival' }) };
      Event.findByPk.mockResolvedValueOnce(ev);
      EventCategory.findAll.mockResolvedValueOnce([]);

      const res = await request(app).get('/5');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 5);
      expect(res.body).toHaveProperty('categories');
    });

    test('4. devuelve 404 si el evento no existe', async () => {
      Event.findByPk.mockResolvedValueOnce(null);

      const res = await request(app).get('/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Event not found');
    });
  });

  // ── POST / (crear evento, requiere admin) ────────────────────────────────
  describe('POST /', () => {

    test('5. rechaza con 401 si no hay token de autenticación', async () => {
      const res = await request(app).post('/').send({ title: 'X' });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/token/i);
    });

    test('6. crea evento con categorías cuando es admin', async () => {
      allowAdmin();
      const created = { id: 10, toJSON: () => ({ id: 10, title: 'Nuevo' }) };
      Event.create.mockResolvedValueOnce(created);
      EventCategory.create.mockResolvedValue({});
      EventCategory.findAll.mockResolvedValueOnce([]);

      const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Nuevo', categories: [{ name: 'VIP', price: 100, capacity: 10 }] });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id', 10);
      expect(EventCategory.create).toHaveBeenCalled();
    });
  });

  // ── Cobertura adicional (endpoints restantes) ────────────────────────────
  describe('Cobertura adicional', () => {

    test('GET /health responde 200', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toContain('Events Service');
    });

    test('GET /organizer/:username devuelve eventos del organizador', async () => {
      Event.findAll.mockResolvedValueOnce([]);
      EventCategory.findAll.mockResolvedValueOnce([]);
      const res = await request(app).get('/organizer/juan');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('GET /organizer/:username devuelve 500 si BD falla', async () => {
      Event.findAll.mockRejectedValueOnce(new Error('error'));
      const res = await request(app).get('/organizer/x');
      expect(res.status).toBe(500);
    });

    test('PATCH /categories/:id/increment incrementa sold', async () => {
      EventCategory.increment.mockResolvedValueOnce();
      EventCategory.findByPk.mockResolvedValueOnce({ id: 1, sold: 5 });
      const res = await request(app).patch('/categories/1/increment');
      expect(res.status).toBe(200);
    });

    test('PATCH /categories/:id/increment devuelve 500 si falla', async () => {
      EventCategory.increment.mockRejectedValueOnce(new Error('e'));
      const res = await request(app).patch('/categories/1/increment');
      expect(res.status).toBe(500);
    });

    test('PUT /categories/:catId actualiza una categoría (admin)', async () => {
      allowAdmin();
      EventCategory.update.mockResolvedValueOnce();
      EventCategory.findByPk.mockResolvedValueOnce({ id: 5, name: 'Updated' });
      const res = await request(app).put('/categories/5').set('Authorization', 'Bearer x').send({ name: 'Updated' });
      expect(res.status).toBe(200);
    });

    test('PUT /categories/:catId con error 500', async () => {
      allowAdmin();
      EventCategory.update.mockRejectedValueOnce(new Error('e'));
      const res = await request(app).put('/categories/5').set('Authorization', 'Bearer x').send({});
      expect(res.status).toBe(500);
    });

    test('DELETE /categories/:catId elimina una categoría (admin)', async () => {
      allowAdmin();
      EventCategory.destroy.mockResolvedValueOnce();
      const res = await request(app).delete('/categories/5').set('Authorization', 'Bearer x');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Categoría eliminada');
    });

    test('DELETE /categories/:catId con error 500', async () => {
      allowAdmin();
      EventCategory.destroy.mockRejectedValueOnce(new Error('e'));
      const res = await request(app).delete('/categories/5').set('Authorization', 'Bearer x');
      expect(res.status).toBe(500);
    });

    test('POST / rechaza con 403 si el usuario no es admin', async () => {
      jwt.verify.mockReturnValue({ id: 1, role: 'attendee' });
      const res = await request(app).post('/').set('Authorization', 'Bearer x').send({});
      expect(res.status).toBe(403);
    });

    test('POST / con error en Event.create devuelve 400', async () => {
      allowAdmin();
      Event.create.mockRejectedValueOnce(new Error('campos inválidos'));
      const res = await request(app).post('/').set('Authorization', 'Bearer x').send({ title: 'x' });
      expect(res.status).toBe(400);
    });

    test('POST / sin categorías', async () => {
      allowAdmin();
      Event.create.mockResolvedValueOnce({ id: 1, toJSON: () => ({ id: 1 }) });
      EventCategory.findAll.mockResolvedValueOnce([]);
      const res = await request(app).post('/').set('Authorization', 'Bearer x').send({ title: 'x' });
      expect(res.status).toBe(201);
    });

    test('GET /:id/categories devuelve categorías del evento', async () => {
      EventCategory.findAll.mockResolvedValueOnce([{ id: 1, name: 'VIP' }]);
      const res = await request(app).get('/5/categories');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    test('GET /:id/categories con error 500', async () => {
      EventCategory.findAll.mockRejectedValueOnce(new Error('e'));
      const res = await request(app).get('/5/categories');
      expect(res.status).toBe(500);
    });

    test('POST /:id/categories crea categoría (admin)', async () => {
      allowAdmin();
      EventCategory.create.mockResolvedValueOnce({ id: 1, name: 'VIP' });
      const res = await request(app).post('/5/categories').set('Authorization', 'Bearer x').send({ name: 'VIP' });
      expect(res.status).toBe(201);
    });

    test('POST /:id/categories con error 400', async () => {
      allowAdmin();
      EventCategory.create.mockRejectedValueOnce(new Error('e'));
      const res = await request(app).post('/5/categories').set('Authorization', 'Bearer x').send({});
      expect(res.status).toBe(400);
    });

    test('GET /:id/wallet devuelve la wallet o objeto vacío', async () => {
      EventWallet.findOne.mockResolvedValueOnce(null);
      const res = await request(app).get('/5/wallet');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
    });

    test('GET /:id/wallet con error 500', async () => {
      EventWallet.findOne.mockRejectedValueOnce(new Error('e'));
      const res = await request(app).get('/5/wallet');
      expect(res.status).toBe(500);
    });

    test('POST /:id/wallet crea wallet nueva (admin)', async () => {
      allowAdmin();
      EventWallet.findOne.mockResolvedValueOnce(null);
      EventWallet.create.mockResolvedValueOnce({ id: 1, eventId: 5 });
      const res = await request(app).post('/5/wallet').set('Authorization', 'Bearer x').send({ bankName: 'X' });
      expect(res.status).toBe(200);
    });

    test('POST /:id/wallet actualiza wallet existente (admin)', async () => {
      allowAdmin();
      const existing = { update: jest.fn().mockResolvedValue() };
      EventWallet.findOne.mockResolvedValueOnce(existing);
      const res = await request(app).post('/5/wallet').set('Authorization', 'Bearer x').send({ bankName: 'Y' });
      expect(res.status).toBe(200);
      expect(existing.update).toHaveBeenCalled();
    });

    test('POST /:id/wallet con error 400', async () => {
      allowAdmin();
      EventWallet.findOne.mockRejectedValueOnce(new Error('e'));
      const res = await request(app).post('/5/wallet').set('Authorization', 'Bearer x').send({});
      expect(res.status).toBe(400);
    });

    test('GET /:id con error 500', async () => {
      Event.findByPk.mockRejectedValueOnce(new Error('e'));
      const res = await request(app).get('/5');
      expect(res.status).toBe(500);
    });

    test('PUT /:id actualiza un evento (admin)', async () => {
      allowAdmin();
      Event.update.mockResolvedValueOnce();
      Event.findByPk.mockResolvedValueOnce({ id: 5, toJSON: () => ({ id: 5 }) });
      EventCategory.findAll.mockResolvedValue([]);
      const res = await request(app).put('/5').set('Authorization', 'Bearer x').send({ title: 'Updated' });
      expect(res.status).toBe(200);
    });

    test('PUT /:id actualiza evento con categorías nuevas', async () => {
      allowAdmin();
      Event.update.mockResolvedValueOnce();
      EventCategory.findAll.mockResolvedValueOnce([{ name: 'OLD', sold: 5 }]).mockResolvedValueOnce([]);
      EventCategory.destroy.mockResolvedValueOnce();
      EventCategory.create.mockResolvedValue({});
      Event.findByPk.mockResolvedValueOnce({ toJSON: () => ({ id: 5 }) });
      const res = await request(app).put('/5').set('Authorization', 'Bearer x').send({
        title: 'Updated',
        categories: [{ name: 'OLD', price: 100, capacity: 5 }, { name: 'NEW', price: 50, capacity: 10 }]
      });
      expect(res.status).toBe(200);
    });

    test('PUT /:id con error 500', async () => {
      allowAdmin();
      Event.update.mockRejectedValueOnce(new Error('e'));
      const res = await request(app).put('/5').set('Authorization', 'Bearer x').send({});
      expect(res.status).toBe(500);
    });

    test('DELETE /:id elimina evento (admin)', async () => {
      allowAdmin();
      Event.destroy.mockResolvedValueOnce(1);
      EventCategory.destroy.mockResolvedValueOnce();
      EventWallet.destroy.mockResolvedValueOnce();
      const res = await request(app).delete('/5').set('Authorization', 'Bearer x');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Event deleted');
    });

    test('DELETE /:id devuelve 404 si no existe', async () => {
      allowAdmin();
      Event.destroy.mockResolvedValueOnce(0);
      const res = await request(app).delete('/999').set('Authorization', 'Bearer x');
      expect(res.status).toBe(404);
    });

    test('DELETE /:id con error 500', async () => {
      allowAdmin();
      Event.destroy.mockRejectedValueOnce(new Error('e'));
      const res = await request(app).delete('/5').set('Authorization', 'Bearer x');
      expect(res.status).toBe(500);
    });
  });
});
