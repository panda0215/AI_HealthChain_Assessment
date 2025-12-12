/**
 * Data Integrity Controller - API endpoints
 * 
 * Endpoints:
 * - POST /api/integrity/tree - Create Merkle tree from records
 * - POST /api/integrity/proof - Generate proof for a record
 * - POST /api/integrity/verify - Verify record integrity
 * - POST /api/integrity/verify-batch - Verify batch of records
 */

const express = require('express');
const IntegrityService = require('./integrityService.js');
const { formatSuccess, formatError } = require('../../utils/helpers.js');

const router = express.Router();

let integrityService = null;

router.use((req, res, next) => {
  if (!integrityService) {
    integrityService = new IntegrityService(
      req.app.locals.blockchain,
      req.app.locals.medicalRecordContract
    );
  }
  next();
});

/**
 * POST /api/integrity/tree
 * Create Merkle tree from records
 */
router.post('/tree', async (req, res, next) => {
  try {
    const { records, storeOnChain, description } = req.body;

    // Validate required fields
    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json(formatError(
        new Error('records array is required and must not be empty'),
        400
      ));
    }

    // Call service
    const result = await integrityService.createMerkleTree(records, {
      storeOnChain,
      description
    });

    res.status(201).json(formatSuccess(result, 'Merkle tree created successfully'));
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('empty')) {
      return res.status(400).json(formatError(error, 400));
    }
    next(error);
  }
});

/**
 * POST /api/integrity/proof
 * Generate proof for a record
 */
router.post('/proof', async (req, res, next) => {
  try {
    const { record, root } = req.body;

    // Validate required fields
    if (!record) {
      return res.status(400).json(formatError(
        new Error('record is required'),
        400
      ));
    }
    if (!root) {
      return res.status(400).json(formatError(
        new Error('root hash is required'),
        400
      ));
    }

    // Call service
    const result = await integrityService.generateProof(record, root);

    res.status(200).json(formatSuccess(result, 'Proof generated successfully'));
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('not found')) {
      return res.status(400).json(formatError(error, 400));
    }
    next(error);
  }
});

/**
 * POST /api/integrity/verify
 * Verify record integrity
 */
router.post('/verify', async (req, res, next) => {
  try {
    const { record, proof, root } = req.body;

    // Validate required fields
    if (!record) {
      return res.status(400).json(formatError(
        new Error('record is required'),
        400
      ));
    }
    if (!proof) {
      return res.status(400).json(formatError(
        new Error('proof is required'),
        400
      ));
    }
    if (!root) {
      return res.status(400).json(formatError(
        new Error('root hash is required'),
        400
      ));
    }

    // Call service
    const isValid = await integrityService.verifyIntegrity(record, proof, root);

    res.status(200).json(formatSuccess({
      valid: isValid,
      record,
      root
    }, isValid ? 'Record integrity verified' : 'Record integrity verification failed'));
  } catch (error) {
    if (error.message.includes('required')) {
      return res.status(400).json(formatError(error, 400));
    }
    next(error);
  }
});

/**
 * POST /api/integrity/verify-batch
 * Verify batch of records
 */
router.post('/verify-batch', async (req, res, next) => {
  try {
    const { records } = req.body;

    // Validate required fields
    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json(formatError(
        new Error('records array is required and must not be empty'),
        400
      ));
    }

    // Call service
    const result = await integrityService.verifyBatch(records);

    res.status(200).json(formatSuccess(result, 'Batch verification completed'));
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('missing')) {
      return res.status(400).json(formatError(error, 400));
    }
    next(error);
  }
});

/**
 * GET /api/integrity/all
 * Get all Merkle trees
 */
router.get('/all', async (req, res, next) => {
  try {
    const trees = integrityService.getAllTrees();

    res.status(200).json(formatSuccess({
      count: trees.length,
      trees
    }, 'All Merkle trees retrieved successfully'));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/integrity/tree/:root/records
 * Get records from a specific tree (if available in cache)
 */
router.get('/tree/:root/records', async (req, res, next) => {
  try {
    const { root } = req.params;
    
    if (!root) {
      return res.status(400).json(formatError(
        new Error('root hash is required'),
        400
      ));
    }

    const records = integrityService.getRecordsByRoot(root);
    
    if (!records) {
      return res.status(404).json(formatError(
        new Error('Tree records not found. The tree may have been created in a previous session.'),
        404
      ));
    }

    res.status(200).json(formatSuccess({
      root,
      records,
      count: records.length
    }, 'Tree records retrieved successfully'));
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('not found')) {
      return res.status(400).json(formatError(error, 400));
    }
    next(error);
  }
});

module.exports = router;

