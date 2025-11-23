# UberProtocol Autonomous Agent

A simple autonomous bidding agent that subscribes to Hedera A2A topic, receives job postings, evaluates them, and submits bids.

## 🤖 What It Does

1. **Listens to A2A Topic**: Subscribes to Hedera HCS topic for job postings
2. **Evaluates Jobs**: Checks budget, deadline, and capability match
3. **Calculates Bids**: Dynamic pricing based on job requirements
4. **Signs Bids**: Creates EIP-712 AcceptanceAttestation signatures
5. **Submits Bids**: Publishes bids back to A2A topic

## 🚀 Quick Start

### Prerequisites

- Node.js v18+
- Hedera testnet account
- Agent registered in 0G IdentityRegistry
- Private key for signing bids

### Installation

```bash
cd agents
npm install
```

### Configuration

1. Copy environment template:
```bash
cp .env.example .env
```

2. Fill in your credentials:
```env
# Agent Identity
AGENT_NAME="DeFi Swap Agent"
AGENT_ID=1  # From 0G IdentityRegistry
AGENT_WALLET_ADDRESS=0x...
AGENT_PRIVATE_KEY=0x...

# Hedera
HEDERA_ACCOUNT_ID=0.0.xxxxx
HEDERA_PRIVATE_KEY=302e...
A2A_TOPIC_ID=0.0.xxxxx  # From relayer

# Base L2
TASK_MANAGER_ADDRESS=0x...

# Pricing
BASE_PRICE_ETH=0.01
MIN_BUDGET_ETH=0.005
```

### Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## 📝 How It Works

### 1. Job Reception
```
Hedera A2A Topic → Agent Subscriber → Job Evaluation
```

Agent receives `JOB_POSTED` messages from A2A topic.

### 2. Job Evaluation

The agent checks:
- ✅ Budget meets minimum threshold
- ✅ Job deadline not expired
- ✅ Agent is in participants list
- ✅ Job topic matches agent capabilities

### 3. Bid Calculation

```typescript
bidPrice = min(budget * 0.9, basePrice)
```

Agent bids at 90% of budget or base price, whichever is higher.

### 4. Bid Submission

Agent creates an EIP-712 signed `AcceptanceAttestation`:

```typescript
{
  intentHash: "0x...",
  participant: agentAddress,
  nonce: 1,
  expiry: jobExpiry,
  conditionsHash: "0x...",
  signature: "0x..."
}
```

Then publishes `BID_SUBMITTED` message to A2A topic.

## 🧬 Customization

### Add Custom Evaluation Logic

Edit `evaluateJob()` in `src/index.ts`:

```typescript
private async evaluateJob(jobSpec: any, intent: any): Promise<boolean> {
  // Check reputation of job poster
  const reputation = await this.checkUserReputation(intent.agentId);
  if (reputation < 50) return false;

  // Check your own capacity
  const hasCapacity = await this.checkCapacity();
  if (!hasCapacity) return false;

  // Your custom logic here
  return true;
}
```

### Custom Pricing Strategy

Edit `calculateBidPrice()` in `src/index.ts`:

```typescript
private async calculateBidPrice(jobSpec: any): Promise<bigint> {
  const budget = BigInt(jobSpec.budget);
  
  // Dynamic pricing based on demand
  const demandMultiplier = await this.getDemandMultiplier();
  const basePrice = ethers.parseEther('0.01');
  
  return (basePrice * BigInt(demandMultiplier)) / BigInt(100);
}
```

### Add AI Decision Making

Install LangChain and integrate:

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { HederaLangchainToolkit } from 'hedera-agent-kit';

const llm = new ChatOpenAI({ model: 'gpt-4' });
const toolkit = new HederaLangchainToolkit({ client });

// Use AI to evaluate jobs
const decision = await llm.invoke(
  `Should I bid on this job? Spec: ${JSON.stringify(jobSpec)}`
);
```

## 📊 Monitoring

Logs are written to:
- `agent-error.log` - Error logs
- `agent.log` - All logs
- Console (in development)

Example log:
```json
{
  "level": "info",
  "message": "Bid submitted successfully",
  "intentHash": "0x...",
  "agentId": 1,
  "timestamp": "2025-11-23T12:00:00.000Z"
}
```

## 🔐 Security

- **Private Key**: Keep `AGENT_PRIVATE_KEY` secure, never commit to Git
- **Signature Validation**: All bids are signed with EIP-712
- **Rate Limiting**: TODO - Add rate limiting for bid submissions
- **Nonce Management**: Track nonces to prevent replay attacks

## 🧪 Testing

### Test Job Reception

1. Post a job via frontend or directly to Base L2
2. Check agent logs for "Received job" message
3. Verify bid appears in relayer database

### Test Bid Submission

```bash
# Check agent is running
curl http://localhost:3000/health

# Monitor logs
tail -f agent.log

# Post test job and watch agent respond
```

## 🎯 Deployment

### Deploy to Server

```bash
# Build
npm run build

# Start with PM2
pm2 start dist/index.js --name uberprotocol-agent

# Monitor
pm2 logs uberprotocol-agent

# Auto-restart on crash
pm2 startup
pm2 save
```

### Deploy Multiple Agents

Run multiple instances with different configs:

```bash
# Agent 1 - DeFi Specialist
AGENT_ID=1 A2A_TOPIC_ID=0.0.12345 npm start

# Agent 2 - NFT Specialist
AGENT_ID=2 A2A_TOPIC_ID=0.0.12345 npm start
```

## 🔄 Integration with UberProtocol

```
┌──────────────┐
│  Base L2     │  JobIntentPosted
│  Contract    │──────────────────┐
└──────────────┘                  │
                                  ▼
                          ┌──────────────┐
                          │   Relayer    │
                          │  A2A Topic   │
                          └──────────────┘
                                  │
                                  ▼
                          ┌──────────────┐
                          │     Agent    │ ◄── You are here
                          │  (Subscriber)│
                          └──────────────┘
                                  │
                                  ▼
                          Bid Submission
```

## 📚 Resources

- [Hedera Agent Kit](https://github.com/hashgraph/hedera-agent-kit)
- [ERC-8001 Spec](../../data/erc-8001.md)
- [EIP-712 Standard](https://eips.ethereum.org/EIPS/eip-712)

## 🤝 Contributing

This is part of the UberProtocol hackathon project.

## 📄 License

MIT

---

Built for ETHGlobal Hackathon 🤖

