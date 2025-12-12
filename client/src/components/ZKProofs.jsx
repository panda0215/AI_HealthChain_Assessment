/**
 * ZK Proofs Component
 * 
 * Generate and verify zero-knowledge proofs for consent and permissions.
 * Proves validity without revealing sensitive data.
 */

import { useState, useEffect } from 'react';
import { zkAPI, consentAPI } from '../services/api';
import { useData } from '../contexts/DataContext';

function ZKProofs() {
  // Use shared data from context
  const { patients, clinicians, loading: dataLoading, getPatientName, getClinicianName } = useData();
  
  const [activeTab, setActiveTab] = useState('consent-proof');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Consents state
  const [consents, setConsents] = useState([]);
  const [loadingConsents, setLoadingConsents] = useState(false);

  // Consent Proof State
  const [consentProofForm, setConsentProofForm] = useState({
    consentId: '',
  });
  const [consentProofResult, setConsentProofResult] = useState(null);

  // Load consents on mount
  useEffect(() => {
    const loadConsents = async () => {
      setLoadingConsents(true);
      try {
        const result = await consentAPI.getAll();
        // Filter to only show valid (non-revoked, non-expired) consents
        const validConsents = result.data.consents.filter(c => !c.isRevoked && !c.isExpired);
        setConsents(validConsents);
      } catch (error) {
        console.error('Failed to load consents:', error);
      } finally {
        setLoadingConsents(false);
      }
    };
    loadConsents();
  }, []);

  // Verify Consent Proof State
  const [verifyConsentProof, setVerifyConsentProof] = useState('');
  const [verifyConsentResult, setVerifyConsentResult] = useState(null);

  // Permission Proof State
  const [permissionProofForm, setPermissionProofForm] = useState({
    userId: '',
    permissions: 'read,write',
  });
  const [permissionProofResult, setPermissionProofResult] = useState(null);

  // Verify Permission Proof State
  const [verifyPermissionForm, setVerifyPermissionForm] = useState({
    proof: '',
    requiredPermissions: 'read,write',
  });
  const [verifyPermissionResult, setVerifyPermissionResult] = useState(null);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleGenerateConsentProof = async (e) => {
    e.preventDefault();
    setLoading(true);
    setConsentProofResult(null);
    setMessage({ type: '', text: '' });

    try {
      const result = await zkAPI.generateConsentProof({
        consentId: consentProofForm.consentId,
      });

      setConsentProofResult(result.data);
      showMessage('success', 'Consent proof generated! Note: Patient and Clinician IDs are hidden.');
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyConsentProof = async () => {
    if (!verifyConsentProof.trim()) {
      showMessage('error', 'Please enter proof JSON');
      return;
    }

    setLoading(true);
    setVerifyConsentResult(null);
    setMessage({ type: '', text: '' });

    try {
      const proof = JSON.parse(verifyConsentProof);
      const result = await zkAPI.verifyConsentProof({ proof });
      setVerifyConsentResult(result.data);
      showMessage('success', result.data.valid ? 'Proof verified!' : 'Proof invalid!');
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePermissionProof = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPermissionProofResult(null);
    setMessage({ type: '', text: '' });

    try {
      const permissions = permissionProofForm.permissions.split(',').map(p => p.trim()).filter(p => p);
      const result = await zkAPI.generatePermissionProof({
        userId: permissionProofForm.userId,
        permissions,
      });

      setPermissionProofResult(result.data);
      showMessage('success', 'Permission proof generated! Note: User ID is hidden.');
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPermissionProof = async (e) => {
    e.preventDefault();
    setLoading(true);
    setVerifyPermissionResult(null);
    setMessage({ type: '', text: '' });

    try {
      const proof = JSON.parse(verifyPermissionForm.proof);
      const requiredPermissions = verifyPermissionForm.requiredPermissions
        .split(',')
        .map(p => p.trim())
        .filter(p => p);

      const result = await zkAPI.verifyPermissionProof({
        proof,
        requiredPermissions,
      });

      setVerifyPermissionResult(result.data);
      showMessage('success', result.data.valid ? 'Permission verified!' : 'Permission invalid!');
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="zk-proofs">
      <h2>Zero-Knowledge Proofs</h2>
      <p className="feature-description">
        Generate and verify zero-knowledge proofs for consent and permissions without revealing sensitive data.
      </p>

      {message.text && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="tabs">
        <button
          className={activeTab === 'consent-proof' ? 'active' : ''}
          onClick={() => setActiveTab('consent-proof')}
        >
          Generate Consent Proof
        </button>
        <button
          className={activeTab === 'verify-consent' ? 'active' : ''}
          onClick={() => setActiveTab('verify-consent')}
        >
          Verify Consent Proof
        </button>
        <button
          className={activeTab === 'permission-proof' ? 'active' : ''}
          onClick={() => setActiveTab('permission-proof')}
        >
          Generate Permission Proof
        </button>
        <button
          className={activeTab === 'verify-permission' ? 'active' : ''}
          onClick={() => setActiveTab('verify-permission')}
        >
          Verify Permission Proof
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'consent-proof' && (
          <form onSubmit={handleGenerateConsentProof} className="form">
            <div className="form-group">
              <label>Consent *</label>
              <select
                value={consentProofForm.consentId}
                onChange={(e) => setConsentProofForm({ ...consentProofForm, consentId: e.target.value })}
                required
                disabled={loadingConsents}
              >
                <option value="">Select a consent...</option>
                {consents.map(consent => {
                  const patientName = getPatientName ? getPatientName(consent.patientId) : consent.patientId.substring(0, 8);
                  const clinicianName = getClinicianName ? getClinicianName(consent.clinicianId) : consent.clinicianId.substring(0, 8);
                  return (
                    <option key={consent.consentId} value={consent.consentId}>
                      {patientName} → {clinicianName} - {consent.consentType}
                    </option>
                  );
                })}
              </select>
              <small className="form-help">
                {loadingConsents ? 'Loading consents...' : `Select from ${consents.length} available consents`}
              </small>
            </div>
            <button type="submit" disabled={loading || loadingConsents} className="btn btn-primary">
              {loading ? 'Generating...' : 'Generate Consent Proof'}
            </button>

            {consentProofResult && (
              <div className="result-box">
                <h3>Consent Proof Generated</h3>
                <div style={{ position: 'relative', marginTop: '15px' }}>
                  <pre style={{ maxHeight: '300px', overflow: 'auto' }}>{JSON.stringify(consentProofResult.proof, null, 2)}</pre>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(consentProofResult.proof, null, 2));
                      showMessage('success', 'Proof copied to clipboard!');
                    }}
                    className="btn btn-secondary"
                    style={{ position: 'absolute', top: '10px', right: '10px', padding: '4px 12px', fontSize: '0.85em' }}
                  >
                    Copy Proof
                  </button>
                </div>
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #ddd' }}>
                  <strong>Quick Action:</strong>
                  <button
                    type="button"
                    onClick={() => {
                      setVerifyConsentProof(JSON.stringify(consentProofResult.proof, null, 2));
                      setActiveTab('verify-consent');
                      showMessage('success', 'Proof copied to Verify tab!');
                    }}
                    className="btn btn-secondary"
                    style={{ marginLeft: '10px', padding: '6px 12px', fontSize: '0.9em' }}
                  >
                    Use in Verify Tab
                  </button>
                </div>
              </div>
            )}
          </form>
        )}

        {activeTab === 'verify-consent' && (
          <div>
            {consentProofResult && (
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '5px', border: '1px solid #4caf50' }}>
                <strong>Quick Fill:</strong>
                <button
                  type="button"
                  onClick={() => {
                    setVerifyConsentProof(JSON.stringify(consentProofResult.proof, null, 2));
                    showMessage('success', 'Proof filled from previous result!');
                  }}
                  className="btn btn-secondary"
                  style={{ marginLeft: '10px', padding: '6px 12px', fontSize: '0.9em' }}
                >
                  Use Previous Proof Result
                </button>
              </div>
            )}
            <div className="form-group">
              <label>Proof (JSON) *</label>
              <div style={{ position: 'relative' }}>
                <textarea
                  value={verifyConsentProof}
                  onChange={(e) => setVerifyConsentProof(e.target.value)}
                  placeholder='{"commitment":"...","verificationKey":"...","salt":"...","valid":true}'
                  rows={10}
                  className="textarea"
                  required
                />
                {verifyConsentProof && (
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(verifyConsentProof);
                        setVerifyConsentProof(JSON.stringify(parsed, null, 2));
                        showMessage('success', 'Proof formatted!');
                      } catch (e) {
                        showMessage('error', 'Invalid JSON format');
                      }
                    }}
                    className="btn btn-secondary"
                    style={{ position: 'absolute', top: '10px', right: '10px', padding: '4px 8px', fontSize: '0.8em' }}
                  >
                    ✨ Format JSON
                  </button>
                )}
              </div>
            </div>
            <button onClick={handleVerifyConsentProof} disabled={loading || !verifyConsentProof.trim()} className="btn btn-primary">
              {loading ? 'Verifying...' : 'Verify Consent Proof'}
            </button>

            {verifyConsentResult && (
              <div className="result-box">
                <h3>Verification Result</h3>
                <div className={`status-badge ${verifyConsentResult.valid ? 'success' : 'error'}`}>
                  {verifyConsentResult.valid ? 'Valid' : 'Invalid'}
                </div>
                <div className="info-item">
                  <strong>Has Consent:</strong> {verifyConsentResult.hasConsent ? 'Yes' : 'No'}
                </div>
                <pre>{JSON.stringify(verifyConsentResult, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'permission-proof' && (
          <form onSubmit={handleGeneratePermissionProof} className="form">
            <div className="form-group">
              <label>User *</label>
              <select
                value={permissionProofForm.userId}
                onChange={(e) => setPermissionProofForm({ ...permissionProofForm, userId: e.target.value })}
                required
                disabled={dataLoading}
              >
                <option value="">Select a user...</option>
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
              <small className="form-help">
                Select a patient or clinician. The User ID will be hidden in the proof.
              </small>
            </div>
            <div className="form-group">
              <label>Permissions * (comma-separated)</label>
              <input
                type="text"
                value={permissionProofForm.permissions}
                onChange={(e) => setPermissionProofForm({ ...permissionProofForm, permissions: e.target.value })}
                placeholder="read,write,admin"
                required
              />
              <small className="form-help">
                Enter permissions separated by commas (e.g., "read,write,admin")
              </small>
            </div>
            <button type="submit" disabled={loading || dataLoading} className="btn btn-primary">
              {loading ? 'Generating...' : 'Generate Permission Proof'}
            </button>

            {permissionProofResult && (
              <div className="result-box">
                <h3>Permission Proof Generated</h3>
                <div style={{ position: 'relative', marginTop: '15px' }}>
                  <pre style={{ maxHeight: '300px', overflow: 'auto' }}>{JSON.stringify(permissionProofResult.proof, null, 2)}</pre>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(permissionProofResult.proof, null, 2));
                      showMessage('success', 'Proof copied to clipboard!');
                    }}
                    className="btn btn-secondary"
                    style={{ position: 'absolute', top: '10px', right: '10px', padding: '4px 12px', fontSize: '0.85em' }}
                  >
                    Copy Proof
                  </button>
                </div>
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #ddd' }}>
                  <strong>Quick Action:</strong>
                  <button
                    type="button"
                    onClick={() => {
                      setVerifyPermissionForm({
                        proof: JSON.stringify(permissionProofResult.proof, null, 2),
                        requiredPermissions: permissionProofForm.permissions,
                      });
                      setActiveTab('verify-permission');
                      showMessage('success', 'Proof copied to Verify tab!');
                    }}
                    className="btn btn-secondary"
                    style={{ marginLeft: '10px', padding: '6px 12px', fontSize: '0.9em' }}
                  >
                    Use in Verify Tab
                  </button>
                </div>
              </div>
            )}
          </form>
        )}

        {activeTab === 'verify-permission' && (
          <form onSubmit={handleVerifyPermissionProof} className="form">
            {permissionProofResult && (
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '5px', border: '1px solid #4caf50' }}>
                <strong>Quick Fill:</strong>
                <button
                  type="button"
                  onClick={() => {
                    setVerifyPermissionForm({
                      proof: JSON.stringify(permissionProofResult.proof, null, 2),
                      requiredPermissions: permissionProofForm.permissions,
                    });
                    showMessage('success', 'Fields filled from previous proof result!');
                  }}
                  className="btn btn-secondary"
                  style={{ marginLeft: '10px', padding: '6px 12px', fontSize: '0.9em' }}
                >
                  Use Previous Proof Result
                </button>
              </div>
            )}
            <div className="form-group">
              <label>Proof (JSON) *</label>
              <div style={{ position: 'relative' }}>
                <textarea
                  value={verifyPermissionForm.proof}
                  onChange={(e) => setVerifyPermissionForm({ ...verifyPermissionForm, proof: e.target.value })}
                  placeholder='{"commitment":"...","verificationKey":"...","permissions":["read","write"],"hasPermissions":true}'
                  rows={10}
                  className="textarea"
                  required
                />
                {verifyPermissionForm.proof && (
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(verifyPermissionForm.proof);
                        setVerifyPermissionForm({ ...verifyPermissionForm, proof: JSON.stringify(parsed, null, 2) });
                        showMessage('success', 'Proof formatted!');
                      } catch (e) {
                        showMessage('error', 'Invalid JSON format');
                      }
                    }}
                    className="btn btn-secondary"
                    style={{ position: 'absolute', top: '10px', right: '10px', padding: '4px 8px', fontSize: '0.8em' }}
                  >
                    ✨ Format JSON
                  </button>
                )}
              </div>
            </div>
            <div className="form-group">
              <label>Required Permissions * (comma-separated)</label>
              <input
                type="text"
                value={verifyPermissionForm.requiredPermissions}
                onChange={(e) => setVerifyPermissionForm({ ...verifyPermissionForm, requiredPermissions: e.target.value })}
                placeholder="read,write"
                required
              />
              <small className="form-help">
                Enter permissions separated by commas (e.g., "read,write,admin")
              </small>
            </div>
            <button type="submit" disabled={loading || !verifyPermissionForm.proof || !verifyPermissionForm.requiredPermissions} className="btn btn-primary">
              {loading ? 'Verifying...' : 'Verify Permission Proof'}
            </button>

            {verifyPermissionResult && (
              <div className="result-box">
                <h3>Verification Result</h3>
                <div className={`status-badge ${verifyPermissionResult.valid ? 'success' : 'error'}`}>
                  {verifyPermissionResult.valid ? 'Valid' : 'Invalid'}
                </div>
                <div className="info-item">
                  <strong>Has Required Permissions:</strong> {verifyPermissionResult.hasRequiredPermissions ? 'Yes' : 'No'}
                </div>
                <pre>{JSON.stringify(verifyPermissionResult, null, 2)}</pre>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

export default ZKProofs;

