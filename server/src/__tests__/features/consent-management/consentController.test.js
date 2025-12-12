/**
 * Consent Controller API Tests
 */

const request = require('supertest');
const express = require('express');
const cors = require('cors');
const Blockchain = require('../../../core/Blockchain.js');
const NodeManager = require('../../../core/NodeManager.js');
const PatientContract = require('../../../features/data-storage/PatientContract.js');
const ClinicianContract = require('../../../features/data-storage/ClinicianContract.js');
const consentRoutes = require('../../../features/consent-management/consentController.js');

describe('Consent Controller API', () => {
  let app;
  let blockchain;
  let nodeManager;
  let patientContract;
  let clinicianContract;

  beforeEach(() => {
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    blockchain = new Blockchain();
    blockchain.createGenesisBlock();
    nodeManager = new NodeManager(blockchain);

    patientContract = new PatientContract(blockchain);
    clinicianContract = new ClinicianContract(blockchain);

    // Register test patients and clinicians
    patientContract.registerPatient({
      id: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
      firstName: 'Test',
      lastName: 'Patient 1',
      name: 'Test Patient 1'
    });
    patientContract.registerPatient({
      id: 'b84b734g-5b2e-528e-b39b-bfc56b8cfc22',
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
      id: 'b47gb5gc-d68b-539d-bgc1-5268e69e4f76',
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

    app.use('/api/consent', consentRoutes);
  });

  afterEach(() => {
    if (app && app.listeners) {
      app.removeAllListeners();
    }
  });

  describe('POST /api/consent/grant', () => {
    test('should grant consent successfully', async () => {
      const response = await request(app)
        .post('/api/consent/grant')
        .send({
          patientId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
          clinicianId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
          consentType: 'Data Access',
          purpose: 'Treatment'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('consentId');
      expect(response.body.data.patientId).toBe('a73a623f-4a1d-417d-a29a-aeb45a7beb11');
    });

    test('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/consent/grant')
        .send({
          patientId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11'
          // Missing clinicianId and consentType
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should return 400 for invalid patient ID', async () => {
      const response = await request(app)
        .post('/api/consent/grant')
        .send({
          patientId: 'invalid-id',
          clinicianId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
          consentType: 'Data Access'
        });

      expect(response.status).toBe(400);
    });

    test('should return 400 for invalid consent type', async () => {
      const response = await request(app)
        .post('/api/consent/grant')
        .send({
          patientId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
          clinicianId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
          consentType: 'Invalid Type'
        });

      expect(response.status).toBe(400);
    });

    test('should handle expiration date', async () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const response = await request(app)
        .post('/api/consent/grant')
        .send({
          patientId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
          clinicianId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
          consentType: 'AI Analysis', // Use different consent type to avoid conflict
          expiresAt
        });

      expect(response.status).toBe(201);
      expect(response.body.data.expiresAt).toBe(expiresAt);
    });
  });


  describe('GET /api/consent/check/:patientId/:clinicianId/:type', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/consent/grant')
        .send({
          patientId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
          clinicianId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
          consentType: 'Data Access'
        });
      // Mine consent transaction so it's available for queries
      // The grant creates a pending transaction that needs to be mined
      // We must mine it so searchTransactions can find it
      expect(blockchain.pendingTransactions.length).toBeGreaterThan(0);
      blockchain.minePendingTransactions();
    });

    test('should check consent successfully', async () => {
      const response = await request(app)
        .get('/api/consent/check/a73a623f-4a1d-417d-a29a-aeb45a7beb11/a36fa4fb-c57a-428c-afb0-4157d58b3e65/Data%20Access');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('hasConsent');
      expect(response.body.data.hasConsent).toBe(true);
    });

    test('should return false for non-existent consent', async () => {
      const response = await request(app)
        .get('/api/consent/check/a73a623f-4a1d-417d-a29a-aeb45a7beb11/c47c623f-4a1d-417d-a29a-aeb45a7beb12/Data%20Access');

      expect(response.status).toBe(200);
      expect(response.body.data.hasConsent).toBe(false);
    });

    test('should return 400 for invalid UUID', async () => {
      const response = await request(app)
        .get('/api/consent/check/invalid-id/a36fa4fb-c57a-428c-afb0-4157d58b3e65/Data%20Access');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/consent/history/:patientId', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/consent/grant')
        .send({
          patientId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
          clinicianId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
          consentType: 'Data Access'
        });
      // Mine consent transaction so it's available for queries
      // The grant creates a pending transaction that needs to be mined
      // We must mine it so searchTransactions can find it
      expect(blockchain.pendingTransactions.length).toBeGreaterThan(0);
      blockchain.minePendingTransactions();
    });

    test('should get consent history', async () => {
      const response = await request(app)
        .get('/api/consent/history/a73a623f-4a1d-417d-a29a-aeb45a7beb11');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('patientId');
      expect(response.body.data).toHaveProperty('history');
      expect(Array.isArray(response.body.data.history)).toBe(true);
      expect(response.body.data.history.length).toBeGreaterThan(0);
    });

    test('should return empty history for patient with no consents', async () => {
      const response = await request(app)
        .get('/api/consent/history/b84b734g-5b2e-528e-b39b-bfc56b8cfc22');

      expect(response.status).toBe(200);
      expect(response.body.data.history).toEqual([]);
    });
  });

  describe('GET /api/consent/active/:patientId', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/consent/grant')
        .send({
          patientId: 'a73a623f-4a1d-417d-a29a-aeb45a7beb11',
          clinicianId: 'a36fa4fb-c57a-428c-afb0-4157d58b3e65',
          consentType: 'Data Access'
        });
    });

    test('should get active consents', async () => {
      const response = await request(app)
        .get('/api/consent/active/a73a623f-4a1d-417d-a29a-aeb45a7beb11');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('patientId');
      expect(response.body.data).toHaveProperty('activeConsents');
      expect(Array.isArray(response.body.data.activeConsents)).toBe(true);
    });

  });
});

