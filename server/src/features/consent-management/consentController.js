/**
 * Consent Controller - API endpoints for consent management
 * 
 * Endpoints:
 * - POST /api/consent/grant - Grant consent
 * - POST /api/consent/revoke - Revoke consent
 * - GET /api/consent/check/:patientId/:clinicianId/:type - Check consent
 * - GET /api/consent/history/:patientId - Get consent history
 * - GET /api/consent/active/:patientId - Get active consents
 */

const express = require('express');
const ConsentService = require('./consentService.js');
const { formatSuccess, formatError } = require('../../utils/helpers.js');

const router = express.Router();

// Initialize service (will be set by middleware)
let consentService = null;
let consentServiceBlockchain = null;

// Middleware to initialize service
router.use((req, res, next) => {
  // Recreate service if blockchain instance has changed (for tests)
  if (!consentService || consentServiceBlockchain !== req.app.locals.blockchain) {
    consentService = new ConsentService(
      req.app.locals.blockchain,
      req.app.locals.patientContract,
      req.app.locals.clinicianContract
    );
    consentServiceBlockchain = req.app.locals.blockchain;
  }
  next();
});

/**
 * POST /api/consent/grant
 * Grant consent
 */
router.post('/grant', async (req, res, next) => {
  try {
    const { patientId, clinicianId, consentType, expiresAt, purpose, grantedBy, metadata } = req.body;

    // Validate required fields
    if (!patientId || !clinicianId || !consentType) {
      return res.status(400).json(formatError(
        new Error('patientId, clinicianId, and consentType are required'),
        400
      ));
    }

    // Call service
    const result = await consentService.grantConsent(patientId, clinicianId, consentType, {
      expiresAt,
      purpose,
      grantedBy,
      metadata
    });

    res.status(201).json(formatSuccess(result, 'Consent granted successfully'));
  } catch (error) {
    // Handle specific error types
    if (error.message.includes('not found') || error.message.includes('Invalid')) {
      return res.status(400).json(formatError(error, 400));
    }
    if (error.message.includes('already exists')) {
      return res.status(409).json(formatError(error, 409));
    }
    next(error);
  }
});

/**
 * POST /api/consent/revoke
 * Revoke consent
 */
router.post('/revoke', async (req, res, next) => {
  try {
    const { consentId } = req.body;

    // Validate required fields
    if (!consentId) {
      return res.status(400).json(formatError(
        new Error('consentId is required'),
        400
      ));
    }

    // Call service (revokedBy is optional, will default to patientId)
    const result = await consentService.revokeConsent(consentId);

    res.status(200).json(formatSuccess(result, 'Consent revoked successfully'));
  } catch (error) {
    // Handle specific error types
    if (error.message.includes('not found') || error.message.includes('Invalid')) {
      return res.status(404).json(formatError(error, 404));
    }
    if (error.message.includes('already been revoked') || error.message.includes('already expired')) {
      return res.status(409).json(formatError(error, 409));
    }
    next(error);
  }
});

/**
 * GET /api/consent/check/:patientId/:clinicianId/:type
 * Check if consent exists and is valid
 */
router.get('/check/:patientId/:clinicianId/:type', async (req, res, next) => {
  try {
    const { patientId, clinicianId, type } = req.params;

    // Validate params exist
    if (!patientId || !clinicianId || !type) {
      return res.status(400).json(formatError(
        new Error('patientId, clinicianId, and type are required'),
        400
      ));
    }

    // Call service
    const result = await consentService.checkConsent(patientId, clinicianId, type);

    res.status(200).json(formatSuccess(result, 'Consent check completed'));
  } catch (error) {
    // Handle specific error types
    if (error.message.includes('Invalid') || error.message.includes('required')) {
      return res.status(400).json(formatError(error, 400));
    }
    next(error);
  }
});

/**
 * GET /api/consent/history/:patientId
 * Get consent history for a patient
 */
router.get('/history/:patientId', async (req, res, next) => {
  try {
    const { patientId } = req.params;

    // Validate param exists
    if (!patientId) {
      return res.status(400).json(formatError(
        new Error('patientId is required'),
        400
      ));
    }

    // Call service
    const result = await consentService.getConsentHistory(patientId);

    res.status(200).json(formatSuccess(result, 'Consent history retrieved successfully'));
  } catch (error) {
    // Handle specific error types
    if (error.message.includes('Invalid') || error.message.includes('not found')) {
      return res.status(400).json(formatError(error, 400));
    }
    next(error);
  }
});

/**
 * GET /api/consent/active/:patientId
 * Get active consents for a patient
 */
router.get('/active/:patientId', async (req, res, next) => {
  try {
    const { patientId } = req.params;

    // Validate param exists
    if (!patientId) {
      return res.status(400).json(formatError(
        new Error('patientId is required'),
        400
      ));
    }

    // Call service
    const result = await consentService.getActiveConsents(patientId);

    res.status(200).json(formatSuccess(result, 'Active consents retrieved successfully'));
  } catch (error) {
    // Handle specific error types
    if (error.message.includes('Invalid') || error.message.includes('not found')) {
      return res.status(400).json(formatError(error, 400));
    }
    next(error);
  }
});

/**
 * GET /api/consent/all
 * Get all consents from all patients
 */
router.get('/all', async (req, res, next) => {
  try {
    // Call service
    const result = await consentService.getAllConsents();

    res.status(200).json(formatSuccess(result, 'All consents retrieved successfully'));
  } catch (error) {
    next(error);
  }
});

module.exports = router;

