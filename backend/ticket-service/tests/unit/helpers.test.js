/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 6 PRUEBAS UNITARIAS — funciones puras y helpers del ticket-service
 * ─────────────────────────────────────────────────────────────────────────────
 * Mocks usados:
 *   1) axios   → para no llamar al events-service real
 *   2) Ticket  → para no necesitar MySQL
 *
 * Matchers usados:
 *   toBe, toEqual, toBeNull, toHaveProperty, toHaveBeenCalledWith,
 *   toMatch, toBeInstanceOf, resolves.toEqual (promesa)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── MOCK 1: axios ─────────────────────────────────────────────────────────────
jest.mock('axios');
const axios = require('axios');

// ── MOCK 2: Sequelize (evita conexión a BD al importar index.js) ─────────────
jest.mock('sequelize', () => {
  const mTicket = {
    findByPk:  jest.fn(),
    findAll:   jest.fn(),
    create:    jest.fn(),
    update:    jest.fn()
  };
  const mSequelize = {
    define:       jest.fn(() => mTicket),
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

// Importamos los helpers DESPUÉS de los mocks
const {
  parseTicketCode,
  getCategoryName,
  getEvent
} = require('../../index');

// ──────────────────────────────────────────────────────────────────────────────

describe('🧪 Pruebas unitarias — helpers de ticket-service', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 1 ──────────────────────────────────────────────────────────────────────
  test('1) parseTicketCode devuelve el ID correcto para un código válido', () => {
    const result = parseTicketCode('EH-2024-X42');
    expect(result).toBe(42);              // ← matcher: toBe
    expect(typeof result).toBe('number'); // ← matcher: toBe
  });

  // ── 2 ──────────────────────────────────────────────────────────────────────
  test('2) parseTicketCode devuelve null para códigos con formato incorrecto', () => {
    expect(parseTicketCode('CODIGO-INVALIDO')).toBeNull(); // ← matcher: toBeNull
    expect(parseTicketCode('EH-XX-X1')).toBeNull();
    expect(parseTicketCode(null)).toBeNull();
    expect(parseTicketCode(undefined)).toBeNull();
  });

  // ── 3 ──────────────────────────────────────────────────────────────────────
  test('3) getCategoryName devuelve el nombre cuando la categoría existe', () => {
    const event = {
      title: 'Concierto',
      categories: [
        { id: 1, name: 'VIP' },
        { id: 2, name: 'General' },
        { id: 3, name: 'Palco' }
      ]
    };
    expect(getCategoryName(event, 2)).toEqual('General'); // ← matcher: toEqual
    expect(getCategoryName(event, 1)).toMatch(/VIP/);     // ← matcher: toMatch (regex)
  });

  // ── 4 ──────────────────────────────────────────────────────────────────────
  test('4) getCategoryName devuelve null cuando la categoría no existe', () => {
    const event = { categories: [{ id: 1, name: 'VIP' }] };
    expect(getCategoryName(event, 999)).toBeNull();
    expect(getCategoryName(null, 1)).toBeNull();
    expect(getCategoryName({ }, 1)).toBeNull();   // sin array categories
  });

  // ── 5 ──────────────────────────────────────────────────────────────────────
  test('5) getEvent llama a axios con la URL correcta del events-service', async () => {
    const fakeEvent = { id: 7, title: 'Festival', categories: [] };
    axios.get.mockResolvedValueOnce({ data: fakeEvent });

    const result = await getEvent(7);

    // ← matcher: toHaveBeenCalledWith
    expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/7'));
    // ← matcher: toHaveProperty
    expect(result.data).toHaveProperty('title', 'Festival');
    expect(result.data).toEqual(fakeEvent);
  });

  // ── 6 ── PRUEBA CON PROMESA ────────────────────────────────────────────────
  test('6) getEvent (promesa) resuelve con los datos del evento', async () => {
    const fakeEvent = { id: 99, title: 'Evento Promesa' };
    // mockResolvedValue (sin "Once") → devuelve lo mismo en todas las llamadas
    axios.get.mockResolvedValue({ data: fakeEvent });

    // ← matcher con promesa: .resolves.toEqual
    await expect(getEvent(99)).resolves.toEqual(
      expect.objectContaining({
        data: expect.objectContaining({ id: 99, title: 'Evento Promesa' })
      })
    );

    // Verificación adicional: la promesa devuelve un objeto
    const result = await getEvent(99);
    expect(result).toBeInstanceOf(Object); // ← matcher: toBeInstanceOf
  });
});
