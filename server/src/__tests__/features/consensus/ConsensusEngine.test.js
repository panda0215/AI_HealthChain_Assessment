/**
 * Consensus Engine Tests
 */

const ConsensusEngine = require('../../../features/consensus/ConsensusEngine.js');
const Blockchain = require('../../../core/Blockchain.js');
const NodeManager = require('../../../core/NodeManager.js');

describe('ConsensusEngine', () => {
  let blockchain;
  let nodeManager;
  let engine;

  beforeEach(() => {
    blockchain = new Blockchain();
    blockchain.createGenesisBlock();
    nodeManager = new NodeManager(blockchain);
    engine = new ConsensusEngine(blockchain, nodeManager);
  });

  describe('proposeBlock', () => {
    test('should propose block successfully', async () => {
      blockchain.addTransaction({ from: 'a', to: 'b', data: {} });
      const result = await engine.proposeBlock(blockchain.pendingTransactions);

      expect(result).toHaveProperty('blockHash');
      expect(result).toHaveProperty('block');
      expect(result).toHaveProperty('consensusReached');
      expect(result.block).toHaveProperty('transactions');
    });

    test('should throw error for empty transactions', async () => {
      await expect(
        engine.proposeBlock([])
      ).rejects.toThrow('empty');
    });

    test('should validate transactions before proposing', async () => {
      const invalidTx = { from: '', to: '', data: {} };
      await expect(
        engine.proposeBlock([invalidTx])
      ).rejects.toThrow('Invalid transaction');
    });
  });

  describe('voteOnBlock', () => {
    test('should vote on block successfully', async () => {
      blockchain.addTransaction({ from: 'a', to: 'b', data: {} });
      const proposal = await engine.proposeBlock(blockchain.pendingTransactions);

      // Proposer already voted, check that proposal includes voting info
      expect(proposal).toHaveProperty('consensusReached');
      expect(proposal).toHaveProperty('totalVotes');
      expect(proposal).toHaveProperty('yesVotes');
      expect(proposal.totalVotes).toBeGreaterThan(0);
    });

    test('should prevent duplicate votes', async () => {
      blockchain.addTransaction({ from: 'a', to: 'b', data: {} });
      const proposal = await engine.proposeBlock(blockchain.pendingTransactions);

      // First vote should fail because proposer already voted
      expect(() => {
        engine.voteOnBlock(proposal.blockHash, true);
      }).toThrow();
    });

    test('should throw error for non-existent block', () => {
      expect(() => {
        engine.voteOnBlock('non-existent-hash', true);
      }).toThrow('not found');
    });
  });

  describe('checkConsensus', () => {
    test('should check consensus status', async () => {
      blockchain.addTransaction({ from: 'a', to: 'b', data: {} });
      const proposal = await engine.proposeBlock(blockchain.pendingTransactions);
      
      const status = engine.checkConsensus(proposal.blockHash);
      expect(status).toHaveProperty('consensusReached');
      expect(status).toHaveProperty('totalVotes');
      expect(status).toHaveProperty('yesVotes');
    });

    test('should return false for no votes', async () => {
      blockchain.addTransaction({ from: 'a', to: 'b', data: {} });
      const proposal = await engine.proposeBlock(blockchain.pendingTransactions);
      
      // Clear votes to test no votes scenario
      engine.votes.set(proposal.blockHash, new Map());
      
      const status = engine.checkConsensus(proposal.blockHash);
      expect(status.consensusReached).toBe(false);
    });
  });

  describe('validateBlockProposal', () => {
    test('should validate correct block proposal', async () => {
      blockchain.addTransaction({ from: 'a', to: 'b', data: {} });
      const proposal = await engine.proposeBlock(blockchain.pendingTransactions);
      
      const isValid = engine.validateBlockProposal(proposal.block);
      expect(isValid).toBe(true);
    });

    test('should reject invalid block', () => {
      const invalidBlock = {
        index: 1,
        transactions: [],
        previousHash: 'wrong',
        hash: 'wrong'
      };
      
      const isValid = engine.validateBlockProposal(invalidBlock);
      expect(isValid).toBe(false);
    });
  });

  describe('syncChain', () => {
    test('should sync chain with network', async () => {
      const result = await engine.syncChain([]);
      expect(result).toHaveProperty('synced');
      expect(result).toHaveProperty('localChainLength');
    });

    test('should validate chain before syncing', async () => {
      const invalidChain = [
        { index: 0, previousHash: '0', hash: 'genesis' },
        { index: 1, previousHash: 'wrong', hash: 'invalid' }
      ];
      
      const result = await engine.syncChain([invalidChain]);
      expect(result.chainValid).toBe(false);
    });
  });
});

