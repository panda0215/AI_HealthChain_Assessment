/**
 * ZK Proof Controller
 * 
 * API endpoints for zero-knowledge proofs:
 * - Generate and verify consent proofs
 * - Generate and verify permission proofs
 */

const express = require('express');
const ZKService = require('./zkService.js');
const { formatSuccess, formatError } = require('../../utils/helpers.js');

const router = express.Router();

let zkService = null;
let zkServiceBlockchain = null;

router.use((req, res, next) => {
  // Recreate service if blockchain instance has changed (for tests)
  if (!zkService || zkServiceBlockchain !== req.app.locals.blockchain) {
    zkService = new ZKService(
      req.app.locals.blockchain,
      req.app.locals.patientContract,
      req.app.locals.clinicianContract
    );
    zkServiceBlockchain = req.app.locals.blockchain;
  }
  next();
});

/**
 * POST /api/zk/consent-proof
 * Generate consent ZK proof
 * Accepts either consentId OR (patientId, clinicianId, consentType)
 */
router.post('/consent-proof', async (req, res, next) => {
  try {
    const { consentId, patientId, clinicianId, consentType } = req.body;

    // Validate: either consentId OR (patientId, clinicianId, consentType)
    if (consentId) {
      // Use consentId mode
      const result = await zkService.generateConsentProof(consentId);
      res.status(200).json(formatSuccess(result, 'Consent proof generated successfully'));
    } else if (patientId && clinicianId && consentType) {
      // Legacy mode: use patientId, clinicianId, consentType
      const result = await zkService.generateConsentProof(patientId, clinicianId, consentType);
      res.status(200).json(formatSuccess(result, 'Consent proof generated successfully'));
    } else {
      return res.status(400).json(formatError(
        new Error('Either consentId OR (patientId, clinicianId, and consentType) are required'),
        400
      ));
    }
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('Invalid') || error.message.includes('not found')) {
      return res.status(400).json(formatError(error, 400));
    }
    next(error);
  }
});

/**
 * POST /api/zk/verify-consent
 * Verify consent ZK proof
 */
router.post('/verify-consent', async (req, res, next) => {
  try {
    const { proof } = req.body;

    // Validate required fields
    if (!proof) {
      return res.status(400).json(formatError(
        new Error('proof object is required'),
        400
      ));
    }

    // Call service
    const result = await zkService.verifyConsentProof({ proof });

    res.status(200).json(formatSuccess(result, 'Consent proof verified'));
  } catch (error) {
    if (error.message.includes('required')) {
      return res.status(400).json(formatError(error, 400));
    }
    next(error);
  }
});

/**
 * POST /api/zk/permission-proof
 * Generate permission ZK proof
 */
router.post('/permission-proof', async (req, res, next) => {
  try {
    const { userId, permissions } = req.body;

    // Validate required fields
    if (!userId || !permissions || !Array.isArray(permissions) || permissions.length === 0) {
      return res.status(400).json(formatError(
        new Error('userId and permissions (non-empty array) are required'),
        400
      ));
    }

    // Call service
    const result = await zkService.generatePermissionProof(userId, permissions);

    res.status(200).json(formatSuccess(result, 'Permission proof generated successfully'));
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('Invalid') || error.message.includes('not found')) {
      return res.status(400).json(formatError(error, 400));
    }
    next(error);
  }
});

/**
 * POST /api/zk/verify-permission
 * Verify permission ZK proof
 */
router.post('/verify-permission', async (req, res, next) => {
  try {
    const { proof, requiredPermissions } = req.body;

    // Validate required fields
    if (!proof) {
      return res.status(400).json(formatError(
        new Error('proof object is required'),
        400
      ));
    }
    if (!requiredPermissions || !Array.isArray(requiredPermissions) || requiredPermissions.length === 0) {
      return res.status(400).json(formatError(
        new Error('requiredPermissions (non-empty array) is required'),
        400
      ));
    }

    // Call service
    const result = await zkService.verifyPermissionProof(proof, requiredPermissions);

    res.status(200).json(formatSuccess(result, 'Permission proof verified'));
  } catch (error) {
    if (error.message.includes('required')) {
      return res.status(400).json(formatError(error, 400));
    }
    next(error);
  }
});

module.exports = router;


