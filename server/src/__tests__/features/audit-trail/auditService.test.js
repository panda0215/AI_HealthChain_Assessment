/**
 * Audit Service Tests
 */

const AuditService = require('../../../features/audit-trail/auditService.js');
const Blockchain = require('../../../core/Blockchain.js');

describe('AuditService', () => {
  let blockchain;
  let service;
  const mockData = {
    patients: [],
    clinicians: [],
    aiModels: [],
    medicalRecords: [],
    consentRecords: []
  };

  beforeEach(() => {
    blockchain = new Blockchain();
    blockchain.createGenesisBlock();
    service = new AuditService(blockchain, mockData);
  });

  describe('logDataAccess', () => {
    test('should log data access successfully', async () => {
      const result = await service.logDataAccess({
        actorId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
        resourceId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
        resourceType: 'medicalRecord',
        granted: true,
        reason: 'Valid consent'
      });

      expect(result).toHaveProperty('logId');
      expect(result).toHaveProperty('transaction');
      expect(result.data).toHaveProperty('type');
      expect(result.data.type).toBe('data-access');
      expect(result.data.granted).toBe(true);
    });

    test('should throw error for missing required fields', async () => {
      await expect(
        service.logDataAccess({
          actorId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65'
          // Missing resourceId, resourceType, granted
        })
      ).rejects.toThrow('required');
    });

    test('should throw error for invalid granted type', async () => {
      await expect(
        service.logDataAccess({
          actorId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
          resourceId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
          resourceType: 'medicalRecord',
          granted: 'yes' // Should be boolean
        })
      ).rejects.toThrow('boolean');
    });
  });

  describe('logConsentChange', () => {
    test('should log consent change successfully', async () => {
      const result = await service.logConsentChange({
        consentId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
        action: 'granted',
        actorId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
        patientId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
        clinicianId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
        consentType: 'Data Access'
      });

      expect(result).toHaveProperty('logId');
      expect(result.data).toHaveProperty('type');
      expect(result.data.type).toBe('consent-change');
      expect(result.data.action).toBe('granted');
    });

    test('should throw error for invalid action', async () => {
      await expect(
        service.logConsentChange({
          consentId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
          action: 'invalid-action',
          actorId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
          patientId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11'
        })
      ).rejects.toThrow('must be one of');
    });
  });

  describe('logAIDiagnostic', () => {
    test('should log AI diagnostic successfully', async () => {
      const result = await service.logAIDiagnostic({
        modelId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
        recordId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
        result: { diagnosis: 'Hypertension' },
        confidence: 0.95
      });

      expect(result).toHaveProperty('logId');
      expect(result.data).toHaveProperty('type');
      expect(result.data.type).toBe('ai-diagnostic');
      expect(result.data.confidence).toBe(0.95);
    });

    test('should throw error for invalid confidence', async () => {
      await expect(
        service.logAIDiagnostic({
          modelId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
          recordId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
          result: {},
          confidence: 1.5 // Invalid: > 1
        })
      ).rejects.toThrow('between 0 and 1');
    });
  });

  describe('queryLogs', () => {
    beforeEach(async () => {
      await service.logDataAccess({
        actorId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
        resourceId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
        resourceType: 'medicalRecord',
        granted: true
      });
      await service.logDataAccess({
        actorId: 'b47gb5gc-d68b-539d-bgc1-5268e69e4f76',
        resourceId: 'b84b734g-5b2e-528e-b39b-bfc56b8cfc22',
        resourceType: 'medicalRecord',
        granted: true
      });
      // Mine transactions so they're available for search
      service.logger.blockchain.minePendingTransactions();
    });

    test('should query logs by actorId', async () => {
      const result = await service.queryLogs({ actorId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65' });
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('logs');
      expect(result.logs.length).toBeGreaterThan(0);
      expect(result.logs.every(log => log.actorId === 'a36fa4fb-c57a-428c-afb0-4157d58b3e65')).toBe(true);
    });

    test('should query logs by resourceId', async () => {
      const result = await service.queryLogs({ resourceId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11' });
      expect(result.logs.every(log => log.resourceId === 'a73a623f-4a1d-417d-a29a-aeb45a7beb11')).toBe(true);
    });

    test('should query logs by type', async () => {
      const result = await service.queryLogs({ type: 'data-access' });
      expect(result.logs.every(log => log.type === 'data-access')).toBe(true);
    });

    test('should return empty array for no matches', async () => {
      const result = await service.queryLogs({ actorId: 'b84b734g-5b2e-528e-b39b-bfc56b8cfc22' });
      expect(result.logs).toEqual([]);
    });
  });

  describe('getAuditTrail', () => {
    beforeEach(async () => {
      await service.logDataAccess({
        actorId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
        resourceId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
        resourceType: 'medicalRecord',
        granted: true
      });
      // Mine transaction so it's available for search
      service.logger.blockchain.minePendingTransactions();
    });

    test('should get audit trail for resource', async () => {
      const result = await service.getAuditTrail('a73a623f-4a1d-417d-a29a-aeb45a7beb11', 'medicalRecord');
      expect(result).toHaveProperty('resourceId');
      expect(result).toHaveProperty('resourceType');
      expect(result).toHaveProperty('trail');
      expect(Array.isArray(result.trail)).toBe(true);
      expect(result.trail.length).toBeGreaterThan(0);
    });
  });
});

