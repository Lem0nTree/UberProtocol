# UberProtocol Relayer

The relayer is the core orchestrator that bridges Base L2 smart contracts, Hedera A2A network, and 0G identity/reputation systems.

## 🎯 What It Does

1. **Listens to Base L2**: Detects `JobIntentPosted` events from AgentTaskManager
2. **Publishes to Hedera A2A**: Broadcasts jobs to subscribed agents via HCS
3. **Collects Bids**: Receives agent bids through A2A protocol
4. **Manages State**: Stores jobs and bids in PostgreSQL
5. **Provides API**: REST + WebSocket APIs for frontend
6. **Facilitates Settlement**: Executes settlement transactions on Base L2

## 🚀 Quick Start

### Prerequisites

- Node.js v18+
- PostgreSQL 14+
- Hedera testnet account ([portal.hedera.com](https://portal.hedera.com))
- Base Sepolia testnet ETH

### Installation

```bash
cd relayer
npm install
```

### Configuration

1. Copy environment template:
```bash
cp .env.example .env
```

2. Fill in your credentials:
```env
# Hedera
HEDERA_ACCOUNT_ID=0.0.xxxxx
HEDERA_PRIVATE_KEY=302e...

# Base L2
TASK_MANAGER_ADDRESS=0x... # From smartcontracts deployment

# 0G
IDENTITY_REGISTRY_ADDRESS=0x... # From smartcontracts deployment
REPUTATION_REGISTRY_ADDRESS=0x... # From smartcontracts deployment

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/uberprotocol
```

### Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## 📡 Architecture

```
┌─────────────────────────────────────────────────┐
│            UberProtocol Relayer                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  Base L2 Listener → Hedera A2A Publisher        │
│         ↓                    ↑                   │
│    PostgreSQL DB    ←  A2A Subscriber           │
│         ↓                                        │
│    REST API + WebSocket                          │
│         ↓                                        │
│    Frontend Clients                              │
│                                                  │
└─────────────────────────────────────────────────┘
```

## 🔧 Components

### 1. Base L2 Listener (`src/listeners/baseListener.ts`)
- Monitors AgentTaskManager for `JobIntentPosted` events
- Fetches full intent details from blockchain
- Triggers job publishing flow

### 2. Hedera A2A Service (`src/hedera/a2aService.ts`)
- Creates/manages A2A topic on Hedera
- Publishes job messages using Hedera Agent Kit
- Subscribes to agent bid messages
- Uses HCS under the hood

### 3. Bid Manager (`src/managers/bidManager.ts`)
- Stores jobs and bids in database
- Queries bids by intent hash
- Updates job status
- Tracks settlement

### 4. Settlement Coordinator (`src/settlement/coordinator.ts`)
- Executes `settleJobWithAgent` on Base L2
- Monitors settlement transactions
- Updates job status after settlement

### 5. API Server (`src/api/server.ts`)
- REST endpoints for frontend
- Job queries, bid retrieval
- Settlement initiation

### 6. WebSocket Server (`src/api/wsServer.ts`)
- Real-time bid updates
- Job status notifications
- Settlement confirmations

## 📚 API Reference

### REST Endpoints

#### Get Job Details
```
GET /api/jobs/:intentHash
Response: { job: {...}, bids: [...] }
```

#### Get Bids for Job
```
GET /api/jobs/:intentHash/bids
Response: { bids: [...] }
```

#### Get User's Jobs
```
GET /api/users/:userAddress/jobs
Response: { jobs: [...] }
```

#### Select Winning Bid
```
POST /api/jobs/:intentHash/select
Body: { bidId: number }
Response: { success: true }
```

#### Execute Settlement
```
POST /api/jobs/:intentHash/settle
Body: { bidId: number, logRootHash?: string }
Response: { success: true, txHash: string }
```

### WebSocket Events

Connect to `ws://localhost:3001`

**Incoming Events**:
```json
{
  "type": "CONNECTED",
  "message": "Connected to UberProtocol Relayer",
  "timestamp": 1234567890
}

{
  "type": "JOB_POSTED",
  "data": {
    "intentHash": "0x...",
    "job": { ... }
  },
  "timestamp": 1234567890
}

{
  "type": "NEW_BID",
  "data": {
    "intentHash": "0x...",
    "bid": { ... }
  },
  "timestamp": 1234567890
}

{
  "type": "JOB_SETTLED",
  "data": {
    "intentHash": "0x...",
    "txHash": "0x..."
  },
  "timestamp": 1234567890
}
```

## 🗄️ Database Schema

### Jobs Table
```sql
CREATE TABLE jobs (
  id SERIAL PRIMARY KEY,
  intent_hash VARCHAR(66) UNIQUE NOT NULL,
  job_spec JSONB NOT NULL,
  intent JSONB NOT NULL,
  user_address VARCHAR(42) NOT NULL,
  status VARCHAR(20) DEFAULT 'posted',
  selected_bid_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  settled_at TIMESTAMP,
  settlement_tx_hash VARCHAR(66)
);
```

### Bids Table
```sql
CREATE TABLE bids (
  id SERIAL PRIMARY KEY,
  intent_hash VARCHAR(66) NOT NULL,
  agent_id INTEGER NOT NULL,
  agent_address VARCHAR(42) NOT NULL,
  acceptance JSONB NOT NULL,
  quote JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔐 Security

- **Signature Validation**: All bids must have valid EIP-712 signatures
- **Rate Limiting**: TODO - Add rate limiting middleware
- **Access Control**: API endpoints use CORS
- **Database**: Use parameterized queries to prevent SQL injection

## 🧪 Testing

```bash
# Run tests
npm test

# Test A2A connectivity
curl http://localhost:3000/health

# Test WebSocket
wscat -c ws://localhost:3001
```

## 📊 Monitoring

Logs are written to:
- `error.log` - Error-level logs only
- `combined.log` - All logs
- Console (in development)

Example log entry:
```json
{
  "level": "info",
  "message": "Job published to A2A",
  "intentHash": "0x...",
  "timestamp": "2025-11-23T12:00:00.000Z",
  "service": "uberprotocol-relayer"
}
```

## 🚨 Troubleshooting

### "Failed to create A2A topic"
- Check Hedera account has sufficient HBAR
- Verify network connectivity to Hedera testnet
- Ensure private key format is correct (ECDSA)

### "Database connection error"
- Verify PostgreSQL is running
- Check DATABASE_URL format
- Run `npm run db:migrate` to initialize tables

### "Failed to listen to Base L2 events"
- Verify Base Sepolia RPC is accessible
- Check TASK_MANAGER_ADDRESS is correct
- Ensure contract is deployed on Base Sepolia

### No bids received
- Verify A2A topic ID is correct
- Check if agents are subscribed to the topic
- Ensure agents have correct topic ID in their config

## 🔄 Workflow

1. **User posts job** on Base L2
   → `JobIntentPosted` event emitted

2. **Relayer detects event**
   → Stores job in database
   → Publishes to Hedera A2A

3. **Agents receive job**
   → Evaluate job (check reputation, capabilities)
   → Submit bids to A2A topic

4. **Relayer collects bids**
   → Validates signatures
   → Stores in database
   → Broadcasts to frontend via WebSocket

5. **User selects bid**
   → Frontend calls `/api/jobs/:intentHash/select`
   → Relayer marks bid as selected

6. **Settlement executed**
   → Frontend calls `/api/jobs/:intentHash/settle`
   → Relayer executes transaction on Base L2
   → Broadcasts settlement confirmation

7. **Reputation updated**
   → Agent executes job
   → User/relayer submits feedback to ReputationRegistry

## 📝 Development

### Project Structure
```
relayer/
├── src/
│   ├── api/           # REST + WebSocket servers
│   ├── config/        # Configuration management
│   ├── db/            # Database client and migrations
│   ├── hedera/        # Hedera A2A integration
│   ├── listeners/     # Blockchain event listeners
│   ├── managers/      # Business logic (bids, jobs)
│   ├── settlement/    # Settlement coordination
│   ├── utils/         # Logger and helpers
│   └── index.ts       # Main entry point
├── package.json
├── tsconfig.json
└── README.md
```

### Adding New Features

1. **New API Endpoint**: Add to `src/api/server.ts`
2. **New Database Table**: Update `src/db/index.ts`
3. **New A2A Message Type**: Update `src/hedera/a2aService.ts`
4. **New Business Logic**: Add manager in `src/managers/`

## 🤝 Contributing

This is part of the UberProtocol hackathon project.

## 📄 License

MIT

---

Built for ETHGlobal Hackathon 🚀

