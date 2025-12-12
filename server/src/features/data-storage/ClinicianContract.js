/**
 * Clinician Contract - Smart Contract for Clinician Data Storage
 * 
 * This contract manages clinician records on the blockchain.
 * All clinician operations are stored immutably as blockchain transactions.
 */

class ClinicianContract {
  constructor(blockchain) {
    this.blockchain = blockchain;
    this.contractAddress = 'clinician-contract';
  }

  /**
   * Register a new clinician
   * 
   * @param {Object} clinicianData - Clinician data
   * @returns {Object} Transaction result
   */
  registerClinician(clinicianData) {
    if (!clinicianData.id || !clinicianData.firstName || !clinicianData.lastName) {
      throw new Error('Clinician ID, first name, and last name are required');
    }

    // Check if clinician already exists
    const existing = this.getClinician(clinicianData.id);
    if (existing) {
      throw new Error('Clinician already exists');
    }

    // Create clinician record
    const clinicianRecord = {
      action: 'register',
      clinicianId: clinicianData.id,
      data: clinicianData,
      timestamp: new Date().toISOString()
    };

    // Create blockchain transaction
    const transaction = this.blockchain.addTransaction({
      from: 'system',
      to: this.contractAddress,
      data: clinicianRecord
    });

    // Transaction stays in pending pool for consensus mechanism
    // Tests should mine explicitly when needed

    return {
      success: true,
      clinicianId: clinicianData.id,
      transaction: {
        id: transaction.id,
        timestamp: transaction.timestamp
      }
    };
  }

  /**
   * Get a clinician by ID
   * 
   * @param {string} clinicianId - Clinician ID
   * @returns {Object|null} Clinician record or null if not found
   */
  getClinician(clinicianId) {
    const transactions = this.blockchain.searchTransactions({
      to: this.contractAddress,
      'data.clinicianId': clinicianId,
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
   * Get all clinicians
   * 
   * @param {boolean} activeOnly - If true, only return active clinicians
   * @returns {Array} Array of all clinician records
   */
  getAllClinicians(activeOnly = false) {
    const transactions = this.blockchain.searchTransactions({
      to: this.contractAddress,
      'data.action': 'register'
    });

    // Use a Map to ensure uniqueness (in case of duplicates)
    const clinicianMap = new Map();
    
    transactions.forEach(tx => {
      const clinicianId = tx.data.clinicianId;
      if (!clinicianMap.has(clinicianId) || tx.blockTimestamp > clinicianMap.get(clinicianId).blockTimestamp) {
        clinicianMap.set(clinicianId, tx.data.data);
      }
    });

    let clinicians = Array.from(clinicianMap.values());
    
    if (activeOnly) {
      clinicians = clinicians.filter(c => c.isActive !== false);
    }

    return clinicians;
  }
}

module.exports = ClinicianContract;

