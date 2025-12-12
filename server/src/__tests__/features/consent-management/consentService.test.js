/**
 * Consent Service Tests
 */

const ConsentService = require('../../../features/consent-management/consentService.js');
const Blockchain = require('../../../core/Blockchain.js');
const PatientContract = require('../../../features/data-storage/PatientContract.js');
const ClinicianContract = require('../../../features/data-storage/ClinicianContract.js');

describe('ConsentService', () => {
  let blockchain;
  let service;
  let patientContract;
  let clinicianContract;

  beforeEach(() => {
    blockchain = new Blockchain();
    blockchain.createGenesisBlock();
    
    patientContract = new PatientContract(blockchain);
    clinicianContract = new ClinicianContract(blockchain);
    
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
    
    service = new ConsentService(blockchain, patientContract, clinicianContract);
  });

  describe('grantConsent', () => {
    test('should grant consent with valid data', async () => {
      const result = await service.grantConsent(
        'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
        'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
        'Data Access',
        { purpose: 'Treatment' }
      );

      expect(result).toHaveProperty('consentId');
      expect(result.patientId).toBe('a73a623f-4a1d-417d-a29a-aeb45a7beb11');
      expect(result.clinicianId).toBe('a36fa4fb-c57a-428c-afb0-4157d58b3e65');
    });

    test('should throw error for invalid patient ID', async () => {
      await expect(
        service.grantConsent('b84b734g-5b2e-528e-b39b-bfc56b8cfc22', 'a36fa4fb-c57a-428c-afb0-4157d58b3e65', 'Data Access')
      ).rejects.toThrow('Invalid patient ID format');
    });

    test('should throw error for invalid clinician ID', async () => {
      await expect(
        service.grantConsent('a73a623f-4a1d-417d-a29a-aeb45a7beb11', 'b47gb5gc-d68b-539d-bgc1-5268e69e4f76', 'Data Access')
      ).rejects.toThrow('Invalid clinician ID format');
    });

    test('should throw error for invalid consent type', async () => {
      await expect(
        service.grantConsent('a73a623f-4a1d-417d-a29a-aeb45a7beb11', 'a36fa4fb-c57a-428c-afb0-4157d58b3e65', 'Invalid Type')
      ).rejects.toThrow('Invalid consent type');
    });

    test('should throw error for invalid UUID format', async () => {
      await expect(
        service.grantConsent('not-a-uuid', 'a36fa4fb-c57a-428c-afb0-4157d58b3e65', 'Data Access')
      ).rejects.toThrow('Invalid patient ID format');
    });
  });

  describe('revokeConsent', () => {
    test('should revoke consent successfully', async () => {
      const grantResult = await service.grantConsent('a73a623f-4a1d-417d-a29a-aeb45a7beb11', 'a36fa4fb-c57a-428c-afb0-4157d58b3e65', 'Data Access');
      // Mine consent transaction so it's available for revocation
      // The grant creates a pending transaction that needs to be mined
      if (blockchain.pendingTransactions.length > 0) {
        blockchain.minePendingTransactions();
      }
      const revokeResult = await service.revokeConsent(grantResult.consentId, 'a73a623f-4a1d-417d-a29a-aeb45a7beb11');

      expect(revokeResult).toHaveProperty('consentId');
      expect(revokeResult.action).toBe('revoke');
    });

    test('should throw error for non-existent consent', async () => {
      await expect(
        service.revokeConsent('a73a623f-4a1d-417d-a29a-aeb45a7beb11', 'a73a623f-4a1d-417d-a29a-aeb45a7beb11')
      ).rejects.toThrow('not found');
    });
  });

  describe('checkConsent', () => {
    test('should return true for valid consent', async () => {
      await service.grantConsent('a73a623f-4a1d-417d-a29a-aeb45a7beb11', 'a36fa4fb-c57a-428c-afb0-4157d58b3e65', 'Data Access');
      // Mine consent transaction so it's available for queries
      // The grant creates a pending transaction that needs to be mined
      // We must mine it so searchTransactions can find it
      expect(blockchain.pendingTransactions.length).toBeGreaterThan(0);
      blockchain.minePendingTransactions();
      const result = await service.checkConsent('a73a623f-4a1d-417d-a29a-aeb45a7beb11', 'a36fa4fb-c57a-428c-afb0-4157d58b3e65', 'Data Access');
      expect(result.hasConsent).toBe(true);
    });

    test('should return false for non-existent consent', async () => {
      const result = await service.checkConsent('a73a623f-4a1d-417d-a29a-aeb45a7beb11', 'a36fa4fb-c57a-428c-afb0-4157d58b3e65', 'Data Access');
      expect(result.hasConsent).toBe(false);
    });
  });

  describe('getConsentHistory', () => {
    test('should return consent history', async () => {
      await service.grantConsent('a73a623f-4a1d-417d-a29a-aeb45a7beb11', 'a36fa4fb-c57a-428c-afb0-4157d58b3e65', 'Data Access');
      // Mine consent transaction so it's available for queries
      // The grant creates a pending transaction that needs to be mined
      // We must mine it so searchTransactions can find it
      expect(blockchain.pendingTransactions.length).toBeGreaterThan(0);
      blockchain.minePendingTransactions();
      const result = await service.getConsentHistory('a73a623f-4a1d-417d-a29a-aeb45a7beb11');
      expect(result).toHaveProperty('patientId');
      expect(result).toHaveProperty('history');
      expect(result.history.length).toBeGreaterThan(0);
    });
  });

  describe('getActiveConsents', () => {
    test('should return active consents', async () => {
      await service.grantConsent('a73a623f-4a1d-417d-a29a-aeb45a7beb11', 'a36fa4fb-c57a-428c-afb0-4157d58b3e65', 'Data Access');
      // Mine consent transaction so it's available for queries
      // The grant creates a pending transaction that needs to be mined
      // We must mine it so searchTransactions can find it
      expect(blockchain.pendingTransactions.length).toBeGreaterThan(0);
      blockchain.minePendingTransactions();
      const result = await service.getActiveConsents('a73a623f-4a1d-417d-a29a-aeb45a7beb11');
      expect(result).toHaveProperty('patientId');
      expect(result).toHaveProperty('activeConsents');
      expect(result.activeConsents.length).toBeGreaterThan(0);
    });
  });
});

