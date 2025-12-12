/**
 * Medical Record Contract - Smart Contract for Medical Record Storage
 * 
 * This contract manages medical records on the blockchain.
 * All medical record operations are stored immutably as blockchain transactions.
 */

class MedicalRecordContract {
  constructor(blockchain) {
    this.blockchain = blockchain;
    this.contractAddress = 'medical-record-contract';
  }

  /**
   * Register a new medical record
   * 
   * @param {Object} recordData - Medical record data
   * @returns {Object} Transaction result
   */
  registerMedicalRecord(recordData) {
    if (!recordData.id || !recordData.patientId) {
      throw new Error('Medical record ID and patient ID are required');
    }

    // Check if record already exists
    const existing = this.getMedicalRecord(recordData.id);
    if (existing) {
      throw new Error('Medical record already exists');
    }

    // Create medical record
    const record = {
      action: 'register',
      recordId: recordData.id,
      patientId: recordData.patientId,
      data: recordData,
      timestamp: new Date().toISOString()
    };

    // Create blockchain transaction
    const transaction = this.blockchain.addTransaction({
      from: 'system',
      to: this.contractAddress,
      data: record
    });

    // Mine the transaction immediately so it's available for querying
    this.blockchain.minePendingTransactions();

    return {
      success: true,
      recordId: recordData.id,
      transaction: {
        id: transaction.id,
        timestamp: transaction.timestamp
      }
    };
  }

  /**
   * Get a medical record by ID
   * 
   * @param {string} recordId - Medical record ID
   * @returns {Object|null} Medical record or null if not found
   */
  getMedicalRecord(recordId) {
    const transactions = this.blockchain.searchTransactions({
      to: this.contractAddress,
      'data.recordId': recordId,
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
   * Get all medical records
   * 
   * @param {string} patientId - Optional patient ID to filter by
   * @returns {Array} Array of all medical records
   */
  getAllMedicalRecords(patientId = null) {
    const searchCriteria = {
      to: this.contractAddress,
      'data.action': 'register'
    };

    if (patientId) {
      searchCriteria['data.patientId'] = patientId;
    }

    const transactions = this.blockchain.searchTransactions(searchCriteria);

    // Use a Map to ensure uniqueness (in case of duplicates)
    const recordMap = new Map();
    
    transactions.forEach(tx => {
      const recordId = tx.data.recordId;
      if (!recordMap.has(recordId) || tx.blockTimestamp > recordMap.get(recordId).blockTimestamp) {
        recordMap.set(recordId, tx.data.data);
      }
    });

    return Array.from(recordMap.values());
  }
}

module.exports = MedicalRecordContract;

