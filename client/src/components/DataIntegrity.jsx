/**
 * Data Integrity Component
 * 
 * Create Merkle trees from medical records and verify data integrity.
 * Generate proofs and verify records haven't been tampered with.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { integrityAPI } from '../services/api';

function DataIntegrity() {
  const [activeTab, setActiveTab] = useState('create');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Create Tree State
  const [recordsInput, setRecordsInput] = useState('');
  const [treeResult, setTreeResult] = useState(null);
  // Store created trees for reuse
  const [createdTrees, setCreatedTrees] = useState([]);

  // Generate Proof State
  const [proofForm, setProofForm] = useState({
    record: '',
    root: '',
    selectedRecordIndex: undefined,
  });
  const [proofResult, setProofResult] = useState(null);
  const [selectedTreeRecords, setSelectedTreeRecords] = useState(null);
  const [loadingTreeRecords, setLoadingTreeRecords] = useState(false);

  // Verify State
  const [verifyForm, setVerifyForm] = useState({
    record: '',
    proof: '',
    root: '',
  });
  const [verifyResult, setVerifyResult] = useState(null);

  // Batch Verify State
  const [batchResult, setBatchResult] = useState(null);
  const [batchSelectedRoot, setBatchSelectedRoot] = useState('');

  // All Trees State
  const [allTrees, setAllTrees] = useState(null);
  
  // Track previous tab to prevent unnecessary refreshes
  const previousTabRef = useRef(activeTab);
  // Track if we're currently fetching to prevent concurrent requests
  const isFetchingRef = useRef(false);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleGetAllTrees = useCallback(async () => {
    // Prevent concurrent requests
    if (isFetchingRef.current) {
      return;
    }
    
    isFetchingRef.current = true;
    setLoading(true);
    setAllTrees(null);
    setMessage({ type: '', text: '' });

    try {
      const result = await integrityAPI.getAll();
      setAllTrees(result.data);
      showMessage('success', `Found ${result.data.count} Merkle tree${result.data.count !== 1 ? 's' : ''}`);
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  // Auto-load all trees when tab is selected
  useEffect(() => {
    // Only refresh if we're switching TO the all-trees tab
    const isSwitchingToAllTrees = activeTab === 'all-trees' && previousTabRef.current !== 'all-trees';
    
    if (isSwitchingToAllTrees && !isFetchingRef.current) {
      handleGetAllTrees();
    }
    
    // Update the previous tab reference
    previousTabRef.current = activeTab;
  }, [activeTab, handleGetAllTrees]);

  const handleCreateTree = async () => {
    if (!recordsInput.trim()) {
      showMessage('error', 'Please enter records');
      return;
    }

    setLoading(true);
    setTreeResult(null);
    setMessage({ type: '', text: '' });

    try {
      let records;
      try {
        records = JSON.parse(recordsInput);
      } catch (e) {
        // If not JSON, treat as array of strings
        records = recordsInput.split('\n').filter(r => r.trim());
      }

      if (!Array.isArray(records) || records.length === 0) {
        throw new Error('Records must be a non-empty array');
      }

      const result = await integrityAPI.createTree({
        records,
        storeOnChain: true,
        description: `Merkle tree for ${records.length} records`,
      });

      setTreeResult(result.data);
      // Store the created tree for reuse
      const newTree = {
        root: result.data.root,
        recordCount: result.data.recordCount,
        createdAt: new Date().toISOString()
      };
      setCreatedTrees([...createdTrees, newTree]);
      showMessage('success', `Merkle tree created! Root: ${result.data.root}`);
      // Always refresh all trees list to show the new tree
      handleGetAllTrees();
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTreeRecords = async (root) => {
    if (!root) return;
    
    setLoadingTreeRecords(true);
    try {
      const result = await integrityAPI.getTreeRecords(root);
      setSelectedTreeRecords(result.data.records);
      showMessage('success', `Loaded ${result.data.count} records from tree`);
    } catch (error) {
      showMessage('error', error.message || 'Could not load tree records. They may not be available in cache.');
      setSelectedTreeRecords(null);
    } finally {
      setLoadingTreeRecords(false);
    }
  };

  const handleGenerateProof = async (e) => {
    e.preventDefault();
    setLoading(true);
    setProofResult(null);
    setMessage({ type: '', text: '' });

    try {
      // Record is optional - if not provided, will use hash from selected record or proof
      let record = null;
      if (proofForm.record && proofForm.record.trim()) {
        try {
          record = JSON.parse(proofForm.record);
        } catch (e) {
          // If not JSON, treat as hash or string
          record = proofForm.record.trim();
        }
      }

      const result = await integrityAPI.generateProof({
        record: record || selectedTreeRecords?.[0], // Use first selected record if no input
        root: proofForm.root,
      });

      setProofResult(result.data);
      showMessage('success', 'Proof generated successfully!');
    } catch (error) {
      let errorMsg = error.message;
      if (error.message.includes('not found in tree')) {
        errorMsg = 'Record not found in tree. Please select a record from the tree using "Load Records" button.';
      }
      showMessage('error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setVerifyResult(null);
    setMessage({ type: '', text: '' });

    try {
      let proof;
      try {
        proof = JSON.parse(verifyForm.proof);
      } catch (e) {
        showMessage('error', 'Invalid proof JSON format');
        setLoading(false);
        return;
      }

      // Record is optional - if not provided, verification will use proof.leaf
      let record = null;
      if (verifyForm.record && verifyForm.record.trim()) {
        try {
          record = JSON.parse(verifyForm.record);
        } catch (e) {
          record = verifyForm.record.trim();
        }
      }

      const result = await integrityAPI.verify({
        record: record || null, // Can be null, verification will use proof.leaf
        proof,
        root: verifyForm.root,
      });

      setVerifyResult(result.data);
      showMessage('success', result.data.valid ? '✓ Verification successful!' : '✗ Verification failed!');
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchVerifyFromTree = async () => {
    if (!batchSelectedRoot) {
      showMessage('error', 'Please select a tree');
      return;
    }

    setLoading(true);
    setBatchResult(null);
    setMessage({ type: '', text: '' });

    try {
      // Load records from tree
      const treeResult = await integrityAPI.getTreeRecords(batchSelectedRoot);
      const records = treeResult.data.records;
      
      if (!records || records.length === 0) {
        throw new Error('No records found in tree');
      }

      // Generate proofs for all records
      const batchRecords = [];
      for (const record of records) {
        try {
          const proofResult = await integrityAPI.generateProof({
            record,
            root: batchSelectedRoot,
          });
          batchRecords.push({
            data: record,
            proof: proofResult.data.proof,
            root: batchSelectedRoot,
          });
        } catch (err) {
          console.error('Error generating proof for record:', err);
        }
      }

      if (batchRecords.length === 0) {
        throw new Error('Failed to generate proofs for any records');
      }

      // Verify batch
      const result = await integrityAPI.verifyBatch({ records: batchRecords });
      setBatchResult(result.data);
      showMessage('success', `Batch verification completed: ${result.data.validCount}/${result.data.total} valid`);
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchVerify = async () => {
    return handleBatchVerifyFromTree();
  };

  return (
    <div className="data-integrity">
      <h2>Data Integrity</h2>

      {message.text && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="tabs">
        <button
          className={activeTab === 'create' ? 'active' : ''}
          onClick={() => setActiveTab('create')}
        >
          Create Tree
        </button>
        <button
          className={activeTab === 'proof' ? 'active' : ''}
          onClick={() => setActiveTab('proof')}
        >
          Generate Proof
        </button>
        <button
          className={activeTab === 'verify' ? 'active' : ''}
          onClick={() => setActiveTab('verify')}
        >
          Verify
        </button>
        <button
          className={activeTab === 'batch' ? 'active' : ''}
          onClick={() => setActiveTab('batch')}
        >
          Batch Verify
        </button>
        <button
          className={activeTab === 'all-trees' ? 'active' : ''}
          onClick={() => setActiveTab('all-trees')}
        >
          All Trees
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'create' && (
          <div>
            <div className="form-group">
              <label>Medical Records (JSON Array)</label>
              <textarea
                value={recordsInput}
                onChange={(e) => setRecordsInput(e.target.value)}
                placeholder='[\n  {"id":"a73a623f-4a1d-417d-a29a-aeb45a7beb11","patientId":"a73a623f-4a1d-417d-a29a-aeb45a7beb11","condition":"Hypertension"},\n  {"id":"4766f152-cc9b-47d0-9519-7c1a5f2e52be","patientId":"4766f152-cc9b-47d0-9519-7c1a5f2e52be","condition":"Diabetes"}\n]'
                rows={12}
                className="textarea"
                style={{ fontFamily: 'monospace', fontSize: '0.9em' }}
              />
              <small className="form-help">
                Enter medical records as a JSON array. Each record should be an object with fields like id, patientId, condition, etc.
              </small>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button onClick={handleCreateTree} disabled={loading} className="btn btn-primary">
                {loading ? 'Creating...' : 'Create Merkle Tree'}
              </button>
              {recordsInput && (
                <button 
                  type="button"
                  onClick={() => {
                    setRecordsInput('');
                    setTreeResult(null);
                  }}
                  className="btn btn-secondary"
                >
                  Clear
                </button>
              )}
            </div>

            {treeResult && (
              <div className="result-box">
                <h3>✓ Merkle Tree Created Successfully</h3>
                <div className="info-item">
                  <strong>Root Hash:</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                    <code className="hash" style={{ flex: 1, wordBreak: 'break-all' }}>{treeResult.root}</code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(treeResult.root);
                        showMessage('success', 'Root hash copied to clipboard!');
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '4px 12px', fontSize: '0.85em' }}
                    >
Copy
                    </button>
                  </div>
                </div>
                <div className="info-item">
                  <strong>Record Count:</strong> {treeResult.recordCount}
                </div>
                {treeResult.transaction && (
                  <div className="info-item">
                    <strong>Transaction ID:</strong>
                    <code>{treeResult.transaction.id}</code>
                  </div>
                )}
                <div className="info-item" style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #ddd' }}>
                  <strong>Next Steps:</strong>
                  <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
                    <li>Copy the Root Hash above</li>
                    <li>Go to "Generate Proof" tab to create a proof for a specific record</li>
                    <li>Use the proof to verify record integrity in the "Verify" tab</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Show previously created trees */}
            {createdTrees.length > 0 && (
              <div className="result-box" style={{ marginTop: '20px' }}>
                <h3>Previously Created Trees</h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Root Hash</th>
                        <th>Records</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {createdTrees.slice().reverse().map((tree, idx) => (
                        <tr key={idx}>
                          <td>
                            <code style={{ fontSize: '0.85em', wordBreak: 'break-all' }}>
                              {tree.root.substring(0, 20)}...
                            </code>
                          </td>
                          <td>{tree.recordCount}</td>
                          <td>{new Date(tree.createdAt).toLocaleString()}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() => {
                                setProofForm({ ...proofForm, root: tree.root });
                                setActiveTab('proof');
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.8em' }}
                            >
                              Use
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'proof' && (
          <form onSubmit={handleGenerateProof} className="form">
            <div className="form-group">
              <label>Merkle Root Hash *</label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                {(createdTrees.length > 0 || (allTrees && allTrees.trees && allTrees.trees.length > 0)) ? (
                  <>
                    <select
                      value={proofForm.root}
                      onChange={(e) => {
                        if (e.target.value) {
                          setProofForm({ ...proofForm, root: e.target.value });
                          handleLoadTreeRecords(e.target.value);
                        } else {
                          setProofForm({ ...proofForm, root: '' });
                          setSelectedTreeRecords(null);
                        }
                      }}
                      required
                      style={{ flex: 1, padding: '0.75rem 2.5rem 0.75rem 0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem', backgroundColor: 'white', cursor: 'pointer' }}
                    >
                      <option value="">Select tree...</option>
                      {createdTrees.slice().reverse().map((tree, idx) => (
                        <option key={`created-${idx}`} value={tree.root}>
                          {tree.recordCount} records - {tree.root.substring(0, 16)}...
                        </option>
                      ))}
                      {allTrees && allTrees.trees && allTrees.trees.map((tree, idx) => (
                        <option key={`all-${idx}`} value={tree.root}>
                          {tree.recordCount} records - {tree.root.substring(0, 16)}...
                        </option>
                      ))}
                    </select>
                    {proofForm.root && (
                      <button
                        type="button"
                        onClick={() => handleLoadTreeRecords(proofForm.root)}
                        disabled={loadingTreeRecords}
                        className="btn btn-secondary"
                        style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}
                      >
                        {loadingTreeRecords ? 'Loading...' : 'Load Records'}
                      </button>
                    )}
                  </>
                ) : (
                  <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px', color: '#666', width: '100%' }}>
                    No trees available. Please create a tree first in the "Create Tree" tab.
                  </div>
                )}
              </div>
              <small className="form-help">
                Select a tree from the dropdown above, then click "Load Records" to see available records.
              </small>
            </div>

            {selectedTreeRecords && selectedTreeRecords.length > 0 && (
              <div className="form-group" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
                <label style={{ marginBottom: '10px', display: 'block' }}>
                  <strong>Select Record from Tree ({selectedTreeRecords.length} available):</strong>
                </label>
                <select
                  value={proofForm.selectedRecordIndex !== undefined ? proofForm.selectedRecordIndex : ''}
                  onChange={(e) => {
                    if (e.target.value !== '') {
                      const selectedRecord = selectedTreeRecords[parseInt(e.target.value)];
                      setProofForm({ 
                        ...proofForm, 
                        selectedRecordIndex: parseInt(e.target.value),
                        record: JSON.stringify(selectedRecord, null, 2) 
                      });
                    } else {
                      setProofForm({ ...proofForm, selectedRecordIndex: undefined, record: '' });
                    }
                  }}
                  required
                  style={{ width: '100%', padding: '0.75rem 2.5rem 0.75rem 0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem', backgroundColor: 'white', cursor: 'pointer' }}
                >
                  <option value="">-- Select a record --</option>
                  {selectedTreeRecords.map((record, idx) => {
                    const recordId = record.id || record.patientId || `Record ${idx + 1}`;
                    const recordType = record.recordType || record.condition || record.diagnosis || 'Unknown';
                    return (
                      <option key={idx} value={idx}>
                        {recordId} - {recordType}
                      </option>
                    );
                  })}
                </select>
                <small className="form-help" style={{ marginTop: '5px', display: 'block' }}>
                  Select a record from the tree above to generate a proof for it.
                </small>
              </div>
            )}

            <button type="submit" disabled={loading || !proofForm.root || (!selectedTreeRecords && !proofForm.record)} className="btn btn-primary">
              {loading ? 'Generating...' : 'Generate Proof'}
            </button>

            {proofResult && (
              <div className="result-box">
                <h3>✓ Proof Generated Successfully</h3>
                <div className="info-item">
                  <strong>Record Hash:</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                    <code style={{ wordBreak: 'break-all', flex: 1 }}>{proofResult.recordHash}</code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(proofResult.recordHash);
                        showMessage('success', 'Record hash copied to clipboard!');
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '4px 12px', fontSize: '0.85em' }}
                    >
                      Copy Hash
                    </button>
                  </div>
                  <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                    You can use this hash directly for future proof generation or verification.
                  </small>
                </div>
                <div className="info-item">
                  <strong>Root Hash:</strong>
                  <code style={{ wordBreak: 'break-all' }}>{proofResult.root}</code>
                </div>
                <div className="info-item">
                  <strong>Proof:</strong>
                  <div style={{ marginTop: '10px', position: 'relative' }}>
                    <pre style={{ maxHeight: '300px', overflow: 'auto' }}>
                      {JSON.stringify(proofResult.proof, null, 2)}
                    </pre>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(proofResult.proof, null, 2));
                        showMessage('success', 'Proof copied to clipboard!');
                      }}
                      className="btn btn-secondary"
                      style={{ position: 'absolute', top: '10px', right: '10px', padding: '4px 12px', fontSize: '0.85em' }}
                    >
Copy Proof
                    </button>
                  </div>
                </div>
                <div className="info-item" style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #ddd' }}>
                  <strong>Quick Actions:</strong>
                  <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setVerifyForm({
                          record: proofForm.record,
                          proof: JSON.stringify(proofResult.proof, null, 2),
                          root: proofResult.root,
                        });
                        setActiveTab('verify');
                        showMessage('info', 'Proof and record copied to Verify tab');
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.9em' }}
                    >
Use in Verify Tab
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify({
                          data: JSON.parse(proofForm.record),
                          proof: proofResult.proof,
                          root: proofResult.root,
                        }, null, 2));
                        showMessage('success', 'Copied to clipboard! Ready for batch verify');
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.9em' }}
                    >
Copy for Batch Verify
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        )}

        {activeTab === 'verify' && (
          <form onSubmit={handleVerify} className="form">
            {proofResult && (
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '5px', border: '1px solid #4caf50' }}>
                <strong>Quick Fill:</strong>
                <button
                  type="button"
                  onClick={() => {
                    setVerifyForm({
                      record: proofForm.record,
                      proof: JSON.stringify(proofResult.proof, null, 2),
                      root: proofResult.root,
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
              <label>Proof (JSON object) *</label>
              <div style={{ position: 'relative' }}>
                <textarea
                  value={verifyForm.proof}
                  onChange={(e) => setVerifyForm({ ...verifyForm, proof: e.target.value })}
                  placeholder='{"leaf":"...","path":[...],"root":"..."}'
                  rows={8}
                  className="textarea"
                  required
                />
                {verifyForm.proof && (
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(verifyForm.proof);
                        setVerifyForm({ ...verifyForm, proof: JSON.stringify(parsed, null, 2) });
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
              <label>Root Hash *</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {(createdTrees.length > 0 || (allTrees && allTrees.trees && allTrees.trees.length > 0)) ? (
                  <select
                    value={verifyForm.root}
                    onChange={(e) => {
                      setVerifyForm({ ...verifyForm, root: e.target.value });
                    }}
                    required
                    style={{ flex: 1, padding: '0.75rem 2.5rem 0.75rem 0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem', backgroundColor: 'white', cursor: 'pointer' }}
                  >
                    <option value="">Select tree...</option>
                    {createdTrees.slice().reverse().map((tree, idx) => (
                      <option key={`created-${idx}`} value={tree.root}>
                        {tree.recordCount} records - {tree.root.substring(0, 16)}...
                      </option>
                    ))}
                    {allTrees && allTrees.trees && allTrees.trees.map((tree, idx) => (
                      <option key={`all-${idx}`} value={tree.root}>
                        {tree.recordCount} records - {tree.root.substring(0, 16)}...
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px', color: '#666', width: '100%' }}>
                    No trees available. Please create a tree first in the "Create Tree" tab.
                  </div>
                )}
              </div>
              <small className="form-help">
                Select a tree from the dropdown above to get the root hash.
              </small>
            </div>
            <button type="submit" disabled={loading || !verifyForm.proof || !verifyForm.root} className="btn btn-primary">
              {loading ? 'Verifying...' : 'Verify Integrity'}
            </button>

            {verifyResult && (
              <div className="result-box">
                <h3>Verification Result</h3>
                <div className={`status-badge ${verifyResult.valid ? 'success' : 'error'}`}>
                  {verifyResult.valid ? '✓ Valid' : '✗ Invalid'}
                </div>
              </div>
            )}
          </form>
        )}

        {activeTab === 'batch' && (
          <div>
            <div className="form-group">
              <label>Select Tree to Verify *</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {(createdTrees.length > 0 || (allTrees && allTrees.trees && allTrees.trees.length > 0)) ? (
                  <select
                    value={batchSelectedRoot}
                    onChange={(e) => setBatchSelectedRoot(e.target.value)}
                    required
                    style={{ flex: 1, padding: '0.75rem 2.5rem 0.75rem 0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem', backgroundColor: 'white', cursor: 'pointer' }}
                  >
                    <option value="">-- Select a tree --</option>
                    {createdTrees.slice().reverse().map((tree, idx) => (
                      <option key={`created-${idx}`} value={tree.root}>
                        {tree.recordCount} records - {tree.root.substring(0, 20)}...
                      </option>
                    ))}
                    {allTrees && allTrees.trees && allTrees.trees.map((tree, idx) => (
                      <option key={`all-${idx}`} value={tree.root}>
                        {tree.recordCount} records - {tree.root.substring(0, 20)}...
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <div style={{ flex: 1, padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px', color: '#666' }}>
                      No trees available. Please create a tree first in the "Create Tree" tab.
                    </div>
                    <button
                      type="button"
                      onClick={handleGetAllTrees}
                      disabled={loading}
                      className="btn btn-secondary"
                      style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}
                    >
                      {loading ? 'Loading...' : 'Load All Trees'}
                    </button>
                  </>
                )}
              </div>
              <small className="form-help">
                Select a tree and click "Verify All Records in Tree" below. The system will automatically generate proofs for all records and verify them.
              </small>
            </div>
            <button 
              onClick={handleBatchVerify} 
              disabled={loading || !batchSelectedRoot} 
              className="btn btn-primary"
            >
              {loading ? 'Verifying...' : 'Verify All Records in Tree'}
            </button>

            {batchResult && (
              <div className="result-box">
                <h3>Batch Verification Result</h3>
                <div className={`status-badge ${batchResult.allValid ? 'success' : 'error'}`}>
                  {batchResult.allValid ? '✓ All Valid' : '✗ Some Invalid'}
                </div>
                <div className="info-item">
                  <strong>Total:</strong> {batchResult.total}
                </div>
                <div className="info-item">
                  <strong>Valid:</strong> {batchResult.validCount}
                </div>
                <div className="info-item">
                  <strong>Invalid:</strong> {batchResult.invalidCount}
                </div>
                {batchResult.results && (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Index</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchResult.results.map((r, idx) => (
                          <tr key={idx}>
                            <td>{r.index}</td>
                            <td>
                              <span className={`badge ${r.valid ? 'badge-success' : 'badge-error'}`}>
                                {r.valid ? 'Valid' : 'Invalid'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'all-trees' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>All Merkle Trees</h3>
              <button 
                onClick={handleGetAllTrees} 
                disabled={loading}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1rem' }}
              >
                {loading ? 'Loading...' : allTrees ? 'Refresh' : 'Load Trees'}
              </button>
            </div>

            {loading && !allTrees && (
              <div className="loading-message" style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                Loading all Merkle trees...
              </div>
            )}

            {allTrees && allTrees.trees && allTrees.trees.length > 0 && (
              <div className="result-box">
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <strong>Found {allTrees.count} Merkle tree{allTrees.count !== 1 ? 's' : ''}</strong>
                    {allTrees.trees.reduce((sum, t) => sum + (t.recordCount || 0), 0) > 0 && (
                      <span style={{ marginLeft: '10px', color: '#666', fontSize: '0.9em' }}>
                        ({allTrees.trees.reduce((sum, t) => sum + (t.recordCount || 0), 0)} total records)
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const totalRecords = allTrees.trees.reduce((sum, t) => sum + (t.recordCount || 0), 0);
                      showMessage('info', `Total: ${allTrees.count} trees with ${totalRecords} records`);
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '4px 12px', fontSize: '0.85em' }}
                  >
                    Show Summary
                  </button>
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Root Hash</th>
                        <th>Description</th>
                        <th>Records</th>
                        <th>Transaction ID</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allTrees.trees.map((tree, idx) => (
                        <tr key={idx}>
                          <td>
                            <code className="code" style={{ fontSize: '0.85em', wordBreak: 'break-all' }}>
                              {tree.root}
                            </code>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              {tree.description || 'No description'}
                              {tree.description && tree.description.toLowerCase().includes('medical record') && (
                                <span style={{ fontSize: '0.75em', color: '#4caf50', fontWeight: 'bold' }}>📋</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <strong>{tree.recordCount || 0}</strong>
                          </td>
                          <td>
                            <code style={{ fontSize: '0.85em' }}>{tree.transactionId || 'N/A'}</code>
                          </td>
                          <td>{tree.timestamp ? new Date(tree.timestamp).toLocaleString() : 'N/A'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setProofForm({ ...proofForm, root: tree.root });
                                  setActiveTab('proof');
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.8em' }}
                              >
                                Proof
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setVerifyForm({ ...verifyForm, root: tree.root });
                                  setActiveTab('verify');
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.8em' }}
                              >
                                Verify
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setBatchSelectedRoot(tree.root);
                                  setActiveTab('batch');
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.8em' }}
                              >
                                Batch
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {allTrees && (!allTrees.trees || allTrees.trees.length === 0) && (
              <div className="result-box" style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: '#666', margin: 0 }}>
                  {allTrees.count === 0 
                    ? 'No Merkle trees found. Create a tree in the "Create Tree" tab to get started.'
                    : 'No trees available. Try refreshing or create a new tree.'}
                </p>
              </div>
            )}

            {!allTrees && !loading && (
              <div className="result-box" style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: '#666', marginBottom: '1rem' }}>
                  Click "Load Trees" above to fetch all Merkle trees from the blockchain.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DataIntegrity;

