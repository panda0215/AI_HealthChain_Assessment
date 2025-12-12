/**
 * Consensus Controller
 * 
 * API endpoints for consensus mechanism:
 * - Propose blocks
 * - Vote on proposals
 * - Sync blockchain with network
 * - Get pending transactions
 */

const express = require('express');
const ConsensusService = require('./consensusService.js');
const { formatSuccess, formatError } = require('../../utils/helpers.js');

const router = express.Router();

// Service will be created by test setup or other initialization

/**
 * POST /api/consensus/propose
 * Propose a new block
 */
router.post('/propose', async (req, res, next) => {
  try {
    const { transactions } = req.body;

    // Transactions are optional - will use pending transactions if not provided
    // But validate if provided
    if (transactions !== undefined) {
      if (!Array.isArray(transactions)) {
        return res.status(400).json(formatError(
          new Error('transactions must be an array'),
          400
        ));
      }
    }

    // Call service
    const result = await req.app.locals.consensusService.proposeBlock(transactions);

    res.status(200).json(formatSuccess(result, 'Block proposed successfully'));
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('No transactions')) {
      return res.status(400).json(formatError(error, 400));
    }
    if (error.message.includes('Invalid transaction')) {
      return res.status(400).json(formatError(error, 400));
    }
    next(error);
  }
});

/**
 * POST /api/consensus/vote
 * Vote on a block proposal
 */
router.post('/vote', async (req, res, next) => {
  try {
    const { blockHash, isValid } = req.body;

    // Validate required fields
    if (!blockHash) {
      return res.status(400).json(formatError(
        new Error('blockHash is required'),
        400
      ));
    }

    if (typeof isValid !== 'boolean') {
      return res.status(400).json(formatError(
        new Error('isValid must be a boolean'),
        400
      ));
    }

    // Call service
    const result = await req.app.locals.consensusService.voteOnBlock(blockHash, isValid);

    res.status(200).json(formatSuccess(result, 'Vote recorded successfully'));
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('must be')) {
      return res.status(400).json(formatError(error, 400));
    }
    if (error.message.includes('not found') || error.message.includes('already voted')) {
      return res.status(404).json(formatError(error, 404));
    }
    if (error.message.includes('Cannot vote yes')) {
      return res.status(400).json(formatError(error, 400));
    }
    next(error);
  }
});

/**
 * POST /api/consensus/sync
 * Synchronize chain with network
 */
router.post('/sync', async (req, res, next) => {
  try {
    const { networkChains } = req.body;

    // Call service
    const result = await req.app.locals.consensusService.syncChain(networkChains || null);

    res.status(200).json(formatSuccess(result, 'Chain synchronized successfully'));
  } catch (error) {
    if (error.message.includes('required')) {
      return res.status(400).json(formatError(error, 400));
    }
    next(error);
  }
});

/**
 * GET /api/consensus/pending-transactions
 * Get pending transactions count
 */
router.get('/pending-transactions', async (req, res, next) => {
  try {
    const blockchain = req.app.locals.blockchain;
    const pendingTransactions = blockchain.pendingTransactions || [];
    
    res.status(200).json(formatSuccess({
      count: pendingTransactions.length,
      transactions: pendingTransactions.map(tx => ({
        id: tx.id,
        from: tx.from,
        to: tx.to,
        timestamp: tx.timestamp,
        type: tx.data?.action || tx.data?.type || 'transaction'
      }))
    }, 'Pending transactions retrieved successfully'));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/consensus/all
 * Get all blocks and consensus information
 */
router.get('/all', async (req, res, next) => {
  try {
    const blockchain = req.app.locals.blockchain;
    const consensusService = req.app.locals.consensusService;
    
    const blocks = blockchain.getAllBlocks();
    const votes = consensusService.engine ? consensusService.engine.votes : new Map();
    
    // Convert votes Map to array
    const votesArray = [];
    votes.forEach((nodeVotes, blockHash) => {
      nodeVotes.forEach((vote, nodeId) => {
        votesArray.push({
          blockHash,
          nodeId,
          isValid: vote
        });
      });
    });

    res.status(200).json(formatSuccess({
      blocks: blocks.map(block => ({
        index: block.index,
        hash: block.hash,
        previousHash: block.previousHash,
        timestamp: block.timestamp,
        transactionCount: block.transactions.length,
        merkleRoot: block.merkleRoot
      })),
      votes: votesArray,
      blockCount: blocks.length,
      voteCount: votesArray.length
    }, 'All consensus data retrieved successfully'));
  } catch (error) {
    next(error);
  }
});

module.exports = router;


