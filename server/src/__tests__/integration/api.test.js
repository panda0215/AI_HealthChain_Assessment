/**
 * Comprehensive API Integration Tests
 * Tests all endpoints across all features
 */

const request = require('supertest');
const express = require('express');
const cors = require('cors');
const Blockchain = require('../../core/Blockchain.js');
const NodeManager = require('../../core/NodeManager.js');

// Import routes
const consentRoutes = require('../../features/consent-management/consentController.js');
const integrityRoutes = require('../../features/data-integrity/integrityController.js');
const zkRoutes = require('../../features/zk-proofs/zkController.js');
const auditRoutes = require('../../features/audit-trail/auditController.js');
const consensusRoutes = require('../../features/consensus/consensusController.js');

// Mock data with valid UUIDs
const mockData = {
  patients: [
    { id: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11', name: 'Test Patient 1' },
    { id: '4766f152-cc9b-47d0-9519-7c1a5f2e52be', name: 'Test Patient 2' }
  ],
  clinicians: [
    { id: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65', name: 'Test Clinician 1' },
    { id: '41fe33a1-f0f7-4560-886a-90565970aa95', name: 'Test Clinician 2' }
  ],
  aiModels: [
    { id: 'model-1', name: 'Test Model' }
  ],
  medicalRecords: [],
  consentRecords: []
};

describe('Comprehensive API Integration Tests', () => {
  let app;
  let blockchain;
  let nodeManager;

  beforeEach(() => {
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    blockchain = new Blockchain();
    blockchain.createGenesisBlock();
    nodeManager = new NodeManager(blockchain);

    const PatientContract = require('../../features/data-storage/PatientContract.js');
    const ClinicianContract = require('../../features/data-storage/ClinicianContract.js');
    const patientContract = new PatientContract(blockchain);
    const clinicianContract = new ClinicianContract(blockchain);

    // Register test patients and clinicians
    patientContract.registerPatient({
      id: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
      firstName: 'Test',
      lastName: 'Patient 1',
      name: 'Test Patient 1'
    });
    patientContract.registerPatient({
      id: '4766f152-cc9b-47d0-9519-7c1a5f2e52be',
      firstName: 'Test',
      lastName: 'Patient 2',
      name: 'Test Patient 2'
    });
    clinicianContract.registerClinician({
      id: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
      firstName: 'Test',
      lastName: 'Clinician 1',
      name: 'Test Clinician 1'
    });
    clinicianContract.registerClinician({
      id: '41fe33a1-f0f7-4560-886a-90565970aa95',
      firstName: 'Test',
      lastName: 'Clinician 2',
      name: 'Test Clinician 2'
    });

    // Mine patient/clinician registrations so they're available for queries
    if (blockchain.pendingTransactions.length > 0) {
      blockchain.minePendingTransactions();
    }

    app.locals.blockchain = blockchain;
    app.locals.nodeManager = nodeManager;
    app.locals.patientContract = patientContract;
    app.locals.clinicianContract = clinicianContract;
    app.locals.data = mockData;

    app.use('/api/consent', consentRoutes);
    app.use('/api/integrity', integrityRoutes);
    app.use('/api/zk', zkRoutes);
    app.use('/api/audit', auditRoutes);
    app.use('/api/consensus', consensusRoutes);
  });

  afterEach(() => {
    // Cleanup: remove all listeners and reset state
    if (app && app.listeners) {
      app.removeAllListeners();
    }
  });

  describe('Consent Management API - Full Flow', () => {
    test('Complete consent lifecycle', async () => {
      // 1. Grant consent
      const grantResponse = await request(app)
        .post('/api/consent/grant')
        .send({
          patientId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
          clinicianId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
          consentType: 'Data Access',
          purpose: 'Treatment'
        });

      expect(grantResponse.status).toBe(201);
      
      // Mine the consent transaction so it's available for queries
      blockchain.minePendingTransactions();

      // 2. Check consent
      const checkResponse = await request(app)
        .get('/api/consent/check/a73a623f-4a1d-417d-a29a-aeb45a7beb11/a36fa4fb-c57a-428c-afb0-4157d58b3e65/Data%20Access');

      expect(checkResponse.status).toBe(200);
      expect(checkResponse.body.data.hasConsent).toBe(true);

      // 3. Get history
      const historyResponse = await request(app)
        .get('/api/consent/history/a73a623f-4a1d-417d-a29a-aeb45a7beb11');

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.data.history.length).toBeGreaterThan(0);

      // 4. Get active consents
      const activeResponse = await request(app)
        .get('/api/consent/active/a73a623f-4a1d-417d-a29a-aeb45a7beb11');

      expect(activeResponse.status).toBe(200);
      expect(activeResponse.body.data.activeConsents.length).toBeGreaterThan(0);
    });
  });

  describe('Data Integrity API - Full Flow', () => {
    test('Complete integrity verification flow', async () => {
      // 1. Create tree
      const treeResponse = await request(app)
        .post('/api/integrity/tree')
        .send({
          records: ['record1', 'record2', 'record3', 'record4'],
          storeOnChain: true
        });

      expect(treeResponse.status).toBe(201);
      const root = treeResponse.body.data.root;

      // 2. Generate proof
      const proofResponse = await request(app)
        .post('/api/integrity/proof')
        .send({
          record: 'record1',
          root
        });

      expect(proofResponse.status).toBe(200);
      const proof = proofResponse.body.data.proof;

      // 3. Verify proof
      const verifyResponse = await request(app)
        .post('/api/integrity/verify')
        .send({
          record: 'record1',
          proof,
          root
        });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.data.valid).toBe(true);

      // 4. Batch verify
      const proof2 = (await request(app)
        .post('/api/integrity/proof')
        .send({ record: 'record2', root })).body.data.proof;

      const batchResponse = await request(app)
        .post('/api/integrity/verify-batch')
        .send({
          records: [
            { data: 'record1', proof, root },
            { data: 'record2', proof: proof2, root }
          ]
        });

      expect(batchResponse.status).toBe(200);
      expect(batchResponse.body.data.allValid).toBe(true);
    });
  });

  describe('ZK Proofs API - Full Flow', () => {
    beforeEach(async () => {
      // Grant consent first
      await request(app)
        .post('/api/consent/grant')
        .send({
          patientId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
          clinicianId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
          consentType: 'Data Access'
        });
      // Mine consent transaction so it's available for ZK proof generation
      // The grant creates a pending transaction that needs to be mined
      // We must mine it so searchTransactions can find it
      expect(blockchain.pendingTransactions.length).toBeGreaterThan(0);
      blockchain.minePendingTransactions();
    });


    test('Complete ZK permission proof flow', async () => {
      // 1. Generate permission proof
      const proofResponse = await request(app)
        .post('/api/zk/permission-proof')
        .send({
          userId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
          permissions: ['read', 'write', 'admin']
        });

      expect(proofResponse.status).toBe(200);
      expect(proofResponse.body.data).toHaveProperty('proof');
      const proof = proofResponse.body.data.proof;

      // Verify privacy - no user ID
      expect(proof.userId).toBeUndefined();

      // 2. Verify permission proof
      const verifyResponse = await request(app)
        .post('/api/zk/verify-permission')
        .send({
          proof,
          requiredPermissions: ['read', 'write']
        });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.data.valid).toBe(true);
    });
  });

  describe('Audit Trail API - Full Flow', () => {
    test('Complete audit trail flow', async () => {
      // 1. Log data access
      const accessResponse = await request(app)
        .post('/api/audit/data-access')
        .send({
          actorId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
          resourceId: 'record-1',
          resourceType: 'medicalRecord',
          granted: true,
          reason: 'Valid consent'
        });

      expect(accessResponse.status).toBe(201);
      const logId1 = accessResponse.body.data.logId;

      // 2. Log consent change
      const consentResponse = await request(app)
        .post('/api/audit/consent')
        .send({
          consentId: 'c73a623f-4a1d-417d-a29a-aeb45a7beb11',
          action: 'granted',
          actorId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
          patientId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
          clinicianId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
          consentType: 'Data Access'
        });

      expect(consentResponse.status).toBe(201);

      // Mine transactions so they're available for queries
      // The audit logs create pending transactions that need to be mined
      // We must mine them so searchTransactions can find them
      expect(blockchain.pendingTransactions.length).toBeGreaterThan(0);
      blockchain.minePendingTransactions();

      // 3. Log AI diagnostic
      const aiResponse = await request(app)
        .post('/api/audit/ai-diagnostic')
        .send({
          modelId: 'd73a623f-4a1d-417d-a29a-aeb45a7beb11',
          recordId: 'e73a623f-4a1d-417d-a29a-aeb45a7beb11',
          result: { diagnosis: 'Hypertension', severity: 'Moderate' },
          confidence: 0.95
        });

      expect(aiResponse.status).toBe(201);

      // Mine AI diagnostic transaction so it's available for queries
      // The audit log creates a pending transaction that needs to be mined
      // We must mine it so searchTransactions can find it
      expect(blockchain.pendingTransactions.length).toBeGreaterThan(0);
      blockchain.minePendingTransactions();

      // 4. Query logs
      const queryResponse = await request(app)
        .get('/api/audit/query?actorId=a36fa4fb-c57a-428c-afb0-4157d58b3e65');

      expect(queryResponse.status).toBe(200);
      expect(queryResponse.body.data.logs.length).toBeGreaterThan(0);

      // 5. Get audit trail
      const trailResponse = await request(app)
        .get('/api/audit/trail/record-1/medicalRecord');

      expect(trailResponse.status).toBe(200);
      expect(trailResponse.body.data.trail.length).toBeGreaterThan(0);
    });
  });


  describe('Cross-Feature Integration', () => {

    test('Data Integrity -> Audit flow', async () => {
      // 1. Create Merkle tree
      const treeResponse = await request(app)
        .post('/api/integrity/tree')
        .send({
          records: ['record1', 'record2'],
          storeOnChain: true
        });

      expect(treeResponse.status).toBe(201);
      const root = treeResponse.body.data.root;

      // 2. Log integrity verification
      const auditResponse = await request(app)
        .post('/api/audit/data-access')
        .send({
          actorId: 'system',
          resourceId: root,
          resourceType: 'merkleRoot',
          granted: true,
          reason: 'Merkle tree created'
        });

      expect(auditResponse.status).toBe(201);
    });
  });

  describe('Error Handling', () => {
    test('Should handle invalid endpoints', async () => {
      const response = await request(app)
        .get('/api/nonexistent/endpoint');

      expect(response.status).toBe(404);
    });

    test('Should handle malformed requests', async () => {
      const response = await request(app)
        .post('/api/consent/grant')
        .send('invalid json');

      expect(response.status).toBe(400);
    });
  });
});

