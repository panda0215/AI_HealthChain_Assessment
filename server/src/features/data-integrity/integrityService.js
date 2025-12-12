/**
 * Data Integrity Service
 * 
 * Handles Merkle tree creation, proof generation, and verification.
 * Caches trees and records for faster access.
 */

const MerkleTree = require('./MerkleTree.js');
const { isValidUUID } = require('../../utils/helpers.js');

class IntegrityService {
  constructor(blockchain, medicalRecordContract) {
    this.blockchain = blockchain;
    this.medicalRecordContract = medicalRecordContract;
    this.treeCache = new Map(); // Cache trees by root hash
    this.recordsCache = new Map(); // Cache records by root hash
  }

  /**
   * Create Merkle tree for a batch of records
   * 
   * @param {Array} records - Array of medical records
   * @param {Object} options - Options (storeOnChain, description)
   * @returns {Object} Merkle tree and root
   */
  async createMerkleTree(records, options = {}) {
    // Validate input
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error('Records array is required and must not be empty');
    }

    // Create Merkle tree from records
    const tree = new MerkleTree(records);
    const root = tree.getRoot();

    if (!root) {
      throw new Error('Failed to create Merkle tree');
    }

    // Cache the tree and records by root hash
    this.treeCache.set(root, tree);
    this.recordsCache.set(root, records);

    // Optionally store root on blockchain
    let transaction = null;
    if (options.storeOnChain !== false) {
      transaction = await this.storeRootOnChain(
        root,
        options.description || `Merkle root for ${records.length} records`,
        records.length
      );
    }

    return {
      root,
      recordCount: records.length,
      transaction: transaction || null
    };
  }

  /**
   * Generate proof for a specific record or hash
   * 
   * @param {Object|string} record - Medical record or hash (64 char hex string)
   * @param {string} root - Merkle root hash (to find the tree)
   * @returns {Object} Proof object
   */
  async generateProof(record, root) {
    if (!record) {
      throw new Error('Record or hash is required');
    }
    if (!root) {
      throw new Error('Root hash is required');
    }

    // Get tree from cache or reconstruct from cached records
    let tree = this.treeCache.get(root);
    
    if (!tree) {
      // Try to reconstruct from cached records
      const cachedRecords = this.recordsCache.get(root);
      
      if (!cachedRecords) {
        // Try to find from blockchain transaction
        const transactions = this.blockchain.searchTransactions({
          to: 'integrity-contract',
          'data.action': 'store-root',
          'data.root': root
        });

        if (transactions.length === 0) {
          throw new Error('Tree not found for the given root hash. Please create the tree first.');
        }

        throw new Error('Tree not found. Please create the tree first with the records.');
      }

      // Reconstruct tree from cached records
      tree = new MerkleTree(cachedRecords);
      this.treeCache.set(root, tree);
    }

    // Generate proof (can accept record object or hash)
    const proof = tree.getProof(record);
    
    // Determine record hash
    let recordHash;
    if (typeof record === 'string' && /^[a-f0-9]{64}$/i.test(record)) {
      recordHash = record.toLowerCase();
    } else {
      recordHash = tree.hash(record);
    }

    return {
      proof,
      root,
      recordHash
    };
  }

  /**
   * Verify record integrity
   * 
   * @param {Object} record - Medical record
   * @param {Object} proof - Merkle proof
   * @param {string} root - Expected root hash
   * @returns {boolean} True if valid
   */
  async verifyIntegrity(record, proof, root) {
    if (!record) {
      throw new Error('Record is required');
    }
    if (!proof) {
      throw new Error('Proof is required');
    }
    if (!root) {
      throw new Error('Root hash is required');
    }

    // Use MerkleTree static method to verify
    return MerkleTree.verifyProof(record, proof, root);
  }

  /**
   * Verify batch of records
   * 
   * @param {Array} records - Array of {data, proof, root} objects
   * @returns {Object} Verification results
   */
  async verifyBatch(records) {
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error('Records array is required and must not be empty');
    }

    // Validate each record has required fields
    const validRecords = records.map((item, index) => {
      if (!item.data) {
        throw new Error(`Record at index ${index} is missing data field`);
      }
      if (!item.proof) {
        throw new Error(`Record at index ${index} is missing proof field`);
      }
      return {
        data: item.data,
        proof: item.proof,
        root: item.root || item.proof.root
      };
    });

    // Verify all proofs
    const allValid = MerkleTree.verifyBatch(validRecords);

    // Individual results
    const results = validRecords.map((item, index) => ({
      index,
      valid: MerkleTree.verifyProof(item.data, item.proof, item.root)
    }));

    return {
      allValid,
      total: results.length,
      validCount: results.filter(r => r.valid).length,
      invalidCount: results.filter(r => !r.valid).length,
      results
    };
  }

  /**
   * Store Merkle root on blockchain
   * 
   * @param {string} root - Merkle root hash
   * @param {string} description - Description of what this root represents
   * @returns {Object} Transaction result
   */
  async storeRootOnChain(root, description, recordCount = 0) {
    if (!root) {
      throw new Error('Root hash is required');
    }

    // Create blockchain transaction
    const transaction = this.blockchain.addTransaction({
      from: 'system',
      to: 'integrity-contract',
      data: {
        action: 'store-root',
        root,
        description: description || 'Merkle root storage',
        recordCount: recordCount,
        timestamp: new Date().toISOString()
      }
    });

    // Transaction stays in pending pool for consensus mechanism
    // It will be mined when a block is proposed and consensus is reached

    return {
      success: true,
      root,
      transaction: {
        id: transaction.id,
        timestamp: transaction.timestamp
      }
    };
  }

  /**
   * Get all Merkle trees from blockchain
   * 
   * @returns {Array} Array of all Merkle tree records
   */
  getAllTrees() {
    // Find all tree creation transactions
    const transactions = this.blockchain.searchTransactions({
      to: 'integrity-contract',
      'data.action': 'store-root'
    });

    // Sort by timestamp (newest first)
    const sortedTransactions = transactions.sort((a, b) => b.blockTimestamp - a.blockTimestamp);

    // Format and return all tree records
    return sortedTransactions.map(tx => {
      // Try to get record count from cache if available
      const cachedRecords = this.recordsCache.get(tx.data.root);
      const recordCount = cachedRecords ? cachedRecords.length : (tx.data.recordCount || 0);
      
      return {
        root: tx.data.root,
        description: tx.data.description || 'No description',
        recordCount: recordCount,
        timestamp: new Date(tx.blockTimestamp).toISOString(),
        transactionId: tx.id,
        blockIndex: tx.blockIndex,
        blockHash: tx.blockHash
      };
    });
  }

  /**
   * Get records from a specific tree root (if available in cache)
   * 
   * @param {string} root - Merkle root hash
   * @returns {Array|null} Array of records or null if not found
   */
  getRecordsByRoot(root) {
    return this.recordsCache.get(root) || null;
  }
}

module.exports = IntegrityService;

