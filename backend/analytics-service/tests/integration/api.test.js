/**
 * 6 PRUEBAS DE INTEGRACIÓN — analytics-service
 * Mocks: sequelize (BD) + axios (servicios externos) + node-cron + jwt
 * Matchers: toBe, toEqual, toHaveProperty, toMatch, toContain
 */

// MOCK 1 — Sequelize
jest.mock('sequelize', () => {
  const makeModel = () => ({
    findAll: jest.fn(), create: jest.fn(), update: jest.fn(),
    findOne: jest.fn(), destroy: jest.fn()
  });
  const models = {};
  return {
    Sequelize: jest.fn(() => ({
      define: jest.fn((name) => { models[name] = makeModel(); return models[name]; }),
      sync: jest.fn().mockResolvedValue(),
      authenticate: jest.fn().mockResolvedValue()
    })),
    DataTypes: {
      INTEGER: 'INTEGER', STRING: 'STRING', DATE: 'DATE', DATEONLY: 'DATEONLY',
      DECIMAL: () => 'DECIMAL', NOW: 'NOW'
    },
    Op: { gte: 'gte' },
    __models: models
  };
});

// MOCK 2 — axios
jest.mock('axios');

jest.mock('node-cron', () => ({ schedule: jest.fn() }));
jest.mock('jsonwebtoken', () => ({ verify: jest.fn() }));

const request = require('supertest');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const sequelizeMock = require('sequelize');
const { app } = require('../../index');

const EventSnapshot = sequelizeMock.__models.EventSnapshot;
const CategorySnapshot = sequelizeMock.__models.CategorySnapshot;
const DailySale = sequelizeMock.__models.DailySale;

const allowAdmin = () => jwt.verify.mockReturnValue({ role: 'admin', id: 1 });

