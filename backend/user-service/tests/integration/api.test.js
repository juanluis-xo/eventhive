/**
 * 6 PRUEBAS DE INTEGRACIÓN — user-service (con supertest)
 * Mocks: sequelize (BD) + bcryptjs (hashing) + jsonwebtoken
 * Matchers: toBe, toEqual, toHaveProperty, toMatch, toContain
 */

// MOCK 1 — Sequelize
const mockUser = { findOne: jest.fn(), create: jest.fn(), findByPk: jest.fn() };
jest.mock('sequelize', () => ({
  Sequelize: jest.fn(() => ({
    define: jest.fn(() => mockUser),
    sync: jest.fn().mockResolvedValue(),
    authenticate: jest.fn().mockResolvedValue(),
    query: jest.fn().mockResolvedValue([])
  })),
  DataTypes: { INTEGER: 'INTEGER', STRING: 'STRING', ENUM: () => 'ENUM' }
}));

// MOCK 2 — bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));

// MOCK 3 — jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'fake-jwt-token-xyz')
}));

const request = require('supertest');
const bcrypt = require('bcryptjs');
const { app, seedAdminIfNeeded } = require('../../index');

describe('🌐 Pruebas de integración — user-service', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(mockUser).forEach(fn => fn.mockReset && fn.mockReset());
  });

  // ── POST /register ───────────────────────────────────────────────────────
  describe('POST /register', () => {

    test('1. registra un usuario y devuelve 201', async () => {
      bcrypt.hash.mockResolvedValueOnce('hashed-password');
      mockUser.create.mockResolvedValueOnce({ id: 1, username: 'ana', email: 'a@a.com', role: 'attendee' });

      const res = await request(app)
        .post('/register')
        .send({ username: 'ana', email: 'a@a.com', password: '1234', role: 'attendee' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'User created successfully');
      expect(res.body.user).toEqual({ id: 1, username: 'ana', email: 'a@a.com', role: 'attendee' });
      expect(bcrypt.hash).toHaveBeenCalledWith('1234', 10);
    });

    test('2. devuelve 400 si User.create lanza error', async () => {
      bcrypt.hash.mockResolvedValueOnce('hash');
      mockUser.create.mockRejectedValueOnce(new Error('email duplicado'));

      const res = await request(app)
        .post('/register')
        .send({ username: 'x', email: 'x@x.com', password: 'p' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/email duplicado/);
    });
  });

  // ── POST /login ──────────────────────────────────────────────────────────
  describe('POST /login', () => {

    test('3. devuelve token JWT cuando las credenciales son válidas', async () => {
      mockUser.findOne.mockResolvedValueOnce({
        id: 5, username: 'ana', email: 'a@a.com', role: 'attendee', password: 'hash'
      });
      bcrypt.compare.mockResolvedValueOnce(true);

      const res = await request(app)
        .post('/login')
        .send({ email: 'a@a.com', password: '1234' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token', 'fake-jwt-token-xyz');
      expect(res.body.user).toEqual({ id: 5, username: 'ana', email: 'a@a.com', role: 'attendee' });
    });

    test('4. devuelve 401 si la contraseña es incorrecta', async () => {
      mockUser.findOne.mockResolvedValueOnce({ id: 1, password: 'h' });
      bcrypt.compare.mockResolvedValueOnce(false);

      const res = await request(app).post('/login').send({ email: 'a@a.com', password: 'mal' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Credenciales inválidas');
    });

    test('5. devuelve 500 si la consulta a BD falla', async () => {
      mockUser.findOne.mockRejectedValueOnce(new Error('BD caída'));

      const res = await request(app).post('/login').send({ email: 'a@a.com', password: '1' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Error en el servidor');
    });
  });

  // ── GET /profile/:id ─────────────────────────────────────────────────────
  describe('GET /profile/:id', () => {

    test('6. devuelve el perfil público (sin password)', async () => {
      mockUser.findByPk.mockResolvedValueOnce({ id: 1, username: 'ana', email: 'a@a.com', role: 'attendee' });

      const res = await request(app).get('/profile/1');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('username', 'ana');
      expect(res.body).not.toHaveProperty('password');
    });
  });

  // ── Cobertura adicional ──────────────────────────────────────────────────
  describe('Cobertura adicional', () => {

    test('login con usuario inexistente devuelve 401', async () => {
      mockUser.findOne.mockResolvedValueOnce(null);
      const res = await request(app).post('/login').send({ email: 'x@x.com', password: '1' });
      expect(res.status).toBe(401);
    });

    test('GET /profile/:id devuelve 404 si no existe', async () => {
      mockUser.findByPk.mockResolvedValueOnce(null);
      const res = await request(app).get('/profile/999');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Usuario no encontrado');
    });

    test('GET /profile/:id devuelve 500 si la BD falla', async () => {
      mockUser.findByPk.mockRejectedValueOnce(new Error('error BD'));
      const res = await request(app).get('/profile/1');
      expect(res.status).toBe(500);
    });
  });

  // ── seedAdminIfNeeded ────────────────────────────────────────────────────
  describe('seedAdminIfNeeded', () => {

    afterEach(() => {
      delete process.env.ADMIN_USERNAME;
      delete process.env.ADMIN_EMAIL;
      delete process.env.ADMIN_PASSWORD;
    });

    test('omite seed cuando faltan variables de entorno', async () => {
      // sin variables — debe retornar sin tocar BD
      await seedAdminIfNeeded();
      expect(mockUser.findOne).not.toHaveBeenCalled();
    });

    test('no crea admin si ya existe uno', async () => {
      process.env.ADMIN_USERNAME = 'admin';
      process.env.ADMIN_EMAIL = 'admin@a.com';
      process.env.ADMIN_PASSWORD = 'pass';
      mockUser.findOne.mockResolvedValueOnce({ username: 'admin', email: 'admin@a.com' });

      await seedAdminIfNeeded();

      expect(mockUser.create).not.toHaveBeenCalled();
    });

    test('crea admin si no existe', async () => {
      process.env.ADMIN_USERNAME = 'admin';
      process.env.ADMIN_EMAIL = 'admin@a.com';
      process.env.ADMIN_PASSWORD = 'pass';
      mockUser.findOne.mockResolvedValueOnce(null);
      bcrypt.hash.mockResolvedValueOnce('hashed');
      mockUser.create.mockResolvedValueOnce({ id: 1 });

      await seedAdminIfNeeded();

      expect(mockUser.create).toHaveBeenCalledWith(expect.objectContaining({
        username: 'admin', email: 'admin@a.com', role: 'admin'
      }));
    });

    test('captura errores sin crashear', async () => {
      process.env.ADMIN_USERNAME = 'admin';
      process.env.ADMIN_EMAIL = 'admin@a.com';
      process.env.ADMIN_PASSWORD = 'pass';
      mockUser.findOne.mockRejectedValueOnce(new Error('BD caída'));

      // No debe lanzar
      await expect(seedAdminIfNeeded()).resolves.toBeUndefined();
    });
  });
});
