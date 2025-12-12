/**
 * Consent Contract
 * 
 * Manages patient consent on the blockchain.
 * Handles granting and revoking consent as immutable transactions.
 */

const crypto = require('crypto');

class ConsentContract {
  constructor(blockchain) {
    this.blockchain = blockchain;
    this.contractAddress = 'consent-contract';
  }

  /**
   * Grant consent for a patient to a clinician
   * 
   * @param {string} patientId - Patient ID
   * @param {string} clinicianId - Clinician ID
   * @param {string} consentType - Type of consent (e.g., 'Data Access', 'AI Analysis')
   * @param {Object} options - Additional options (expiresAt, purpose, etc.)
   * @returns {Object} Transaction result
   */
  grantConsent(patientId, clinicianId, consentType, options = {}) {
    // Validate inputs
    if (!patientId || !clinicianId || !consentType) {
      throw new Error('Patient ID, clinician ID, and consent type are required');
    }

    // Check if active consent already exists
    if (this.hasValidConsent(patientId, clinicianId, consentType)) {
      throw new Error('Active consent already exists for this patient-clinician-type combination');
    }

    // Generate consent ID
    const consentId = crypto.randomUUID();
    
    // Set expiration date (default: 1 year from now)
    const expiresAt = options.expiresAt 
      ? new Date(options.expiresAt).toISOString()
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    // Create consent record
    const consentData = {
      action: 'grant',
      consentId,
      patientId,
      clinicianId,
      consentType,
      expiresAt,
      purpose: options.purpose || 'Treatment',
      grantedAt: new Date().toISOString(),
      grantedBy: options.grantedBy || patientId,
      metadata: options.metadata || {}
    };

    // Create blockchain transaction
    const transaction = this.blockchain.addTransaction({
      from: 'system',
      to: this.contractAddress,
      data: consentData
    });

    // Transaction stays in pending pool for consensus mechanism
    // It will be mined when a block is proposed and consensus is reached

    return {
      success: true,
      consentId,
      transaction: {
        id: transaction.id,
        timestamp: transaction.timestamp
      }
    };
  }

  /**
   * Revoke consent
   * 
   * @param {string} consentId - Consent record ID
   * @returns {Object} Transaction result
   */
  revokeConsent(consentId) {
    if (!consentId) {
      throw new Error('Consent ID is required');
    }

    // Find the original consent grant transaction
    const consentHistory = this.blockchain.searchTransactions({
      to: this.contractAddress,
      'data.action': 'grant',
      'data.consentId': consentId
    });

    if (consentHistory.length === 0) {
      throw new Error('Consent record not found');
    }

    const originalConsent = consentHistory[0].data;

    // Check if already revoked
    const revocations = this.blockchain.searchTransactions({
      to: this.contractAddress,
      'data.action': 'revoke',
      'data.consentId': consentId
    });

    if (revocations.length > 0) {
      throw new Error('Consent has already been revoked');
    }

    // Check if expired
    if (new Date(originalConsent.expiresAt) < new Date()) {
      throw new Error('Consent has already expired');
    }

    // Default revokedBy to patientId (the consent owner)
    const revokedBy = originalConsent.patientId;

    // Create revocation transaction
    const revocationData = {
      action: 'revoke',
      consentId,
      patientId: originalConsent.patientId,
      clinicianId: originalConsent.clinicianId,
      consentType: originalConsent.consentType,
      revokedAt: new Date().toISOString(),
      revokedBy,
      reason: 'User requested revocation'
    };

    const transaction = this.blockchain.addTransaction({
      from: 'system',
      to: this.contractAddress,
      data: revocationData
    });

    // Transaction stays in pending pool for consensus mechanism
    // It will be mined when a block is proposed and consensus is reached

    return {
      success: true,
      consentId,
      transaction: {
        id: transaction.id,
        timestamp: transaction.timestamp
      }
    };
  }

