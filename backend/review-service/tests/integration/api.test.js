/**
 * 6 PRUEBAS DE INTEGRACIÓN — review-service (con supertest)
 * Mocks: sequelize (BD) + axios (servicio externo)
 * Matchers: toBe, toEqual, toHaveProperty, toMatch, toContain, toHaveLength
 */

// MOCK 1 — Sequelize
const mockReview = { findAll: jest.fn(), create: jest.fn() };
jest.mock('sequelize', () => ({
  Sequelize: jest.fn(() => ({
    define: jest.fn(() => mockReview),
    sync: jest.fn().mockResolvedValue(),
    authenticate: jest.fn().mockResolvedValue()
  })),
  DataTypes: { INTEGER: 'INTEGER', STRING: 'STRING', TEXT: 'TEXT' }
}));

// MOCK 2 — axios
jest.mock('axios');

const request = require('supertest');
const { app } = require('../../index');

describe('🌐 Pruebas de integración — review-service', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(mockReview).forEach(fn => fn.mockReset && fn.mockReset());
  });

  // ── POST / ───────────────────────────────────────────────────────────────
  describe('POST /', () => {

    test('1. crea una reseña y devuelve 201', async () => {
      const fakeReview = { id: 1, userId: 5, username: 'Ana', eventId: 10, rating: 5, comment: 'Top' };
      mockReview.create.mockResolvedValueOnce(fakeReview);

      const res = await request(app)
        .post('/')
        .send({ userId: 5, username: 'Ana', eventId: 10, rating: 5, comment: 'Top' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(fakeReview);
      expect(res.body).toHaveProperty('rating', 5);
    });

    test('2. devuelve 400 si Review.create lanza error', async () => {
      mockReview.create.mockRejectedValueOnce(new Error('rating fuera de rango'));

      const res = await request(app)
        .post('/')
        .send({ userId: 1, username: 'X', eventId: 2, rating: 10, comment: 'no' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/rating fuera de rango/);
    });
  });

  // ── GET /event/:eventId ──────────────────────────────────────────────────
  describe('GET /event/:eventId', () => {

    test('3. devuelve reseñas con count y promedio', async () => {
      const list = [{ rating: 5 }, { rating: 3 }, { rating: 4 }];
      mockReview.findAll.mockResolvedValueOnce(list);

      const res = await request(app).get('/event/10');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('count', 3);
      expect(res.body).toHaveProperty('average', 4);
      expect(res.body.reviews).toHaveLength(3);
    });

    test('4. devuelve count 0 y average 0 si no hay reseñas', async () => {
      mockReview.findAll.mockResolvedValueOnce([]);

      const res = await request(app).get('/event/99');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(0);
      expect(res.body.average).toBe(0);
    });

    test('5. devuelve 500 si la BD falla', async () => {
      mockReview.findAll.mockRejectedValueOnce(new Error('Error BD'));

      const res = await request(app).get('/event/10');

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', 'Error BD');
    });
  });

  // ── GET /stats ───────────────────────────────────────────────────────────
  describe('GET /stats', () => {

    test('6. devuelve estadísticas para múltiples eventos', async () => {
      mockReview.findAll
        .mockResolvedValueOnce([{ rating: 5 }, { rating: 3 }])  // event 1
        .mockResolvedValueOnce([{ rating: 4 }]);                // event 2

      const res = await request(app).get('/stats').query({ eventIds: '1,2' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toEqual({ eventId: 1, count: 2, average: 4 });
      expect(res.body[1]).toEqual({ eventId: 2, count: 1, average: 4 });
    });
  });

  // ── Cobertura adicional ──────────────────────────────────────────────────
  describe('Cobertura adicional', () => {

    test('GET /stats sin eventIds devuelve []', async () => {
      const res = await request(app).get('/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('GET /stats con BD que falla devuelve 500', async () => {
      mockReview.findAll.mockRejectedValueOnce(new Error('error stats'));
      const res = await request(app).get('/stats').query({ eventIds: '1' });
      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/error stats/);
    });

    test('GET /health devuelve 200', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toContain('Review Service');
    });
  });
});
