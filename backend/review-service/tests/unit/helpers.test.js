/**
 * 6 PRUEBAS UNITARIAS — review-service
 * Mocks: sequelize (BD) + axios (servicio externo)
 * Matchers: toBe, toEqual, toHaveProperty, toBeInstanceOf, toBeDefined, toMatch
 */

// MOCK 1 — Sequelize
jest.mock('sequelize', () => ({
  Sequelize: jest.fn(() => ({
    define: jest.fn(() => ({})),
    sync: jest.fn().mockResolvedValue(),
    authenticate: jest.fn().mockResolvedValue()
  })),
  DataTypes: { INTEGER: 'INTEGER', STRING: 'STRING', TEXT: 'TEXT' }
}));

// MOCK 2 — axios
jest.mock('axios');

const { calculateAverage, parseEventIds, formatEventStats } = require('../../index');

describe('🧪 Pruebas unitarias — review-service', () => {

  // ── calculateAverage ──────────────────────────────────────────────────────
  describe('calculateAverage', () => {

    test('1. devuelve 0 cuando la lista está vacía o no es array', () => {
      expect(calculateAverage([])).toBe(0);
      expect(calculateAverage(null)).toBe(0);
      expect(calculateAverage(undefined)).toBe(0);
      expect(calculateAverage('no-es-array')).toBe(0);
    });

    test('2. calcula el promedio correctamente con un decimal', () => {
      const reviews = [{ rating: 5 }, { rating: 4 }, { rating: 3 }];
      expect(calculateAverage(reviews)).toBe(4);

      const reviews2 = [{ rating: 5 }, { rating: 4 }];
      expect(calculateAverage(reviews2)).toBe(4.5);
    });

    test('3. ignora ratings undefined o null tratándolos como 0', () => {
      const reviews = [{ rating: 5 }, { rating: undefined }, { rating: null }];
      expect(calculateAverage(reviews)).toBeDefined();
      // (5 + 0 + 0) / 3 = 1.7
      expect(calculateAverage(reviews)).toBe(1.7);
    });
  });

  // ── parseEventIds ─────────────────────────────────────────────────────────
  describe('parseEventIds', () => {

    test('4. parsea una lista válida "1,2,3" en [1,2,3]', () => {
      expect(parseEventIds('1,2,3')).toEqual([1, 2, 3]);
      expect(parseEventIds('10')).toEqual([10]);
    });

    test('5. devuelve [] para entradas inválidas o vacías', () => {
      expect(parseEventIds('')).toEqual([]);
      expect(parseEventIds(null)).toEqual([]);
      expect(parseEventIds(undefined)).toEqual([]);
      expect(parseEventIds(123)).toEqual([]);
      // Filtra valores no numéricos
      expect(parseEventIds('abc,xyz')).toEqual([]);
    });
  });

  // ── formatEventStats — async / Promise ────────────────────────────────────
  describe('formatEventStats (async)', () => {

    test('6. devuelve una promesa que resuelve con la forma correcta (.resolves)', async () => {
      const reviews = [{ rating: 5 }, { rating: 3 }];
      const promise = formatEventStats(7, reviews);

      expect(promise).toBeInstanceOf(Promise);
      await expect(promise).resolves.toEqual({
        eventId: 7,
        count: 2,
        average: 4
      });

      const result = await formatEventStats(7, reviews);
      expect(result).toHaveProperty('eventId', 7);
      expect(result).toHaveProperty('average');
    });
  });
});
