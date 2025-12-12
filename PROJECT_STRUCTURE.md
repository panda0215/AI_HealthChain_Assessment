# Project Structure

## Complete Directory Tree

```
aihealthchains-blockchain-assessment/
│
├── README.md                          # Main project documentation
├── QUICK_START.md                     # Quick start guide
├── ASSESSMENT_GUIDELINES.md           # Detailed implementation guidelines
├── PROJECT_STRUCTURE.md               # This file
├── .gitignore                         # Git ignore rules
│
├── client/                            # React + Vite Frontend
│   ├── src/
│   │   ├── App.jsx                    # Main application component
│   │   ├── App.css                    # Application styles
│   │   ├── main.jsx                   # Entry point
│   │   └── index.css                 # Global styles
│   ├── public/                        # Static assets
│   ├── index.html                     # HTML template
│   ├── vite.config.js                 # Vite configuration
│   ├── package.json                   # Frontend dependencies
│   └── README.md                      # Frontend documentation
│
├── server/                            # Node.js Backend
│   ├── src/
│   │   ├── index.js                   # Backend entry point
│   │   │
│   │   ├── core/                      # Blockchain core implementation
│   │   │   ├── Blockchain.js          # Core blockchain class
│   │   │   └── NodeManager.js         # Network node management
│   │   │
│   │   ├── features/                  # Features to implement
│   │   │   ├── consent-management/
│   │   │   │   ├── ConsentContract.js # Smart contract (TODO)
│   │   │   │   ├── consentService.js  # Service layer (TODO)
│   │   │   │   └── consentController.js # API endpoints (TODO)
│   │   │   │
│   │   │   ├── data-integrity/
│   │   │   │   ├── MerkleTree.js      # Merkle tree (TODO)
│   │   │   │   ├── integrityService.js # Service layer (TODO)
│   │   │   │   └── integrityController.js # API endpoints (TODO)
│   │   │   │
│   │   │   ├── zk-proofs/
│   │   │   │   ├── ZKProof.js         # ZK proof system (TODO)
│   │   │   │   ├── zkService.js       # Service layer (TODO)
│   │   │   │   └── zkController.js    # API endpoints (TODO)
│   │   │   │
│   │   │   ├── audit-trail/
│   │   │   │   ├── AuditLogger.js     # Audit logger (TODO)
│   │   │   │   ├── auditService.js    # Service layer (TODO)
│   │   │   │   └── auditController.js # API endpoints (TODO)
│   │   │   │
│   │   │   └── consensus/
│   │   │       ├── ConsensusEngine.js  # Consensus algorithm (TODO)
│   │   │       ├── consensusService.js # Service layer (TODO)
│   │   │       └── consensusController.js # API endpoints (TODO)
│   │   │
│   │   ├── utils/                     # Utility functions
│   │   │   └── helpers.js             # Helper functions
│   │   │
│   │   └── data/                      # Generated mock data
│   │       └── generated-data.js      # Auto-generated (run generator)
│   │
│   ├── package.json                   # Backend dependencies
│   ├── .env.example                   # Environment variables example
│   └── README.md                      # Backend documentation
│
└── data-generator/                    # Mock Data Generator
    ├── generate-data.js               # Data generation script
    ├── package.json                   # Generator dependencies
    └── README.md                      # Generator documentation
```

## Key Files

### Documentation
- **README.md** - Main project overview and instructions
- **QUICK_START.md** - Quick setup guide
- **ASSESSMENT_GUIDELINES.md** - Detailed implementation guidelines
- **PROJECT_STRUCTURE.md** - This file

### Backend Core
- **server/src/index.js** - Main server entry point
- **server/src/core/Blockchain.js** - Blockchain implementation
- **server/src/core/NodeManager.js** - Node management

### Features (To Implement)
All features follow the same pattern:
- `*Contract.js` or `*Tree.js` or `*Engine.js` - Core logic
- `*Service.js` - Service layer
- `*Controller.js` - API endpoints

### Frontend
- **client/src/App.jsx** - Main React component
- **client/vite.config.js** - Vite configuration

### Data
- **data-generator/generate-data.js** - Generates mock data
- **server/src/data/generated-data.js** - Generated data (run generator first)

## File Naming Conventions

- **PascalCase** - Classes (e.g., `Blockchain.js`, `ConsentContract.js`)
- **camelCase** - Services and utilities (e.g., `consentService.js`, `helpers.js`)
- **kebab-case** - Config files (e.g., `vite.config.js`, `package.json`)

## Module Structure

### Feature Modules
Each feature module contains:
1. **Core Logic** - The main implementation (Contract, Tree, Engine, etc.)
2. **Service Layer** - Business logic and validation
3. **Controller** - Express routes and API endpoints

### Import Pattern
```javascript
// Core logic
import ConsentContract from './ConsentContract.js';

// Service uses core
import ConsentService from './consentService.js';

// Controller uses service
import ConsentService from './consentService.js';
```

## Data Flow

```
Client Request
    ↓
Controller (API endpoint)
    ↓
Service (business logic)
    ↓
Contract/Engine (core logic)
    ↓
Blockchain (storage)
```

## Adding New Features

To add a new feature:

1. Create directory: `server/src/features/new-feature/`
2. Create files:
   - `NewFeature.js` - Core logic
   - `newFeatureService.js` - Service layer
   - `newFeatureController.js` - API endpoints
3. Import in `server/src/index.js`
4. Add route: `app.use('/api/new-feature', newFeatureRoutes)`

## Notes

- All blockchain operations go through the `Blockchain` class
- Mock data is loaded into `app.locals.data`
- Services receive `blockchain` and `data` as dependencies
- Controllers are Express routers

