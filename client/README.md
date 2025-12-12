# AI Health Chains - Frontend Client

## Overview

This is the React + Vite frontend application for the AI Health Chains blockchain assessment. It provides a user interface for interacting with the blockchain backend.

## Technology Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Axios** - HTTP client

## Project Structure

```
client/
├── src/
│   ├── App.jsx          # Main application component
│   ├── App.css          # Application styles
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── public/              # Static assets
├── index.html           # HTML template
├── vite.config.js       # Vite configuration
└── package.json         # Dependencies
```

## Getting Started

### Installation

```bash
cd client
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

Build for production:

```bash
npm run build
```

### Preview

Preview production build:

```bash
npm run preview
```

## Features

### Dashboard

The main dashboard displays:
- Blockchain chain length
- Total transactions
- Node ID
- Network node count

### Feature Pages

Each feature has its own page:
- **Consent Management** - `/consent`
- **Data Integrity** - `/integrity`
- **ZK Proofs** - `/zk-proofs`
- **Audit Trail** - `/audit`
- **Consensus** - `/consensus`

## API Integration

The frontend communicates with the backend via REST API:

- Base URL: `/api` (proxied to `http://localhost:3000` in development)
- All API calls use Axios
- Error handling should be implemented in each component

## Customization

### Adding New Features

1. Create a new component in `src/`
2. Add route in `App.jsx`
3. Add navigation link in header
4. Implement API integration

### Styling

- Global styles: `src/index.css`
- Component styles: `src/App.css`
- Use CSS modules or styled-components for component-specific styles

## Development Guidelines

1. **Component Structure** - Keep components small and focused
2. **State Management** - Use React hooks (useState, useEffect)
3. **Error Handling** - Handle API errors gracefully
4. **Loading States** - Show loading indicators during API calls
5. **Responsive Design** - Ensure UI works on different screen sizes

## API Endpoints

See `server/README.md` for complete API documentation.

### Example API Call

```javascript
import axios from 'axios';

const fetchBlockchainInfo = async () => {
  try {
    const response = await axios.get('/api/blockchain/info');
    console.log(response.data);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

## Notes

- The frontend is a skeleton - you may enhance it as needed
- API endpoints return 501 (Not Implemented) until features are completed
- Focus on backend implementation for the assessment
- Frontend can be enhanced to demonstrate features once implemented

