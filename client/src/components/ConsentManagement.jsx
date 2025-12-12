/**
 * Consent Management Component
 * 
 * Manage patient consent: grant, revoke, check, and view all consents.
 */

import React, { useState, useCallback, useRef } from 'react';
import { consentAPI } from '../services/api';
import { useData } from '../contexts/DataContext';

function ConsentManagement({ onConsentUpdate }) {
  // Use shared data from context
  const { patients, clinicians, loading: dataLoading, getPatientName, getClinicianName } = useData();
  
  const [activeTab, setActiveTab] = useState('grant');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }, []);

  // Grant Consent State
  const [grantForm, setGrantForm] = useState({
    patientId: '',
    clinicianId: '',
    consentType: 'Data Access',
    expiresAt: '',
    purpose: 'Treatment',
  });

  // Revoke Consent State
  const [revokeForm, setRevokeForm] = useState({
    consentId: '',
  });

  // Check Consent State
  const [checkForm, setCheckForm] = useState({
    patientId: '',
    clinicianId: '',
    type: 'Data Access',
  });
  const [checkResult, setCheckResult] = useState(null);

  // All Consents State
  const [allConsents, setAllConsents] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Track if we're currently fetching to prevent concurrent requests
  const isFetchingRef = useRef(false);

  // getPatientName and getClinicianName are provided by useData() hook

  const handleGetAllConsents = useCallback(async () => {
    // Prevent concurrent requests
    if (isFetchingRef.current) {
      return;
    }
    
    isFetchingRef.current = true;
    setLoading(true);
    setAllConsents(null);
    setMessage({ type: '', text: '' });

    try {
      const result = await consentAPI.getAll();
      setAllConsents(result.data);
      setCurrentPage(1); // Reset to first page when loading new data
      showMessage('success', `Found ${result.data.count} consent records`);
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []); // Empty deps - showMessage is stable, doesn't need to be in deps

  // Pagination calculations
  const totalPages = allConsents ? Math.ceil(allConsents.consents.length / itemsPerPage) : 0;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedConsents = allConsents ? allConsents.consents.slice(startIndex, endIndex) : [];
  
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1); // Reset to first page
  };

  // Note: All consents are only loaded when Refresh button is clicked, not automatically

  const handleGrantConsent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await consentAPI.grant({
        patientId: grantForm.patientId,
        clinicianId: grantForm.clinicianId,
        consentType: grantForm.consentType,
        expiresAt: grantForm.expiresAt || undefined,
        purpose: grantForm.purpose,
      });

      showMessage('success', `Consent granted successfully! Consent ID: ${result.data.consentId}`);
      setGrantForm({
        patientId: '',
        clinicianId: '',
        consentType: 'Data Access',
        expiresAt: '',
        purpose: 'Treatment',
      });
      // Refresh dashboard data
      if (onConsentUpdate) onConsentUpdate();
      // Refresh all consents list if it's already loaded
      if (allConsents !== null) {
        handleGetAllConsents();
      }
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeConsent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await consentAPI.revoke({
        consentId: revokeForm.consentId,
      });

      showMessage('success', `Consent revoked successfully!`);
      setRevokeForm({ consentId: '' });
      // Refresh dashboard data
      if (onConsentUpdate) onConsentUpdate();
      // Refresh all consents list if it's already loaded
      if (allConsents !== null) {
        handleGetAllConsents();
      }
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckConsent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setCheckResult(null);
    setMessage({ type: '', text: '' });

    try {
      const result = await consentAPI.check(
        checkForm.patientId,
        checkForm.clinicianId,
        checkForm.type
      );
      setCheckResult(result.data);
      showMessage('success', 'Consent check completed');
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="consent-management">
      <h2>Consent Management</h2>
      <p className="feature-description">
        Manage patient consent for data access. Grant, revoke, check, and track consent records on the blockchain.
      </p>

      {message.text && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="tabs">
        <button
          className={activeTab === 'grant' ? 'active' : ''}
          onClick={() => setActiveTab('grant')}
        >
          Grant Consent
        </button>
        <button
          className={activeTab === 'revoke' ? 'active' : ''}
          onClick={() => setActiveTab('revoke')}
        >
          Revoke Consent
        </button>
        <button
          className={activeTab === 'check' ? 'active' : ''}
          onClick={() => setActiveTab('check')}
        >
          Check Consent
        </button>
        <button
          className={activeTab === 'history' ? 'active' : ''}
          onClick={() => setActiveTab('history')}
        >
          All Consents
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'grant' && (
          <form onSubmit={handleGrantConsent} className="form">
            <div className="form-group">
              <label>Patient *</label>
              <select
                value={grantForm.patientId}
                onChange={(e) => setGrantForm({ ...grantForm, patientId: e.target.value })}
                required
                disabled={dataLoading}
              >
                <option value="">Select a patient...</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name} (Age: {patient.age}, {patient.gender})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Clinician *</label>
              <select
                value={grantForm.clinicianId}
                onChange={(e) => setGrantForm({ ...grantForm, clinicianId: e.target.value })}
                required
                disabled={dataLoading}
              >
                <option value="">Select a clinician...</option>
                {clinicians.map(clinician => (
                  <option key={clinician.id} value={clinician.id}>
                    {clinician.name} - {clinician.specialty} ({clinician.hospital})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Consent Type *</label>
              <select
                value={grantForm.consentType}
                onChange={(e) => setGrantForm({ ...grantForm, consentType: e.target.value })}
                required
              >
                <option value="Data Access">Data Access</option>
                <option value="AI Analysis">AI Analysis</option>
                <option value="Research">Research</option>
                <option value="Treatment">Treatment</option>
              </select>
            </div>
            <div className="form-group">
              <label>Purpose</label>
              <input
                type="text"
                value={grantForm.purpose}
                onChange={(e) => setGrantForm({ ...grantForm, purpose: e.target.value })}
                placeholder="Treatment"
              />
            </div>
            <div className="form-group">
              <label>Expires At (Optional)</label>
              <input
                type="datetime-local"
                value={grantForm.expiresAt}
                onChange={(e) => setGrantForm({ ...grantForm, expiresAt: e.target.value })}
              />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Granting...' : 'Grant Consent'}
            </button>
          </form>
        )}

        {activeTab === 'revoke' && (
          <form onSubmit={handleRevokeConsent} className="form">
            <div className="form-group">
              <label>Consent ID *</label>
              <input
                type="text"
                value={revokeForm.consentId}
                onChange={(e) => setRevokeForm({ ...revokeForm, consentId: e.target.value })}
                placeholder="Enter consent ID to revoke"
                required
              />
              <small className="help-text">
                Enter the consent ID to revoke. The revocation will be recorded on the blockchain.
              </small>
            </div>
            <button type="submit" disabled={loading} className="btn btn-danger">
              {loading ? 'Revoking...' : 'Revoke Consent'}
            </button>
          </form>
        )}

        {activeTab === 'check' && (
          <div>
            <form onSubmit={handleCheckConsent} className="form">
              <div className="form-group">
                <label>Patient *</label>
                <select
                  value={checkForm.patientId}
                  onChange={(e) => setCheckForm({ ...checkForm, patientId: e.target.value })}
                  required
                  disabled={dataLoading}
                >
                  <option value="">Select a patient...</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name} (Age: {patient.age}, {patient.gender})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Clinician *</label>
                <select
                  value={checkForm.clinicianId}
                  onChange={(e) => setCheckForm({ ...checkForm, clinicianId: e.target.value })}
                  required
                  disabled={dataLoading}
                >
                  <option value="">Select a clinician...</option>
                  {clinicians.map(clinician => (
                    <option key={clinician.id} value={clinician.id}>
                      {clinician.name} - {clinician.specialty} ({clinician.hospital})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Consent Type *</label>
                <select
                  value={checkForm.type}
                  onChange={(e) => setCheckForm({ ...checkForm, type: e.target.value })}
                  required
                >
                  <option value="Data Access">Data Access</option>
                  <option value="AI Analysis">AI Analysis</option>
                  <option value="Research">Research</option>
                  <option value="Treatment">Treatment</option>
                </select>
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'Checking...' : 'Check Consent'}
              </button>
            </form>

            {checkResult && (
              <div className="result-box">
                <h3>Check Result</h3>
                <div className={`status-badge ${checkResult.hasConsent ? 'success' : 'error'}`}>
                  {checkResult.hasConsent ? '✓ Consent Valid' : '✗ No Valid Consent'}
                </div>
                <pre>{JSON.stringify(checkResult, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3>All Consents</h3>
                {allConsents && (
                  <small style={{ color: '#666', display: 'block', marginTop: '0.25rem' }}>
                    {allConsents.count} total
                  </small>
                )}
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {allConsents && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label htmlFor="itemsPerPage" style={{ fontSize: '0.9rem', color: '#666' }}>Show:</label>
                    <select
                      id="itemsPerPage"
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(e.target.value)}
                      style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                )}
                <button 
                  onClick={handleGetAllConsents} 
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 1rem' }}
                >
                  {loading ? 'Loading...' : allConsents ? 'Refresh' : 'Load Consents'}
                </button>
              </div>
            </div>

            {loading && !allConsents && (
              <div className="loading-message">
                Loading all consents...
              </div>
            )}

            {!allConsents && !loading && (
              <div className="result-box" style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: '#666', margin: 0 }}>
                  Click "Load Consents" above to load all consents from the blockchain.
                </p>
              </div>
            )}

            {allConsents && (
              <div className="result-box">
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Consent ID</th>
                        <th>Patient</th>
                        <th>Clinician</th>
                        <th>Type</th>
                        <th>Action</th>
                        <th>Timestamp</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedConsents.map((record, idx) => {
                        const isExpired = record.expiresAt && new Date(record.expiresAt) < new Date();
                        const isRevoked = record.isRevoked === true;
                        const status = isExpired ? 'expired' : isRevoked ? 'revoked' : 'active';
                        
                        return (
                          <tr key={startIndex + idx}>
                            <td className="code">{record.consentId}</td>
                            <td>{getPatientName(record.patientId)}</td>
                            <td>{getClinicianName(record.clinicianId)}</td>
                            <td>{record.consentType}</td>
                            <td>
                              <span className={`badge badge-${record.action}`}>
                                {record.action}
                              </span>
                            </td>
                            <td>{record.timestamp ? new Date(record.timestamp).toLocaleString() : '-'}</td>
                            <td>
                              <span className={`badge badge-${status}`}>
                                {status === 'expired' ? 'Expired' : status === 'revoked' ? 'Revoked' : 'Active'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="pagination">
                    <div className="pagination-info">
                      Showing {startIndex + 1} to {Math.min(endIndex, allConsents.consents.length)} of {allConsents.consents.length} consents
                    </div>
                    <div className="pagination-controls">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 1rem' }}
                      >
                        Previous
                      </button>
                      
                      <div className="pagination-numbers">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(page => {
                            // Show first page, last page, current page, and pages around current
                            return page === 1 || 
                                   page === totalPages || 
                                   (page >= currentPage - 2 && page <= currentPage + 2);
                          })
                          .map((page, idx, arr) => {
                            // Add ellipsis if there's a gap
                            const prevPage = arr[idx - 1];
                            const showEllipsis = prevPage && page - prevPage > 1;
                            
                            return (
                              <React.Fragment key={page}>
                                {showEllipsis && <span className="pagination-ellipsis">...</span>}
                                <button
                                  onClick={() => handlePageChange(page)}
                                  className={`btn ${currentPage === page ? 'btn-primary' : 'btn-secondary'}`}
                                  style={{ padding: '0.5rem 0.75rem', minWidth: '40px' }}
                                >
                                  {page}
                                </button>
                              </React.Fragment>
                            );
                          })}
                      </div>
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 1rem' }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

export default ConsentManagement;

