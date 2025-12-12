/**
 * Audit Service
 * 
 * This service provides business logic for audit logging operations.
 */

const AuditLogger = require('./AuditLogger.js');
const { isValidUUID } = require('../../utils/helpers.js');

class AuditService {
  constructor(blockchain) {
    this.logger = new AuditLogger(blockchain);
  }

  /**
   * Log data access
   * 
   * @param {Object} accessLog - Access log data
   * @returns {Promise<Object>} Result with log ID and transaction info
   */
  async logDataAccess(accessLog) {
    // Validate actorId format only if it looks like a UUID (optional validation)
    // Don't enforce UUID format strictly as resourceId might not be UUID

    // Call logger
    const result = await this.logger.logDataAccess(accessLog);
    
    return {
      success: true,
      logId: result.logId,
      data: result.data,
      transaction: result.transaction
    };
  }

  /**
   * Log consent change
   * 
   * @param {Object} consentLog - Consent change log
   * @returns {Promise<Object>} Result with log ID and transaction info
   */
  async logConsentChange(consentLog) {
    // Note: Audit logging accepts any string identifiers, no UUID validation required

    // Call logger
    const result = await this.logger.logConsentChange(consentLog);
    
    return {
      success: true,
      logId: result.logId,
      data: result.data,
      transaction: result.transaction
    };
  }

  /**
   * Log AI diagnostic
   * 
   * @param {Object} aiLog - AI diagnostic log
   * @returns {Promise<Object>} Result with log ID and transaction info
   */
  async logAIDiagnostic(aiLog) {
    // Note: Audit logging accepts any string identifiers, no UUID validation required

    // Call logger
    const result = await this.logger.logAIDiagnostic(aiLog);
    
    return {
      success: true,
      logId: result.logId,
      data: result.data,
      transaction: result.transaction
    };
  }

  /**
   * Query logs
   * 
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Result with logs and count
   */
  async queryLogs(filters) {
    // Call logger
    const logs = await this.logger.queryLogs(filters);
    
    return {
      count: logs.length,
      logs
    };
  }

  /**
   * Get audit trail
   * 
   * @param {string} resourceId - Resource ID
   * @param {string} resourceType - Resource type
   * @returns {Promise<Object>} Result with audit trail
   */
  async getAuditTrail(resourceId, resourceType) {
    // Validate resourceId exists (don't enforce UUID format)
    if (!resourceId) {
      throw new Error('resourceId is required');
    }

    // Validate resourceType
    const validTypes = ['medicalRecord', 'patient', 'consent', 'aiDiagnostic'];
    if (!resourceType || !validTypes.includes(resourceType)) {
      throw new Error(`Invalid resourceType. Must be one of: ${validTypes.join(', ')}`);
    }

    // Call logger
    const trailResult = await this.logger.getAuditTrail(resourceId, resourceType);
    
    return {
      resourceId: trailResult.resourceId,
      resourceType: trailResult.resourceType,
      count: trailResult.trail.length,
      trail: trailResult.trail
    };
  }
}

module.exports = AuditService;


