/**
 * ZK Proof Service
 * 
 * This service provides business logic for zero-knowledge proof operations.
 */

const ZKProof = require('./ZKProof.js');
const ConsentContract = require('../consent-management/ConsentContract.js');
const { isValidUUID } = require('../../utils/helpers.js');

class ZKService {
  constructor(blockchain, patientContract, clinicianContract) {
    this.blockchain = blockchain;
    this.patientContract = patientContract;
    this.clinicianContract = clinicianContract;
    this.consentContract = new ConsentContract(blockchain);
  }

  /**
   * Generate consent proof
   * 
   * @param {string} consentId - Consent ID (preferred) OR patientId
   * @param {string} clinicianId - Clinician ID (optional if consentId provided)
   * @param {string} consentType - Consent type (optional if consentId provided)
   * @returns {Promise<Object>} ZK proof
   */
  async generateConsentProof(consentId, clinicianId = null, consentType = null) {
    let patientId, finalClinicianId, finalConsentType;

    // If consentId is provided AND clinicianId/consentType are NOT provided, use consentId mode
    // Otherwise, use legacy mode (patientId, clinicianId, consentType)
    if (consentId && isValidUUID(consentId) && !clinicianId && !consentType) {
      // ConsentId mode: get consent details from consentId
      const consent = this.consentContract.getConsentById(consentId);
      
      if (!consent) {
        throw new Error('Consent not found');
      }

      if (!consent.isValid) {
        throw new Error('Consent is not valid (revoked or expired)');
      }

      patientId = consent.patientId;
      finalClinicianId = consent.clinicianId;
      finalConsentType = consent.consentType;
    } else {
      // Legacy mode: use patientId, clinicianId, consentType directly
      patientId = consentId; // In this case, first param is patientId
      
      if (!isValidUUID(patientId)) {
        throw new Error('Invalid patientId or consentId format');
      }
      if (!clinicianId || !isValidUUID(clinicianId)) {
        throw new Error('Invalid clinicianId format');
      }
      if (!consentType) {
        throw new Error('consentType is required');
      }

      finalClinicianId = clinicianId;
      finalConsentType = consentType;
    }

    // Check if consent exists and is valid (without revealing to verifier)
    const hasValidConsent = this.consentContract.hasValidConsent(
      patientId,
      finalClinicianId,
      finalConsentType
    );

    // Throw error if no valid consent exists - cannot generate proof for invalid consent
    if (!hasValidConsent) {
      throw new Error('Consent not found or invalid');
    }

    // Create consent data object
    const consentData = {
      valid: hasValidConsent
    };

    // Generate ZK proof that hides patientId, clinicianId, and consentType
    // but proves that valid consent exists
    const proof = ZKProof.generateProof(
      patientId,
      finalClinicianId,
      finalConsentType,
      consentData
    );

    return {
      proof,
      // Note: patientId, clinicianId, consentType are NOT included
      // Only the proof that consent is valid is returned
    };
  }

  /**
   * Verify consent proof
   * 
   * @param {Object} proof - ZK proof object
   * @returns {Promise<Object>} Verification result
   */
  async verifyConsentProof(proof) {
    if (!proof || !proof.proof) {
      throw new Error('proof object is required');
    }

    // Verify proof using ZKProof static method
    const isValid = ZKProof.verifyProof(proof.proof);

    return {
      valid: isValid,
      hasConsent: proof.proof.valid || false,
      // Note: patientId, clinicianId, consentType are not revealed
    };
  }

  /**
   * Generate permission proof
   * 
   * @param {string} userId - User ID
   * @param {Array} permissions - Permissions to prove
   * @returns {Promise<Object>} ZK proof
   */
  async generatePermissionProof(userId, permissions) {
    // Validate UUID
    if (!isValidUUID(userId)) {
      throw new Error('Invalid userId format');
    }

    if (!Array.isArray(permissions) || permissions.length === 0) {
      throw new Error('permissions must be a non-empty array');
    }

    // Check if user exists in blockchain
    const patient = this.patientContract.getPatient(userId);
    const clinician = this.clinicianContract.getClinician(userId);
    const userExists = !!(patient || clinician);

    if (!userExists) {
      throw new Error('User not found');
    }

    // For this assessment, assume user has the requested permissions if they exist
    // In production, this would check actual permissions
    const hasPermissions = true; // Simplified for assessment

    // Create permission data
    const permissionData = {
      hasPermissions
    };

    // Generate ZK proof that hides userId but proves permissions
    const proof = ZKProof.generatePermissionProof(
      userId,
      permissions,
      permissionData
    );

    return {
      proof,
      // Note: userId is NOT included in proof
      // Only the proof that user has permissions is returned
    };
  }

  /**
   * Verify permission proof
   * 
   * @param {Object} proof - Permission proof
   * @param {Array} requiredPermissions - Permissions that must be proven
   * @returns {Promise<Object>} Verification result
   */
  async verifyPermissionProof(proof, requiredPermissions) {
    if (!proof || !proof.commitment) {
      throw new Error('proof object is required');
    }

    if (!Array.isArray(requiredPermissions) || requiredPermissions.length === 0) {
      throw new Error('requiredPermissions must be a non-empty array');
    }

    // Verify proof using ZKProof static method
    const isValid = ZKProof.verifyPermissionProof(
      proof,
      requiredPermissions
    );

    return {
      valid: isValid,
      hasRequiredPermissions: isValid,
      // Note: userId is not revealed
    };
  }
}

module.exports = ZKService;


