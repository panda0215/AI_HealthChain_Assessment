/**
 * Consensus Component
 * 
 * Propose blocks, vote on proposals, and sync the blockchain.
 * View pending transactions waiting to be mined.
 */

import { useState, useCallback, useEffect } from 'react';
import { consensusAPI } from '../services/api';

function Consensus() {
  const [activeTab, setActiveTab] = useState('propose');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Pending Transactions State
  const [pendingTransactions, setPendingTransactions] = useState({ count: 0, transactions: [] });
  const [loadingPending, setLoadingPending] = useState(false);

  // Propose Block State
  const [proposeResult, setProposeResult] = useState(null);

  // Load pending transactions
  const loadPendingTransactions = useCallback(async () => {
    setLoadingPending(true);
    try {
      const result = await consensusAPI.getPendingTransactions();
      setPendingTransactions(result.data);
    } catch (error) {
      console.error('Error loading pending transactions:', error);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  // Load pending transactions on mount and when tab changes to propose
  useEffect(() => {
    if (activeTab === 'propose') {
      loadPendingTransactions();
    }
  }, [activeTab, loadPendingTransactions]);

  // Vote State
  const [voteForm, setVoteForm] = useState({
    blockHash: '',
    isValid: true,
  });
  const [voteResult, setVoteResult] = useState(null);

  // Sync State
  const [syncResult, setSyncResult] = useState(null);

  // All Consensus State
  const [allConsensus, setAllConsensus] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleProposeBlock = async () => {
    setLoading(true);
    setProposeResult(null);
    setMessage({ type: '', text: '' });

    try {
      const result = await consensusAPI.proposeBlock({
        transactions: [], // Empty array uses pending transactions
      });

      setProposeResult(result.data);
      // Reload pending transactions after proposing
      loadPendingTransactions();
      if (result.data.consensusReached) {
        showMessage('success', 'Block proposed and consensus reached! Block mined.');
      } else {
        showMessage('info', `Block proposed. Waiting for votes (${result.data.votes}/${result.data.totalNodes})`);
      }
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (e) => {
    e.preventDefault();
    setLoading(true);
    setVoteResult(null);
    setMessage({ type: '', text: '' });

    try {
      const result = await consensusAPI.voteOnBlock({
        blockHash: voteForm.blockHash,
        isValid: voteForm.isValid,
      });

      setVoteResult(result.data);
      if (result.data.consensusReached) {
        showMessage('success', 'Consensus reached! Block mined.');
      } else {
        showMessage('info', `Vote recorded. ${result.data.yesVotes}/${result.data.totalNodes} yes votes.`);
      }
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncChain = async () => {
    setLoading(true);
    setSyncResult(null);
    setMessage({ type: '', text: '' });

    try {
      const result = await consensusAPI.syncChain({
        networkChains: [], // Empty array simulates sync
      });

      setSyncResult(result.data);
      showMessage('success', result.data.message || result.message || 'Chain synchronized successfully');
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetAllConsensus = useCallback(async () => {
    setLoading(true);
    setAllConsensus(null);
    setMessage({ type: '', text: '' });

    try {
      const result = await consensusAPI.getAll();
      setAllConsensus(result.data);
      setCurrentPage(1);
      showMessage('success', `Loaded ${result.data.blockCount} blocks and ${result.data.voteCount} votes`);
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Pagination calculations
  const totalPages = allConsensus ? Math.ceil(allConsensus.blocks.length / itemsPerPage) : 0;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBlocks = allConsensus ? allConsensus.blocks.slice(startIndex, endIndex) : [];

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  return (
    <div className="consensus">
      <h2>Consensus Mechanism</h2>
      <p className="feature-description">
        Propose blocks, vote on proposals, and synchronize the blockchain chain across the network.
      </p>

      {message.text && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="tabs">
        <button
          className={activeTab === 'propose' ? 'active' : ''}
          onClick={() => setActiveTab('propose')}
        >
          Propose Block
        </button>
        <button
          className={activeTab === 'vote' ? 'active' : ''}
          onClick={() => setActiveTab('vote')}
        >
          Vote on Block
        </button>
        <button
          className={activeTab === 'sync' ? 'active' : ''}
          onClick={() => setActiveTab('sync')}
        >
          Sync Chain
        </button>
        <button
          className={activeTab === 'all' ? 'active' : ''}
          onClick={() => setActiveTab('all')}
        >
          All Blocks & Votes
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'propose' && (
          <div>
            <div className="info-box">
              <h3>Block Proposal</h3>
              <p>
                Propose a new block using pending transactions from the blockchain.
                The block will be validated and require consensus (67% agreement) to be mined.
              </p>
              <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
                <strong>Pending Transactions:</strong> {loadingPending ? 'Loading...' : pendingTransactions.count}
                {pendingTransactions.count === 0 && (
                  <div style={{ marginTop: '10px', color: '#d32f2f', fontSize: '0.9em' }}>
                    No pending transactions available. Create some transactions (e.g., grant consent, log data access) to propose a block.
                  </div>
                )}
                {pendingTransactions.count > 0 && (
                  <button
                    onClick={loadPendingTransactions}
                    disabled={loadingPending}
                    style={{ marginLeft: '10px', padding: '4px 8px', fontSize: '0.85em' }}
                    className="btn btn-secondary"
                  >
                    Refresh
                  </button>
                )}
              </div>
            </div>
            <button 
              onClick={handleProposeBlock} 
              disabled={loading || pendingTransactions.count === 0} 
              className="btn btn-primary"
            >
              {loading ? 'Proposing...' : 'Propose Block'}
            </button>
            {pendingTransactions.count === 0 && (
              <div style={{ marginTop: '10px', color: '#666', fontSize: '0.9em' }}>
                Cannot propose block: No pending transactions available.
              </div>
            )}

            {proposeResult && (
              <div className="result-box">
                <h3>Proposal Result</h3>
                <div className={`status-badge ${proposeResult.consensusReached ? 'success' : 'info'}`}>
                  {proposeResult.consensusReached ? '✓ Consensus Reached' : '⏳ Waiting for Votes'}
                </div>
                <div className="info-item">
                  <strong>Block Hash:</strong>
                  <code className="hash">{proposeResult.blockHash}</code>
                </div>
                <div className="info-item">
                  <strong>Votes:</strong> {proposeResult.votes} / {proposeResult.totalNodes}
                </div>
                <div className="info-item">
                  <strong>Threshold:</strong> {((proposeResult.threshold || 0.67) * 100).toFixed(0)}%
                </div>
                {proposeResult.block && (
                  <div className="info-item">
                    <strong>Block Index:</strong> {proposeResult.block.index}
                  </div>
                )}
                {proposeResult.message && (
                  <div className="info-item">
                    <strong>Message:</strong> {proposeResult.message}
                  </div>
                )}
                <pre>{JSON.stringify(proposeResult, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'vote' && (
          <form onSubmit={handleVote} className="form">
            <div className="form-group">
              <label>Block Hash *</label>
              <input
                type="text"
                value={voteForm.blockHash}
                onChange={(e) => setVoteForm({ ...voteForm, blockHash: e.target.value })}
                placeholder="Hash of the block to vote on"
                required
              />
            </div>
            <div className="form-group">
              <label>Vote *</label>
              <select
                value={voteForm.isValid}
                onChange={(e) => setVoteForm({ ...voteForm, isValid: e.target.value === 'true' })}
                required
              >
                <option value="true">Valid (Yes)</option>
                <option value="false">Invalid (No)</option>
              </select>
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Voting...' : 'Submit Vote'}
            </button>

            {voteResult && (
              <div className="result-box">
                <h3>Vote Result</h3>
                <div className={`status-badge ${voteResult.consensusReached ? 'success' : 'info'}`}>
                  {voteResult.consensusReached ? '✓ Consensus Reached' : '⏳ More Votes Needed'}
                </div>
                <div className="info-item">
                  <strong>Vote:</strong> {voteResult.isValid ? 'Valid (Yes)' : 'Invalid (No)'}
                </div>
                <div className="info-item">
                  <strong>Total Votes:</strong> {voteResult.totalVotes} / {voteResult.totalNodes}
                </div>
                <div className="info-item">
                  <strong>Yes Votes:</strong> {voteResult.yesVotes}
                </div>
                <div className="info-item">
                  <strong>Threshold:</strong> {((voteResult.threshold || 0.67) * 100).toFixed(0)}%
                </div>
                {voteResult.block && (
                  <div className="info-item">
                    <strong>Block Mined:</strong> Index {voteResult.block.index}
                  </div>
                )}
                <pre>{JSON.stringify(voteResult, null, 2)}</pre>
              </div>
            )}
          </form>
        )}

        {activeTab === 'sync' && (
          <div>
            <div className="info-box">
              <h3>Chain Synchronization</h3>
              <p>
                Synchronize the local blockchain chain with the network.
                This will validate the chain and update if a longer valid chain is found.
              </p>
            </div>
            <button onClick={handleSyncChain} disabled={loading} className="btn btn-primary">
              {loading ? 'Syncing...' : 'Sync Chain'}
            </button>

            {syncResult && (
              <div className="result-box">
                <h3>Sync Result</h3>
                <div className={`status-badge ${syncResult.synced ? 'success' : 'error'}`}>
                  {syncResult.synced ? '✓ Synchronized' : '✗ Sync Failed'}
                </div>
                <div className="info-item">
                  <strong>Local Chain Length:</strong> {syncResult.localChainLength}
                </div>
                {syncResult.newChainLength && (
                  <div className="info-item">
                    <strong>New Chain Length:</strong> {syncResult.newChainLength}
                  </div>
                )}
                {syncResult.chainReplaced !== undefined && (
                  <div className="info-item">
                    <strong>Chain Replaced:</strong> {syncResult.chainReplaced ? 'Yes' : 'No'}
                  </div>
                )}
                {syncResult.chainValid !== undefined && (
                  <div className="info-item">
                    <strong>Chain Valid:</strong> {syncResult.chainValid ? 'Yes' : 'No'}
                  </div>
                )}
                {syncResult.message && (
                  <div className="info-item">
                    <strong>Message:</strong> {syncResult.message}
                  </div>
                )}
                <pre>{JSON.stringify(syncResult, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'all' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3>All Blocks & Consensus Data</h3>
                {allConsensus && (
                  <small style={{ color: '#666', display: 'block', marginTop: '0.25rem' }}>
                    {allConsensus.blockCount} blocks, {allConsensus.voteCount} votes
                  </small>
                )}
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {allConsensus && (
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
                  onClick={handleGetAllConsensus} 
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 1rem' }}
                >
                  {loading ? 'Loading...' : allConsensus ? 'Refresh' : 'Load Consensus Data'}
                </button>
              </div>
            </div>

            {loading && !allConsensus && (
              <div className="loading-message">
                Loading consensus data...
              </div>
            )}

            {!allConsensus && !loading && (
              <div className="result-box" style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: '#666', margin: 0 }}>
                  Click "Load Consensus Data" above to load all blocks and votes from the blockchain.
                </p>
              </div>
            )}

            {allConsensus && (
              <div className="result-box">
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Index</th>
                        <th>Hash</th>
                        <th>Previous Hash</th>
                        <th>Transactions</th>
                        <th>Timestamp</th>
                        <th>Merkle Root</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedBlocks.map((block, idx) => (
                        <tr key={startIndex + idx}>
                          <td>{block.index}</td>
                          <td>
                            <code className="code" style={{ fontSize: '0.85em', wordBreak: 'break-all' }}>
                              {block.hash.substring(0, 20)}...
                            </code>
                          </td>
                          <td>
                            <code className="code" style={{ fontSize: '0.85em', wordBreak: 'break-all' }}>
                              {block.previousHash.substring(0, 20)}...
                            </code>
                          </td>
                          <td>{block.transactionCount}</td>
                          <td>{new Date(block.timestamp).toLocaleString()}</td>
                          <td>
                            <code className="code" style={{ fontSize: '0.85em', wordBreak: 'break-all' }}>
                              {block.merkleRoot.substring(0, 16)}...
                            </code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {allConsensus.votes && allConsensus.votes.length > 0 && (
                  <div style={{ marginTop: '2rem' }}>
                    <h4>Votes ({allConsensus.voteCount})</h4>
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Block Hash</th>
                            <th>Node ID</th>
                            <th>Vote</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allConsensus.votes.map((vote, idx) => (
                            <tr key={idx}>
                              <td>
                                <code className="code" style={{ fontSize: '0.85em', wordBreak: 'break-all' }}>
                                  {vote.blockHash.substring(0, 20)}...
                                </code>
                              </td>
                              <td className="code">{vote.nodeId}</td>
                              <td>
                                <span className={`badge ${vote.isValid ? 'badge-success' : 'badge-danger'}`}>
                                  {vote.isValid ? 'Valid' : 'Invalid'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {totalPages > 1 && (
                  <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      Showing {startIndex + 1} to {Math.min(endIndex, allConsensus.blocks.length)} of {allConsensus.blocks.length} blocks
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

export default Consensus;

