/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PRUEBAS DE COBERTURA — endpoints adicionales del ticket-service
 * ─────────────────────────────────────────────────────────────────────────────
 * Estas pruebas son adicionales a las 12 obligatorias (6 unit + 6 integración)
 * y existen para llevar la cobertura sobre el 80% que pide la rúbrica (1.2).
 *
 * Mocks usados (mismos que el resto): axios + Sequelize.
 * ─────────────────────────────────────────────────────────────────────────────
 */

jest.mock('axios');
const axios = require('axios');

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

const request = require('supertest');
const { app, getEvent } = require('../../index');

// ──────────────────────────────────────────────────────────────────────────────

describe('📈 Pruebas adicionales para cobertura ≥ 80%', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(mockTicket).forEach(fn => fn.mockReset && fn.mockReset());
  });

  // ── /event-users/:eventId ─────────────────────────────────────────────────
  describe('GET /event-users/:eventId', () => {
    test('devuelve userIds únicos de los asistentes', async () => {
      mockTicket.findAll.mockResolvedValueOnce([
        { userId: 1 }, { userId: 2 }, { userId: 1 }, { userId: 3 }
      ]);
      const res = await request(app).get('/event-users/5');
      expect(res.status).toBe(200);
      expect(res.body.eventId).toBe(5);
      expect(res.body.userIds).toEqual([1, 2, 3]);   // sin duplicados
    });

    test('responde 500 si la BD lanza error', async () => {
      mockTicket.findAll.mockRejectedValueOnce(new Error('DB caída'));
      const res = await request(app).get('/event-users/5');
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', 'DB caída');
    });
  });

  // ── /event-stats/:eventId — caso de error ────────────────────────────────
  describe('GET /event-stats/:eventId — error', () => {
    test('responde 500 si findAll falla', async () => {
      mockTicket.findAll.mockRejectedValueOnce(new Error('Error BD'));
      const res = await request(app).get('/event-stats/1');
      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/Error BD/);
    });
  });

  // ── /details/:id ─────────────────────────────────────────────────────────
  describe('GET /details/:id', () => {
    test('devuelve los detalles del ticket con su evento', async () => {
      mockTicket.findByPk.mockResolvedValueOnce({
        id: 7, userId: 1, eventId: 10, categoryId: 2, zoneLabel: 'VIP',
        purchaseDate: new Date('2025-01-01')
      });
      axios.get.mockResolvedValueOnce({ data: { id: 10, title: 'Concierto' } });

      const res = await request(app).get('/details/7');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: 7, userId: 1, categoryId: 2, zoneLabel: 'VIP'
      });
      expect(res.body.event).toEqual({ id: 10, title: 'Concierto' });
    });

    test('devuelve 404 si el ticket no existe', async () => {
      mockTicket.findByPk.mockResolvedValueOnce(null);
      const res = await request(app).get('/details/999');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Ticket no encontrado');
    });

    test('devuelve evento "no disponible" cuando getEvent falla', async () => {
      mockTicket.findByPk.mockResolvedValueOnce({
        id: 7, userId: 1, eventId: 10, categoryId: null, zoneLabel: null,
        purchaseDate: new Date()
      });
      // axios falla en ambas urls (docker y localhost) → catch del endpoint
      axios.get.mockRejectedValue(new Error('events-service caído'));
      const res = await request(app).get('/details/7');
      expect(res.status).toBe(200);
      expect(res.body.event).toEqual({ title: 'Evento no disponible' });
    });
  });

  // ── /user/:userId ────────────────────────────────────────────────────────
  describe('GET /user/:userId', () => {
    test('devuelve los tickets del usuario con el evento de cada uno', async () => {
      mockTicket.findAll.mockResolvedValueOnce([
        { id: 1, eventId: 10, categoryId: 2, purchaseDate: new Date() },
        { id: 2, eventId: 11, categoryId: 3, purchaseDate: new Date() }
      ]);
      axios.get
        .mockResolvedValueOnce({ data: { id: 10, title: 'Concierto' } })
        .mockResolvedValueOnce({ data: { id: 11, title: 'Festival' } });

      const res = await request(app).get('/user/42');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].event.title).toBe('Concierto');
      expect(res.body[1].event.title).toBe('Festival');
    });

    test('devuelve "Evento no disponible" cuando alguno falla', async () => {
      mockTicket.findAll.mockResolvedValueOnce([
        { id: 1, eventId: 10, categoryId: null, purchaseDate: new Date() }
      ]);
      axios.get.mockRejectedValue(new Error('events-service caído'));

      const res = await request(app).get('/user/42');
      expect(res.status).toBe(200);
      expect(res.body[0].event).toEqual({ title: 'Evento no disponible' });
    });
  });

  // ── POST / — error path ──────────────────────────────────────────────────
  describe('POST / — caso de error', () => {
    test('responde 400 cuando Ticket.create falla', async () => {
      mockTicket.create.mockRejectedValueOnce(new Error('Datos inválidos'));
      const res = await request(app).post('/').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Datos inválidos');
    });

    test('crea ticket SIN categoryId (rama del if)', async () => {
      const created = { id: 50, userId: 1, eventId: 10, categoryId: null };
      mockTicket.create.mockResolvedValueOnce(created);
      axios.post.mockResolvedValue({});

      const res = await request(app)
        .post('/')
        .send({ userId: 1, eventId: 10 });   // sin categoryId

      expect(res.status).toBe(201);
      // No debe llamar al increment (porque no hay categoryId)
      expect(axios.patch).not.toHaveBeenCalled();
    });
  });

  // ── POST /batch ──────────────────────────────────────────────────────────
  describe('POST /batch', () => {
    test('rechaza con 400 si faltan campos obligatorios', async () => {
      const res1 = await request(app).post('/batch').send({});
      expect(res1.status).toBe(400);
      expect(res1.body.error).toMatch(/userId.*eventId.*items/);

      const res2 = await request(app)
        .post('/batch')
        .send({ userId: 1, eventId: 1, items: [] });
      expect(res2.status).toBe(400);
    });

    test('crea N tickets según la cantidad de cada item', async () => {
      // Mock: cada Ticket.create devuelve un ticket con id incremental
      let nextId = 100;
      mockTicket.create.mockImplementation(async (data) => ({
        id: nextId++, ...data
      }));
      axios.patch.mockResolvedValue({});
      axios.post.mockResolvedValue({});

      const res = await request(app)
        .post('/batch')
        .send({
          userId:  1,
          eventId: 10,
          items: [
            { categoryId: 1, zoneLabel: 'VIP',     quantity: 2 },
            { categoryId: 2, zoneLabel: 'General', quantity: 1 }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.total).toBe(3);                  // 2 + 1
      expect(res.body.tickets).toHaveLength(3);
      expect(mockTicket.create).toHaveBeenCalledTimes(3);
    });

    test('responde 400 si Ticket.create lanza error en medio del loop', async () => {
      mockTicket.create.mockRejectedValueOnce(new Error('error inserción'));
      const res = await request(app)
        .post('/batch')
        .send({
          userId: 1, eventId: 1,
          items: [{ categoryId: 1, quantity: 1 }]
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('error inserción');
    });
  });

  // ── 404 handler ──────────────────────────────────────────────────────────
  describe('404 handler', () => {
    test('rutas inexistentes devuelven 404 con mensaje en español', async () => {
      const res = await request(app).get('/ruta-que-no-existe');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Ruta no encontrada en TICKET SERVICE');
      expect(res.body).toHaveProperty('urlReceived', '/ruta-que-no-existe');
    });
  });

  // ── /verify/:code — caso de error en findByPk ───────────────────────────
  describe('GET /verify/:code — error en BD', () => {
    test('responde 500 si findByPk lanza error', async () => {
      mockTicket.findByPk.mockRejectedValueOnce(new Error('BD caída'));
      const res = await request(app).get('/verify/EH-2024-X1');
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('valid', false);
      expect(res.body.error).toBe('BD caída');
    });

    test('verifica ticket aún cuando getEvent falla (evento no disponible)', async () => {
      const fakeTicket = {
        id: 1, userId: 1, eventId: 10, categoryId: null, usedAt: null,
        purchaseDate: new Date(),
        update: jest.fn().mockResolvedValue()
      };
      mockTicket.findByPk.mockResolvedValueOnce(fakeTicket);
      axios.get.mockRejectedValue(new Error('events-service caído'));

      const res = await request(app).get('/verify/EH-2024-X1');
      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.event.title).toBe('Evento no disponible');   // fallback
    });
  });

  // ── POST / — ramas internas de catch (cobertura de funciones) ───────────
  describe('POST / — fallbacks internos', () => {
    test('si axios.patch (Docker) falla, intenta con localhost', async () => {
      const created = { id: 51, userId: 1, eventId: 10, categoryId: 5 };
      mockTicket.create.mockResolvedValueOnce(created);
      // 1ª llamada Docker falla, 2ª (localhost) ok
      axios.patch
        .mockRejectedValueOnce(new Error('Docker DNS falló'))
        .mockResolvedValueOnce({});
      axios.post.mockResolvedValue({});

      const res = await request(app)
        .post('/')
        .send({ userId: 1, eventId: 10, categoryId: 5 });

      expect(res.status).toBe(201);
      expect(axios.patch).toHaveBeenCalledTimes(2); // se llamó al fallback
      expect(axios.patch).toHaveBeenLastCalledWith(
        expect.stringContaining('localhost:5002')
      );
    });

    test('si la notificación POST falla, el ticket sigue creado (catch no bloqueante)', async () => {
      const created = { id: 52, userId: 1, eventId: 10, categoryId: null };
      mockTicket.create.mockResolvedValueOnce(created);
      // No hay categoryId → no patch. Notificación rechaza para ejercitar el .catch inline
      axios.post.mockRejectedValueOnce(new Error('notification-service caído'));

      const res = await request(app)
        .post('/')
        .send({ userId: 1, eventId: 10 });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id', 52);
    });
  });

  // ── POST /batch — fallback Docker → localhost en increment ───────────────
  describe('POST /batch — fallbacks internos', () => {
    test('si axios.patch falla, intenta localhost dentro del loop', async () => {
      let nextId = 200;
      mockTicket.create.mockImplementation(async (data) => ({ id: nextId++, ...data }));
      // Primera Docker falla, segunda localhost ok (se repite por quantity = 1)
      axios.patch
        .mockRejectedValueOnce(new Error('Docker DNS falló'))
        .mockResolvedValueOnce({});
      axios.post.mockResolvedValue({});

      const res = await request(app)
        .post('/batch')
        .send({
          userId: 1, eventId: 10,
          items: [{ categoryId: 9, zoneLabel: 'VIP', quantity: 1 }]
        });

      expect(res.status).toBe(201);
      expect(res.body.total).toBe(1);
      expect(axios.patch).toHaveBeenCalled();
    });
  });

  // ── getEvent — fallback localhost (unit) ─────────────────────────────────
  describe('getEvent — fallback a localhost', () => {
    test('si la URL Docker falla, intenta con localhost', async () => {
      axios.get
        .mockRejectedValueOnce(new Error('Docker DNS falló'))   // 1ª llamada falla
        .mockResolvedValueOnce({ data: { id: 1, title: 'OK' } }); // 2ª (localhost) ok

      const result = await getEvent(1);
      expect(axios.get).toHaveBeenCalledTimes(2);
      expect(axios.get).toHaveBeenLastCalledWith(expect.stringContaining('localhost:5002'));
      expect(result.data).toEqual({ id: 1, title: 'OK' });
    });
  });
});