  /**
   * Check if consent exists and is valid
   * 
   * @param {string} patientId - Patient ID
   * @param {string} clinicianId - Clinician ID
   * @param {string} consentType - Type of consent to check
   * @returns {boolean} True if valid consent exists
   */
  hasValidConsent(patientId, clinicianId, consentType) {
    // Find all grant transactions for this patient-clinician-type (mined blocks)
    let grants = this.blockchain.searchTransactions({
      to: this.contractAddress,
      'data.action': 'grant',
      'data.patientId': patientId,
      'data.clinicianId': clinicianId,
      'data.consentType': consentType
    });

    // Also check pending transactions
    const pendingGrants = (this.blockchain.pendingTransactions || [])
      .filter(tx => 
        tx.to === this.contractAddress &&
        tx.data?.action === 'grant' &&
        tx.data?.patientId === patientId &&
        tx.data?.clinicianId === clinicianId &&
        tx.data?.consentType === consentType
      );

    // Combine mined and pending transactions
    if (pendingGrants.length > 0) {
      grants = [...grants, ...pendingGrants.map(tx => ({
        ...tx,
        data: tx.data,
        blockIndex: null,
        blockHash: null,
        blockTimestamp: null // Pending transactions don't have blockTimestamp yet
      }))];
    }

    if (grants.length === 0) {
      return false;
    }

    // Get the most recent grant (by block timestamp)
    // Pending transactions (null blockTimestamp) are considered most recent
    const sortedGrants = grants.sort((a, b) => {
      if (a.blockTimestamp === null && b.blockTimestamp === null) return 0;
      if (a.blockTimestamp === null) return -1; // Pending is more recent
      if (b.blockTimestamp === null) return 1;  // Pending is more recent
      return b.blockTimestamp - a.blockTimestamp;
    });
    const latestGrant = sortedGrants[0];

    // Check if revoked (only check mined revocations)
    const revocations = this.blockchain.searchTransactions({
      to: this.contractAddress,
      'data.action': 'revoke',
      'data.consentId': latestGrant.data.consentId
    });

    if (revocations.length > 0 && latestGrant.blockTimestamp !== null) {
      // Check if revocation happened after grant (only for mined grants)
      const revocation = revocations[0];
      if (revocation.blockTimestamp >= latestGrant.blockTimestamp) {
        return false;
      }
    }

    // Check if expired
    const expiresAt = new Date(latestGrant.data.expiresAt);
    if (expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Get consent history for a patient
   * 
   * @param {string} patientId - Patient ID
   * @returns {Array} Array of consent records
   */
  getConsentHistory(patientId) {
    // Find all consent transactions for this patient
    const transactions = this.blockchain.searchTransactions({
      to: this.contractAddress,
      'data.patientId': patientId
    });

    // Sort by timestamp (oldest first)
    const sortedTransactions = transactions.sort((a, b) => a.blockTimestamp - b.blockTimestamp);

    // Format and return consent records
    return sortedTransactions.map(tx => ({
      consentId: tx.data.consentId,
      patientId: tx.data.patientId,
      clinicianId: tx.data.clinicianId,
      consentType: tx.data.consentType,
      action: tx.data.action,
      timestamp: new Date(tx.blockTimestamp).toISOString(),
      expiresAt: tx.data.expiresAt || null,
      purpose: tx.data.purpose || null,
      grantedAt: tx.data.grantedAt || null,
      revokedAt: tx.data.revokedAt || null,
      revokedBy: tx.data.revokedBy || null,
      blockIndex: tx.blockIndex,
      blockHash: tx.blockHash
    }));
  }

  /**
   * Get active consents for a patient
   * 
   * @param {string} patientId - Patient ID
   * @returns {Array} Array of active consent records
   */
  getActiveConsents(patientId) {
    const history = this.getConsentHistory(patientId);
    const activeConsents = [];
    const consentMap = new Map();

    // Process history chronologically to determine current state
    for (const record of history) {
      const key = `${record.patientId}-${record.clinicianId}-${record.consentType}`;
      
      if (record.action === 'grant') {
        // Check if not expired
        if (record.expiresAt && new Date(record.expiresAt) >= new Date()) {
          consentMap.set(key, record);
        }
      } else if (record.action === 'revoke') {
        // Remove from active consents
        consentMap.delete(key);
      }
    }

    // Convert map to array
    for (const consent of consentMap.values()) {
      // Double-check expiration
      if (!consent.expiresAt || new Date(consent.expiresAt) >= new Date()) {
        activeConsents.push(consent);
      }
    }

    return activeConsents;
  }

  /**
   * Get consent by consent ID
   * 
   * @param {string} consentId - Consent ID
   * @returns {Object|null} Consent record or null if not found
   */
  getConsentById(consentId) {
    if (!consentId) {
      return null;
    }

    // Find the grant transaction for this consent ID (mined blocks)
    let grantTransactions = this.blockchain.searchTransactions({
      to: this.contractAddress,
      'data.action': 'grant',
      'data.consentId': consentId
    });

    // Also check pending transactions
    const pendingGrants = (this.blockchain.pendingTransactions || [])
      .filter(tx => 
        tx.to === this.contractAddress &&
        tx.data?.action === 'grant' &&
        tx.data?.consentId === consentId
      );

    // Combine mined and pending transactions
    if (pendingGrants.length > 0) {
      grantTransactions = [...grantTransactions, ...pendingGrants.map(tx => ({
        ...tx,
        data: tx.data,
        blockIndex: null,
        blockHash: null,
        blockTimestamp: null // Pending transactions don't have blockTimestamp yet
      }))];
    }

    if (grantTransactions.length === 0) {
      return null;
    }

    // Get the most recent grant (should only be one per consentId)
    const grantTx = grantTransactions[0];

    // Check if revoked
    const revocations = this.blockchain.searchTransactions({
      to: this.contractAddress,
      'data.action': 'revoke',
      'data.consentId': consentId
    });

    const isRevoked = revocations.length > 0 && 
                     revocations[0].blockTimestamp >= grantTx.blockTimestamp;
    const isExpired = grantTx.data.expiresAt && 
                     new Date(grantTx.data.expiresAt) < new Date();

    return {
      consentId: grantTx.data.consentId,
      patientId: grantTx.data.patientId,
      clinicianId: grantTx.data.clinicianId,
      consentType: grantTx.data.consentType,
      expiresAt: grantTx.data.expiresAt || null,
      purpose: grantTx.data.purpose || null,
      grantedAt: grantTx.data.grantedAt || null,
      isRevoked,
      isExpired,
      isValid: !isRevoked && !isExpired
    };
  }

  /**
   * Get all consents from all patients
   * Returns all grant records with their revocation status
   *
   * @returns {Array} Array of all consent records (grants only, with revocation info)
   */
  getAllConsents() {
    // Find all grant transactions
    const grantTransactions = this.blockchain.searchTransactions({
      to: this.contractAddress,
      'data.action': 'grant'
    });

    // Find all revocation transactions for quick lookup
    const revokeTransactions = this.blockchain.searchTransactions({
      to: this.contractAddress,
      'data.action': 'revoke'
    });

    // Create a map of consentId -> revocation info
    const revocationMap = new Map();
    revokeTransactions.forEach(revokeTx => {
      const consentId = revokeTx.data.consentId;
      if (!revocationMap.has(consentId) || 
          revokeTx.blockTimestamp > revocationMap.get(consentId).blockTimestamp) {
        revocationMap.set(consentId, {
          revokedAt: new Date(revokeTx.blockTimestamp).toISOString(),
          revokedBy: revokeTx.data.revokedBy,
          blockTimestamp: revokeTx.blockTimestamp
        });
      }
    });

    // Sort grants by timestamp (oldest first)
    const sortedGrants = grantTransactions.sort((a, b) => a.blockTimestamp - b.blockTimestamp);

    // Format and return all consent records with revocation status
    return sortedGrants.map(tx => {
      const consentId = tx.data.consentId;
      const revocationInfo = revocationMap.get(consentId);
      const isRevoked = revocationInfo !== undefined && 
                       revocationInfo.blockTimestamp >= tx.blockTimestamp;
      const isExpired = tx.data.expiresAt && 
                       new Date(tx.data.expiresAt) < new Date();

      return {
        consentId: tx.data.consentId,
        patientId: tx.data.patientId,
        clinicianId: tx.data.clinicianId,
        consentType: tx.data.consentType,
        action: isRevoked ? 'revoke' : 'grant', // Show the last/most recent action
        timestamp: isRevoked ? revocationInfo.revokedAt : new Date(tx.blockTimestamp).toISOString(), // Show revocation timestamp if revoked
        expiresAt: tx.data.expiresAt || null,
        purpose: tx.data.purpose || null,
        grantedAt: tx.data.grantedAt || null,
        revokedAt: isRevoked ? revocationInfo.revokedAt : null,
        revokedBy: isRevoked ? revocationInfo.revokedBy : null,
        blockIndex: tx.blockIndex,
        blockHash: tx.blockHash,
        isRevoked,
        isExpired
      };
    });
  }
}

module.exports = ConsentContract;

