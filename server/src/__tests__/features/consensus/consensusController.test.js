/**
 * Consensus Controller API Tests
 */

const request = require('supertest');
const express = require('express');
const cors = require('cors');
const Blockchain = require('../../../core/Blockchain.js');
const NodeManager = require('../../../core/NodeManager.js');
const consensusRoutes = require('../../../features/consensus/consensusController.js');

describe('Consensus Controller API', () => {
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

    // Add more nodes for testing (so consensus requires more than 1 vote)
    nodeManager.addNode('node-2');
    nodeManager.addNode('node-3');

    app.locals.blockchain = blockchain;
    app.locals.nodeManager = nodeManager;
    app.locals.consensusService = new (require('../../../features/consensus/consensusService.js'))(blockchain, nodeManager);
    app.locals.data = {
      patients: [],
      clinicians: [],
      aiModels: [],
      medicalRecords: [],
      consentRecords: []
    };

    app.use('/api/consensus', consensusRoutes);
  });

  afterEach(() => {
    if (app && app.listeners) {
      app.removeAllListeners();
    }
  });

  describe('POST /api/consensus/propose', () => {
    beforeEach(() => {
      // Add some pending transactions
      blockchain.addTransaction({ from: 'a', to: 'b', data: { type: 'test' } });
      blockchain.addTransaction({ from: 'c', to: 'd', data: { type: 'test' } });
    });

    test('should propose block successfully', async () => {
      const response = await request(app)
        .post('/api/consensus/propose')
        .send({ transactions: [] }); // Empty array uses pending transactions

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('blockHash');
      expect(response.body.data).toHaveProperty('block');
      expect(response.body.data).toHaveProperty('consensusReached');
      expect(response.body.data).toHaveProperty('votes');
      expect(response.body.data).toHaveProperty('totalNodes');
    });

    test('should propose block with provided transactions', async () => {
      const response = await request(app)
        .post('/api/consensus/propose')
        .send({
          transactions: [
            { from: 'x', to: 'y', data: {} }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.data.block.transactions.length).toBeGreaterThan(0);
    });

    test('should return 400 for invalid transactions array', async () => {
      const response = await request(app)
        .post('/api/consensus/propose')
        .send({
          transactions: 'not-an-array'
        });

      expect(response.status).toBe(400);
    });

    test('should return 400 for empty transactions when none pending', async () => {
      // Clear pending transactions
      blockchain.pendingTransactions = [];

      const response = await request(app)
        .post('/api/consensus/propose')
        .send({ transactions: [] });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/consensus/vote', () => {

    test('should return 400 for missing blockHash', async () => {
      const response = await request(app)
        .post('/api/consensus/vote')
        .send({
          isValid: true
        });

      expect(response.status).toBe(400);
    });

    test('should return 400 for invalid isValid type', async () => {
      // Create a block for this specific test
      blockchain.addTransaction({ from: 'e', to: 'f', data: {} });
      const proposeResponse = await request(app)
        .post('/api/consensus/propose')
        .send({ transactions: [] });
      const blockHash = proposeResponse.body.data.blockHash;

      const response = await request(app)
        .post('/api/consensus/vote')
        .send({
          blockHash,
          isValid: 'yes' // Should be boolean
        });

      expect(response.status).toBe(400);
    });

    test('should return 404 for non-existent block', async () => {
      const response = await request(app)
        .post('/api/consensus/vote')
        .send({
          blockHash: 'non-existent-hash',
          isValid: true
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/consensus/pending-transactions', () => {
    test('should return pending transactions count and list', async () => {
      // Add some pending transactions
      blockchain.addTransaction({ from: 'a', to: 'b', data: { type: 'test1' } });
      blockchain.addTransaction({ from: 'c', to: 'd', data: { type: 'test2' } });

      const response = await request(app)
        .get('/api/consensus/pending-transactions');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('count');
      expect(response.body.data).toHaveProperty('transactions');
      expect(response.body.data.count).toBe(2);
      expect(Array.isArray(response.body.data.transactions)).toBe(true);
      expect(response.body.data.transactions.length).toBe(2);
    });

    test('should return empty list when no pending transactions', async () => {
      // Clear pending transactions
      blockchain.pendingTransactions = [];

      const response = await request(app)
        .get('/api/consensus/pending-transactions');

      expect(response.status).toBe(200);
      expect(response.body.data.count).toBe(0);
      expect(response.body.data.transactions.length).toBe(0);
    });
  });

  describe('POST /api/consensus/sync', () => {
    test('should sync chain successfully', async () => {
      const response = await request(app)
        .post('/api/consensus/sync')
        .send({
          networkChains: []
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('synced');
      expect(response.body.data).toHaveProperty('localChainLength');
    });

    test('should sync with provided network chains', async () => {
      const networkChain = [
        {
          index: 0,
          timestamp: Date.now(),
          transactions: [],
          previousHash: '0',
          hash: 'genesis',
          nonce: 0,
          merkleRoot: '0'
        }
      ];

      const response = await request(app)
        .post('/api/consensus/sync')
        .send({
          networkChains: [networkChain]
        });

      expect(response.status).toBe(200);
      expect(response.body.data.synced).toBe(true);
    });

    test('should handle sync without networkChains', async () => {
      const response = await request(app)
        .post('/api/consensus/sync')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.data.synced).toBe(true);
    });
  });
});

