/**
 * 6 PRUEBAS UNITARIAS — notification-service
 * Mocks: sequelize (BD) + axios (servicios externos) + jsonwebtoken + node-cron
 * Matchers: toBe, toEqual, toHaveProperty, toContain, toBeNull, toBeInstanceOf
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

const axios = require('axios');
const jwt = require('jsonwebtoken');
const { verifyAdmin, safeGet, buildEmailHtml, getEventTitle, getUserEmail } = require('../../index');

describe('🧪 Pruebas unitarias — notification-service', () => {

  beforeEach(() => jest.clearAllMocks());

  // ── verifyAdmin ──────────────────────────────────────────────────────────
  describe('verifyAdmin', () => {

    const buildRes = () => {
      const res = {};
      res.status = jest.fn(() => res);
      res.json = jest.fn(() => res);
      return res;
    };

    test('1. devuelve 401 sin header', () => {
      const res = buildRes();
      verifyAdmin({ headers: {} }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('2. devuelve 403 si rol no es admin', () => {
      jwt.verify.mockReturnValueOnce({ role: 'attendee' });
      const res = buildRes();
      verifyAdmin({ headers: { authorization: 'Bearer x' } }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ── buildEmailHtml ───────────────────────────────────────────────────────
  describe('buildEmailHtml', () => {

    test('3. devuelve un string HTML que incluye el subject y body', () => {
      const html = buildEmailHtml('Mi título', 'Mi cuerpo');
      expect(html).toContain('Mi título');
      expect(html).toContain('Mi cuerpo');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('EventHive');
    });
  });

  // ── safeGet ──────────────────────────────────────────────────────────────
  describe('safeGet (async fallback)', () => {

    test('4. cae a localhost si la URL Docker falla', async () => {
      axios.get
        .mockRejectedValueOnce(new Error('Docker DNS'))
        .mockResolvedValueOnce({ data: { ok: true } });

      const promise = safeGet('http://docker:5002/path', 5002, '/path');
      expect(promise).toBeInstanceOf(Promise);

      const result = await promise;
      expect(result).toEqual({ data: { ok: true } });
      expect(axios.get).toHaveBeenLastCalledWith('http://localhost:5002/path');
    });
  });

  // ── getEventTitle ────────────────────────────────────────────────────────
  describe('getEventTitle (async)', () => {

    test('5. devuelve el título cuando events-service responde', async () => {
      axios.get.mockResolvedValueOnce({ data: { title: 'Concierto' } });
      const title = await getEventTitle(5);
      expect(title).toBe('Concierto');
    });

    test('5b. devuelve "tu evento" cuando events-service falla', async () => {
      axios.get.mockRejectedValue(new Error('events-service caído'));
      const title = await getEventTitle(5);
      expect(title).toBe('tu evento');
    });
  });

  // ── getUserEmail ─────────────────────────────────────────────────────────
  describe('getUserEmail (async)', () => {

    test('6. devuelve null si no hay userId', async () => {
      const email = await getUserEmail(null);
      expect(email).toBeNull();
    });

    test('6b. devuelve el email si user-service responde', async () => {
      axios.get.mockResolvedValueOnce({ data: { email: 'a@a.com' } });
      const email = await getUserEmail(1);
      expect(email).toBe('a@a.com');
    });
  });
});
