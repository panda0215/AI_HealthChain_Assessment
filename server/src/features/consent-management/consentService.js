/**
 * Consent Service - Service layer for consent management
 * 
 * This service provides business logic validation and coordinates
 * between controllers and the ConsentContract.
 */

const ConsentContract = require('./ConsentContract.js');
const { isValidUUID } = require('../../utils/helpers.js');

class ConsentService {
  constructor(blockchain, patientContract, clinicianContract) {
    this.contract = new ConsentContract(blockchain);
    this.patientContract = patientContract;
    this.clinicianContract = clinicianContract;
  }

  /**
   * Grant consent
   * 
   * @param {string} patientId - Patient ID
   * @param {string} clinicianId - Clinician ID
   * @param {string} consentType - Type of consent
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Result with consent ID and transaction info
   */
  async grantConsent(patientId, clinicianId, consentType, options = {}) {
    // Validate UUIDs
    if (!isValidUUID(patientId)) {
      throw new Error('Invalid patient ID format');
    }
    if (!isValidUUID(clinicianId)) {
      throw new Error('Invalid clinician ID format');
    }

    // Validate consent type
    const validConsentTypes = ['Data Access', 'AI Analysis', 'Research', 'Treatment'];
    if (!consentType || !validConsentTypes.includes(consentType)) {
      throw new Error(`Invalid consent type. Must be one of: ${validConsentTypes.join(', ')}`);
    }

    // Validate patient exists in blockchain
    const patient = this.patientContract.getPatient(patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }

    // Validate clinician exists in blockchain
    const clinician = this.clinicianContract.getClinician(clinicianId);
    if (!clinician) {
      throw new Error('Clinician not found');
    }

    // Validate expiration date if provided
    if (options.expiresAt) {
      const expirationDate = new Date(options.expiresAt);
      if (isNaN(expirationDate.getTime())) {
        throw new Error('Invalid expiration date format');
      }
      if (expirationDate <= new Date()) {
        throw new Error('Expiration date must be in the future');
      }
    }

    // Call contract to grant consent
    const result = this.contract.grantConsent(patientId, clinicianId, consentType, options);
    
    // Calculate expiresAt (contract sets it, but we need to return it)
    const expiresAt = options.expiresAt 
      ? new Date(options.expiresAt).toISOString()
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    
    return {
      success: true,
      consentId: result.consentId,
      patientId,
      clinicianId,
      consentType,
      expiresAt,
      transaction: result.transaction
    };
  }

  /**
   * Revoke consent
   * 
   * @param {string} consentId - Consent record ID
   * @returns {Promise<Object>} Result with transaction info
   */
  async revokeConsent(consentId) {
    // Validate UUIDs
    if (!isValidUUID(consentId)) {
      throw new Error('Invalid consent ID format');
    }

    // Call contract to revoke consent (revokedBy will default to patientId)
    const result = this.contract.revokeConsent(consentId);
    
    return {
      success: true,
      action: 'revoke',
      consentId,
      transaction: result.transaction
    };
  }

  /**
   * Check consent validity
   * 
   * @param {string} patientId - Patient ID
   * @param {string} clinicianId - Clinician ID
   * @param {string} consentType - Type of consent to check
   * @returns {Promise<Object>} Result with validity status
   */
  async checkConsent(patientId, clinicianId, consentType) {
    // Validate UUIDs (decode URL-encoded type)
    const decodedType = decodeURIComponent(consentType);
    
    if (!isValidUUID(patientId)) {
      throw new Error('Invalid patient ID format');
    }
    if (!isValidUUID(clinicianId)) {
      throw new Error('Invalid clinician ID format');
    }
    if (!decodedType) {
      throw new Error('Consent type is required');
    }

    // Check if valid consent exists
    const hasConsent = this.contract.hasValidConsent(patientId, clinicianId, decodedType);
    
    return {
      hasConsent,
      patientId,
      clinicianId,
      consentType: decodedType
    };
  }

  /**
   * Get consent history
   * 
   * @param {string} patientId - Patient ID
   * @returns {Promise<Object>} Result with consent history
   */
  async getConsentHistory(patientId) {
    // Validate UUID format (but allow non-UUID IDs if they exist in data)
    if (!patientId) {
      throw new Error('Invalid patient ID format');
    }

    // Check if patient exists in blockchain
    if (isValidUUID(patientId)) {
      const patient = this.patientContract.getPatient(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }
    }

    // Get consent history from contract
    const history = this.contract.getConsentHistory(patientId);
    
    return {
      patientId,
      count: history.length,
      history
    };
  }

  /**
   * Get active consents
   * 
   * @param {string} patientId - Patient ID
   * @returns {Promise<Object>} Result with active consents
   */
  async getActiveConsents(patientId) {
    // Validate UUID
    if (!isValidUUID(patientId)) {
      throw new Error('Invalid patient ID format');
    }

    // Validate patient exists in blockchain
    const patient = this.patientContract.getPatient(patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }

    // Get active consents from contract
    const activeConsents = this.contract.getActiveConsents(patientId);
    
    return {
      patientId,
      count: activeConsents.length,
      activeConsents
    };
  }

  /**
   * Get all consents from all patients
   * Reads only from blockchain
   *
   * @returns {Promise<Object>} Result with all consents
   */
  async getAllConsents() {
    // Get all consent transactions from the blockchain
    const blockchainConsents = this.contract.getAllConsents();

    // Sort by timestamp (newest first)
    blockchainConsents.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    });

    return {
      count: blockchainConsents.length,
      blockchainCount: blockchainConsents.length,
      mockDataCount: 0,
      consents: blockchainConsents
    };
  }
}

module.exports = ConsentService;

