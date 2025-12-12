/**
 * Data Initializer - Loads mock data into blockchain
 * 
 * This service initializes the blockchain with all mock data from generated-data.js
 */

const PatientContract = require('./PatientContract.js');
const ClinicianContract = require('./ClinicianContract.js');
const AIModelContract = require('./AIModelContract.js');
const MedicalRecordContract = require('./MedicalRecordContract.js');
const ConsentContract = require('../consent-management/ConsentContract.js');

class DataInitializer {
  constructor(blockchain) {
    this.blockchain = blockchain;
    this.patientContract = new PatientContract(blockchain);
    this.clinicianContract = new ClinicianContract(blockchain);
    this.aiModelContract = new AIModelContract(blockchain);
    this.medicalRecordContract = new MedicalRecordContract(blockchain);
    this.consentContract = new ConsentContract(blockchain);
  }

  /**
   * Check if data has already been initialized
   * 
   * @returns {boolean} True if data exists in blockchain
   */
  isInitialized() {
    // Check if any patients exist
    const patients = this.patientContract.getAllPatients();
    return patients.length > 0;
  }

  /**
   * Initialize blockchain with all mock data
   * 
   * @param {Object} mockData - Mock data object containing patients, clinicians, aiModels, medicalRecords, consentRecords
   * @returns {Object} Initialization result with counts
   */
  async initialize(mockData) {
    const { patients, clinicians, aiModels, medicalRecords, consentRecords } = mockData;
    
    const results = {
      patients: 0,
      clinicians: 0,
      aiModels: 0,
      medicalRecords: 0,
      consents: 0,
      errors: []
    };

    console.log('Starting blockchain data initialization...');

    // Initialize patients
    if (patients && patients.length > 0) {
      console.log(`Loading ${patients.length} patients...`);
      for (const patient of patients) {
        try {
          // Check if patient already exists
          const existing = this.patientContract.getPatient(patient.id);
          if (!existing) {
            await this.patientContract.registerPatient(patient);
            results.patients++;
          }
        } catch (error) {
          results.errors.push(`Patient ${patient.id}: ${error.message}`);
        }
      }
      console.log(`✓ Loaded ${results.patients} patients`);
    }

    // Initialize clinicians
    if (clinicians && clinicians.length > 0) {
      console.log(`Loading ${clinicians.length} clinicians...`);
      for (const clinician of clinicians) {
        try {
          // Check if clinician already exists
          const existing = this.clinicianContract.getClinician(clinician.id);
          if (!existing) {
            await this.clinicianContract.registerClinician(clinician);
            results.clinicians++;
          }
        } catch (error) {
          results.errors.push(`Clinician ${clinician.id}: ${error.message}`);
        }
      }
      console.log(`✓ Loaded ${results.clinicians} clinicians`);
    }

    // Initialize AI models
    if (aiModels && aiModels.length > 0) {
      console.log(`Loading ${aiModels.length} AI models...`);
      for (const model of aiModels) {
        try {
          // Check if model already exists
          const existing = this.aiModelContract.getAIModel(model.id);
          if (!existing) {
            await this.aiModelContract.registerAIModel(model);
            results.aiModels++;
          }
        } catch (error) {
          results.errors.push(`AI Model ${model.id}: ${error.message}`);
        }
      }
      console.log(`✓ Loaded ${results.aiModels} AI models`);
    }

    // Initialize medical records
    if (medicalRecords && medicalRecords.length > 0) {
      console.log(`Loading ${medicalRecords.length} medical records...`);
      for (const record of medicalRecords) {
        try {
          // Check if record already exists
          const existing = this.medicalRecordContract.getMedicalRecord(record.id);
          if (!existing) {
            await this.medicalRecordContract.registerMedicalRecord(record);
            results.medicalRecords++;
          }
        } catch (error) {
          results.errors.push(`Medical Record ${record.id}: ${error.message}`);
        }
      }
      console.log(`✓ Loaded ${results.medicalRecords} medical records`);
    }

    // Initialize consent records
    if (consentRecords && consentRecords.length > 0) {
      console.log(`Loading ${consentRecords.length} consent records...`);
      for (const consent of consentRecords) {
        try {
          // Check if consent already exists (by checking if there's a grant transaction)
          const existingConsents = this.blockchain.searchTransactions({
            to: 'consent-contract',
            'data.action': 'grant',
            'data.consentId': consent.id
          });

          if (existingConsents.length === 0) {
            // Register consent using the consent contract
            await this.consentContract.grantConsent(
              consent.patientId,
              consent.clinicianId,
              consent.consentType,
              {
                expiresAt: consent.expiresAt,
                purpose: consent.purpose || 'Treatment',
                grantedBy: consent.grantedBy || consent.patientId,
                metadata: consent.metadata || {}
              }
            );
            results.consents++;
          }
        } catch (error) {
          results.errors.push(`Consent ${consent.id}: ${error.message}`);
        }
      }
      console.log(`✓ Loaded ${results.consents} consent records`);
    }

    console.log('✓ Blockchain data initialization complete!');
    console.log(`  - Patients: ${results.patients}`);
    console.log(`  - Clinicians: ${results.clinicians}`);
    console.log(`  - AI Models: ${results.aiModels}`);
    console.log(`  - Medical Records: ${results.medicalRecords}`);
    console.log(`  - Consents: ${results.consents}`);
    
    if (results.errors.length > 0) {
      console.log(`  - Errors: ${results.errors.length}`);
    }

    return results;
  }
}

module.exports = DataInitializer;

