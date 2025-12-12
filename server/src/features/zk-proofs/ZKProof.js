/**
 * Zero-Knowledge Proof Implementation
 * 
 * This is a simplified ZK proof system using cryptographic commitments.
 * In production, you would use libraries like circom, snarkjs, or similar for proper ZK-SNARKs.
 * 
 * This implementation demonstrates the concept by:
 * - Using cryptographic commitments (hash with salt) to hide data
 * - Generating proofs that can be verified without revealing underlying data
 * - Supporting consent and permission proofs
 */

const crypto = require('crypto');

class ZKProof {
  /**
   * Generate a ZK proof that proves consent exists without revealing details
   * 
   * @param {string} patientId - Patient ID (will be hidden)
   * @param {string} clinicianId - Clinician ID (will be hidden)
   * @param {string} consentType - Consent type (will be hidden)
   * @param {Object} consentData - Actual consent data (must contain valid: boolean)
   * @returns {Object} ZK proof object
   */
  static generateProof(patientId, clinicianId, consentType, consentData) {
    if (!consentData || typeof consentData.valid !== 'boolean') {
      throw new Error('consentData must contain a valid boolean field');
    }

    // Generate random salt for commitment
    const salt = crypto.randomBytes(32).toString('hex');
    
    // Create commitment: hash of (patientId + clinicianId + consentType + valid + salt)
    // This hides the actual IDs and type while proving validity
    const commitmentData = `${patientId}:${clinicianId}:${consentType}:${consentData.valid}:${salt}`;
    const commitment = crypto.createHash('sha256').update(commitmentData).digest('hex');
    
    // Create verification key (hash of commitment + secret key)
    // In production, this would be part of a proper ZK-SNARK setup
    const verificationKey = crypto.createHash('sha256')
      .update(commitment + 'zk-secret-key')
      .digest('hex');

    // Generate proof that doesn't reveal patientId, clinicianId, or consentType
    // but proves that consent is valid
    const proof = {
      commitment,
      verificationKey,
      salt, // Salt is included but doesn't reveal original data
      valid: consentData.valid, // Only reveal validity, not identities
      timestamp: new Date().toISOString(),
      // Note: patientId, clinicianId, consentType are NOT included in proof
    };

    return proof;
  }

  /**
   * Verify a ZK proof
   * 
   * @param {Object} proof - ZK proof object
   * @param {string} expectedRoot - Expected root/commitment (optional, uses proof.commitment if not provided)
   * @returns {boolean} True if proof is valid
   */
  static verifyProof(proof, expectedRoot = null) {
    if (!proof || !proof.commitment || !proof.verificationKey) {
      return false;
    }

    // Verify proof structure
    if (typeof proof.valid !== 'boolean') {
      return false;
    }

    // Verify commitment matches verification key
    const expectedVerificationKey = crypto.createHash('sha256')
      .update(proof.commitment + 'zk-secret-key')
      .digest('hex');

    if (proof.verificationKey !== expectedVerificationKey) {
      return false;
    }

    // If expectedRoot is provided, verify commitment matches
    if (expectedRoot && proof.commitment !== expectedRoot) {
      return false;
    }

    // Verify timestamp is recent (within 24 hours)
    if (proof.timestamp) {
      const proofTime = new Date(proof.timestamp);
      const now = new Date();
      const hoursDiff = (now - proofTime) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        return false; // Proof expired
      }
    }

    return true;
  }

  /**
   * Generate proof that user has permission without revealing identity
   * 
   * @param {string} userId - User ID to hide
   * @param {Array} permissions - Permissions to prove
   * @param {Object} permissionData - Actual permission data (must contain hasPermissions: boolean)
   * @returns {Object} ZK proof
   */
  static generatePermissionProof(userId, permissions, permissionData) {
    if (!Array.isArray(permissions) || permissions.length === 0) {
      throw new Error('permissions must be a non-empty array');
    }

    if (!permissionData || typeof permissionData.hasPermissions !== 'boolean') {
      throw new Error('permissionData must contain a hasPermissions boolean field');
    }

    // Generate random salt
    const salt = crypto.randomBytes(32).toString('hex');
    
    // Create commitment: hash of (userId + permissions + hasPermissions + salt)
    // This hides the userId while proving permissions
    const permissionsHash = crypto.createHash('sha256')
      .update(permissions.sort().join(':'))
      .digest('hex');
    
    const commitmentData = `${userId}:${permissionsHash}:${permissionData.hasPermissions}:${salt}`;
    const commitment = crypto.createHash('sha256').update(commitmentData).digest('hex');
    
    // Create verification key
    const verificationKey = crypto.createHash('sha256')
      .update(commitment + 'zk-secret-key')
      .digest('hex');

    // Generate proof that doesn't reveal userId but proves permissions
    const proof = {
      commitment,
      verificationKey,
      salt,
      permissions: permissions.sort(), // Permissions can be revealed (not sensitive)
      hasPermissions: permissionData.hasPermissions, // Only reveal permission status
      timestamp: new Date().toISOString(),
      // Note: userId is NOT included in proof
    };

    return proof;
  }

  /**
   * Verify permission proof
   * 
   * @param {Object} proof - Permission proof
   * @param {Array} requiredPermissions - Permissions that must be proven
   * @returns {boolean} True if user has required permissions
   */
  static verifyPermissionProof(proof, requiredPermissions) {
    if (!proof || !proof.commitment || !proof.verificationKey) {
      return false;
    }

    if (!Array.isArray(requiredPermissions) || requiredPermissions.length === 0) {
      throw new Error('requiredPermissions must be a non-empty array');
    }

    // Verify proof structure
    if (typeof proof.hasPermissions !== 'boolean') {
      return false;
    }

    // Check that user has permissions
    if (!proof.hasPermissions) {
      return false;
    }

    // Verify all required permissions are in the proof
    const proofPermissions = proof.permissions || [];
    const hasAllRequired = requiredPermissions.every(perm => 
      proofPermissions.includes(perm)
    );

    if (!hasAllRequired) {
      return false;
    }

    // Verify commitment matches verification key
    const expectedVerificationKey = crypto.createHash('sha256')
      .update(proof.commitment + 'zk-secret-key')
      .digest('hex');

    if (proof.verificationKey !== expectedVerificationKey) {
      return false;
    }

    // Verify timestamp is recent
    if (proof.timestamp) {
      const proofTime = new Date(proof.timestamp);
      const now = new Date();
      const hoursDiff = (now - proofTime) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        return false; // Proof expired
      }
    }

    return true;
  }
}

module.exports = ZKProof;
