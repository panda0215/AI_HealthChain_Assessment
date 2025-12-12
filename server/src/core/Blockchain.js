/**
 * Blockchain Core
 * 
 * Simple permissioned blockchain implementation.
 * Stores transactions in blocks with proof-of-work.
 */

const crypto = require('crypto');

class Blockchain {
  constructor() {
    this.chain = [];
    this.pendingTransactions = [];
    this.difficulty = 2; // For proof-of-work (simplified)
    this.miningReward = 0; // No mining rewards in permissioned blockchain
  }

  /**
   * Create the genesis block
   */
  createGenesisBlock() {
    // Don't create duplicate genesis blocks
    if (this.chain.length > 0) {
      return this.chain[0];
    }

    const genesisBlock = {
      index: 0,
      timestamp: Date.now(),
      transactions: [],
      previousHash: '0',
      hash: this.calculateHash(0, Date.now(), [], '0'),
      nonce: 0,
      merkleRoot: this.calculateMerkleRoot([])
    };
    
    this.chain.push(genesisBlock);
    return genesisBlock;
  }

  /**
   * Get the latest block in the chain
   */
  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  /**
   * Get the length of the chain
   */
  getChainLength() {
    return this.chain.length;
  }

  /**
   * Get total number of transactions
   */
  getTotalTransactions() {
    return this.chain.reduce((total, block) => total + block.transactions.length, 0);
  }

  /**
   * Add a new transaction to the pending pool
   */
  addTransaction(transaction) {
    if (!transaction.from || !transaction.to || !transaction.data) {
      throw new Error('Transaction must include from, to, and data fields');
    }

    // Validate transaction
    if (!this.isValidTransaction(transaction)) {
      throw new Error('Invalid transaction');
    }

    this.pendingTransactions.push({
      ...transaction,
      timestamp: Date.now(),
      id: crypto.randomUUID()
    });

    return this.pendingTransactions[this.pendingTransactions.length - 1];
  }

  /**
   * Mine pending transactions into a new block
   */
  minePendingTransactions(miningRewardAddress = null) {
    if (this.pendingTransactions.length === 0) {
      throw new Error('No pending transactions to mine');
    }

    const block = {
      index: this.chain.length,
      timestamp: Date.now(),
      transactions: [...this.pendingTransactions],
      previousHash: this.getLatestBlock().hash,
      nonce: 0,
      merkleRoot: null
    };

    // Calculate merkle root
    block.merkleRoot = this.calculateMerkleRoot(block.transactions);

    // Proof of work (simplified)
    block.hash = this.proofOfWork(block);

    // Add block to chain
    this.chain.push(block);

    // Clear pending transactions
    this.pendingTransactions = [];

    return block;
  }

  /**
   * Simple proof-of-work algorithm
   */
  proofOfWork(block) {
    let hash = this.calculateBlockHash(block);
    const target = '0'.repeat(this.difficulty);

    while (hash.substring(0, this.difficulty) !== target) {
      block.nonce++;
      hash = this.calculateBlockHash(block);
    }

    return hash;
  }

  /**
   * Calculate hash for a block
   */
  calculateBlockHash(block) {
    return this.calculateHash(
      block.index,
      block.timestamp,
      block.transactions,
      block.previousHash,
      block.nonce,
      block.merkleRoot
    );
  }

  /**
   * Calculate hash from data
   */
  calculateHash(...args) {
    const data = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join('');
    
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Calculate Merkle root from transactions
   */
  calculateMerkleRoot(transactions) {
    if (transactions.length === 0) {
      return crypto.createHash('sha256').update('').digest('hex');
    }

    if (transactions.length === 1) {
      return this.calculateHash(transactions[0]);
    }

    // Simple binary Merkle tree
    let tree = transactions.map(tx => this.calculateHash(tx));

    while (tree.length > 1) {
      const newTree = [];
      for (let i = 0; i < tree.length; i += 2) {
        if (i + 1 < tree.length) {
          newTree.push(this.calculateHash(tree[i] + tree[i + 1]));
        } else {
          newTree.push(tree[i]);
        }
      }
      tree = newTree;
    }

    return tree[0];
  }

  /**
   * Validate a transaction
   */
  isValidTransaction(transaction) {
    // Basic validation - in production, this would check signatures, permissions, etc.
    return transaction.from && transaction.to && transaction.data;
  }

  /**
   * Validate the entire chain
   */
  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Check if current block hash is valid
      const currentHash = this.calculateBlockHash(currentBlock);
      if (currentBlock.hash !== currentHash) {
        return false;
      }

      // Check if previous hash matches
      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }

      // Validate Merkle root
      const calculatedMerkleRoot = this.calculateMerkleRoot(currentBlock.transactions);
      if (currentBlock.merkleRoot !== calculatedMerkleRoot) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get a block by index
   */
  getBlock(index) {
    return this.chain[index] || null;
  }

  /**
   * Get all blocks
   */
  getAllBlocks() {
    return this.chain;
  }

  /**
   * Search for transactions by criteria
   */
  searchTransactions(criteria) {
    const results = [];
    
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        let matches = true;
        
        for (const [key, value] of Object.entries(criteria)) {
          // Handle nested properties like 'data.action'
          const keys = key.split('.');
          let txValue = tx;
          for (const k of keys) {
            if (txValue && typeof txValue === 'object' && k in txValue) {
              txValue = txValue[k];
            } else {
              txValue = undefined;
              break;
            }
          }
          
          if (txValue !== value) {
            matches = false;
            break;
          }
        }
        
        if (matches) {
          results.push({
            ...tx,
            blockIndex: block.index,
            blockHash: block.hash,
            blockTimestamp: block.timestamp
          });
        }
      }
    }
    
    return results;
  }
}

module.exports = Blockchain;

