/**
 * 6 PRUEBAS UNITARIAS — user-service
 * Mocks: sequelize (BD) + bcryptjs (hashing — servicio externo)
 * Matchers: toBe, toEqual, toBeNull, toContain, toBeDefined, toHaveProperty, toBeInstanceOf
 */

// MOCK 1 — Sequelize
jest.mock('sequelize', () => ({
  Sequelize: jest.fn(() => ({
    define: jest.fn(() => ({})),
    sync: jest.fn().mockResolvedValue(),
    authenticate: jest.fn().mockResolvedValue(),
    query: jest.fn().mockResolvedValue([])
  })),
  DataTypes: { INTEGER: 'INTEGER', STRING: 'STRING', ENUM: () => 'ENUM' }
}));

// MOCK 2 — bcryptjs
jest.mock('bcryptjs');

const { isValidRole, buildPublicUser, buildJwtPayload, VALID_ROLES } = require('../../index');

describe('🧪 Pruebas unitarias — user-service', () => {

  // ── isValidRole ───────────────────────────────────────────────────────────
  describe('isValidRole', () => {

    test('1. acepta los 3 roles válidos', () => {
      expect(isValidRole('organizer')).toBe(true);
      expect(isValidRole('attendee')).toBe(true);
      expect(isValidRole('admin')).toBe(true);
    });

    test('2. rechaza valores no válidos', () => {
      expect(isValidRole('superuser')).toBe(false);
      expect(isValidRole('')).toBe(false);
      expect(isValidRole(null)).toBe(false);
    });

    test('3. la lista de roles está bien definida', () => {
      expect(VALID_ROLES).toEqual(['organizer', 'attendee', 'admin']);
      expect(VALID_ROLES).toContain('admin');
      expect(VALID_ROLES).toBeDefined();
    });
  });

  // ── buildPublicUser ───────────────────────────────────────────────────────
  describe('buildPublicUser', () => {

    test('4. quita la contraseña del usuario', () => {
      const dbUser = {
        id: 1, username: 'ana', email: 'a@a.com',
        role: 'attendee', password: 'super-secret-hash'
      };
      const result = buildPublicUser(dbUser);

      expect(result).toEqual({ id: 1, username: 'ana', email: 'a@a.com', role: 'attendee' });
      expect(result).not.toHaveProperty('password');
    });

    test('5. devuelve null si el usuario es null o undefined', () => {
      expect(buildPublicUser(null)).toBeNull();
      expect(buildPublicUser(undefined)).toBeNull();
    });
  });

  // ── buildJwtPayload — async ───────────────────────────────────────────────
  describe('buildJwtPayload (async)', () => {

    test('6. devuelve una promesa con el payload del JWT (.resolves)', async () => {
      const user = { id: 99, email: 'admin@a.com', role: 'admin', password: 'h' };
      const promise = buildJwtPayload(user);

      expect(promise).toBeInstanceOf(Promise);
      await expect(promise).resolves.toEqual({
        id: 99, email: 'admin@a.com', role: 'admin'
      });

      const payload = await buildJwtPayload(user);
      expect(payload).toHaveProperty('id', 99);
      expect(payload).not.toHaveProperty('password');
    });
  });
});
