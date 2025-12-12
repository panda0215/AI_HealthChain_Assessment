import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import { blockchainAPI, dataAPI } from './services/api'
import { DataProvider } from './contexts/DataContext'
import ConsentManagement from './components/ConsentManagement'
import DataIntegrity from './components/DataIntegrity'
import ZKProofs from './components/ZKProofs'
import AuditTrail from './components/AuditTrail'
import Consensus from './components/Consensus'
import './App.css'

function App() {
  const [blockchainInfo, setBlockchainInfo] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchBlockchainInfo()
    fetchStats()
  }, [])

  const fetchBlockchainInfo = async () => {
    try {
      setError(null)
      setLoading(true)
      const data = await blockchainAPI.getInfo()
      setBlockchainInfo(data)
    } catch (error) {
      console.error('Error fetching blockchain info:', error)
      setError(error.message || 'Failed to load blockchain information')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const result = await dataAPI.getStats()
      setStats(result.data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const refreshBlockchainInfo = async () => {
    await fetchBlockchainInfo()
  }

  return (
    <DataProvider>
      <Router>
        <div className="app">
          <header className="app-header">
            <div className="container">
              <h1>AI Health Chains - Blockchain Assessment</h1>
              <nav>
                <NavLink to="/" end>Dashboard</NavLink>
                <NavLink to="/consent">Consent Management</NavLink>
                <NavLink to="/integrity">Data Integrity</NavLink>
                <NavLink to="/zk-proofs">ZK Proofs</NavLink>
                <NavLink to="/audit">Audit Trail</NavLink>
                <NavLink to="/consensus">Consensus</NavLink>
              </nav>
            </div>
          </header>

          <main className="app-main">
            <div className="container">
              <Routes>
                <Route path="/" element={<Dashboard blockchainInfo={blockchainInfo} stats={stats} loading={loading} error={error} />} />
                <Route path="/consent" element={<ConsentManagement onConsentUpdate={refreshBlockchainInfo} />} />
                <Route path="/integrity" element={<DataIntegrity />} />
                <Route path="/zk-proofs" element={<ZKProofs />} />
                <Route path="/audit" element={<AuditTrail />} />
                <Route path="/consensus" element={<Consensus />} />
              </Routes>
            </div>
          </main>

          <footer className="app-footer">
            <div className="container">
              <p>AI Health Chains - Senior Blockchain Engineer Assessment</p>
            </div>
          </footer>
        </div>
      </Router>
    </DataProvider>
  )
}

function Dashboard({ blockchainInfo, stats, loading, error }) {
  return (
    <div className="dashboard">
      <h2>Blockchain Dashboard</h2>
      
      {loading ? (
        <p>Loading blockchain information...</p>
      ) : error ? (
        <div className="error-message">
          <p>Error: {error}</p>
          <p>Please make sure the server is running on port 3000.</p>
        </div>
      ) : (
        <>
          {blockchainInfo && (
            <div className="info-grid">
              <div className="info-card">
                <h3>Chain Length</h3>
                <p className="large-number">{blockchainInfo.chainLength}</p>
              </div>
              <div className="info-card">
                <h3>Total Transactions</h3>
                <p className="large-number">{blockchainInfo.totalTransactions}</p>
              </div>
              <div className="info-card">
                <h3>Node ID</h3>
                <p className="code">{blockchainInfo.nodeId}</p>
              </div>
              <div className="info-card">
                <h3>Network Nodes</h3>
                <p className="large-number">{blockchainInfo.networkNodes.length}</p>
              </div>
            </div>
          )}

          {stats && (
            <div className="stats-section" style={{ marginTop: '2rem' }}>
              <h3>System Statistics</h3>
              <div className="info-grid">
                <div className="info-card">
                  <h3>Total Patients</h3>
                  <p className="large-number">{stats.totalPatients?.toLocaleString()}</p>
                </div>
                <div className="info-card">
                  <h3>Total Clinicians</h3>
                  <p className="large-number">{stats.totalClinicians?.toLocaleString()}</p>
                </div>
                <div className="info-card">
                  <h3>AI Models</h3>
                  <p className="large-number">{stats.totalAIModels?.toLocaleString()}</p>
                </div>
                <div className="info-card">
                  <h3>Medical Records</h3>
                  <p className="large-number">{stats.totalMedicalRecords?.toLocaleString()}</p>
                </div>
                <div className="info-card">
                  <h3>Consent Records</h3>
                  <p className="large-number">{stats.totalConsentRecords?.toLocaleString()}</p>
                </div>
                <div className="info-card">
                  <h3>AI Generated Records</h3>
                  <p className="large-number">{stats.aiGeneratedRecords?.toLocaleString()}</p>
                </div>
                <div className="info-card">
                  <h3>Active Consents</h3>
                  <p className="large-number">{stats.activeConsents?.toLocaleString()}</p>
                </div>
                <div className="info-card">
                  <h3>Revoked Consents</h3>
                  <p className="large-number">{stats.revokedConsents?.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          <div className="features-overview">
            <h3>Features to Implement</h3>
            <ul>
              <li>✅ Consent Management - Smart contract for patient consent</li>
              <li>✅ Data Integrity - Merkle tree implementation</li>
              <li>✅ ZK Proofs - Zero-knowledge proof system</li>
              <li>✅ Audit Trail - Immutable logging</li>
              <li>✅ Consensus - Network agreement mechanism</li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}


export default App

