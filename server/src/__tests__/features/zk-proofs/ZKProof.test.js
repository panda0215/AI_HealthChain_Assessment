/**
 * ZK Proof Tests
 */

const ZKProof = require('../../../features/zk-proofs/ZKProof.js');

describe('ZKProof', () => {
  describe('Consent Proof', () => {
    test('should generate consent proof', () => {
      const proof = ZKProof.generateProof(
        'patient-1',
        'clinician-1',
        'Data Access',
        { valid: true }
      );

      expect(proof).toHaveProperty('commitment');
      expect(proof).toHaveProperty('verificationKey');
      expect(proof).toHaveProperty('salt');
      expect(proof).toHaveProperty('valid');
      expect(proof.valid).toBe(true);
      // Should not reveal patient/clinician IDs
      expect(proof.patientId).toBeUndefined();
      expect(proof.clinicianId).toBeUndefined();
      expect(proof.consentType).toBeUndefined();
    });

    test('should verify valid consent proof', () => {
      const proof = ZKProof.generateProof(
        'patient-1',
        'clinician-1',
        'Data Access',
        { valid: true }
      );

      const isValid = ZKProof.verifyProof(proof);
      expect(isValid).toBe(true);
    });

    test('should reject invalid proof', () => {
      const proof = {
        commitment: 'invalid',
        verificationKey: 'invalid',
        salt: 'invalid',
        valid: true
      };

      const isValid = ZKProof.verifyProof(proof);
      expect(isValid).toBe(false);
    });

    test('should throw error for missing valid field', () => {
      expect(() => {
        ZKProof.generateProof('patient-1', 'clinician-1', 'Data Access', {});
      }).toThrow('valid boolean field');
    });
  });

  describe('Permission Proof', () => {
    test('should generate permission proof', () => {
      const proof = ZKProof.generatePermissionProof(
        'user-1',
        ['read', 'write'],
        { hasPermissions: true, permissions: ['read', 'write'] }
      );

      expect(proof).toHaveProperty('commitment');
      expect(proof).toHaveProperty('verificationKey');
      expect(proof).toHaveProperty('permissions');
      expect(proof).toHaveProperty('hasPermissions');
      expect(proof.hasPermissions).toBe(true);
      // Should not reveal user ID
      expect(proof.userId).toBeUndefined();
    });

    test('should verify permission proof', () => {
      const proof = ZKProof.generatePermissionProof(
        'user-1',
        ['read', 'write'],
        { hasPermissions: true, permissions: ['read', 'write'] }
      );

      const isValid = ZKProof.verifyPermissionProof(proof, ['read', 'write']);
      expect(isValid).toBe(true);
    });

    test('should reject proof with missing permissions', () => {
      const proof = ZKProof.generatePermissionProof(
        'user-1',
        ['read'],
        { hasPermissions: true, permissions: ['read'] }
      );

      const isValid = ZKProof.verifyPermissionProof(proof, ['read', 'write']);
      expect(isValid).toBe(false);
    });

    test('should reject expired proof', () => {
      const proof = ZKProof.generatePermissionProof(
        'user-1',
        ['read', 'write'],
        { hasPermissions: true, permissions: ['read', 'write'] }
      );

      // Set timestamp to 25 hours ago
      proof.timestamp = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();

      const isValid = ZKProof.verifyPermissionProof(proof, ['read', 'write']);
      expect(isValid).toBe(false);
    });
  });
});

