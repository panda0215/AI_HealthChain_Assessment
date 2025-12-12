/**
 * Consensus Service
 * 
 * This service provides business logic for consensus operations.
 */

const ConsensusEngine = require('./ConsensusEngine.js');

class ConsensusService {
  constructor(blockchain, nodeManager) {
    this.engine = new ConsensusEngine(blockchain, nodeManager);
    this.blockchain = blockchain;
    this.nodeManager = nodeManager;
  }

  /**
   * Propose block
   * 
   * @param {Array} transactions - Transactions to include (optional, uses pending if not provided)
   * @returns {Promise<Object>} Consensus result
   */
  async proposeBlock(transactions = null) {
    // Use pending transactions if none provided or if empty array is passed
    let txs;
    if (transactions === null || transactions === undefined) {
      txs = this.blockchain.pendingTransactions;
    } else if (Array.isArray(transactions) && transactions.length === 0) {
      // Empty array means use pending transactions
      txs = this.blockchain.pendingTransactions;
    } else {
      txs = transactions;
    }

    if (!Array.isArray(txs) || txs.length === 0) {
      throw new Error('No transactions to propose');
    }

    // Call engine
    const result = await this.engine.proposeBlock(txs);
    
    return result;
  }

  /**
   * Validate block
   * 
   * @param {Object} blockProposal - Block proposal to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateBlock(blockProposal) {
    if (!blockProposal) {
      throw new Error('blockProposal is required');
    }

    // Call engine
    const isValid = this.engine.validateBlockProposal(blockProposal);
    
    return {
      valid: isValid,
      blockHash: blockProposal.hash || null
    };
  }

  /**
   * Vote on block
   * 
   * @param {string} blockHash - Hash of proposed block
   * @param {boolean} isValid - Whether block is valid
   * @returns {Promise<Object>} Vote result
   */
  async voteOnBlock(blockHash, isValid) {
    if (!blockHash) {
      throw new Error('blockHash is required');
    }

    if (typeof isValid !== 'boolean') {
      throw new Error('isValid must be a boolean');
    }

    // Call engine
    const result = this.engine.voteOnBlock(blockHash, isValid);
    
    return {
      ...result,
      voteRecorded: true
    };
  }

  /**
   * Sync chain
   * 
   * @param {Array} networkChains - Chains from other nodes (optional)
   * @returns {Promise<Object>} Sync result
   */
  async syncChain(networkChains = null) {
    // Call engine
    const result = await this.engine.syncChain(networkChains);
    
    return result;
  }

  /**
   * Check consensus status
   * 
   * @param {string} blockHash - Block hash to check
   * @returns {Object} Consensus status
   */
  checkConsensus(blockHash) {
    if (!blockHash) {
      throw new Error('blockHash is required');
    }

    return this.engine.checkConsensus(blockHash);
  }

  /**
   * Handle node failure
   * 
   * @param {string} nodeId - Failed node ID
   * @returns {Object} Result
   */
  handleNodeFailure(nodeId) {
    if (!nodeId) {
      throw new Error('nodeId is required');
    }

    return this.engine.handleNodeFailure(nodeId);
  }
}

module.exports = ConsensusService;


