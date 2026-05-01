/**
 * 6 PRUEBAS UNITARIAS — events-service
 * Mocks: sequelize (BD) + jsonwebtoken (JWT — servicio externo)
 * Matchers: toBe, toEqual, toHaveProperty, toBeInstanceOf, toHaveLength
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

const jwt = require('jsonwebtoken');
const sequelizeMock = require('sequelize');
const { verifyAdmin, attachCategories } = require('../../index');

const Event = sequelizeMock.__models.Event;
const EventCategory = sequelizeMock.__models.EventCategory;

describe('🧪 Pruebas unitarias — events-service', () => {

  beforeEach(() => jest.clearAllMocks());

  // ── verifyAdmin (middleware) ─────────────────────────────────────────────
  describe('verifyAdmin middleware', () => {

    const buildRes = () => {
      const res = {};
      res.status = jest.fn(() => res);
      res.json = jest.fn(() => res);
      return res;
    };

    test('1. devuelve 401 si no hay header authorization', () => {
      const req = { headers: {} };
      const res = buildRes();
      const next = jest.fn();

      verifyAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('2. devuelve 401 si no hay token después de Bearer', () => {
      const req = { headers: { authorization: 'Bearer ' } };
      const res = buildRes();
      const next = jest.fn();

      verifyAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('3. devuelve 403 si el rol no es admin', () => {
      jwt.verify.mockReturnValueOnce({ id: 1, role: 'attendee' });
      const req = { headers: { authorization: 'Bearer fake-token' } };
      const res = buildRes();
      const next = jest.fn();

      verifyAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    test('4. llama next() y setea req.user cuando es admin', () => {
      const decoded = { id: 1, role: 'admin', email: 'a@a.com' };
      jwt.verify.mockReturnValueOnce(decoded);
      const req = { headers: { authorization: 'Bearer good-token' } };
      const res = buildRes();
      const next = jest.fn();

      verifyAdmin(req, res, next);

      expect(req.user).toEqual(decoded);
      expect(req.user).toHaveProperty('role', 'admin');
      expect(next).toHaveBeenCalled();
    });

    test('5. devuelve 401 si jwt.verify lanza error', () => {
      jwt.verify.mockImplementationOnce(() => { throw new Error('expired'); });
      const req = { headers: { authorization: 'Bearer bad' } };
      const res = buildRes();
      const next = jest.fn();

      verifyAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ── attachCategories (async) ─────────────────────────────────────────────
  describe('attachCategories (async)', () => {

    test('6. retorna una promesa con categorías unidas a los eventos', async () => {
      const events = [
        { id: 1, toJSON: () => ({ id: 1, title: 'E1' }) },
        { id: 2, toJSON: () => ({ id: 2, title: 'E2' }) }
      ];
      const cats = [
        { eventId: 1, toJSON: () => ({ eventId: 1, name: 'VIP' }) },
        { eventId: 2, toJSON: () => ({ eventId: 2, name: 'General' }) }
      ];
      EventCategory.findAll.mockResolvedValueOnce(cats);

      const promise = attachCategories(events);
      expect(promise).toBeInstanceOf(Promise);

      const result = await promise;
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('categories');
      expect(result[0].categories[0].name).toBe('VIP');
    });
  });
});
