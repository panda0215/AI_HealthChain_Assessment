/**
 * Audit Controller - API endpoints
 * 
 * Endpoints:
 * - POST /api/audit/data-access - Log data access
 * - POST /api/audit/consent - Log consent change
 * - POST /api/audit/ai-diagnostic - Log AI diagnostic
 * - GET /api/audit/query - Query audit logs
 * - GET /api/audit/trail/:resourceId/:resourceType - Get audit trail
 */

const express = require('express');
const AuditService = require('./auditService.js');
const { formatSuccess, formatError } = require('../../utils/helpers.js');

const router = express.Router();

let auditService = null;
let auditServiceBlockchain = null;

router.use((req, res, next) => {
  // Recreate service if blockchain instance has changed (for tests)
  if (!auditService || auditServiceBlockchain !== req.app.locals.blockchain) {
    auditService = new AuditService(
      req.app.locals.blockchain
    );
    auditServiceBlockchain = req.app.locals.blockchain;
  }
  next();
});

/**
 * POST /api/audit/data-access
 * Log data access
 */
router.post('/data-access', async (req, res, next) => {
  try {
    const { actorId, resourceId, resourceType, granted, reason, metadata } = req.body;

    // Validate required fields
    if (!actorId || !resourceId || !resourceType || typeof granted !== 'boolean') {
      return res.status(400).json(formatError(
        new Error('actorId, resourceId, resourceType, and granted (boolean) are required'),
        400
      ));
    }

    // Call service
    const result = await auditService.logDataAccess({
      actorId,
      resourceId,
      resourceType,
      granted,
      reason,
      metadata
    });

    res.status(201).json(formatSuccess(result, 'Data access logged successfully'));
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('Invalid')) {
      return res.status(400).json(formatError(error, 400));
    }
    next(error);
  }
});

/**
 * POST /api/audit/consent
 * Log consent change
 */
router.post('/consent', async (req, res, next) => {
  try {
    const { consentId, action, actorId, patientId, clinicianId, consentType, metadata } = req.body;

    // Validate required fields
    if (!consentId || !action || !actorId || !patientId) {
      return res.status(400).json(formatError(
        new Error('consentId, action, actorId, and patientId are required'),
        400
      ));
    }

    // Call service
    const result = await auditService.logConsentChange({
      consentId,
      action,
      actorId,
      patientId,
      clinicianId,
      consentType,
      metadata
    });

    res.status(201).json(formatSuccess(result, 'Consent change logged successfully'));
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('Invalid') || error.message.includes('must be one of')) {
      return res.status(400).json(formatError(error, 400));
    }
    next(error);
  }
});

/**
 * POST /api/audit/ai-diagnostic
 * Log AI diagnostic
 */
router.post('/ai-diagnostic', async (req, res, next) => {
  try {
    const { modelId, recordId, result, confidence, metadata } = req.body;

    // Validate required fields
    if (!modelId || !recordId || !result) {
      return res.status(400).json(formatError(
        new Error('modelId, recordId, and result are required'),
        400
      ));
    }

    // Call service
    const result_data = await auditService.logAIDiagnostic({
      modelId,
      recordId,
      result,
      confidence,
      metadata
    });

    res.status(201).json(formatSuccess(result_data, 'AI diagnostic logged successfully'));
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('Invalid') || error.message.includes('between 0 and 1')) {
      return res.status(400).json(formatError(error, 400));
    }
    next(error);
  }
});

/**
 * GET /api/audit/query
 * Query audit logs
 */
router.get('/query', async (req, res, next) => {
  try {
    // Extract query parameters
    const filters = {
      actorId: req.query.actorId || null,
      resourceId: req.query.resourceId || null,
      action: req.query.action || null,
      type: req.query.type || null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null
    };

    // Remove null values
    Object.keys(filters).forEach(key => {
      if (filters[key] === null) {
        delete filters[key];
      }
    });

    // Call service
    const result = await auditService.queryLogs(filters);

    res.status(200).json(formatSuccess(result, 'Audit logs retrieved successfully'));
  } catch (error) {
    if (error.message.includes('Invalid')) {
      return res.status(400).json(formatError(error, 400));
    }
    next(error);
  }
});

/**
 * GET /api/audit/trail/:resourceId/:resourceType
 * Get audit trail for resource
 */
router.get('/trail/:resourceId/:resourceType', async (req, res, next) => {
  try {
    let { resourceId, resourceType } = req.params;

    // Validate params exist (check for empty strings or whitespace)
    if (!resourceId || resourceId.trim() === '' || !resourceType || resourceType.trim() === '') {
      return res.status(400).json(formatError(
        new Error('resourceId and resourceType are required'),
        400
      ));
    }

    // Call service
    const result = await auditService.getAuditTrail(resourceId, resourceType);

    res.status(200).json(formatSuccess(result, 'Audit trail retrieved successfully'));
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('Invalid')) {
      return res.status(400).json(formatError(error, 400));
    }
    next(error);
  }
});

/**
 * GET /api/audit/all
 * Get all audit logs (no filters)
 */
router.get('/all', async (req, res, next) => {
  try {
    // Call service with empty filters to get all logs
    const result = await auditService.queryLogs({});

    res.status(200).json(formatSuccess({
      count: result.logs.length,
      logs: result.logs
    }, 'All audit logs retrieved successfully'));
  } catch (error) {
    next(error);
  }
});

module.exports = router;


