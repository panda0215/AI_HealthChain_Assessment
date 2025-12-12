/**
 * Utility Helper Functions
 */

/**
 * Validate UUID format
 */
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize string input
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
}

/**
 * Format error response
 */
function formatError(error, status = 500) {
  return {
    success: false,
    error: {
      message: error.message || 'Internal server error',
      status,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Format success response
 */
function formatSuccess(data, message = 'Success') {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  isValidUUID,
  isValidEmail,
  sanitizeString,
  formatError,
  formatSuccess
};

