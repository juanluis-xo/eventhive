/**
 * 6 PRUEBAS UNITARIAS — analytics-service
 * Mocks: sequelize (BD) + axios (servicio externo) + node-cron + jsonwebtoken
 * Matchers: toBe, toEqual, toHaveProperty, toBeInstanceOf, toHaveBeenCalledWith
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

// node-cron mock (para que no programe nada en tests)
jest.mock('node-cron', () => ({ schedule: jest.fn() }));

// jsonwebtoken
jest.mock('jsonwebtoken', () => ({ verify: jest.fn() }));

const axios = require('axios');
const jwt = require('jsonwebtoken');
const { verifyAdmin, safeGet } = require('../../index');

describe('🧪 Pruebas unitarias — analytics-service', () => {

  beforeEach(() => jest.clearAllMocks());

  // ── verifyAdmin ──────────────────────────────────────────────────────────
  describe('verifyAdmin', () => {

    const buildRes = () => {
      const res = {};
      res.status = jest.fn(() => res);
      res.json = jest.fn(() => res);
      return res;
    };

    test('1. devuelve 401 sin header authorization', () => {
      const res = buildRes();
      verifyAdmin({ headers: {} }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('2. devuelve 401 si no hay token después de Bearer', () => {
      const res = buildRes();
      verifyAdmin({ headers: { authorization: 'Bearer ' } }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('3. devuelve 403 si rol no es admin', () => {
      jwt.verify.mockReturnValueOnce({ role: 'attendee' });
      const res = buildRes();
      verifyAdmin({ headers: { authorization: 'Bearer x' } }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('4. llama next() si es admin', () => {
      jwt.verify.mockReturnValueOnce({ role: 'admin', id: 1 });
      const next = jest.fn();
      const req = { headers: { authorization: 'Bearer x' } };
      verifyAdmin(req, buildRes(), next);
      expect(next).toHaveBeenCalled();
      expect(req.user).toHaveProperty('role', 'admin');
    });

    test('5. devuelve 401 si jwt.verify lanza', () => {
      jwt.verify.mockImplementationOnce(() => { throw new Error('expired'); });
      const res = buildRes();
      verifyAdmin({ headers: { authorization: 'Bearer bad' } }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ── safeGet (async, fallback Docker→localhost) ──────────────────────────
  describe('safeGet (async fallback)', () => {

    test('6. cae a localhost si la URL Docker falla — devuelve promesa', async () => {
      axios.get
        .mockRejectedValueOnce(new Error('Docker DNS'))
        .mockResolvedValueOnce({ data: { ok: true } });

      const promise = safeGet('http://docker:5002/path', 5002, '/path');
      expect(promise).toBeInstanceOf(Promise);

      const result = await promise;
      expect(result).toEqual({ data: { ok: true } });
      expect(axios.get).toHaveBeenCalledTimes(2);
      expect(axios.get).toHaveBeenLastCalledWith('http://localhost:5002/path');
    });
  });
});
