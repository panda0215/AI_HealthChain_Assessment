/**
 * Helper Functions Tests
 */

const {
  isValidUUID,
  isValidEmail,
  sanitizeString,
  formatError,
  formatSuccess
} = require('../../utils/helpers.js');

describe('Helper Functions', () => {
  describe('isValidUUID', () => {
    test('should validate correct UUID', () => {
      const validUUID = 'a73a623f-4a1d-417d-a29a-aeb45a7beb11';
      expect(isValidUUID(validUUID)).toBe(true);
    });

    test('should reject invalid UUID', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('123')).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    test('should validate correct email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    test('should reject invalid email', () => {
      expect(isValidEmail('not-an-email')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    test('should sanitize string', () => {
      const input = '  Test String  ';
      const output = sanitizeString(input);
      expect(output).toBe('Test String');
    });

    test('should handle empty string', () => {
      expect(sanitizeString('')).toBe('');
    });

    test('should handle null/undefined', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
    });
  });

  describe('formatError', () => {
    test('should format error correctly', () => {
      const error = new Error('Test error');
      const formatted = formatError(error, 400);
      
      expect(formatted).toHaveProperty('error');
      expect(formatted.error).toHaveProperty('message');
      expect(formatted.error).toHaveProperty('status');
      expect(formatted.error.status).toBe(400);
    });

    test('should use default status code', () => {
      const error = new Error('Test error');
      const formatted = formatError(error);
      expect(formatted.error.status).toBe(500);
    });
  });

  describe('formatSuccess', () => {
    test('should format success response correctly', () => {
      const data = { id: '123', name: 'Test' };
      const formatted = formatSuccess(data, 'Success message');
      
      expect(formatted).toHaveProperty('success');
      expect(formatted).toHaveProperty('message');
      expect(formatted).toHaveProperty('data');
      expect(formatted.success).toBe(true);
      expect(formatted.data).toEqual(data);
    });

    test('should use default message', () => {
      const data = { id: '123' };
      const formatted = formatSuccess(data);
      expect(formatted.message).toBe('Success');
    });
  });
});

