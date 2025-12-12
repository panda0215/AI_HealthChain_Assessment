/**
 * Consensus Service Tests
 */

const ConsensusService = require('../../../features/consensus/consensusService.js');
const Blockchain = require('../../../core/Blockchain.js');
const NodeManager = require('../../../core/NodeManager.js');

describe('ConsensusService', () => {
  let blockchain;
  let nodeManager;
  let service;

  beforeEach(() => {
    blockchain = new Blockchain();
    blockchain.createGenesisBlock();
    nodeManager = new NodeManager(blockchain);
    service = new ConsensusService(blockchain, nodeManager);
  });

  describe('proposeBlock', () => {
    beforeEach(() => {
      blockchain.addTransaction({ from: 'a', to: 'b', data: {} });
    });

    test('should propose block successfully', async () => {
      const result = await service.proposeBlock();

      expect(result).toHaveProperty('blockHash');
      expect(result).toHaveProperty('block');
      expect(result).toHaveProperty('consensusReached');
      expect(result.block).toHaveProperty('transactions');
    });

    test('should propose block with provided transactions', async () => {
      const transactions = [{ from: 'x', to: 'y', data: {} }];
      const result = await service.proposeBlock(transactions);

      expect(result.block.transactions.length).toBeGreaterThan(0);
    });

    test('should throw error for empty transactions', async () => {
      blockchain.pendingTransactions = [];
      await expect(
        service.proposeBlock([])
      ).rejects.toThrow('No transactions');
    });
  });

  describe('validateBlock', () => {
    test('should validate block successfully', async () => {
      blockchain.addTransaction({ from: 'a', to: 'b', data: {} });
      const proposal = await service.proposeBlock();
      
      const result = await service.validateBlock(proposal.block);
      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(true);
    });

    test('should reject invalid block', async () => {
      const invalidBlock = {
        index: 1,
        transactions: [],
        previousHash: 'wrong',
        hash: 'wrong'
      };

      const result = await service.validateBlock(invalidBlock);
      expect(result.valid).toBe(false);
    });
  });

  describe('voteOnBlock', () => {
    let blockHash;

    beforeEach(async () => {
      blockchain.addTransaction({ from: 'a', to: 'b', data: {} });
      const proposal = await service.proposeBlock();
      blockHash = proposal.blockHash;
    });

    test('should vote on block successfully', async () => {
      // Add more transactions and create another proposal
      blockchain.addTransaction({ from: 'c', to: 'd', data: {} });
      const proposal = await service.proposeBlock();
      expect(proposal).toHaveProperty('consensusReached');
      expect(proposal).toHaveProperty('totalVotes');
      expect(proposal.totalVotes).toBeGreaterThan(0);
    });

    test('should throw error for non-existent block', async () => {
      await expect(
        service.voteOnBlock('non-existent-hash', true)
      ).rejects.toThrow('not found');
    });
  });

  describe('syncChain', () => {
    test('should sync chain successfully', async () => {
      const result = await service.syncChain(null);

      expect(result).toHaveProperty('synced');
      expect(result).toHaveProperty('localChainLength');
      expect(result.synced).toBe(true);
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

      const result = await service.syncChain([networkChain]);
      expect(result.synced).toBe(true);
    });
  });
});

