/**
 * API Service - Centralized API communication
 * Handles all HTTP requests to the backend
 */

import axios from 'axios';

const API_BASE = '/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const errorMessage = error.response?.data?.error?.message || error.message || 'An error occurred';
    return Promise.reject(new Error(errorMessage));
  }
);

// Blockchain API
export const blockchainAPI = {
  getInfo: () => apiClient.get('/blockchain/info'),
  getHealth: () => apiClient.get('/health'),
};

// Consent Management API
export const consentAPI = {
  grant: (data) => apiClient.post('/consent/grant', data),
  revoke: (data) => apiClient.post('/consent/revoke', data),
  check: (patientId, clinicianId, type) =>
    apiClient.get(`/consent/check/${patientId}/${clinicianId}/${encodeURIComponent(type)}`),
  getHistory: (patientId) => apiClient.get(`/consent/history/${patientId}`),
  getActive: (patientId) => apiClient.get(`/consent/active/${patientId}`),
  getAll: () => apiClient.get('/consent/all'),
};

// Data Integrity API
export const integrityAPI = {
  createTree: (data) => apiClient.post('/integrity/tree', data),
  generateProof: (data) => apiClient.post('/integrity/proof', data),
  verify: (data) => apiClient.post('/integrity/verify', data),
  verifyBatch: (data) => apiClient.post('/integrity/verify-batch', data),
  getAll: () => apiClient.get('/integrity/all'),
  getTreeRecords: (root) => apiClient.get(`/integrity/tree/${encodeURIComponent(root)}/records`),
};

// ZK Proofs API
export const zkAPI = {
  generateConsentProof: (data) => apiClient.post('/zk/consent-proof', data),
  verifyConsentProof: (data) => apiClient.post('/zk/verify-consent', data),
  generatePermissionProof: (data) => apiClient.post('/zk/permission-proof', data),
  verifyPermissionProof: (data) => apiClient.post('/zk/verify-permission', data),
};

// Audit Trail API
export const auditAPI = {
  logDataAccess: (data) => apiClient.post('/audit/data-access', data),
  logConsentChange: (data) => apiClient.post('/audit/consent', data),
  logAIDiagnostic: (data) => apiClient.post('/audit/ai-diagnostic', data),
  queryLogs: (params) => apiClient.get('/audit/query', { params }),
  getTrail: (resourceId, resourceType) => 
    apiClient.get(`/audit/trail/${resourceId}/${encodeURIComponent(resourceType)}`),
  getAll: () => apiClient.get('/audit/all'),
};

// Consensus API
export const consensusAPI = {
  proposeBlock: (data) => apiClient.post('/consensus/propose', data),
  voteOnBlock: (data) => apiClient.post('/consensus/vote', data),
  syncChain: (data) => apiClient.post('/consensus/sync', data),
  getPendingTransactions: () => apiClient.get('/consensus/pending-transactions'),
  getAll: () => apiClient.get('/consensus/all'),
};

// Data API for UI
export const dataAPI = {
  getPatients: () => apiClient.get('/patients'),
  getClinicians: () => apiClient.get('/clinicians'),
  getMedicalRecords: (patientId, full = false) => apiClient.get('/medical-records', { 
    params: { 
      ...(patientId ? { patientId } : {}),
      ...(full ? { full: 'true' } : {})
    } 
  }),
  getAIModels: () => apiClient.get('/ai-models'),
  getStats: () => apiClient.get('/stats'),
};

export default apiClient;

