# FlowSync Quick Start Guide

## Prerequisites
- Node.js 18+
- npm 9+
- Google Cloud Project (optional)

## Installation (5 minutes)
1. Clone: `git clone https://github.com/sank-98/FlowSync.git`
2. Install: `npm install`
3. Configure: `cp .env.example .env` (fill values)
4. Start: `npm start`
5. Access: `http://localhost:8080`

## Test API
- Health: `GET http://localhost:8080/health`
- Zones: `GET http://localhost:8080/api/zones`
- Route: `POST http://localhost:8080/api/route`

Example:
```bash
curl -s http://localhost:8080/health | jq
curl -s http://localhost:8080/api/zones | jq
curl -s -X POST http://localhost:8080/api/route \
  -H "Content-Type: application/json" \
  -d '{"from":"entry-a","to":"food-court","preference":"fastest"}' | jq
```

## Available Commands
- `npm start` - Run server
- `npm test` - Run all tests
- `npm run lint` - Check code quality
- `npm run test:coverage` - Coverage report
