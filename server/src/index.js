/**
 * AI Health Chains - Blockchain Assessment Backend Server
 * 
 * This is the main entry point for the backend server.
 * The server provides a REST API for interacting with the permissioned blockchain.
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Import blockchain core
const Blockchain = require('./core/Blockchain.js');
const NodeManager = require('./core/NodeManager.js');

// Import feature routes (to be implemented)
const consentRoutes = require('./features/consent-management/consentController.js');
const integrityRoutes = require('./features/data-integrity/integrityController.js');
const zkRoutes = require('./features/zk-proofs/zkController.js');
const auditRoutes = require('./features/audit-trail/auditController.js');
const consensusRoutes = require('./features/consensus/consensusController.js');
const ConsensusService = require('./features/consensus/consensusService.js');

// Import data storage contracts
const PatientContract = require('./features/data-storage/PatientContract.js');
const ClinicianContract = require('./features/data-storage/ClinicianContract.js');
const AIModelContract = require('./features/data-storage/AIModelContract.js');
const MedicalRecordContract = require('./features/data-storage/MedicalRecordContract.js');
const DataInitializer = require('./features/data-storage/dataInitializer.js');

// Import data
const { patients, clinicians, aiModels, medicalRecords, consentRecords } = require('./data/generated-data.js');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Data initialization limits (hardcoded for now)
const MAX_MEDICAL_RECORDS = 100; // Limit to 100 medical records
const MAX_CONSENT_RECORDS = 50;  // Limit to 50 consent records

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize blockchain
const blockchain = new Blockchain();
const nodeManager = new NodeManager(blockchain);

// Initialize data storage contracts
const patientContract = new PatientContract(blockchain);
const clinicianContract = new ClinicianContract(blockchain);
const aiModelContract = new AIModelContract(blockchain);
const medicalRecordContract = new MedicalRecordContract(blockchain);
const dataInitializer = new DataInitializer(blockchain);

// Initialize consensus service
const consensusService = new ConsensusService(blockchain, nodeManager);

// Store contracts and blockchain in app locals
app.locals.blockchain = blockchain;
app.locals.nodeManager = nodeManager;
app.locals.patientContract = patientContract;
app.locals.clinicianContract = clinicianContract;
app.locals.aiModelContract = aiModelContract;
app.locals.medicalRecordContract = medicalRecordContract;
app.locals.consensusService = consensusService;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    blockchain: {
      chainLength: blockchain.getChainLength(),
      latestBlock: blockchain.getLatestBlock()?.hash || null,
      nodeId: nodeManager.getNodeId()
    }
  });
});

// Blockchain info endpoint
app.get('/api/blockchain/info', (req, res) => {
  try {
    const latestBlock = blockchain.getLatestBlock();
    const info = {
      chainLength: blockchain.getChainLength(),
      latestBlock: latestBlock ? {
        index: latestBlock.index,
        hash: latestBlock.hash,
        previousHash: latestBlock.previousHash,
        timestamp: latestBlock.timestamp,
        transactions: latestBlock.transactions.length
      } : null,
      nodeId: nodeManager.getNodeId(),
      networkNodes: nodeManager.getNetworkNodes(),
      totalTransactions: blockchain.getTotalTransactions()
    };
    res.json(info);
  } catch (error) {
    console.error('Error in /api/blockchain/info:', error);
    res.status(500).json({ error: 'Failed to get blockchain info', message: error.message });
  }
});

// Feature routes
app.use('/api/consent', consentRoutes);
app.use('/api/integrity', integrityRoutes);
app.use('/api/zk', zkRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/consensus', consensusRoutes);

// Data endpoints for UI - Read from blockchain (not mock data)
app.get('/api/patients', (req, res) => {
  try {
    // Get patients from blockchain via PatientContract
    const patients = req.app.locals.patientContract.getAllPatients().map(p => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      firstName: p.firstName,
      lastName: p.lastName,
      age: p.age,
      gender: p.gender,
      email: p.email
    }));
    res.json({ data: patients, count: patients.length });
  } catch (error) {
    console.error('Error in /api/patients:', error);
    res.status(500).json({ error: 'Failed to get patients', message: error.message });
  }
});

app.get('/api/clinicians', (req, res) => {
  try {
    // Get clinicians from blockchain via ClinicianContract
    const clinicians = req.app.locals.clinicianContract.getAllClinicians(true)
      .map(c => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        firstName: c.firstName,
        lastName: c.lastName,
        specialty: c.specialty,
        hospital: c.hospital,
        email: c.email
      }));
    res.json({ data: clinicians, count: clinicians.length });
  } catch (error) {
    console.error('Error in /api/clinicians:', error);
    res.status(500).json({ error: 'Failed to get clinicians', message: error.message });
  }
});

app.get('/api/medical-records', (req, res) => {
  try {
    const { patientId, full } = req.query;
    const allRecords = req.app.locals.medicalRecordContract.getAllMedicalRecords(patientId || null);
    
    // If full=true, return complete records (for data integrity)
    // Otherwise, return filtered fields (for UI display)
    const records = full === 'true' 
      ? allRecords 
      : allRecords.map(r => ({
          id: r.id,
          patientId: r.patientId,
          recordType: r.recordType,
          diagnosis: r.diagnosis,
          date: r.date,
          description: r.description
        }));
    
    res.json({ data: records, count: records.length });
  } catch (error) {
    console.error('Error in /api/medical-records:', error);
    res.status(500).json({ error: 'Failed to get medical records', message: error.message });
  }
});

app.get('/api/ai-models', (req, res) => {
  try {
    const models = req.app.locals.aiModelContract.getAllAIModels()
      .map(m => ({
        id: m.id,
        name: m.name,
        version: m.version,
        description: m.description,
        accuracy: m.accuracy
      }));
    res.json({ data: models, count: models.length });
  } catch (error) {
    console.error('Error in /api/ai-models:', error);
    res.status(500).json({ error: 'Failed to get AI models', message: error.message });
  }
});

// Stats endpoint - Returns real blockchain data statistics
app.get('/api/stats', (req, res) => {
  try {
    const blockchain = req.app.locals.blockchain;
    const patientContract = req.app.locals.patientContract;
    const clinicianContract = req.app.locals.clinicianContract;
    const aiModelContract = req.app.locals.aiModelContract;
    const medicalRecordContract = req.app.locals.medicalRecordContract;
    
    // Import ConsentContract to get consent statistics
    const ConsentContract = require('./features/consent-management/ConsentContract.js');
    const consentContract = new ConsentContract(blockchain);
    
    // Get counts from blockchain contracts
    const totalPatients = patientContract.getAllPatients().length;
    const totalClinicians = clinicianContract.getAllClinicians().length;
    const totalAIModels = aiModelContract.getAllAIModels().length;
    const allMedicalRecords = medicalRecordContract.getAllMedicalRecords();
    const totalMedicalRecords = allMedicalRecords.length;
    
    // Count AI-generated medical records
    const aiGeneratedRecords = allMedicalRecords.filter(record => 
      record.aiGenerated === true || record.source === 'AI' || record.generatedByAI === true
    ).length;
    
    // Get all consents and calculate active vs revoked
    const allConsents = consentContract.getAllConsents();
    const totalConsentRecords = allConsents.length;
    
    let activeConsents = 0;
    let revokedConsents = 0;
    
    allConsents.forEach(consent => {
      if (consent.isRevoked === true) {
        revokedConsents++;
      } else if (consent.isExpired !== true) {
        // Not revoked and not expired = active
        activeConsents++;
      }
    });
    
    // Count audit logs
    const auditLogs = blockchain.searchTransactions({
      to: 'audit-contract'
    });
    const totalAuditLogs = auditLogs.length;
    
    // Build statistics object
    const realStats = {
      totalPatients,
      totalClinicians,
      totalAIModels,
      totalMedicalRecords,
      totalConsentRecords,
      aiGeneratedRecords,
      activeConsents,
      revokedConsents,
      totalAuditLogs,
      pendingTransactions: blockchain.pendingTransactions.length
    };
    
    res.json({ data: realStats, success: true });
  } catch (error) {
    console.error('Error in /api/stats:', error);
    res.status(500).json({ error: 'Failed to get stats', message: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Endpoint not found',
      path: req.path
    }
  });
});

// Start server
const server = app.listen(PORT, async () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║   AI Health Chains - Blockchain Assessment Server                    ║  
║                                                                      ║
║   Server running on: http://localhost:${PORT}                        ║
║   Node ID: ${nodeManager.getNodeId()}                                ║
║   Blockchain initialized with ${blockchain.getChainLength()} blocks  ║
╚══════════════════════════════════════════════════════════════════════╝
  `);
  
  // Initialize with genesis block if chain is empty
  if (blockchain.getChainLength() === 0) {
    blockchain.createGenesisBlock();
    console.log('✓ Genesis block created');
  }

  // Initialize blockchain with mock data if not already initialized
  try {
    if (!dataInitializer.isInitialized()) {
      console.log('\nInitializing blockchain with mock data...');
      
      // Limit the number of records based on environment variables
      const limitedMedicalRecords = medicalRecords.slice(0, MAX_MEDICAL_RECORDS);
      const limitedConsentRecords = consentRecords.slice(0, MAX_CONSENT_RECORDS);
      
      if (MAX_MEDICAL_RECORDS < medicalRecords.length) {
        console.log(`Limiting medical records: ${MAX_MEDICAL_RECORDS} of ${medicalRecords.length} will be loaded`);
      }
      if (MAX_CONSENT_RECORDS < consentRecords.length) {
        console.log(`Limiting consent records: ${MAX_CONSENT_RECORDS} of ${consentRecords.length} will be loaded`);
      }
      
      await dataInitializer.initialize({
        patients,
        clinicians,
        aiModels,
        medicalRecords: limitedMedicalRecords,
        consentRecords: limitedConsentRecords
      });
      console.log('✓ Blockchain initialization complete\n');
    } else {
      console.log('✓ Blockchain already initialized with data\n');
    }
  } catch (error) {
    console.error('❌ Error initializing blockchain data:', error);
    console.error('Server will continue, but some data may not be available.');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${PORT} is already in use.`);
    console.error(`Please stop the process using port ${PORT} or change the PORT environment variable.\n`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  
  server.close((err) => {
    if (err) {
      console.error('Error closing server:', err);
      process.exit(1);
    }
    
    console.log('✓ Server closed successfully');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('⚠ Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

module.exports = app;

