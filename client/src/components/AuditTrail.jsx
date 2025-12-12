/**
 * Audit Trail Component
 * 
 * Log data access and consent changes.
 * View all audit logs stored on the blockchain.
 */

import { useState, useCallback, useEffect } from 'react';
import { auditAPI, dataAPI, consentAPI } from '../services/api';
import { useData } from '../contexts/DataContext';

function AuditTrail() {
  // Use shared data from context
  const { patients, clinicians, loading: dataLoading, getPatientName, getClinicianName } = useData();
  
  const [activeTab, setActiveTab] = useState('log-access');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Additional data state
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [aiModels, setAiModels] = useState([]);
  const [consents, setConsents] = useState([]);
  const [loadingAdditionalData, setLoadingAdditionalData] = useState(false);

  // Load additional data on mount
  useEffect(() => {
    const loadAdditionalData = async () => {
      setLoadingAdditionalData(true);
      try {
        const [recordsRes, modelsRes, consentsRes] = await Promise.all([
          dataAPI.getMedicalRecords(),
          dataAPI.getAIModels(),
          consentAPI.getAll()
        ]);
        setMedicalRecords(recordsRes.data || []);
        setAiModels(modelsRes.data || []);
        setConsents(consentsRes.data?.consents || []);
      } catch (error) {
        console.error('Error loading additional data:', error);
      } finally {
        setLoadingAdditionalData(false);
      }
    };
    loadAdditionalData();
  }, []);

  // Helper function to get medical record details
  const getMedicalRecordDetails = (resourceId) => {
    if (!resourceId) return null;
    const record = medicalRecords.find(r => r.id === resourceId);
    if (record) {
      return {
        id: record.id,
        patientName: getPatientName(record.patientId),
        recordType: record.recordType || record.diagnosis || 'Record',
        diagnosis: record.diagnosis,
        date: record.date
      };
    }
    return null;
  }
  
  // All Audit Logs State
  const [allAuditLogs, setAllAuditLogs] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Log Data Access State
  const [dataAccessForm, setDataAccessForm] = useState({
    actorId: '',
    resourceId: '',
    resourceType: 'medicalRecord',
    granted: true,
    reason: '',
  });

  // Log Consent Change State
  const [consentLogForm, setConsentLogForm] = useState({
    consentId: '',
    action: 'granted',
    actorId: '',
    patientId: '',
    clinicianId: '',
    consentType: 'Data Access',
  });


  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleLogDataAccess = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await auditAPI.logDataAccess({
        actorId: dataAccessForm.actorId,
        resourceId: dataAccessForm.resourceId,
        resourceType: dataAccessForm.resourceType,
        granted: dataAccessForm.granted,
        reason: dataAccessForm.reason || (dataAccessForm.granted ? 'Access granted' : 'Access denied'),
      });

      showMessage('success', `Data access logged! Log ID: ${result.data.logId}`);
      setDataAccessForm({
        actorId: '',
        resourceId: '',
        resourceType: 'medicalRecord',
        granted: true,
        reason: '',
      });
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogConsentChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await auditAPI.logConsentChange({
        consentId: consentLogForm.consentId,
        action: consentLogForm.action,
        actorId: consentLogForm.actorId,
        patientId: consentLogForm.patientId,
        clinicianId: consentLogForm.clinicianId || undefined,
        consentType: consentLogForm.consentType || undefined,
      });

      showMessage('success', `Consent change logged! Log ID: ${result.data.logId}`);
      setConsentLogForm({
        consentId: '',
        action: 'granted',
        actorId: '',
        patientId: '',
        clinicianId: '',
        consentType: 'Data Access',
      });
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };


  const handleGetAllAuditLogs = useCallback(async () => {
    setLoading(true);
    setAllAuditLogs(null);
    setMessage({ type: '', text: '' });

    try {
      // Load medical records if not already loaded (needed for displaying record details)
      if (medicalRecords.length === 0) {
        try {
          const recordsRes = await dataAPI.getMedicalRecords();
          setMedicalRecords(recordsRes.data || []);
        } catch (error) {
          console.error('Error loading medical records:', error);
        }
      }

      const result = await auditAPI.getAll();
      setAllAuditLogs(result.data);
      setCurrentPage(1);
      showMessage('success', `Loaded ${result.data.count} audit logs`);
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  }, [medicalRecords.length]);

  // Pagination calculations
  const totalPages = allAuditLogs ? Math.ceil(allAuditLogs.logs.length / itemsPerPage) : 0;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = allAuditLogs ? allAuditLogs.logs.slice(startIndex, endIndex) : [];

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  return (
    <div className="audit-trail">
      <h2>Audit Trail</h2>
      <p className="feature-description">
        Log and query immutable audit records for data access, consent changes, and AI diagnostics.
      </p>

      {message.text && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="tabs">
        <button
          className={activeTab === 'log-access' ? 'active' : ''}
          onClick={() => setActiveTab('log-access')}
        >
          Log Data Access
        </button>
        <button
          className={activeTab === 'log-consent' ? 'active' : ''}
          onClick={() => setActiveTab('log-consent')}
        >
          Log Consent Change
        </button>
        <button
          className={activeTab === 'all' ? 'active' : ''}
          onClick={() => setActiveTab('all')}
        >
          All Audit Logs
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'log-access' && (
          <form onSubmit={handleLogDataAccess} className="form">
            <div className="form-group">
              <label>Actor *</label>
              <select
                value={dataAccessForm.actorId}
                onChange={(e) => setDataAccessForm({ ...dataAccessForm, actorId: e.target.value })}
                required
                disabled={dataLoading}
              >
                <option value="">Select an actor...</option>
                <optgroup label="Patients">
                  {patients.map(patient => (
                    <option key={`patient-${patient.id}`} value={patient.id}>
                      {patient.name} (Patient) - Age: {patient.age}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Clinicians">
                  {clinicians.map(clinician => (
                    <option key={`clinician-${clinician.id}`} value={clinician.id}>
                      {clinician.name} (Clinician) - {clinician.specialty}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div className="form-group">
              <label>Resource Type *</label>
              <select
                value={dataAccessForm.resourceType}
                onChange={(e) => setDataAccessForm({ ...dataAccessForm, resourceType: e.target.value, resourceId: '' })}
                required
              >
                <option value="medicalRecord">Medical Record</option>
                <option value="patient">Patient</option>
                <option value="consent">Consent</option>
              </select>
            </div>
            <div className="form-group">
              <label>Resource *</label>
              {dataAccessForm.resourceType === 'medicalRecord' && (
                <select
                  value={dataAccessForm.resourceId}
                  onChange={(e) => setDataAccessForm({ ...dataAccessForm, resourceId: e.target.value })}
                  required
                  disabled={loadingAdditionalData}
                >
                  <option value="">Select a medical record...</option>
                  {medicalRecords.slice(0, 100).map(record => (
                    <option key={record.id} value={record.id}>
                      {record.id.substring(0, 8)}... - {record.recordType || record.condition || 'Record'}
                    </option>
                  ))}
                </select>
              )}
              {dataAccessForm.resourceType === 'patient' && (
                <select
                  value={dataAccessForm.resourceId}
                  onChange={(e) => setDataAccessForm({ ...dataAccessForm, resourceId: e.target.value })}
                  required
                  disabled={dataLoading}
                >
                  <option value="">Select a patient...</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name} - Age: {patient.age}
                    </option>
                  ))}
                </select>
              )}
              {dataAccessForm.resourceType === 'consent' && (
                <select
                  value={dataAccessForm.resourceId}
                  onChange={(e) => setDataAccessForm({ ...dataAccessForm, resourceId: e.target.value })}
                  required
                  disabled={loadingAdditionalData}
                >
                  <option value="">Select a consent...</option>
                  {consents.map(consent => {
                    const patientName = getPatientName(consent.patientId);
                    const clinicianName = getClinicianName(consent.clinicianId);
                    return (
                      <option key={consent.consentId} value={consent.consentId}>
                        {patientName} → {clinicianName} - {consent.consentType}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
            <div className="form-group">
              <label>Access Granted</label>
              <select
                value={dataAccessForm.granted}
                onChange={(e) => setDataAccessForm({ ...dataAccessForm, granted: e.target.value === 'true' })}
              >
                <option value="true">Granted</option>
                <option value="false">Denied</option>
              </select>
            </div>
            <div className="form-group">
              <label>Reason</label>
              <input
                type="text"
                value={dataAccessForm.reason}
                onChange={(e) => setDataAccessForm({ ...dataAccessForm, reason: e.target.value })}
                placeholder="Reason for grant/denial"
              />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Logging...' : 'Log Data Access'}
            </button>
          </form>
        )}

        {activeTab === 'log-consent' && (
          <form onSubmit={handleLogConsentChange} className="form">
            <div className="form-group">
              <label>Consent *</label>
              <select
                value={consentLogForm.consentId}
                onChange={(e) => {
                  const selectedConsent = consents.find(c => c.consentId === e.target.value);
                  setConsentLogForm({
                    ...consentLogForm,
                    consentId: e.target.value,
                    patientId: selectedConsent?.patientId || '',
                    clinicianId: selectedConsent?.clinicianId || '',
                  });
                }}
                required
                disabled={loadingAdditionalData}
              >
                <option value="">Select a consent...</option>
                {consents.map(consent => {
                  const patientName = getPatientName(consent.patientId);
                  const clinicianName = getClinicianName(consent.clinicianId);
                  return (
                    <option key={consent.consentId} value={consent.consentId}>
                      {patientName} → {clinicianName} - {consent.consentType}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="form-group">
              <label>Action *</label>
              <select
                value={consentLogForm.action}
                onChange={(e) => setConsentLogForm({ ...consentLogForm, action: e.target.value })}
                required
              >
                <option value="granted">Granted</option>
                <option value="revoked">Revoked</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div className="form-group">
              <label>Actor *</label>
              <select
                value={consentLogForm.actorId}
                onChange={(e) => setConsentLogForm({ ...consentLogForm, actorId: e.target.value })}
                required
                disabled={dataLoading}
              >
                <option value="">Select an actor...</option>
                <optgroup label="Patients">
                  {patients.map(patient => (
                    <option key={`patient-${patient.id}`} value={patient.id}>
                      {patient.name} (Patient) - Age: {patient.age}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Clinicians">
                  {clinicians.map(clinician => (
                    <option key={`clinician-${clinician.id}`} value={clinician.id}>
                      {clinician.name} (Clinician) - {clinician.specialty}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div className="form-group">
              <label>Patient *</label>
              <select
                value={consentLogForm.patientId}
                onChange={(e) => setConsentLogForm({ ...consentLogForm, patientId: e.target.value })}
                required
                disabled={dataLoading}
              >
                <option value="">Select a patient...</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name} - Age: {patient.age}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Clinician</label>
              <select
                value={consentLogForm.clinicianId}
                onChange={(e) => setConsentLogForm({ ...consentLogForm, clinicianId: e.target.value })}
                disabled={dataLoading}
              >
                <option value="">Select a clinician (optional)...</option>
                {clinicians.map(clinician => (
                  <option key={clinician.id} value={clinician.id}>
                    {clinician.name} - {clinician.specialty}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Consent Type</label>
              <select
                value={consentLogForm.consentType}
                onChange={(e) => setConsentLogForm({ ...consentLogForm, consentType: e.target.value })}
              >
                <option value="Data Access">Data Access</option>
                <option value="AI Analysis">AI Analysis</option>
                <option value="Research">Research</option>
                <option value="Treatment">Treatment</option>
              </select>
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Logging...' : 'Log Consent Change'}
            </button>
          </form>
        )}

        {activeTab === 'all' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3>All Audit Logs</h3>
                {allAuditLogs && (
                  <small style={{ color: '#666', display: 'block', marginTop: '0.25rem' }}>
                    {allAuditLogs.count} total
                  </small>
                )}
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {allAuditLogs && (
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
                  onClick={handleGetAllAuditLogs} 
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 1rem' }}
                >
                  {loading ? 'Loading...' : allAuditLogs ? 'Refresh' : 'Load Audit Logs'}
                </button>
              </div>
            </div>

            {loading && !allAuditLogs && (
              <div className="loading-message">
                Loading all audit logs...
              </div>
            )}

            {!allAuditLogs && !loading && (
              <div className="result-box" style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: '#666', margin: 0 }}>
                  Click "Load Audit Logs" above to load all audit logs from the blockchain.
                </p>
              </div>
            )}

            {allAuditLogs && (
              <div className="result-box">
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Timestamp</th>
                        <th>Actor ID</th>
                        <th>Resource ID</th>
                        <th>Action</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLogs.map((log, idx) => {
                        const timestamp = log.timestamp ? (() => {
                          try {
                            const date = new Date(log.timestamp);
                            return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString();
                          } catch (e) {
                            return 'Invalid Date';
                          }
                        })() : 'N/A';
                        
                        // Get medical record details if resourceType is medicalRecord
                        const recordDetails = log.resourceType === 'medicalRecord' && log.resourceId 
                          ? getMedicalRecordDetails(log.resourceId)
                          : null;
                        
                        // Format resource display
                        const resourceDisplay = recordDetails 
                          ? `${recordDetails.patientName} - ${recordDetails.recordType}`
                          : (log.resourceId || log.recordId || 'N/A');
                        
                        return (
                          <tr key={startIndex + idx}>
                            <td>
                              <span className="badge badge-info">{log.type}</span>
                              {log.pending && (
                                <span className="badge" style={{ marginLeft: '5px', backgroundColor: '#ff9800', color: 'white' }}>Pending</span>
                              )}
                            </td>
                            <td>{log.pending ? 'Pending' : timestamp}</td>
                            <td className="code">
                              {log.actorId ? (getPatientName(log.actorId) || getClinicianName(log.actorId) || log.actorId) : 'N/A'}
                            </td>
                            <td className="code" title={log.resourceId || log.recordId || ''}>
                              {resourceDisplay}
                              {recordDetails && (
                                <small style={{ display: 'block', color: '#666', fontSize: '0.8em', marginTop: '2px' }}>
                                  ID: {log.resourceId.substring(0, 8)}...
                                </small>
                              )}
                            </td>
                            <td>{log.action || 'N/A'}</td>
                            <td>
                              <details>
                                <summary>View</summary>
                                <pre style={{ fontSize: '0.85em', maxHeight: '200px', overflow: 'auto' }}>
                                  {JSON.stringify({
                                    ...log,
                                    timestamp: log.timestamp || 'N/A',
                                    blockIndex: log.blockIndex ?? 'Pending',
                                    blockHash: log.blockHash || 'Pending',
                                    blockTimestamp: log.blockTimestamp || 'Pending'
                                  }, null, 2)}
                                </pre>
                              </details>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      Showing {startIndex + 1} to {Math.min(endIndex, allAuditLogs.logs.length)} of {allAuditLogs.logs.length} logs
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 1rem' }}
                      >
                        Previous
                      </button>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 10) {
                            pageNum = i + 1;
                          } else if (currentPage <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 4) {
                            pageNum = totalPages - 9 + i;
                          } else {
                            pageNum = currentPage - 5 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`btn ${currentPage === pageNum ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ padding: '0.5rem 0.75rem', minWidth: '40px' }}
                            >
                              {pageNum}
                            </button>
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

export default AuditTrail;

