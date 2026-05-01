/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 6 PRUEBAS DE INTEGRACIÓN — payment-service (con supertest)
 * ─────────────────────────────────────────────────────────────────────────────
 * Endpoints: POST /process, GET /user/:userId, GET /health
 * Mocks: sequelize (BD) + Math.random (txn id determinístico)
 * Matchers: toBe, toEqual, toHaveProperty, toMatch, toContain
 * ─────────────────────────────────────────────────────────────────────────────
 */

// MOCK 1 — Sequelize
const mockPayment = {
  findAll: jest.fn(),
  create:  jest.fn()
};

jest.mock('sequelize', () => {
  const mSequelize = {
    define:       jest.fn(() => mockPayment),
    sync:         jest.fn().mockResolvedValue(),
    authenticate: jest.fn().mockResolvedValue()
  };
  return {
    Sequelize: jest.fn(() => mSequelize),
    DataTypes: {
      INTEGER: 'INTEGER', STRING: 'STRING', DECIMAL: () => 'DECIMAL',
      ENUM: () => 'ENUM'
    }
  };
});

const request = require('supertest');
const { app } = require('../../index');

describe('🌐 Pruebas de integración — payment-service', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(mockPayment).forEach(fn => fn.mockReset && fn.mockReset());
  });

  // ── POST /process ────────────────────────────────────────────────────────
  describe('POST /process', () => {

    test('1. procesa un pago exitoso y devuelve 201', async () => {
      // MOCK 2 — Math.random para que el txn id sea determinístico
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      const fakePayment = {
        id: 10, userId: 1, eventId: 5, amount: 100.00,
        method: 'paypal', transactionId: 'TXN-XYZABC123'
      };
      mockPayment.create.mockResolvedValueOnce(fakePayment);

      const res = await request(app)
        .post('/process')
        .send({ userId: 1, eventId: 5, amount: 100.00, method: 'paypal' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Pago procesado exitosamente');
      expect(res.body.payment).toEqual(fakePayment);
    });

    test('2. devuelve 500 cuando Payment.create falla', async () => {
      mockPayment.create.mockRejectedValueOnce(new Error('Conexión BD perdida'));

      const res = await request(app)
        .post('/process')
        .send({ userId: 1, eventId: 5, amount: 100.00, method: 'paypal' });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toMatch(/Conexión BD perdida/);
    });

    test('3. genera transactionId con formato TXN-XXXXXXXXX', async () => {
      mockPayment.create.mockImplementation(async (data) => ({ id: 20, ...data }));

      await request(app)
        .post('/process')
        .send({ userId: 2, eventId: 8, amount: 50, method: 'credit_card' });

      const callArg = mockPayment.create.mock.calls[0][0];
      expect(callArg.transactionId).toMatch(/^TXN-[A-Z0-9]+$/);
      expect(callArg.userId).toBe(2);
    });
  });

  // ── GET /user/:userId ────────────────────────────────────────────────────
  describe('GET /user/:userId', () => {

    test('4. devuelve la lista de pagos de un usuario', async () => {
      const list = [
        { id: 1, userId: 7, amount: 50, method: 'paypal' },
        { id: 2, userId: 7, amount: 75, method: 'credit_card' }
      ];
      mockPayment.findAll.mockResolvedValueOnce(list);

      const res = await request(app).get('/user/7');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(list);
      expect(res.body).toHaveLength(2);
    });

    test('5. devuelve 500 si findAll falla', async () => {
      mockPayment.findAll.mockRejectedValueOnce(new Error('Tabla no existe'));

      const res = await request(app).get('/user/7');

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', 'Tabla no existe');
    });
  });

  // ── GET /health ──────────────────────────────────────────────────────────
  describe('GET /health', () => {

    test('6. devuelve 200 con mensaje de servicio activo', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body.status).toContain('Payment Service');
    });
  });
});
