/**
 * Patient Contract - Smart Contract for Patient Data Storage
 * 
 * This contract manages patient records on the blockchain.
 * All patient operations are stored immutably as blockchain transactions.
 */

class PatientContract {
  constructor(blockchain) {
    this.blockchain = blockchain;
    this.contractAddress = 'patient-contract';
  }

  /**
   * Register a new patient
   * 
   * @param {Object} patientData - Patient data
   * @returns {Object} Transaction result
   */
  registerPatient(patientData) {
    if (!patientData.id || !patientData.firstName || !patientData.lastName) {
      throw new Error('Patient ID, first name, and last name are required');
    }

    // Check if patient already exists
    const existing = this.getPatient(patientData.id);
    if (existing) {
      throw new Error('Patient already exists');
    }

    // Create patient record
    const patientRecord = {
      action: 'register',
      patientId: patientData.id,
      data: patientData,
      timestamp: new Date().toISOString()
    };

    // Create blockchain transaction
    const transaction = this.blockchain.addTransaction({
      from: 'system',
      to: this.contractAddress,
      data: patientRecord
    });

    // Transaction stays in pending pool for consensus mechanism
    // Tests should mine explicitly when needed

    return {
      success: true,
      patientId: patientData.id,
      transaction: {
        id: transaction.id,
        timestamp: transaction.timestamp
      }
    };
  }

  /**
   * Get a patient by ID
   * 
   * @param {string} patientId - Patient ID
   * @returns {Object|null} Patient record or null if not found
   */
  getPatient(patientId) {
    const transactions = this.blockchain.searchTransactions({
      to: this.contractAddress,
      'data.patientId': patientId,
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
   * Get all patients
   * 
   * @returns {Array} Array of all patient records
   */
  getAllPatients() {
    const transactions = this.blockchain.searchTransactions({
      to: this.contractAddress,
      'data.action': 'register'
    });

    // Use a Map to ensure uniqueness (in case of duplicates)
    const patientMap = new Map();
    
    transactions.forEach(tx => {
      const patientId = tx.data.patientId;
      if (!patientMap.has(patientId) || tx.blockTimestamp > patientMap.get(patientId).blockTimestamp) {
        patientMap.set(patientId, tx.data.data);
      }
    });

    return Array.from(patientMap.values());
  }
}

module.exports = PatientContract;

