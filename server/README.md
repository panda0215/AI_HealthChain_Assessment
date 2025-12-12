# AI Health Chains - Backend Server

## Overview

This is the backend server for the AI Health Chains blockchain assessment. It implements a permissioned blockchain system for healthcare data management.

## Architecture

### Core Components

- **Blockchain** (`src/core/Blockchain.js`) - Core blockchain implementation
- **NodeManager** (`src/core/NodeManager.js`) - Network node management

### Features to Implement

All features are located in `src/features/`:

1. **Consent Management** (`consent-management/`)
   - Smart contract for patient consent
   - Consent granting and revocation
   - Consent validation

2. **Data Integrity** (`data-integrity/`)
   - Merkle tree implementation
   - Proof generation and verification
   - Batch verification

3. **ZK Proofs** (`zk-proofs/`)
   - Zero-knowledge proof generation
   - Permission verification without revealing data

4. **Audit Trail** (`audit-trail/`)
   - Immutable logging system
   - Queryable audit logs
   - Data access tracking

5. **Consensus** (`consensus/`)
   - Consensus algorithm implementation
   - Block validation
   - Network synchronization

## API Endpoints

### Health & Info

- `GET /health` - Health check
- `GET /api/blockchain/info` - Blockchain information

### Consent Management

- `POST /api/consent/grant` - Grant consent
  ```json
  {
    "patientId": "uuid",
    "clinicianId": "uuid",
    "consentType": "Data Access",
    "options": {
      "expiresAt": "2025-12-31T00:00:00Z",
      "purpose": "Treatment"
    }
  }
  ```

- `POST /api/consent/revoke` - Revoke consent
  ```json
  {
    "consentId": "uuid",
    "revokedBy": "uuid"
  }
  ```

- `GET /api/consent/check/:patientId/:clinicianId/:type` - Check consent
- `GET /api/consent/history/:patientId` - Get consent history
- `GET /api/consent/active/:patientId` - Get active consents

### Data Integrity

- `POST /api/integrity/tree` - Create Merkle tree
  ```json
  {
    "records": ["recordId1", "recordId2", ...]
  }
  ```

- `POST /api/integrity/proof` - Generate proof
  ```json
  {
    "recordId": "uuid",
    "tree": {...}
  }
  ```

- `POST /api/integrity/verify` - Verify integrity
  ```json
  {
    "record": {...},
    "proof": {...},
    "root": "hash"
  }
  ```

- `POST /api/integrity/verify-batch` - Batch verification

### ZK Proofs

- `POST /api/zk/consent-proof` - Generate consent ZK proof
- `POST /api/zk/verify-consent` - Verify consent proof
- `POST /api/zk/permission-proof` - Generate permission proof
- `POST /api/zk/verify-permission` - Verify permission proof

### Audit Trail

- `POST /api/audit/data-access` - Log data access
  ```json
  {
    "actorId": "uuid",
    "resourceId": "uuid",
    "resourceType": "medicalRecord",
    "granted": true,
    "reason": "Valid consent"
  }
  ```

- `POST /api/audit/consent` - Log consent change
- `POST /api/audit/ai-diagnostic` - Log AI diagnostic
- `GET /api/audit/query` - Query audit logs
  - Query params: `actorId`, `resourceId`, `action`, `startDate`, `endDate`
- `GET /api/audit/trail/:resourceId/:resourceType` - Get audit trail

### Consensus

- `POST /api/consensus/propose` - Propose block
- `POST /api/consensus/vote` - Vote on block
- `POST /api/consensus/sync` - Sync chain

## Data Structure

### Mock Data

The server loads mock data from `src/data/generated-data.js`:

- **Patients** - 1000 patient records
- **Clinicians** - 200 clinician records
- **AI Models** - 12 AI model records
- **Medical Records** - 5000 medical record entries (configurable via `MAX_MEDICAL_RECORDS`)
- **Consent Records** - 3000 consent records (configurable via `MAX_CONSENT_RECORDS`)

### Environment Variables

You can control the number of records loaded during initialization using environment variables:

- `MAX_MEDICAL_RECORDS` - Maximum number of medical records to load (default: all available)
- `MAX_CONSENT_RECORDS` - Maximum number of consent records to load (default: all available)
- `PORT` - Server port (default: 3000)

Example `.env` file:
```
PORT=3000
MAX_MEDICAL_RECORDS=100
MAX_CONSENT_RECORDS=50
```

This is useful for development and testing when you don't need the full dataset loaded.

## Blockchain Structure

### Block Structure

```javascript
{
  index: number,
  timestamp: number,
  transactions: Array<Transaction>,
  previousHash: string,
  hash: string,
  nonce: number,
  merkleRoot: string
}
```

### Transaction Structure

```javascript
{
  id: string,
  from: string,
  to: string,
  data: Object,
  timestamp: number
}
```

## Implementation Guidelines

### 1. Consent Management

**Files to implement:**
- `ConsentContract.js` - Smart contract logic
- `consentService.js` - Service layer
- `consentController.js` - API endpoints

**Key Requirements:**
- All consent operations must create blockchain transactions
- Consent state must be queryable from blockchain
- Must enforce consent before data access
- Support consent expiration

### 2. Data Integrity

**Files to implement:**
- `MerkleTree.js` - Merkle tree data structure
- `integrityService.js` - Service layer
- `integrityController.js` - API endpoints

**Key Requirements:**
- Build Merkle tree from records
- Generate proofs for individual records
- Verify proofs against root
- Support batch verification

### 3. ZK Proofs

**Files to implement:**
- `ZKProof.js` - ZK proof generation/verification
- `zkService.js` - Service layer
- `zkController.js` - API endpoints

**Key Requirements:**
- Generate proofs without revealing data
- Verify proofs cryptographically
- Support permission proofs

### 4. Audit Trail

**Files to implement:**
- `AuditLogger.js` - Audit logging mechanism
- `auditService.js` - Service layer
- `auditController.js` - API endpoints

**Key Requirements:**
- All logs must be blockchain transactions
- Support querying and filtering
- Include timestamps, actors, actions

### 5. Consensus

**Files to implement:**
- `ConsensusEngine.js` - Consensus algorithm
- `consensusService.js` - Service layer
- `consensusController.js` - API endpoints

**Key Requirements:**
- Validate transactions
- Require majority agreement
- Handle node failures
- Support chain synchronization

## Security Considerations

1. **Input Validation** - Validate all inputs
2. **Authorization** - Check permissions before operations
3. **Cryptographic Security** - Use proper hashing and signatures
4. **Error Handling** - Don't leak sensitive information
5. **Audit Logging** - Log all security-relevant operations

## Testing

Run tests with:
```bash
npm test
```

## Development

Start development server with auto-reload:
```bash
npm run dev
```

## Production

Start production server:
```bash
npm start
```

## Environment Variables

Create a `.env` file:

```env
PORT=3000
NODE_ENV=development
```

## Notes

- All blockchain operations are synchronous in this implementation
- In production, you would use a proper blockchain framework (Hyperledger Fabric, etc.)
- The consensus mechanism is simplified for assessment purposes
- Mock data is loaded into memory - in production, use a database

