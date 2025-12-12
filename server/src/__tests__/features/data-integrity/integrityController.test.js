/**
 * Data Integrity Controller API Tests
 */

const request = require('supertest');
const express = require('express');
const cors = require('cors');
const Blockchain = require('../../../core/Blockchain.js');
const NodeManager = require('../../../core/NodeManager.js');
const integrityRoutes = require('../../../features/data-integrity/integrityController.js');

describe('Data Integrity Controller API', () => {
  let app;
  let blockchain;
  let nodeManager;
  const mockData = {
    patients: [],
    clinicians: [],
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

    app.locals.blockchain = blockchain;
    app.locals.nodeManager = nodeManager;
    app.locals.data = mockData;

    app.use('/api/integrity', integrityRoutes);
  });

  afterEach(() => {
    if (app && app.listeners) {
      app.removeAllListeners();
    }
  });

  describe('POST /api/integrity/tree', () => {
    test('should create Merkle tree successfully', async () => {
      const response = await request(app)
        .post('/api/integrity/tree')
        .send({
          records: ['record1', 'record2', 'record3']
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('root');
      expect(response.body.data).toHaveProperty('recordCount');
      expect(response.body.data.recordCount).toBe(3);
      expect(typeof response.body.data.root).toBe('string');
    });

    test('should return 400 for empty records array', async () => {
      const response = await request(app)
        .post('/api/integrity/tree')
        .send({
          records: []
        });

      expect(response.status).toBe(400);
    });

    test('should return 400 for missing records', async () => {
      const response = await request(app)
        .post('/api/integrity/tree')
        .send({});

      expect(response.status).toBe(400);
    });

    test('should handle single record', async () => {
      const response = await request(app)
        .post('/api/integrity/tree')
        .send({
          records: ['single-record']
        });

      expect(response.status).toBe(201);
      expect(response.body.data.recordCount).toBe(1);
    });

    test('should handle object records', async () => {
      const response = await request(app)
        .post('/api/integrity/tree')
        .send({
          records: [
            { id: '1', diagnosis: 'Hypertension' },
            { id: '2', diagnosis: 'Diabetes' }
          ]
        });

      expect(response.status).toBe(201);
      expect(response.body.data.recordCount).toBe(2);
    });

    test('should store root on chain when requested', async () => {
      const response = await request(app)
        .post('/api/integrity/tree')
        .send({
          records: ['record1', 'record2'],
          storeOnChain: true,
          description: 'Test tree'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.transaction).toBeTruthy();
    });
  });

  describe('POST /api/integrity/proof', () => {
    let root;

    beforeEach(async () => {
      const treeResponse = await request(app)
        .post('/api/integrity/tree')
        .send({
          records: ['record1', 'record2', 'record3']
        });
      root = treeResponse.body.data.root;
    });

    test('should generate proof successfully', async () => {
      const response = await request(app)
        .post('/api/integrity/proof')
        .send({
          record: 'record1',
          root
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('proof');
      expect(response.body.data.proof).toHaveProperty('leaf');
      expect(response.body.data.proof).toHaveProperty('path');
      expect(response.body.data.proof).toHaveProperty('root');
    });

    test('should return 400 for missing record', async () => {
      const response = await request(app)
        .post('/api/integrity/proof')
        .send({
          root
        });

      expect(response.status).toBe(400);
    });

    test('should return 400 for missing root', async () => {
      const response = await request(app)
        .post('/api/integrity/proof')
        .send({
          record: 'record1'
        });

      expect(response.status).toBe(400);
    });

    test('should handle object records', async () => {
      const treeResponse = await request(app)
        .post('/api/integrity/tree')
        .send({
          records: [
            { id: '1', data: 'test1' },
            { id: '2', data: 'test2' }
          ]
        });

      const response = await request(app)
        .post('/api/integrity/proof')
        .send({
          record: { id: '1', data: 'test1' },
          root: treeResponse.body.data.root
        });

      expect(response.status).toBe(200);
      expect(response.body.data.proof).toBeTruthy();
    });
  });

  describe('POST /api/integrity/verify', () => {
    let root, proof;

    beforeEach(async () => {
      const treeResponse = await request(app)
        .post('/api/integrity/tree')
        .send({
          records: ['record1', 'record2', 'record3']
        });
      root = treeResponse.body.data.root;

      const proofResponse = await request(app)
        .post('/api/integrity/proof')
        .send({
          record: 'record1',
          root
        });
      proof = proofResponse.body.data.proof;
    });

    test('should verify valid proof', async () => {
      const response = await request(app)
        .post('/api/integrity/verify')
        .send({
          record: 'record1',
          proof,
          root
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
    });

    test('should reject invalid proof', async () => {
      const response = await request(app)
        .post('/api/integrity/verify')
        .send({
          record: 'tampered-record',
          proof,
          root
        });

      expect(response.status).toBe(200);
      expect(response.body.data.valid).toBe(false);
    });

    test('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/integrity/verify')
        .send({
          record: 'record1'
          // Missing proof and root
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/integrity/verify-batch', () => {
    let root;

    beforeEach(async () => {
      const treeResponse = await request(app)
        .post('/api/integrity/tree')
        .send({
          records: ['record1', 'record2', 'record3', 'record4']
        });
      root = treeResponse.body.data.root;
    });

    test('should verify batch successfully', async () => {
      const proof1 = (await request(app)
        .post('/api/integrity/proof')
        .send({ record: 'record1', root })).body.data.proof;

      const proof2 = (await request(app)
        .post('/api/integrity/proof')
        .send({ record: 'record2', root })).body.data.proof;

      const response = await request(app)
        .post('/api/integrity/verify-batch')
        .send({
          records: [
            { data: 'record1', proof: proof1, root },
            { data: 'record2', proof: proof2, root }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('allValid');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('validCount');
      expect(response.body.data.allValid).toBe(true);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.validCount).toBe(2);
    });

    test('should detect invalid records in batch', async () => {
      const proof1 = (await request(app)
        .post('/api/integrity/proof')
        .send({ record: 'record1', root })).body.data.proof;

      const proof2 = (await request(app)
        .post('/api/integrity/proof')
        .send({ record: 'record2', root })).body.data.proof;

      const response = await request(app)
        .post('/api/integrity/verify-batch')
        .send({
          records: [
            { data: 'record1', proof: proof1, root },
            { data: 'tampered', proof: proof2, root }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.data.allValid).toBe(false);
      expect(response.body.data.invalidCount).toBe(1);
    });

    test('should return 400 for empty records', async () => {
      const response = await request(app)
        .post('/api/integrity/verify-batch')
        .send({
          records: []
        });

      expect(response.status).toBe(400);
    });
  });
});

