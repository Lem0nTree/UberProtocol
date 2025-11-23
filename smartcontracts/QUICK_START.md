# UberProtocol - Quick Start Guide

## ⚡ 5-Minute Setup

```bash
# 1. Install dependencies
cd smartcontracts && npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your PRIVATE_KEY

# 3. Compile contracts
npm run compile

# 4. Run local demo
npm run demo
```

## 🎯 One-Command Deployments

### Deploy Everything to 0G Testnet
```bash
npm run deploy:0g
```
**Deploys:** MockVerifier, AgentNFT, IdentityRegistry, ReputationRegistry + mock agent

### Deploy to Base Sepolia
```bash
npm run deploy:base
```
**Deploys:** AgentTaskManager (funded with 0.1 ETH)

## 📝 Usage Examples

### Post a Job

```typescript
import { ethers } from "hardhat";
import { createJobIntent } from "./scripts/utils/createJobIntent";

const [user] = await ethers.getSigners();
const taskManager = await ethers.getContractAt("AgentTaskManager", "0x...");

const { intent, signature, jobSpec } = await createJobIntent(
  user,
  await taskManager.getAddress(),
  84532, // Base Sepolia chain ID
  {
    topic: "defi_swap",
    ipfsUri: "ipfs://QmJobSpec",
    budget: ethers.parseEther("1.0"),
    deadline: Math.floor(Date.now() / 1000) + 86400 // 24h
  },
  ["0xAgent1Address", "0xAgent2Address"]
);

// Post to blockchain
const tx = await taskManager.postJobIntent(intent, signature, jobSpec);
await tx.wait();
console.log("Job posted! Intent hash:", intentHash);
```

### Agent Accepts Job

```typescript
import { createAcceptance } from "./scripts/utils/createAcceptance";

const [, agent] = await ethers.getSigners();

const { acceptance, signature } = await createAcceptance(
  agent,
  taskManagerAddress,
  84532,
  intentHash, // From posted job
  {
    expiry: Math.floor(Date.now() / 1000) + 3600, // 1h
    nonce: 1
  }
);

// In production: Send via Hedera HCS or HTTP to relayer
console.log("Acceptance:", acceptance);
```

### Settle Job

```typescript
// User selects winning agent and settles
const tx = await taskManager.settleJobWithAgent(
  intent,
  acceptance,
  agentPayoutAddress,
  ethers.parseEther("0.9"), // Payment amount
  ethers.keccak256(ethers.toUtf8Bytes("execution-logs"))
);
await tx.wait();
console.log("Job settled! Agent paid.");
```

## 🔑 Key Addresses

After deployment, save these:

```typescript
// Base Sepolia (Chain ID: 84532)
const BASE_CONTRACTS = {
  AgentTaskManager: "0x..."
};

// 0G Testnet (Chain ID: 16600)
const ZEROG_CONTRACTS = {
  MockVerifier: "0x...",
  AgentNFT: "0x...",
  IdentityRegistry: "0x...",
  ReputationRegistry: "0x..."
};
```

## 🧪 Test Commands

```bash
# Run full E2E demo
npm run demo

# Create job intent (helper)
export TASK_MANAGER_ADDRESS=0x...
npm run create:intent

# Create acceptance (helper)
export INTENT_HASH=0x...
npm run create:acceptance

# Start local node
npm run node

# Run tests (when implemented)
npm test
```

## 📊 Contract ABIs

After compiling, find ABIs in:
```
artifacts/contracts/base/AgentTaskManager.sol/AgentTaskManager.json
artifacts/contracts/zeroG/AgentNFT.sol/AgentNFT.json
artifacts/contracts/zeroG/IdentityRegistry.sol/IdentityRegistry.json
artifacts/contracts/zeroG/ReputationRegistry.sol/ReputationRegistry.json
```

## 🔍 Verify Contracts

### Base Sepolia
```bash
npx hardhat verify --network baseSepolia \
  0xYourAgentTaskManagerAddress
```

### 0G Testnet
```bash
npx hardhat verify --network zeroGTestnet \
  0xYourContractAddress \
  "constructor_arg_1" "constructor_arg_2"
```

## 🐛 Common Issues

### "Insufficient funds"
→ Fund your address on Base Sepolia: https://faucet.quicknode.com/base/sepolia
→ Fund on 0G: Contact 0G team for testnet tokens

### "Nonce too low"
→ Intent nonce must be > current nonce
→ Get current: `taskManager.agentNonces(agentAddress)`

### "Participants not canonical"
→ Use `sortParticipants()` from eip712Signer.ts
→ Addresses must be sorted ascending

### "Bad signature"
→ Ensure signer matches intent.agentId or acceptance.participant
→ Verify EIP-712 domain matches deployed contract

## 📚 Learn More

- **Full Documentation**: See [README.md](./README.md)
- **Deployment Guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Implementation Details**: See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

## 🆘 Support

- Check the docs in `/smartcontracts` directory
- Review contract comments and NatSpec
- Read the ERC standards in `/data` directory

## 🚀 Ready to Deploy?

1. ✅ Compiled contracts
2. ✅ Funded wallet addresses
3. ✅ Environment configured
4. ✅ Run: `npm run deploy:0g && npm run deploy:base`
5. ✅ Save all deployment addresses
6. ✅ Configure relayer with addresses
7. ✅ Test with demo script

---

**Need Help?** Open an issue or check the comprehensive documentation files.

Built for ETHGlobal Hackathon 🎉

