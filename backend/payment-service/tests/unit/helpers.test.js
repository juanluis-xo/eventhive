/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 6 PRUEBAS UNITARIAS — payment-service
 * ─────────────────────────────────────────────────────────────────────────────
 * Helpers puros: generateTransactionId, isValidPaymentMethod, formatPaymentResponse
 * Mocks: sequelize (BD) + Math.random (servicio externo / fuente de aleatoriedad)
 * Matchers: toBe, toEqual, toMatch, toHaveProperty, toBeDefined, toContain, toBeInstanceOf
 * Async: incluye una prueba con .resolves
 * ─────────────────────────────────────────────────────────────────────────────
 */

// MOCK 1 — Sequelize (base de datos)
jest.mock('sequelize', () => {
  const mSequelize = {
    define:       jest.fn(() => ({})),
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

const {
  generateTransactionId,
  isValidPaymentMethod,
  formatPaymentResponse,
  VALID_METHODS
} = require('../../index');

describe('🧪 Pruebas unitarias — payment-service', () => {

  // ── generateTransactionId ──────────────────────────────────────────────────
  describe('generateTransactionId', () => {

    test('1. devuelve un string con prefijo TXN- (toMatch)', () => {
      const id = generateTransactionId();
      expect(id).toMatch(/^TXN-[A-Z0-9]+$/);
    });

    test('2. devuelve IDs distintos en llamadas distintas (MOCK 2: Math.random)', () => {
      // MOCK 2 — Spy sobre Math.random para que sea determinístico
      const spy = jest.spyOn(Math, 'random')
        .mockReturnValueOnce(0.123456789)
        .mockReturnValueOnce(0.987654321);

      const id1 = generateTransactionId();
      const id2 = generateTransactionId();

      expect(id1).not.toBe(id2);
      expect(spy).toHaveBeenCalledTimes(2);
      spy.mockRestore();
    });
  });

  // ── isValidPaymentMethod ───────────────────────────────────────────────────
  describe('isValidPaymentMethod', () => {

    test('3. acepta los 3 métodos válidos (toBe true)', () => {
      expect(isValidPaymentMethod('paypal')).toBe(true);
      expect(isValidPaymentMethod('credit_card')).toBe(true);
      expect(isValidPaymentMethod('debit_card')).toBe(true);
    });

    test('4. rechaza métodos inválidos o vacíos', () => {
      expect(isValidPaymentMethod('bitcoin')).toBe(false);
      expect(isValidPaymentMethod('')).toBe(false);
      expect(isValidPaymentMethod(null)).toBe(false);
      expect(isValidPaymentMethod(undefined)).toBe(false);
    });

    test('5. la lista de métodos válidos contiene exactamente los 3 esperados (toEqual + toContain)', () => {
      expect(VALID_METHODS).toEqual(['paypal', 'credit_card', 'debit_card']);
      expect(VALID_METHODS).toContain('paypal');
      expect(VALID_METHODS).toBeDefined();
    });
  });

  // ── formatPaymentResponse — async / Promise ────────────────────────────────
  describe('formatPaymentResponse (async)', () => {

    test('6. devuelve una promesa que resuelve con el formato correcto (.resolves)', async () => {
      const fakePayment = { id: 1, userId: 5, amount: 99.99, method: 'paypal' };

      // Es una promesa real
      const promise = formatPaymentResponse(fakePayment);
      expect(promise).toBeInstanceOf(Promise);

      // Resuelve con la forma esperada
      await expect(promise).resolves.toEqual({
        success: true,
        message: 'Pago procesado exitosamente',
        payment: fakePayment
      });

      // Validación adicional con toHaveProperty
      const result = await formatPaymentResponse(fakePayment);
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('payment.id', 1);
    });
  });
});