describe('🌐 Pruebas de integración — analytics-service', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    [EventSnapshot, CategorySnapshot, DailySale].forEach(m =>
      Object.values(m).forEach(fn => fn.mockReset && fn.mockReset())
    );
  });

  // ── 1. GET /health ───────────────────────────────────────────────────────
  test('1. GET /health devuelve 200 con estado y puerto', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body.status).toContain('Analytics Service');
  });

  // ── 2. GET /overview ─────────────────────────────────────────────────────
  test('2. GET /overview devuelve KPIs globales (admin)', async () => {
    allowAdmin();
    EventSnapshot.findAll.mockResolvedValueOnce([
      { totalRevenue: '1000', totalSold: 50, totalCapacity: 100, avgRating: '4', reviewCount: 5, lastUpdatedAt: new Date() },
      { totalRevenue: '500',  totalSold: 25, totalCapacity: 50,  avgRating: '5', reviewCount: 3, lastUpdatedAt: new Date() }
    ]);

    const res = await request(app).get('/overview').set('Authorization', 'Bearer x');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalRevenue', 1500);
    expect(res.body).toHaveProperty('totalEvents', 2);
    expect(res.body).toHaveProperty('totalTickets', 75);
  });

  // ── 3. GET /events ───────────────────────────────────────────────────────
  test('3. GET /events devuelve la lista de snapshots ordenados', async () => {
    allowAdmin();
    EventSnapshot.findAll.mockResolvedValueOnce([
      { eventId: 1, title: 'Concierto', totalRevenue: '500' }
    ]);

    const res = await request(app).get('/events').set('Authorization', 'Bearer x');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  // ── 4. GET /events/:id/summary ───────────────────────────────────────────
  test('4. GET /events/:id/summary devuelve el resumen del evento', async () => {
    allowAdmin();
    EventSnapshot.findOne.mockResolvedValueOnce({ eventId: 5, title: 'X', totalRevenue: '100' });

    const res = await request(app).get('/events/5/summary').set('Authorization', 'Bearer x');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('eventId', 5);
  });

  // ── 5. POST /refresh ─────────────────────────────────────────────────────
  test('5. POST /refresh fuerza la recolección', async () => {
    allowAdmin();
    // collect() llama axios.get(EVENTS_URL); que devuelva [] = "No hay eventos"
    axios.get.mockResolvedValueOnce({ data: [] });

    const res = await request(app).post('/refresh').set('Authorization', 'Bearer x');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toMatch(/actualizados/i);
  });

  // ── 6. 404 handler ───────────────────────────────────────────────────────
  test('6. ruta inexistente devuelve 404', async () => {
    const res = await request(app).get('/ruta-no-existe');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('ANALYTICS SERVICE');
  });

  // ── Cobertura adicional ──────────────────────────────────────────────────
  describe('Cobertura adicional', () => {

    test('GET /overview con error 500', async () => {
      allowAdmin();
      EventSnapshot.findAll.mockRejectedValueOnce(new Error('e'));
      const res = await request(app).get('/overview').set('Authorization', 'Bearer x');
      expect(res.status).toBe(500);
    });

    test('GET /events con error 500', async () => {
      allowAdmin();
      EventSnapshot.findAll.mockRejectedValueOnce(new Error('e'));
      const res = await request(app).get('/events').set('Authorization', 'Bearer x');
      expect(res.status).toBe(500);
    });

    test('GET /events/:id/summary devuelve 404 si no existe', async () => {
      allowAdmin();
      EventSnapshot.findOne.mockResolvedValueOnce(null);
      const res = await request(app).get('/events/99/summary').set('Authorization', 'Bearer x');
      expect(res.status).toBe(404);
    });

    test('GET /events/:id/summary con error 500', async () => {
      allowAdmin();
      EventSnapshot.findOne.mockRejectedValueOnce(new Error('e'));
      const res = await request(app).get('/events/5/summary').set('Authorization', 'Bearer x');
      expect(res.status).toBe(500);
    });

    test('GET /events/:id/categories', async () => {
      allowAdmin();
      CategorySnapshot.findAll.mockResolvedValueOnce([{ name: 'VIP' }]);
      const res = await request(app).get('/events/5/categories').set('Authorization', 'Bearer x');
      expect(res.status).toBe(200);
    });

    test('GET /events/:id/categories con error 500', async () => {
      allowAdmin();
      CategorySnapshot.findAll.mockRejectedValueOnce(new Error('e'));
      const res = await request(app).get('/events/5/categories').set('Authorization', 'Bearer x');
      expect(res.status).toBe(500);
    });

    test('GET /events/:id/timeseries', async () => {
      allowAdmin();
      DailySale.findAll.mockResolvedValueOnce([
        { saleDate: '2025-01-01', totalSold: 5 },
        { saleDate: '2025-01-02', totalSold: 8 }
      ]);
      const res = await request(app).get('/events/5/timeseries?days=10').set('Authorization', 'Bearer x');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    test('GET /events/:id/timeseries con error 500', async () => {
      allowAdmin();
      DailySale.findAll.mockRejectedValueOnce(new Error('e'));
      const res = await request(app).get('/events/5/timeseries').set('Authorization', 'Bearer x');
      expect(res.status).toBe(500);
    });

    test('POST /refresh con error en collect', async () => {
      allowAdmin();
      axios.get.mockRejectedValueOnce(new Error('docker'))
               .mockRejectedValueOnce(new Error('localhost'));
      const res = await request(app).post('/refresh').set('Authorization', 'Bearer x');
      // collect captura el error internamente, así que /refresh sigue 200
      expect([200, 500]).toContain(res.status);
    });

    test('POST /refresh procesa eventos completos', async () => {
      allowAdmin();
      // events list
      axios.get
        .mockResolvedValueOnce({ data: [{
          id: 1, title: 'E1', category: 'C', date: '2025', location: 'L',
          categories: [{ id: 10, name: 'VIP', price: 100, capacity: 50, sold: 25 }]
        }] })
        // reviews stats
        .mockResolvedValueOnce({ data: [{ eventId: 1, average: 4, count: 10 }] });

      EventSnapshot.findOne.mockResolvedValueOnce(null);  // crear nuevo
      EventSnapshot.create.mockResolvedValueOnce({});
      CategorySnapshot.destroy.mockResolvedValueOnce();
      CategorySnapshot.create.mockResolvedValueOnce({});
      DailySale.findOne.mockResolvedValueOnce(null);
      DailySale.create.mockResolvedValueOnce({});

      const res = await request(app).post('/refresh').set('Authorization', 'Bearer x');
      expect(res.status).toBe(200);
    });

    test('POST /refresh con snapshot existente lo actualiza', async () => {
      allowAdmin();
      axios.get
        .mockResolvedValueOnce({ data: [{
          id: 2, title: 'E2', categories: [{ id: 1, name: 'X', price: 50, capacity: 10, sold: 5 }]
        }] })
        .mockResolvedValueOnce({ data: [] });

      const existingSnap = { update: jest.fn().mockResolvedValue() };
      const existingDay  = { update: jest.fn().mockResolvedValue() };
      EventSnapshot.findOne.mockResolvedValueOnce(existingSnap);
      CategorySnapshot.destroy.mockResolvedValueOnce();
      CategorySnapshot.create.mockResolvedValueOnce({});
      DailySale.findOne.mockResolvedValueOnce(existingDay);

      const res = await request(app).post('/refresh').set('Authorization', 'Bearer x');
      expect(res.status).toBe(200);
      expect(existingSnap.update).toHaveBeenCalled();
    });

    test('POST /refresh sin eventos retorna mensaje correcto', async () => {
      allowAdmin();
      axios.get.mockResolvedValueOnce({ data: [] });
      const res = await request(app).post('/refresh').set('Authorization', 'Bearer x');
      expect(res.status).toBe(200);
    });

    test('POST /refresh maneja error en reviews', async () => {
      allowAdmin();
      axios.get
        .mockResolvedValueOnce({ data: [{ id: 1, title: 'X', categories: [] }] })
        .mockRejectedValueOnce(new Error('reviews caído'))   // reviews docker
        .mockRejectedValueOnce(new Error('reviews local'));  // reviews localhost
      EventSnapshot.findOne.mockResolvedValueOnce(null);
      EventSnapshot.create.mockResolvedValueOnce({});
      CategorySnapshot.destroy.mockResolvedValueOnce();
      DailySale.findOne.mockResolvedValueOnce(null);
      DailySale.create.mockResolvedValueOnce({});

      const res = await request(app).post('/refresh').set('Authorization', 'Bearer x');
      expect(res.status).toBe(200);
    });

    test('rechazo 401 en /overview sin token', async () => {
      const res = await request(app).get('/overview');
      expect(res.status).toBe(401);
    });

    test('GET /overview con array vacío de snapshots (lastUpdated null)', async () => {
      allowAdmin();
      EventSnapshot.findAll.mockResolvedValueOnce([]);
      const res = await request(app).get('/overview').set('Authorization', 'Bearer x');
      expect(res.status).toBe(200);
      expect(res.body.totalEvents).toBe(0);
      expect(res.body.lastUpdated).toBeNull();
    });

    test('GET /overview con snapshots sin reviewCount (avgRating 0)', async () => {
      allowAdmin();
      EventSnapshot.findAll.mockResolvedValueOnce([
        { totalRevenue: '100', totalSold: 5, totalCapacity: 10, avgRating: '0', reviewCount: 0, lastUpdatedAt: new Date() }
      ]);
      const res = await request(app).get('/overview').set('Authorization', 'Bearer x');
      expect(res.status).toBe(200);
      expect(res.body.avgRating).toBe(0);
    });

    test('POST /refresh con categories que tienen valores undefined (defaults || 0)', async () => {
      allowAdmin();
      axios.get
        .mockResolvedValueOnce({ data: [{
          id: 1, title: 'Sin precios',
          categories: [{ id: 10, name: 'VIP' /* sin price ni capacity ni sold */ }]
        }] })
        .mockResolvedValueOnce({ data: 'no-es-array' });   // reviews retorna string

      EventSnapshot.findOne.mockResolvedValueOnce(null);
      EventSnapshot.create.mockResolvedValueOnce({});
      CategorySnapshot.destroy.mockResolvedValueOnce();
      CategorySnapshot.create.mockResolvedValueOnce({});
      DailySale.findOne.mockResolvedValueOnce(null);
      DailySale.create.mockResolvedValueOnce({});

      const res = await request(app).post('/refresh').set('Authorization', 'Bearer x');
      expect(res.status).toBe(200);
    });
  });
});
