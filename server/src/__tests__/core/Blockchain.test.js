/**
 * Blockchain Core Tests
 */

const Blockchain = require('../../core/Blockchain.js');

describe('Blockchain', () => {
  let blockchain;

  beforeEach(() => {
    blockchain = new Blockchain();
  });

  describe('Genesis Block', () => {
    test('should create genesis block', () => {
      blockchain.createGenesisBlock();
      expect(blockchain.getChainLength()).toBe(1);
      expect(blockchain.getLatestBlock().index).toBe(0);
      expect(blockchain.getLatestBlock().previousHash).toBe('0');
    });

    test('should not create duplicate genesis blocks', () => {
      blockchain.createGenesisBlock();
      const initialLength = blockchain.getChainLength();
      blockchain.createGenesisBlock();
      expect(blockchain.getChainLength()).toBe(initialLength);
    });
  });

  describe('Transactions', () => {
    beforeEach(() => {
      blockchain.createGenesisBlock();
    });

    test('should add transaction to pending', () => {
      const transaction = {
        from: 'patient-1',
        to: 'clinician-1',
        data: { type: 'consent' }
      };
      blockchain.addTransaction(transaction);
      expect(blockchain.pendingTransactions.length).toBe(1);
    });

    test('should mine pending transactions', () => {
      blockchain.addTransaction({
        from: 'patient-1',
        to: 'clinician-1',
        data: { type: 'consent' }
      });
      blockchain.minePendingTransactions('miner-address');
      expect(blockchain.pendingTransactions.length).toBe(0);
      expect(blockchain.getChainLength()).toBe(2);
    });

    test('should calculate Merkle root correctly', () => {
      blockchain.addTransaction({ from: 'a', to: 'b', data: { test: 1 } });
      blockchain.addTransaction({ from: 'c', to: 'd', data: { test: 2 } });
      const root = blockchain.calculateMerkleRoot(blockchain.pendingTransactions);
      expect(root).toBeTruthy();
      expect(typeof root).toBe('string');
    });
  });

  describe('Chain Validation', () => {
    beforeEach(() => {
      blockchain.createGenesisBlock();
    });

    test('should validate valid chain', () => {
      blockchain.addTransaction({ from: 'a', to: 'b', data: {} });
      blockchain.minePendingTransactions('miner');
      expect(blockchain.isChainValid()).toBe(true);
    });

    test('should detect tampered chain', () => {
      blockchain.addTransaction({ from: 'a', to: 'b', data: {} });
      blockchain.minePendingTransactions('miner');
      // Tamper with transactions
      blockchain.chain[1].transactions[0].data = 'tampered';
      // Recalculate hash with tampered data
      blockchain.chain[1].hash = blockchain.calculateBlockHash(blockchain.chain[1]);
      expect(blockchain.isChainValid()).toBe(false);
    });
  });

  describe('Transaction Search', () => {
    beforeEach(() => {
      blockchain.createGenesisBlock();
    });

    test('should find transactions by from address', () => {
      blockchain.addTransaction({ from: 'patient-1', to: 'clinician-1', data: {} });
      blockchain.minePendingTransactions('miner');
      const results = blockchain.searchTransactions({ from: 'patient-1' });
      expect(results.length).toBeGreaterThan(0);
    });

    test('should find transactions by to address', () => {
      blockchain.addTransaction({ from: 'patient-1', to: 'clinician-1', data: {} });
      blockchain.minePendingTransactions('miner');
      const results = blockchain.searchTransactions({ to: 'clinician-1' });
      expect(results.length).toBeGreaterThan(0);
    });
  });
});

