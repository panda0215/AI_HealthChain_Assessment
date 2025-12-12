# Quick Start Guide

## Prerequisites

- Node.js v18 or higher
- npm or yarn

## Setup Steps

### 1. Install Dependencies

**Backend:**
```bash
cd server
npm install
```

**Frontend:**
```bash
cd client
npm install
```

**Data Generator:**
```bash
cd data-generator
npm install
```

### 2. Generate Mock Data

```bash
cd data-generator
node generate-data.js
```

This creates `server/src/data/generated-data.js` with thousands of mock healthcare records.

### 3. Start Backend Server

```bash
cd server
npm start
```

Server runs on `http://localhost:3000`

### 4. Start Frontend (in a new terminal)

```bash
cd client
npm run dev
```

Frontend runs on `http://localhost:5173`

## Verify Installation

1. **Check Backend:**
   - Open `http://localhost:3000/health`
   - Should return health status

2. **Check Frontend:**
   - Open `http://localhost:5173`
   - Should see dashboard with blockchain info

## Next Steps

1. Review `README.md` for project overview
2. Read `ASSESSMENT_GUIDELINES.md` for implementation details
3. Check `server/README.md` for API documentation
4. Start implementing features in `server/src/features/`

## Troubleshooting

### Port Already in Use

If port 3000 or 5173 is in use:
- Backend: Set `PORT` in `server/.env`
- Frontend: Change port in `client/vite.config.js`

### Data Not Generated

If you see empty data:
- Run `node data-generator/generate-data.js`
- Check that `server/src/data/generated-data.js` exists

### Module Not Found

If you see import errors:
- Make sure you ran `npm install` in each directory
- Check Node.js version: `node --version` (should be v18+)

## Development Tips

- Use `npm run dev` in server for auto-reload
- Frontend auto-reloads with Vite
- Check browser console for frontend errors
- Check terminal for backend errors

## Project Structure

```
aihealthchains-blockchain-assessment/
├── client/              # React frontend
├── server/              # Node.js backend
├── data-generator/      # Mock data generator
└── README.md           # Main documentation
```

## Need Help?

- Review documentation files
- Check code comments in feature files
- Contact: careers@aihealthchains.com

