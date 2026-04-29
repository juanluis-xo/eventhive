/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 6 PRUEBAS DE INTEGRACIÓN — endpoints HTTP del ticket-service
 * ─────────────────────────────────────────────────────────────────────────────
 * Mocks usados:
 *   1) axios     → para no llamar al events-service / notification-service real
 *   2) Sequelize → para no necesitar la BD MySQL
 *
 * Las pruebas usan supertest para hacer peticiones HTTP contra la app Express.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── MOCK 1: axios ─────────────────────────────────────────────────────────────
jest.mock('axios');
const axios = require('axios');

// ── MOCK 2: Sequelize (no necesitamos BD real) ───────────────────────────────
const mockTicket = {
  findByPk: jest.fn(),
  findAll:  jest.fn(),
  create:   jest.fn(),
  update:   jest.fn()
};

jest.mock('sequelize', () => {
  const mSequelize = {
    define:       jest.fn(() => mockTicket),
    sync:         jest.fn().mockResolvedValue(),
    authenticate: jest.fn().mockResolvedValue()
  };
  return {
    Sequelize: jest.fn(() => mSequelize),
    DataTypes: {
      INTEGER: 'INTEGER', STRING: 'STRING', DATE: 'DATE',
      NOW: 'NOW', ENUM: () => 'ENUM', BOOLEAN: 'BOOLEAN', TEXT: 'TEXT'
    }
  };
});

// Acceso al mock desde dentro del mock factory (Jest hoisting)
const sequelizeModule = require('sequelize');

// Importamos la app DESPUÉS de los mocks
const request = require('supertest');
const { app } = require('../../index');

// ──────────────────────────────────────────────────────────────────────────────

describe('🌐 Pruebas de integración — API de ticket-service', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(mockTicket).forEach(fn => fn.mockReset && fn.mockReset());
  });

  // ── 1 ──────────────────────────────────────────────────────────────────────
  test('1) GET /verify/:code devuelve 400 cuando el formato del código es inválido', async () => {
    const res = await request(app).get('/verify/CODIGO-MAL');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('valid', false);
    expect(res.body.error).toMatch(/inválido/i);
  });

  // ── 2 ──────────────────────────────────────────────────────────────────────
  test('2) GET /verify/:code devuelve 404 cuando el ticket no existe', async () => {
    mockTicket.findByPk.mockResolvedValueOnce(null);

    const res = await request(app).get('/verify/EH-2024-X9999');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      valid: false,
      error: 'Ticket no encontrado.'
    });
    expect(mockTicket.findByPk).toHaveBeenCalledWith(9999);
  });

  // ── 3 ──────────────────────────────────────────────────────────────────────
  test('3) GET /verify/:code (1ª vez) devuelve valid:true y marca el ticket como usado', async () => {
    const fakeTicket = {
      id: 5, userId: 1, eventId: 10, categoryId: 2, usedAt: null,
      purchaseDate: new Date('2025-01-01'),
      update: jest.fn().mockResolvedValue()
    };
    mockTicket.findByPk.mockResolvedValueOnce(fakeTicket);
    axios.get.mockResolvedValueOnce({
      data: {
        id: 10, title: 'Concierto Rock', date: '2025-12-01', location: 'Bogotá',
        categories: [{ id: 2, name: 'VIP' }]
      }
    });

    const res = await request(app).get('/verify/EH-2024-X5');

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.alreadyUsed).toBe(false);
    expect(res.body.event).toHaveProperty('title', 'Concierto Rock');
    expect(res.body.categoryName).toBe('VIP');
    // El ticket debe haberse marcado como usado
    expect(fakeTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({ usedAt: expect.any(Date) })
    );
  });

  // ── 4 ──────────────────────────────────────────────────────────────────────
  test('4) GET /verify/:code (2ª vez) devuelve alreadyUsed:true sin volver a marcar', async () => {
    const usedDate = new Date('2025-06-15T10:00:00Z');
    const fakeTicket = {
      id: 5, userId: 1, eventId: 10, categoryId: 2,
      usedAt: usedDate,                       // ya fue usado antes
      purchaseDate: new Date('2025-01-01'),
      update: jest.fn()
    };
    mockTicket.findByPk.mockResolvedValueOnce(fakeTicket);
    axios.get.mockResolvedValueOnce({
      data: { id: 10, title: 'Concierto', categories: [] }
    });

    const res = await request(app).get('/verify/EH-2024-X5');

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.alreadyUsed).toBe(true);
    expect(res.body.usedAt).toBeDefined();
    expect(fakeTicket.update).not.toHaveBeenCalled();   // NO se vuelve a marcar
  });

  // ── 5 ──────────────────────────────────────────────────────────────────────
  test('5) GET /event-stats/:eventId devuelve totales agrupados por categoría', async () => {
    mockTicket.findAll.mockResolvedValueOnce([
      { eventId: 1, categoryId: 1 },
      { eventId: 1, categoryId: 1 },
      { eventId: 1, categoryId: 2 },
      { eventId: 1, categoryId: null }   // sin categoría
    ]);

    const res = await request(app).get('/event-stats/1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      total: 4,
      byCategory: { '1': 2, '2': 1, sin_categoria: 1 }
    });
    expect(mockTicket.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { eventId: '1' } })
    );
  });

  // ── 6 ──────────────────────────────────────────────────────────────────────
  test('6) POST / crea un ticket y dispara la notificación', async () => {
    const created = { id: 100, userId: 1, eventId: 10, categoryId: 2 };
    mockTicket.create.mockResolvedValueOnce(created);
    // Para los axios.patch (incrementar sold) y axios.post (notificación)
    axios.patch.mockResolvedValue({});
    axios.post.mockResolvedValue({});

    const res = await request(app)
      .post('/')
      .send({ userId: 1, eventId: 10, categoryId: 2 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(created);
    expect(mockTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, eventId: 10, categoryId: 2 })
    );

    // Damos un "tick" para que se dispare la notificación asíncrona (no bloqueante)
    await new Promise(r => setImmediate(r));

    // Se llamó al events-service para incrementar el sold de la categoría
    expect(axios.patch).toHaveBeenCalled();
    // Se llamó al notification-service
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/notify'),
      expect.objectContaining({ type: 'ticket.purchased', userId: 1 })
    );
  });
});
