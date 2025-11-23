# UberProtocol Deployment Guide

## Prerequisites

1. Node.js v18+ and npm installed
2. Private key with funds on:
   - Base Sepolia (get from https://faucet.quicknode.com/base/sepolia)
   - 0G Testnet (contact 0G team or faucet)

## Setup

```bash
cd smartcontracts
npm install
cp .env.example .env
```

Edit `.env`:
```bash
PRIVATE_KEY=your_private_key_without_0x
BASE_SEPOLIA_RPC=https://sepolia.base.org
ZEROG_TESTNET_RPC=https://evmrpc-testnet.0g.ai
```

## Compile Contracts

```bash
npm run compile
```

Expected output:
```
Compiled 15 Solidity files successfully
```

## Deployment Sequence

### Step 1: Deploy to 0G Testnet (Identity & Reputation)

```bash
npm run deploy:0g
```

**Deploys:**
1. `MockVerifier` - Simplified TEE verifier
2. `AgentNFT` - ERC-7857 agent NFTs
3. `IdentityRegistry` - ERC-8004 agent registry (ERC-721 based)
4. `ReputationRegistry` - ERC-8004 feedback system
5. Mints mock agent NFT (tokenId: 0)
6. Registers mock agent (agentId: 1)

**Save these addresses:**
```
MockVerifier:         0x...
AgentNFT:            0x...
IdentityRegistry:    0x...
ReputationRegistry:  0x...
Mock Agent NFT ID:   0
Mock Agent ID:       1
```

### Step 2: Deploy to Base Sepolia (Coordination)

```bash
npm run deploy:base
```

**Deploys:**
1. `AgentTaskManager` - ERC-8001 style coordination
2. Funds contract with 0.1 ETH for demo settlements

**Save this address:**
```
AgentTaskManager:    0x...
```

### Step 3: Run End-to-End Demo (Local)

Test the full flow locally:

```bash
npm run demo
```

This demonstrates:
- User posting job intent with EIP-712 signature
- Multiple agents submitting bids
- User settling with selected agent
- Payment execution

## Manual Testing

### Create a Job Intent

```bash
export TASK_MANAGER_ADDRESS=0x... # Your deployed address
npm run create:intent
```

### Create an Acceptance

```bash
export TASK_MANAGER_ADDRESS=0x...
export INTENT_HASH=0x... # From previous step
npm run create:acceptance
```

### Post Intent On-Chain

```typescript
import { ethers } from "hardhat";
import { createJobIntent } from "./scripts/utils/createJobIntent";

const [signer] = await ethers.getSigners();
const taskManager = await ethers.getContractAt(
  "AgentTaskManager",
  "0x..." // Your address
);

const { intent, signature, jobSpec } = await createJobIntent(
  signer,
  await taskManager.getAddress(),
  84532, // Base Sepolia
  {
    topic: "defi_strategy",
    ipfsUri: "ipfs://QmExample",
    budget: ethers.parseEther("1.0"),
    deadline: Math.floor(Date.now() / 1000) + 86400
  },
  ["0xAgent1", "0xAgent2"]
);

const tx = await taskManager.postJobIntent(intent, signature, jobSpec, {
  value: ethers.parseEther("1.0") // Fund the intent
});
await tx.wait();
```

## Verification (Optional)

### Verify on BaseScan

```bash
npx hardhat verify --network baseSepolia <AgentTaskManager_address>
```

### Verify on 0G Explorer

```bash
npx hardhat verify --network zeroGTestnet <contract_address> <constructor_args>
```

## Integration with Relayer

After deployment, configure your relayer with:

```json
{
  "base": {
    "chainId": 84532,
    "rpc": "https://sepolia.base.org",
    "contracts": {
      "AgentTaskManager": "0x..."
    }
  },
  "zeroG": {
    "chainId": 16600,
    "rpc": "https://evmrpc-testnet.0g.ai",
    "contracts": {
      "AgentNFT": "0x...",
      "IdentityRegistry": "0x...",
      "ReputationRegistry": "0x...",
      "MockVerifier": "0x..."
    }
  },
  "hedera": {
    "network": "testnet",
    "topicId": "0.0.xxxxx"
  }
}
```

## Troubleshooting

### "insufficient funds" error
- Ensure your account has ETH on the target network
- Check gas prices during deployment

### "nonce too low" error
- Wait for previous transaction to confirm
- Reset nonce in MetaMask if using multiple tools

### Contract verification fails
- Ensure constructor arguments match deployment
- Check Solidity compiler version (0.8.24)
- Verify optimization settings match hardhat.config.ts

### Transaction reverts on postJobIntent
- Ensure participants array is sorted ascending
- Check intent hasn't expired
- Verify nonce is greater than current nonce
- Ensure signature is from agentId address

## Production Checklist

Before mainnet deployment:

- [ ] Replace MockVerifier with real TEE attestation service
- [ ] Add access control to AgentTaskManager withdraw function
- [ ] Implement ERC-20 token support for payments (not just ETH)
- [ ] Add pausability to critical contracts
- [ ] Comprehensive test coverage (unit + integration)
- [ ] Professional security audit
- [ ] Gas optimization review
- [ ] Set up monitoring and alerts
- [ ] Document emergency procedures
- [ ] Prepare upgrade path (if using proxies)

## Support

For issues or questions:
- GitHub: [Your Repo]
- Discord: [Your Channel]
- Email: [Your Email]

---

Built for ETHGlobal Hackathon 🚀

