/**
 * Audit Logger Tests
 */

const AuditLogger = require('../../../features/audit-trail/AuditLogger.js');
const Blockchain = require('../../../core/Blockchain.js');

describe('AuditLogger', () => {
  let blockchain;
  let logger;

  beforeEach(() => {
    blockchain = new Blockchain();
    blockchain.createGenesisBlock();
    logger = new AuditLogger(blockchain);
  });

  describe('logDataAccess', () => {
    test('should log data access successfully', async () => {
      const result = await logger.logDataAccess({
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
        logger.logDataAccess({
          actorId: 'clinician-1',
          // Missing resourceId and resourceType
          granted: true
        })
      ).rejects.toThrow('required');
    });

    test('should log denied access', async () => {
      const result = await logger.logDataAccess({
        actorId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
        resourceId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
        resourceType: 'medicalRecord',
        granted: false,
        reason: 'No consent'
      });

      expect(result.data.granted).toBe(false);
    });
  });

  describe('logConsentChange', () => {
    test('should log consent change', async () => {
      const result = await logger.logConsentChange({
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
        logger.logConsentChange({
          consentId: 'consent-1',
          action: 'invalid-action',
          actorId: 'patient-1',
          patientId: 'patient-1'
        })
      ).rejects.toThrow('must be one of');
    });
  });

  describe('logAIDiagnostic', () => {
    test('should log AI diagnostic', async () => {
      const result = await logger.logAIDiagnostic({
        modelId: 'model-1',
        recordId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
        result: { diagnosis: 'Hypertension', severity: 'Moderate' },
        confidence: 0.95
      });

      expect(result).toHaveProperty('logId');
      expect(result.data).toHaveProperty('type');
      expect(result.data.type).toBe('ai-diagnostic');
      expect(result.data.confidence).toBe(0.95);
    });

    test('should throw error for invalid confidence', async () => {
      await expect(
        logger.logAIDiagnostic({
          modelId: 'model-1',
          recordId: 'record-1',
          result: {},
          confidence: 1.5 // Invalid: > 1
        })
      ).rejects.toThrow('between 0 and 1');
    });
  });

  describe('queryLogs', () => {
    beforeEach(async () => {
      await logger.logDataAccess({
        actorId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
        resourceId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
        resourceType: 'medicalRecord',
        granted: true
      });
      await logger.logDataAccess({
        actorId: 'b47gb5gc-d68b-539d-bgc1-5268e69e4f76',
        resourceId: 'b84b734g-5b2e-528e-b39b-bfc56b8cfc22',
        resourceType: 'medicalRecord',
        granted: true
      });
      // Mine transactions so they're available for search
      blockchain.minePendingTransactions();
    });

    test('should query logs by actorId', async () => {
      const logs = await logger.queryLogs({ actorId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65' });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.every(log => log.actorId === 'a36fa4fb-c57a-428c-afb0-4157d58b3e65')).toBe(true);
    });

    test('should query logs by resourceId', async () => {
      const logs = await logger.queryLogs({ resourceId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11' });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.every(log => log.resourceId === 'a73a623f-4a1d-417d-a29a-aeb45a7beb11')).toBe(true);
    });

    test('should query logs by type', async () => {
      const logs = await logger.queryLogs({ type: 'data-access' });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.every(log => log.type === 'data-access')).toBe(true);
    });

    test('should return empty array for no matches', async () => {
      const logs = await logger.queryLogs({ actorId: 'b84b734g-5b2e-528e-b39b-bfc56b8cfc22' });
      expect(logs).toEqual([]);
    });
  });

  describe('getAuditTrail', () => {
    beforeEach(async () => {
      await logger.logDataAccess({
        actorId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
        resourceId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
        resourceType: 'medicalRecord',
        granted: true
      });
      // Mine transaction so it's available for search
      blockchain.minePendingTransactions();
    });

    test('should get audit trail for resource', async () => {
      const trail = await logger.getAuditTrail('a73a623f-4a1d-417d-a29a-aeb45a7beb11', 'medicalRecord');
      expect(trail).toHaveProperty('resourceId');
      expect(trail).toHaveProperty('resourceType');
      expect(trail).toHaveProperty('trail');
      expect(Array.isArray(trail.trail)).toBe(true);
      expect(trail.trail.length).toBeGreaterThan(0);
    });
  });
});

