/**
 * Merkle Tree
 * 
 * Creates a binary tree structure for verifying data integrity.
 * Uses SHA-256 to hash data and build the tree.
 */

const crypto = require('crypto');

class MerkleTree {
  constructor(data = []) {
    this.leaves = [];
    this.root = null;
    this.levels = [];
    
    if (data.length > 0) {
      this.buildTree(data);
    }
  }

  /**
   * Normalize an object by sorting keys recursively
   * This ensures consistent hashing regardless of key order
   */
  normalizeObject(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.normalizeObject(item));
    }
    
    const normalized = {};
    const sortedKeys = Object.keys(obj).sort();
    
    for (const key of sortedKeys) {
      normalized[key] = this.normalizeObject(obj[key]);
    }
    
    return normalized;
  }

  /**
   * Hash a piece of data
   * 
   * @param {string|Object} data - Data to hash
   * @returns {string} Hash value (hex string)
   */
  hash(data) {
    let dataString;
    
    if (typeof data === 'string') {
      // Try to parse as JSON, if successful normalize it
      try {
        const parsed = JSON.parse(data);
        const normalized = this.normalizeObject(parsed);
        dataString = JSON.stringify(normalized);
      } catch (e) {
        // Not valid JSON, use as-is
        dataString = data;
      }
    } else {
      // Normalize object before stringifying
      const normalized = this.normalizeObject(data);
      dataString = JSON.stringify(normalized);
    }
    
    // Use SHA-256 and return hex string
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Build Merkle tree from data
   * 
   * @param {Array} data - Array of data items
   */
  buildTree(data) {
    if (data.length === 0) {
      this.root = null;
      this.levels = [];
      this.leaves = [];
      return;
    }

    // Hash all leaves
    this.leaves = data.map(item => this.hash(item));
    this.levels = [this.leaves]; // First level is the leaves

    // Build tree levels bottom-up
    let currentLevel = this.leaves;

    while (currentLevel.length > 1) {
      const nextLevel = [];

      // Process pairs
      for (let i = 0; i < currentLevel.length; i += 2) {
        if (i + 1 < currentLevel.length) {
          // Pair exists - hash both together
          const left = currentLevel[i];
          const right = currentLevel[i + 1];
          const combined = this.hash(left + right);
          nextLevel.push(combined);
        } else {
          // Odd number - duplicate last node
          const last = currentLevel[i];
          const combined = this.hash(last + last);
          nextLevel.push(combined);
        }
      }

      this.levels.push(nextLevel);
      currentLevel = nextLevel;
    }

    // Root is the last (and only) item in the top level
    this.root = currentLevel[0];
  }

  /**
   * Get Merkle root
   * 
   * @returns {string|null} Root hash or null if tree is empty
   */
  getRoot() {
    return this.root;
  }

  /**
   * Generate proof for a data item or hash
   * 
   * @param {string|Object} data - Data item to prove, or hash string
   * @returns {Object} Proof object with leaf, path, and root
   */
  getProof(data) {
    if (!this.root) {
      throw new Error('Tree is empty');
    }

    let leafHash;
    
    // Check if data is already a hash (64 char hex string)
    if (typeof data === 'string' && /^[a-f0-9]{64}$/i.test(data)) {
      // It's already a hash, use it directly
      leafHash = data.toLowerCase();
    } else {
      // Hash the data to find the leaf
      leafHash = this.hash(data);
    }
    
    // Find the index of the leaf
    const leafIndex = this.leaves.findIndex(hash => hash === leafHash);
    
    if (leafIndex === -1) {
      // Provide helpful error message
      const dataPreview = typeof data === 'string' 
        ? (data.length > 100 ? data.substring(0, 100) + '...' : data)
        : JSON.stringify(data).substring(0, 100);
      throw new Error(`Data item not found in tree. Make sure the record exactly matches one of the records used to create the tree. Searched for: ${dataPreview}`);
    }

    // Build proof path (sibling hashes and positions)
    const path = [];
    let currentIndex = leafIndex;
    let currentLevel = 0;

    // Traverse up the tree
    while (currentLevel < this.levels.length - 1) {
      const level = this.levels[currentLevel];
      const isLeft = currentIndex % 2 === 0;
      const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;

      if (siblingIndex < level.length) {
        // Sibling exists
        path.push({
          hash: level[siblingIndex],
          position: isLeft ? 'right' : 'left'
        });
      } else {
        // No sibling (odd number case) - use self
        path.push({
          hash: level[currentIndex],
          position: isLeft ? 'right' : 'left'
        });
      }

      // Move to parent level
      currentIndex = Math.floor(currentIndex / 2);
      currentLevel++;
    }

    return {
      leaf: leafHash,
      path: path,
      root: this.root
    };
  }

  /**
   * Verify a proof against root
   * 
   * @param {string|Object} data - Original data or hash (64 char hex string)
   * @param {Object} proof - Proof object with path and root
   * @param {string} root - Expected root hash (optional, uses proof.root if not provided)
   * @returns {boolean} True if proof is valid
   */
  static verifyProof(data, proof, root = null) {
    if (!proof || !proof.path || !proof.root) {
      return false;
    }

    const expectedRoot = root || proof.root;
    
    // Determine leaf hash
    let leafHash;
    if (data) {
      // Check if data is already a hash (64 char hex string)
      if (typeof data === 'string' && /^[a-f0-9]{64}$/i.test(data)) {
        leafHash = data.toLowerCase();
      } else {
        // Hash the data using normalized method
        const tempTree = new MerkleTree();
        leafHash = tempTree.hash(data);
      }
      
      // Verify the leaf hash matches the proof leaf
      if (leafHash.toLowerCase() !== proof.leaf.toLowerCase()) {
        return false;
      }
    } else {
      // No data provided, use proof leaf directly
      leafHash = proof.leaf.toLowerCase();
    }

    // Reconstruct the path up to root
    let currentHash = leafHash;

    for (const node of proof.path) {
      const siblingHash = node.hash.toLowerCase();
      if (node.position === 'left') {
        // Current hash is right child, node.hash is left child
        currentHash = crypto.createHash('sha256')
          .update(siblingHash + currentHash)
          .digest('hex');
      } else {
        // Current hash is left child, node.hash is right child
        currentHash = crypto.createHash('sha256')
          .update(currentHash + siblingHash)
          .digest('hex');
      }
    }

    // Compare final hash with expected root
    return currentHash.toLowerCase() === expectedRoot.toLowerCase();
  }

  /**
   * Verify multiple proofs in batch
   * 
   * @param {Array} proofs - Array of {data, proof, root} objects
   * @returns {boolean} True if all proofs are valid
   */
  static verifyBatch(proofs) {
    if (!Array.isArray(proofs) || proofs.length === 0) {
      return false;
    }

    // Verify each proof
    for (const item of proofs) {
      if (!item.data || !item.proof) {
        return false;
      }

      const isValid = MerkleTree.verifyProof(
        item.data,
        item.proof,
        item.root || item.proof.root
      );

      if (!isValid) {
        return false;
      }
    }

    return true;
  }
}

module.exports = MerkleTree;

