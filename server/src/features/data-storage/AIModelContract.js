/**
 * AI Model Contract - Smart Contract for AI Model Data Storage
 * 
 * This contract manages AI model records on the blockchain.
 * All AI model operations are stored immutably as blockchain transactions.
 */

class AIModelContract {
  constructor(blockchain) {
    this.blockchain = blockchain;
    this.contractAddress = 'ai-model-contract';
  }

  /**
   * Register a new AI model
   * 
   * @param {Object} modelData - AI model data
   * @returns {Object} Transaction result
   */
  registerAIModel(modelData) {
    if (!modelData.id || !modelData.name) {
      throw new Error('AI Model ID and name are required');
    }

    // Check if model already exists
    const existing = this.getAIModel(modelData.id);
    if (existing) {
      throw new Error('AI Model already exists');
    }

    // Create AI model record
    const modelRecord = {
      action: 'register',
      modelId: modelData.id,
      data: modelData,
      timestamp: new Date().toISOString()
    };

    // Create blockchain transaction
    const transaction = this.blockchain.addTransaction({
      from: 'system',
      to: this.contractAddress,
      data: modelRecord
    });

    // Mine the transaction immediately so it's available for querying
    this.blockchain.minePendingTransactions();

    return {
      success: true,
      modelId: modelData.id,
      transaction: {
        id: transaction.id,
        timestamp: transaction.timestamp
      }
    };
  }

  /**
   * Get an AI model by ID
   * 
   * @param {string} modelId - AI Model ID
   * @returns {Object|null} AI Model record or null if not found
   */
  getAIModel(modelId) {
    const transactions = this.blockchain.searchTransactions({
      to: this.contractAddress,
      'data.modelId': modelId,
      'data.action': 'register'
    });

    if (transactions.length === 0) {
      return null;
    }

    // Get the most recent registration
    const sortedTransactions = transactions.sort((a, b) => b.blockTimestamp - a.blockTimestamp);
    return sortedTransactions[0].data.data;
  }

  /**
   * Get all AI models
   * 
   * @returns {Array} Array of all AI model records
   */
  getAllAIModels() {
    const transactions = this.blockchain.searchTransactions({
      to: this.contractAddress,
      'data.action': 'register'
    });

    // Use a Map to ensure uniqueness (in case of duplicates)
    const modelMap = new Map();
    
    transactions.forEach(tx => {
      const modelId = tx.data.modelId;
      if (!modelMap.has(modelId) || tx.blockTimestamp > modelMap.get(modelId).blockTimestamp) {
        modelMap.set(modelId, tx.data.data);
      }
    });

    return Array.from(modelMap.values());
  }
}

module.exports = AIModelContract;

