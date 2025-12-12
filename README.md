# AI Health Chains - Senior Blockchain Engineer Assessment

## Overview

Welcome to the AI Health Chains blockchain engineering assessment. This assessment is designed to evaluate your expertise in building enterprise-grade blockchain systems for healthcare data management. You will be working with a permissioned blockchain infrastructure that handles patient records, consent management, and AI diagnostic results.

## Project Structure

```
aihealthchains-blockchain-assessment/
├── client/                 # React + Vite frontend application
│   ├── src/
│   ├── public/
│   └── package.json
├── server/                 # Node.js backend with blockchain core
│   ├── src/
│   │   ├── core/          # Blockchain core implementation
│   │   ├── features/      # Features to implement (YOUR WORK)
│   │   ├── utils/         # Utility functions
│   │   ├── data/          # Generated mock data
│   │   └── index.js       # Backend entry point
│   └── package.json
├── data-generator/         # Scripts to generate mock healthcare data
│   └── generate-data.js
└── README.md              # This file
```

## Technology Stack

### Backend
- **Node.js** (v18+)
- **Express.js** - REST API framework
- **Blockchain Core** - Custom permissioned blockchain implementation
- **Crypto** - Node.js crypto module for cryptographic operations

### Frontend
- **React** (v18+)
- **Vite** - Build tool and dev server
- **TypeScript** (optional but recommended)
- **Modern UI libraries** (you may add as needed)

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm or yarn package manager
- Git

### Installation

1. **Clone or extract this assessment repository**

2. **Install backend dependencies:**
   ```bash
   cd server
   npm install
   ```

3. **Install frontend dependencies:**
   ```bash
   cd client
   npm install
   ```

### Running the Application

1. **Start the backend server:**
   ```bash
   cd server
   npm start
   ```
   The server will run on `http://localhost:3000`

2. **Start the frontend development server:**
   ```bash
   cd client
   npm run dev
   ```
   The frontend will run on `http://localhost:5173` (Vite default)

## Assessment Features

You are required to implement the following features in the `server/src/features/` directory:

### 1. Smart Contract: Patient Consent Management
**Location:** `server/src/features/consent-management/`

Implement a smart contract system that:
- Manages patient consent for data access
- Tracks consent grants and revocations
- Enforces consent before data access
- Logs all consent changes on the blockchain

**Files to implement:**
- `ConsentContract.js` - Main smart contract logic
- `consentService.js` - Service layer for consent operations
- `consentController.js` - API endpoints

### 2. Data Integrity: Merkle Tree Implementation
**Location:** `server/src/features/data-integrity/`

Implement a Merkle tree system for:
- Creating tamper-evident data structures
- Verifying data integrity
- Generating proofs for data verification
- Batch verification of records

**Files to implement:**
- `MerkleTree.js` - Merkle tree data structure
- `integrityService.js` - Service for integrity operations
- `integrityController.js` - API endpoints

### 3. Zero-Knowledge Proof: Permission Verification
**Location:** `server/src/features/zk-proofs/`

Implement a zero-knowledge proof system that:
- Verifies user permissions without revealing identity
- Proves data access rights without exposing consent details
- Generates and validates ZK proofs

**Files to implement:**
- `ZKProof.js` - ZK proof generation and validation
- `zkService.js` - Service layer
- `zkController.js` - API endpoints

### 4. Audit Trail: Immutable Logging
**Location:** `server/src/features/audit-trail/`

Implement an audit trail system that:
- Logs all data access attempts
- Records all consent changes
- Tracks AI diagnostic result submissions
- Provides queryable audit logs

**Files to implement:**
- `AuditLogger.js` - Audit logging mechanism
- `auditService.js` - Service layer
- `auditController.js` - API endpoints

### 5. Consensus: Network Agreement
**Location:** `server/src/features/consensus/`

Implement a consensus mechanism that:
- Handles transaction validation across nodes
- Manages block creation and validation
- Implements Byzantine fault tolerance
- Handles network synchronization

**Files to implement:**
- `ConsensusEngine.js` - Consensus algorithm
- `consensusService.js` - Service layer
- `consensusController.js` - API endpoints

## Assessment Guidelines

### What You Need to Implement

1. **Complete all feature implementations** in the `server/src/features/` directories
2. **Ensure all features integrate** with the blockchain core
3. **Write comprehensive tests** for your implementations
4. **Follow security best practices** - this is healthcare data!
5. **Document your code** with clear comments
6. **Handle edge cases** and error scenarios

### What's Already Provided

- Blockchain core infrastructure (`server/src/core/`)
- API routing structure
- Database/state management setup
- Frontend skeleton
- Mock data generation
- Basic authentication framework

### Evaluation Criteria

Your implementation will be evaluated on:

1. **Correctness** - Does it work as specified?
2. **Security** - Are there vulnerabilities or security issues?
3. **Code Quality** - Is the code clean, maintainable, and well-documented?
4. **Blockchain Understanding** - Does it properly leverage blockchain concepts?
5. **Performance** - Is it efficient and scalable?
6. **Testing** - Are edge cases and errors handled?

### Submission

1. Complete all feature implementations
2. Ensure the application runs without errors
3. Write a brief summary document explaining:
   - Your implementation approach
   - Any design decisions you made
   - Challenges you encountered
   - Potential improvements

4. Submit your code via the method specified in your hiring process

## API Documentation

See `server/README.md` for detailed API documentation.

## Frontend Documentation

See `client/README.md` for frontend development guidelines.

## Questions?

If you have questions about the assessment, please contact: careers@aihealthchains.com

## Time Estimate

This assessment is designed to take approximately 8-12 hours for a senior blockchain engineer. Focus on quality over speed - we value thorough, secure implementations.

---

**Good luck! We're excited to see what you build.**

