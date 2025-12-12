/**
 * Audit Logger
 * 
 * Stores all audit logs as blockchain transactions.
 * Logs are tamper-proof and can be queried later.
 */

class AuditLogger {
  constructor(blockchain) {
    this.blockchain = blockchain;
    this.contractAddress = 'audit-contract';
  }

  /**
   * Log a data access attempt
   * 
   * @param {Object} accessLog - Access log data
   * @param {string} accessLog.actorId - ID of entity attempting access
   * @param {string} accessLog.resourceId - ID of resource being accessed
   * @param {string} accessLog.resourceType - Type of resource (e.g., 'medicalRecord')
   * @param {boolean} accessLog.granted - Whether access was granted
   * @param {string} accessLog.reason - Reason for grant/denial
   * @param {Object} accessLog.metadata - Additional metadata
   * @returns {Object} Transaction result
   */
  async logDataAccess(accessLog) {
    // Validate required fields
    if (!accessLog.actorId || !accessLog.resourceId || !accessLog.resourceType) {
      throw new Error('actorId, resourceId, and resourceType are required');
    }

    if (typeof accessLog.granted !== 'boolean') {
      throw new Error('granted must be a boolean');
    }

    // Create audit log entry
    const logEntry = {
      type: 'data-access',
      timestamp: new Date().toISOString(),
      actorId: accessLog.actorId,
      resourceId: accessLog.resourceId,
      resourceType: accessLog.resourceType,
      action: 'read',
      granted: accessLog.granted,
      reason: accessLog.reason || (accessLog.granted ? 'Access granted' : 'Access denied'),
      metadata: accessLog.metadata || {}
    };

    // Create blockchain transaction
    const transaction = this.blockchain.addTransaction({
      from: 'system',
      to: this.contractAddress,
      data: logEntry
    });

    // Transaction stays in pending pool for consensus mechanism
    // It will be mined when a block is proposed and consensus is reached

    return {
      success: true,
      logId: transaction.id,
      data: logEntry,
      transaction: {
        id: transaction.id,
        timestamp: transaction.timestamp
      }
    };
  }

  /**
   * Log a consent change
   * 
   * @param {Object} consentLog - Consent change log
   * @param {string} consentLog.consentId - Consent record ID
   * @param {string} consentLog.action - Action (granted, revoked, expired)
   * @param {string} consentLog.actorId - ID of entity performing action
   * @param {string} consentLog.patientId - Patient ID
   * @param {Object} consentLog.metadata - Additional metadata
   * @returns {Object} Transaction result
   */
  async logConsentChange(consentLog) {
    // Validate required fields
    if (!consentLog.consentId || !consentLog.action || !consentLog.actorId || !consentLog.patientId) {
      throw new Error('consentId, action, actorId, and patientId are required');
    }

    const validActions = ['granted', 'revoked', 'expired'];
    if (!validActions.includes(consentLog.action)) {
      throw new Error(`action must be one of: ${validActions.join(', ')}`);
    }

    // Create audit log entry
    const logEntry = {
      type: 'consent-change',
      timestamp: new Date().toISOString(),
      consentId: consentLog.consentId,
      action: consentLog.action,
      actorId: consentLog.actorId,
      patientId: consentLog.patientId,
      clinicianId: consentLog.clinicianId || null,
      consentType: consentLog.consentType || null,
      metadata: consentLog.metadata || {}
    };

    // Create blockchain transaction
    const transaction = this.blockchain.addTransaction({
      from: 'system',
      to: this.contractAddress,
      data: logEntry
    });

    // Transaction stays in pending pool for consensus mechanism
    // It will be mined when a block is proposed and consensus is reached

    return {
      success: true,
      logId: transaction.id,
      data: logEntry,
      transaction: {
        id: transaction.id,
        timestamp: transaction.timestamp
      }
    };
  }

