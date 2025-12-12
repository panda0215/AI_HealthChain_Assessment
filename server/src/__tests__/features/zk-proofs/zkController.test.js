/**
 * ZK Proofs Controller API Tests
 */

const request = require('supertest');
const express = require('express');
const cors = require('cors');
const Blockchain = require('../../../core/Blockchain.js');
const NodeManager = require('../../../core/NodeManager.js');
const zkRoutes = require('../../../features/zk-proofs/zkController.js');
const ConsentContract = require('../../../features/consent-management/ConsentContract.js');

describe('ZK Proofs Controller API', () => {
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
    aiModels: [],
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

    const PatientContract = require('../../../features/data-storage/PatientContract.js');
    const ClinicianContract = require('../../../features/data-storage/ClinicianContract.js');
    const patientContract = new PatientContract(blockchain);
    const clinicianContract = new ClinicianContract(blockchain);

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

    // Grant consent for testing
    const contract = new ConsentContract(blockchain);
    contract.grantConsent(
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

    app.locals.blockchain = blockchain;
    app.locals.nodeManager = nodeManager;
    app.locals.patientContract = patientContract;
    app.locals.clinicianContract = clinicianContract;

    app.use('/api/zk', zkRoutes);
  });

  afterEach(() => {
    if (app && app.listeners) {
      app.removeAllListeners();
    }
  });

  describe('POST /api/zk/consent-proof', () => {
    test('should generate consent proof successfully', async () => {
      const response = await request(app)
        .post('/api/zk/consent-proof')
        .send({
          patientId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
          clinicianId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
          consentType: 'Data Access'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('proof');
      expect(response.body.data.proof).toHaveProperty('commitment');
      expect(response.body.data.proof).toHaveProperty('verificationKey');
      expect(response.body.data.proof).toHaveProperty('valid');
      // Should not reveal sensitive data
      expect(response.body.data.proof.patientId).toBeUndefined();
      expect(response.body.data.proof.clinicianId).toBeUndefined();
      expect(response.body.data.proof.consentType).toBeUndefined();
    });

    test('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/zk/consent-proof')
        .send({
          patientId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11'
          // Missing clinicianId and consentType
        });

      expect(response.status).toBe(400);
    });

    test('should return 400 for invalid patient ID', async () => {
      const response = await request(app)
        .post('/api/zk/consent-proof')
        .send({
          patientId: 'invalid-id',
          clinicianId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
          consentType: 'Data Access'
        });

      expect(response.status).toBe(400);
    });

    test('should generate consent proof using consentId', async () => {
      // Get consentId from the granted consent
      const consentTx = blockchain.searchTransactions({
        to: 'consent-contract',
        'data.action': 'grant'
      });
      expect(consentTx.length).toBeGreaterThan(0);
      const consentId = consentTx[0].data.consentId;

      const response = await request(app)
        .post('/api/zk/consent-proof')
        .send({
          consentId: consentId
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('proof');
      expect(response.body.data.proof).toHaveProperty('commitment');
      expect(response.body.data.proof).toHaveProperty('verificationKey');
      expect(response.body.data.proof).toHaveProperty('valid');
      // Should not reveal sensitive data
      expect(response.body.data.proof.patientId).toBeUndefined();
      expect(response.body.data.proof.clinicianId).toBeUndefined();
      expect(response.body.data.proof.consentType).toBeUndefined();
    });

    test('should return 400 for invalid consentId', async () => {
      const response = await request(app)
        .post('/api/zk/consent-proof')
        .send({
          consentId: 'non-existent-consent-id'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/zk/verify-consent', () => {
    let proof;

    beforeEach(async () => {
      const proofResponse = await request(app)
        .post('/api/zk/consent-proof')
        .send({
          patientId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
          clinicianId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
          consentType: 'Data Access'
        });
      expect(proofResponse.status).toBe(200);
      expect(proofResponse.body.data).toHaveProperty('proof');
      proof = proofResponse.body.data.proof;
    });

    test('should verify valid consent proof', async () => {
      const response = await request(app)
        .post('/api/zk/verify-consent')
        .send({ proof });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('valid');
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data).toHaveProperty('hasConsent');
    });

    test('should reject invalid proof', async () => {
      const invalidProof = {
        commitment: 'invalid',
        verificationKey: 'invalid',
        salt: 'invalid',
        valid: true
      };

      const response = await request(app)
        .post('/api/zk/verify-consent')
        .send({ proof: invalidProof });

      expect(response.status).toBe(200);
      expect(response.body.data.valid).toBe(false);
    });

    test('should return 400 for missing proof', async () => {
      const response = await request(app)
        .post('/api/zk/verify-consent')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/zk/permission-proof', () => {
    test('should generate permission proof successfully', async () => {
      const response = await request(app)
        .post('/api/zk/permission-proof')
        .send({
          userId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
          permissions: ['read', 'write']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('proof');
      expect(response.body.data.proof).toHaveProperty('commitment');
      expect(response.body.data.proof).toHaveProperty('permissions');
      expect(response.body.data.proof).toHaveProperty('hasPermissions');
      // Should not reveal user ID
      expect(response.body.data.proof.userId).toBeUndefined();
    });

    test('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/zk/permission-proof')
        .send({
          userId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11'
          // Missing permissions
        });

      expect(response.status).toBe(400);
    });

    test('should return 400 for empty permissions array', async () => {
      const response = await request(app)
        .post('/api/zk/permission-proof')
        .send({
          userId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
          permissions: []
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/zk/verify-permission', () => {
    let proof;

    beforeEach(async () => {
      const proofResponse = await request(app)
        .post('/api/zk/permission-proof')
        .send({
          userId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
          permissions: ['read', 'write', 'admin']
        });
      expect(proofResponse.status).toBe(200);
      expect(proofResponse.body.data).toHaveProperty('proof');
      proof = proofResponse.body.data.proof;
    });


    test('should return 400 for missing proof', async () => {
      const response = await request(app)
        .post('/api/zk/verify-permission')
        .send({
          requiredPermissions: ['read']
        });

      expect(response.status).toBe(400);
    });

    test('should return 400 for empty required permissions', async () => {
      const response = await request(app)
        .post('/api/zk/verify-permission')
        .send({
          proof,
          requiredPermissions: []
        });

      expect(response.status).toBe(400);
    });
  });
});

