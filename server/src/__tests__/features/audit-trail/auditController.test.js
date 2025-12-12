/**
 * Audit Trail Controller API Tests
 */

const request = require('supertest');
const express = require('express');
const cors = require('cors');
const Blockchain = require('../../../core/Blockchain.js');
const NodeManager = require('../../../core/NodeManager.js');
const auditRoutes = require('../../../features/audit-trail/auditController.js');

describe('Audit Trail Controller API', () => {
  let app;
  let blockchain;
  let nodeManager;
  const mockData = {
    patients: [
      { id: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11', name: 'Test Patient' }
    ],
    clinicians: [
      { id: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65', name: 'Test Clinician' }
    ],
    aiModels: [
      { id: 'model-1', name: 'Test Model' }
    ],
    medicalRecords: [],
    consentRecords: []
  };

  beforeEach(() => {
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    blockchain = new Blockchain();
    blockchain.createGenesisBlock();
    nodeManager = new NodeManager(blockchain);

    app.locals.blockchain = blockchain;
    app.locals.nodeManager = nodeManager;
    app.locals.data = mockData;

    app.use('/api/audit', auditRoutes);
  });

  afterEach(() => {
    if (app && app.listeners) {
      app.removeAllListeners();
    }
  });

  describe('POST /api/audit/data-access', () => {
    test('should log data access successfully', async () => {
      const response = await request(app)
        .post('/api/audit/data-access')
        .send({
          actorId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
          resourceId: 'record-1',
          resourceType: 'medicalRecord',
          granted: true,
          reason: 'Valid consent'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('logId');
      expect(response.body.data.data.type).toBe('data-access');
      expect(response.body.data.data.granted).toBe(true);
    });

    test('should log denied access', async () => {
      const response = await request(app)
        .post('/api/audit/data-access')
        .send({
          actorId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
          resourceId: 'record-1',
          resourceType: 'medicalRecord',
          granted: false,
          reason: 'No consent'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.data.granted).toBe(false);
    });

    test('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/audit/data-access')
        .send({
          actorId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65'
          // Missing resourceId, resourceType, granted
        });

      expect(response.status).toBe(400);
    });

    test('should return 400 for invalid granted type', async () => {
      const response = await request(app)
        .post('/api/audit/data-access')
        .send({
          actorId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
          resourceId: 'record-1',
          resourceType: 'medicalRecord',
          granted: 'yes' // Should be boolean
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/audit/consent', () => {
    test('should log consent change successfully', async () => {
      const response = await request(app)
        .post('/api/audit/consent')
        .send({
          consentId: 'consent-1',
          action: 'granted',
          actorId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
          patientId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
          clinicianId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
          consentType: 'Data Access'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('logId');
      expect(response.body.data.data.type).toBe('consent-change');
      expect(response.body.data.data.action).toBe('granted');
    });

    test('should return 400 for invalid action', async () => {
      const response = await request(app)
        .post('/api/audit/consent')
        .send({
          consentId: 'consent-1',
          action: 'invalid-action',
          actorId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
          patientId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11'
        });

      expect(response.status).toBe(400);
    });

    test('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/audit/consent')
        .send({
          consentId: 'consent-1'
          // Missing action, actorId, patientId
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/audit/ai-diagnostic', () => {
    test('should log AI diagnostic successfully', async () => {
      const response = await request(app)
        .post('/api/audit/ai-diagnostic')
        .send({
          modelId: 'model-1',
          recordId: 'record-1',
          result: { diagnosis: 'Hypertension', severity: 'Moderate' },
          confidence: 0.95
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('logId');
      expect(response.body.data.data.type).toBe('ai-diagnostic');
      expect(response.body.data.data.confidence).toBe(0.95);
    });

    test('should return 400 for invalid confidence', async () => {
      const response = await request(app)
        .post('/api/audit/ai-diagnostic')
        .send({
          modelId: 'model-1',
          recordId: 'record-1',
          result: {},
          confidence: 1.5 // Invalid: > 1
        });

      expect(response.status).toBe(400);
    });

    test('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/audit/ai-diagnostic')
        .send({
          modelId: 'model-1'
          // Missing recordId and result
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/audit/query', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/audit/data-access')
        .send({
          actorId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
          resourceId: 'record-1',
          resourceType: 'medicalRecord',
          granted: true
        });

      await request(app)
        .post('/api/audit/data-access')
        .send({
          actorId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
          resourceId: 'record-2',
          resourceType: 'medicalRecord',
          granted: false
        });
      // Mine transactions so they're available for search
      // The audit logs create pending transactions that need to be mined
      // We must mine them so searchTransactions can find them
      expect(blockchain.pendingTransactions.length).toBeGreaterThan(0);
      blockchain.minePendingTransactions();
    });

    test('should query logs by actorId', async () => {
      const response = await request(app)
        .get('/api/audit/query?actorId=a36fa4fb-c57a-428c-afb0-4157d58b3e65');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('logs');
      expect(response.body.data.logs.length).toBeGreaterThan(0);
      expect(response.body.data.logs.every(log => log.actorId === 'a36fa4fb-c57a-428c-afb0-4157d58b3e65')).toBe(true);
    });

    test('should query logs by resourceId', async () => {
      const response = await request(app)
        .get('/api/audit/query?resourceId=record-1');

      expect(response.status).toBe(200);
      expect(response.body.data.logs.length).toBeGreaterThan(0);
      expect(response.body.data.logs.every(log => log.resourceId === 'record-1')).toBe(true);
    });

    test('should query logs by type', async () => {
      const response = await request(app)
        .get('/api/audit/query?type=data-access');

      expect(response.status).toBe(200);
      expect(response.body.data.logs.every(log => log.type === 'data-access')).toBe(true);
    });

    test('should query logs with date range', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/audit/query?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`);

      expect(response.status).toBe(200);
      expect(response.body.data.logs.length).toBeGreaterThan(0);
    });

    test('should return empty array for no matches', async () => {
      const response = await request(app)
        .get('/api/audit/query?actorId=non-existent-id');

      expect(response.status).toBe(200);
      expect(response.body.data.logs).toEqual([]);
    });
  });

  describe('GET /api/audit/trail/:resourceId/:resourceType', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/audit/data-access')
        .send({
          actorId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
          resourceId: 'record-1',
          resourceType: 'medicalRecord',
          granted: true
        });
      // Mine transaction so it's available for search
      // The audit log creates a pending transaction that needs to be mined
      // We must mine it so searchTransactions can find it
      expect(blockchain.pendingTransactions.length).toBeGreaterThan(0);
      blockchain.minePendingTransactions();
    });

    test('should get audit trail for resource', async () => {
      const response = await request(app)
        .get('/api/audit/trail/record-1/medicalRecord');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('resourceId');
      expect(response.body.data).toHaveProperty('resourceType');
      expect(response.body.data).toHaveProperty('trail');
      expect(Array.isArray(response.body.data.trail)).toBe(true);
      expect(response.body.data.trail.length).toBeGreaterThan(0);
    });

    test('should return 400 for missing params', async () => {
      const response = await request(app)
        .get('/api/audit/trail/ /medicalRecord'); // Use space instead of empty

      expect(response.status).toBe(400);
    });
  });
});

