/**
 * ZK Service Tests
 */

const ZKService = require('../../../features/zk-proofs/zkService.js');
const Blockchain = require('../../../core/Blockchain.js');
const ConsentContract = require('../../../features/consent-management/ConsentContract.js');
const PatientContract = require('../../../features/data-storage/PatientContract.js');
const ClinicianContract = require('../../../features/data-storage/ClinicianContract.js');

describe('ZKService', () => {
  let blockchain;
  let service;
  let patientContract;
  let clinicianContract;
  let consentContract;

  beforeEach(() => {
    blockchain = new Blockchain();
    blockchain.createGenesisBlock();
    
    patientContract = new PatientContract(blockchain);
    clinicianContract = new ClinicianContract(blockchain);
    consentContract = new ConsentContract(blockchain);
    
    // Register test patient and clinician
    patientContract.registerPatient({
      id: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
      firstName: 'Test',
      lastName: 'Patient',
      name: 'Test Patient'
    });
    
    clinicianContract.registerClinician({
      id: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
      firstName: 'Test',
      lastName: 'Clinician',
      name: 'Test Clinician'
    });
    
    // Mine patient/clinician registrations so they're available for queries
    if (blockchain.pendingTransactions.length > 0) {
      blockchain.minePendingTransactions();
    }
    
    service = new ZKService(blockchain, patientContract, clinicianContract);

    // Grant consent for testing
    consentContract.grantConsent(
      'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
      'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
      'Data Access'
    );
    // Mine the consent transaction so it's available for queries
    // Note: registerPatient/registerClinician already mined their transactions,
    // so the consent should be the only pending transaction now
    // We must mine it so searchTransactions can find it
    expect(blockchain.pendingTransactions.length).toBeGreaterThan(0);
    blockchain.minePendingTransactions();
  });

  describe('generateConsentProof', () => {
    test('should generate consent proof successfully', async () => {
      const result = await service.generateConsentProof(
        'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
        'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
        'Data Access'
      );

      expect(result).toHaveProperty('proof');
      expect(result.proof).toHaveProperty('commitment');
      expect(result.proof).toHaveProperty('verificationKey');
      expect(result.proof).toHaveProperty('valid');
      // Should not reveal sensitive data
      expect(result.proof.patientId).toBeUndefined();
      expect(result.proof.clinicianId).toBeUndefined();
      expect(result.proof.consentType).toBeUndefined();
    });

    test('should throw error for invalid patient ID', async () => {
      await expect(
        service.generateConsentProof(
          'invalid-id',
          'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
          'Data Access'
        )
      ).rejects.toThrow('Invalid');
    });

    test('should throw error for non-existent consent', async () => {
      await expect(
        service.generateConsentProof(
          'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
          'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
          'AI Analysis' // Not granted
        )
      ).rejects.toThrow('not found');
    });
  });

  describe('verifyConsentProof', () => {
    let proof;

    beforeEach(async () => {
      // Make sure consent is mined before generating proof
      // The consent was granted in the main beforeEach, but we need to ensure it's mined
      // before generating the proof for verification tests
      if (blockchain.pendingTransactions.length > 0) {
        blockchain.minePendingTransactions();
      }
      const result = await service.generateConsentProof(
        'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
        'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
        'Data Access'
      );
      proof = result.proof;
    });

    test('should verify valid consent proof', async () => {
      const result = await service.verifyConsentProof({ proof });

      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(true);
      expect(result).toHaveProperty('hasConsent');
    });

    test('should reject invalid proof', async () => {
      const invalidProof = {
        commitment: 'invalid',
        verificationKey: 'invalid',
        salt: 'invalid',
        valid: true
      };

      const result = await service.verifyConsentProof({ proof: invalidProof });
      expect(result.valid).toBe(false);
    });
  });

  describe('generatePermissionProof', () => {
    test('should generate permission proof successfully', async () => {
      const result = await service.generatePermissionProof(
        'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
        ['read', 'write']
      );

      expect(result).toHaveProperty('proof');
      expect(result.proof).toHaveProperty('commitment');
      expect(result.proof).toHaveProperty('permissions');
      expect(result.proof).toHaveProperty('hasPermissions');
      // Should not reveal user ID
      expect(result.proof.userId).toBeUndefined();
    });

    test('should throw error for invalid user ID', async () => {
      await expect(
        service.generatePermissionProof('invalid-id', ['read'])
      ).rejects.toThrow('Invalid');
    });
  });

  describe('verifyPermissionProof', () => {
    let proof;

    beforeEach(async () => {
      const result = await service.generatePermissionProof(
        'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
        ['read', 'write', 'admin']
      );
      proof = result.proof;
    });

    test('should verify valid permission proof', async () => {
      const result = await service.verifyPermissionProof(proof, ['read', 'write']);

      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(true);
      expect(result).toHaveProperty('hasRequiredPermissions');
    });

    test('should reject proof with missing permissions', async () => {
      const result = await service.verifyPermissionProof(proof, ['read', 'write', 'delete']);

      expect(result.valid).toBe(false);
    });
  });
});