  /**
   * Log an AI diagnostic submission
   * 
   * @param {Object} aiLog - AI diagnostic log
   * @param {string} aiLog.modelId - AI model ID
   * @param {string} aiLog.recordId - Medical record ID
   * @param {Object} aiLog.result - Diagnostic result
   * @param {number} aiLog.confidence - Confidence score
   * @param {Object} aiLog.metadata - Additional metadata
   * @returns {Object} Transaction result
   */
  async logAIDiagnostic(aiLog) {
    // Validate required fields
    if (!aiLog.modelId || !aiLog.recordId || !aiLog.result) {
      throw new Error('modelId, recordId, and result are required');
    }

    if (aiLog.confidence !== undefined && (typeof aiLog.confidence !== 'number' || aiLog.confidence < 0 || aiLog.confidence > 1)) {
      throw new Error('confidence must be a number between 0 and 1');
    }

    // Create audit log entry
    const logEntry = {
      type: 'ai-diagnostic',
      timestamp: new Date().toISOString(),
      modelId: aiLog.modelId,
      recordId: aiLog.recordId,
      result: aiLog.result,
      confidence: aiLog.confidence || null,
      metadata: aiLog.metadata || {}
    };

    // Create blockchain transaction
    const transaction = this.blockchain.addTransaction({
      from: 'system',
      to: this.contractAddress,
      data: logEntry
    });

    // Transaction stays in pending pool for consensus mechanism
    // It will be mined when a block is proposed and consensus is reached

    return {
      success: true,
      logId: transaction.id,
      data: logEntry,
      transaction: {
        id: transaction.id,
        timestamp: transaction.timestamp
      }
    };
  }

  /**
   * Query audit logs
   * 
   * @param {Object} filters - Filter criteria
   * @param {string} filters.actorId - Filter by actor
   * @param {string} filters.resourceId - Filter by resource
   * @param {string} filters.action - Filter by action
   * @param {string} filters.type - Filter by log type
   * @param {string} filters.startDate - Start date (ISO string)
   * @param {string} filters.endDate - End date (ISO string)
   * @returns {Array} Array of audit log entries
   */
  async queryLogs(filters = {}) {
    // Search blockchain for all audit transactions (mined blocks)
    const minedTransactions = this.blockchain.searchTransactions({
      to: this.contractAddress
    });

    // Also include pending transactions
    const pendingTransactions = (this.blockchain.pendingTransactions || [])
      .filter(tx => tx.to === this.contractAddress)
      .map(tx => {
        // Ensure timestamp is preserved from transaction or data
        const timestamp = tx.data?.timestamp || (tx.timestamp ? new Date(tx.timestamp).toISOString() : new Date().toISOString());
        return {
          ...tx.data,
          timestamp, // Ensure timestamp is always present
          logId: tx.id,
          blockIndex: null, // Not yet in a block
          blockHash: null, // Not yet in a block
          blockTimestamp: null, // Not yet in a block
          pending: true // Mark as pending
        };
      });

    // Combine mined and pending transactions
    const allTransactions = [...minedTransactions, ...pendingTransactions];

    // Apply filters
    let filteredLogs = allTransactions.map(tx => ({
      ...tx.data,
      logId: tx.id,
      blockIndex: tx.blockIndex,
      blockHash: tx.blockHash,
      blockTimestamp: tx.blockTimestamp,
      pending: tx.pending || false
    }));

    // Filter by actorId
    if (filters.actorId) {
      filteredLogs = filteredLogs.filter(log => log.actorId === filters.actorId);
    }

    // Filter by resourceId
    if (filters.resourceId) {
      filteredLogs = filteredLogs.filter(log => log.resourceId === filters.resourceId);
    }

    // Filter by action
    if (filters.action) {
      filteredLogs = filteredLogs.filter(log => log.action === filters.action);
    }

    // Filter by type
    if (filters.type) {
      filteredLogs = filteredLogs.filter(log => log.type === filters.type);
    }

    // Filter by resourceType
    if (filters.resourceType) {
      filteredLogs = filteredLogs.filter(log => log.resourceType === filters.resourceType);
    }

    // Filter by date range
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= startDate);
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= endDate);
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return filteredLogs;
  }

  /**
   * Get audit trail for a specific resource
   * 
   * @param {string} resourceId - Resource ID
   * @param {string} resourceType - Resource type
   * @returns {Array} Audit trail (chronological order)
   */
  async getAuditTrail(resourceId, resourceType) {
    if (!resourceId || !resourceType) {
      throw new Error('resourceId and resourceType are required');
    }

    // Query logs for this specific resource
    const logs = await this.queryLogs({
      resourceId,
      resourceType
    });

    // Also include consent changes that might reference this resource
    const consentLogs = await this.queryLogs({
      type: 'consent-change'
    });

    // Filter consent logs that might be related (if patientId matches resourceId for patient resources)
    const relatedConsentLogs = consentLogs.filter(log => {
      if (resourceType === 'patient' && log.patientId === resourceId) {
        return true;
      }
      return false;
    });

    // Combine and sort chronologically (oldest first for trail)
    const trail = [...logs, ...relatedConsentLogs].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    return {
      resourceId,
      resourceType,
      trail
    };
  }
}

module.exports = AuditLogger;
