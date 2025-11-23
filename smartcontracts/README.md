# UberProtocol Smart Contracts

Production-ready smart contracts for the UberProtocol hackathon project - a cross-chain coordination layer for autonomous agents.

## 🏗️ Architecture

### Base L2 (Coordination & Settlement)
- **AgentTaskManager**: ERC-8001-style intent coordination with job posting and settlement

### 0G (Agent Identity & Reputation)
- **AgentNFT**: ERC-7857 compliant AI agent NFTs with private metadata
- **MockVerifier**: Simplified TEE verifier for hackathon (production would use real attestation)
- **IdentityRegistry**: ERC-8004 agent identity registry using ERC-721
- **ReputationRegistry**: ERC-8004 feedback and reputation system

## 📋 Standards Compliance

- ✅ **ERC-8001**: Agent Coordination Framework (canonical typed data, domain, hashing)
- ✅ **ERC-7857**: AI Agents NFT with Private Metadata (full interface support)
- ✅ **ERC-8004**: Trustless Agents (Identity + Reputation registries)
- ✅ **EIP-712**: Structured data signing
- ✅ **ERC-1271**: Contract signature validation support

## 🚀 Setup

```bash
cd smartcontracts
npm install
```

Create a `.env` file:
```bash
cp .env.example .env
# Edit .env with your private key and RPC endpoints
```

## 🔨 Compile

```bash
npm run compile
```

## 🚢 Deployment

### Deploy to 0G Testnet
```bash
npm run deploy:0g
```

This deploys:
1. MockVerifier
2. AgentNFT (with verifier)
3. IdentityRegistry
4. ReputationRegistry (with identity registry)
5. Mints a mock agent NFT
6. Registers the agent in IdentityRegistry

### Deploy to Base Sepolia
```bash
npm run deploy:base
```

This deploys:
1. AgentTaskManager (ERC-8001 coordination)
2. Funds it with 0.1 ETH for demo settlements

## 📝 Usage Examples

### 1. Create a Job Intent

```typescript
import { createJobIntent } from "./scripts/utils/createJobIntent";

const { intent, signature, jobSpec, intentHash } = await createJobIntent(
  userSigner,
  taskManagerAddress,
  chainId,
  {
    topic: "defi_strategy",
    ipfsUri: "ipfs://QmExample",
    budget: ethers.parseEther("1.0"),
    deadline: Math.floor(Date.now() / 1000) + 86400
  },
  [agentAddress1, agentAddress2]
);

// Post to contract
const tx = await taskManager.postJobIntent(intent, signature, jobSpec);
await tx.wait();
```

### 2. Agent Creates Acceptance

```typescript
import { createAcceptance } from "./scripts/utils/createAcceptance";

const { acceptance, signature } = await createAcceptance(
  agentSigner,
  taskManagerAddress,
  chainId,
  intentHash,
  {
    expiry: Math.floor(Date.now() / 1000) + 3600,
    nonce: 1
  }
);

// Agent submits bid (off-chain via Hedera or HTTP to relayer)
```

### 3. Settle Job with Agent

```typescript
// User selects winning agent and settles
const tx = await taskManager.settleJobWithAgent(
  intent,
  acceptance,
  agentPayoutAddress,
  amount,
  logRootHash
);
await tx.wait();
```

## 📚 Contract Interfaces

### AgentTaskManager (Base L2)

```solidity
function postJobIntent(
    AgentIntent calldata intent,
    bytes calldata intentSig,
    JobSpec calldata spec
) external payable returns (bytes32 intentHash);

function settleJobWithAgent(
    AgentIntent calldata intent,
    AcceptanceAttestation calldata acc,
    address payable payoutAddress,
    uint256 amount,
    bytes32 logRootHash
) external;
```

### IdentityRegistry (0G)

```solidity
function register(
    string memory tokenURI,
    MetadataEntry[] calldata metadata
) external returns (uint256 agentId);

function setMetadata(
    uint256 agentId,
    string calldata key,
    bytes calldata value
) external;

function getMetadata(
    uint256 agentId,
    string calldata key
) external view returns (bytes memory);
```

### ReputationRegistry (0G)

```solidity
function giveFeedback(
    uint256 agentId,
    uint8 score,
    bytes32 tag1,
    bytes32 tag2,
    string calldata fileuri,
    bytes32 filehash,
    bytes memory feedbackAuth
) external;

function getSummary(
    uint256 agentId,
    address[] calldata clientAddresses,
    bytes32 tag1,
    bytes32 tag2
) external view returns (uint64 count, uint8 averageScore);
```

### AgentNFT (0G)

```solidity
function mint(
    IntelligentData[] calldata iDatas,
    address to
) public payable returns (uint256 tokenId);

function intelligentDataOf(
    uint256 _tokenId
) external view returns (IntelligentData[] memory);

function iTransfer(
    address _to,
    uint256 _tokenId,
    TransferValidityProof[] calldata _proofs
) external;
```

## 🧪 Testing

```bash
npm run test
```

## 🔐 Security Considerations

### AgentTaskManager
- ✅ EIP-712 signature verification for intents and acceptances
- ✅ Nonce monotonicity per agentId
- ✅ Canonical participant ordering (sorted ascending)
- ✅ Expiry checks for intents and acceptances
- ✅ Budget enforcement

### AgentNFT
- ✅ Transfer validity proof verification
- ✅ Access assistant validation
- ✅ Data hash integrity checks
- ⚠️ MockVerifier accepts all valid signatures (production needs real TEE attestation)

### IdentityRegistry
- ✅ ERC-721 standard compliance
- ✅ Owner/operator access control for metadata updates
- ✅ URIStorage for registration files

### ReputationRegistry
- ✅ FeedbackAuth signature validation
- ✅ Index limit enforcement
- ✅ Expiry checks
- ⚠️ Sybil attack mitigation requires filtering by trusted reviewers

## 📖 EIP-712 Typed Data

### AgentIntent Domain
```javascript
{
  name: "ERC-8001",
  version: "1",
  chainId: <network_chain_id>,
  verifyingContract: <AgentTaskManager_address>
}
```

### Type Hashes
```solidity
AGENT_INTENT_TYPEHASH = keccak256(
  "AgentIntent(bytes32 payloadHash,uint64 expiry,uint64 nonce,address agentId,bytes32 coordinationType,uint256 coordinationValue,address[] participants)"
);

ACCEPTANCE_TYPEHASH = keccak256(
  "AcceptanceAttestation(bytes32 intentHash,address participant,uint64 nonce,uint64 expiry,bytes32 conditionsHash)"
);

JOBSPEC_TYPEHASH = keccak256(
  "JobSpec(string topic,string ipfsUri,uint256 budget,uint64 deadline)"
);
```

## 🎯 Networks

### Base Sepolia
- Chain ID: 84532
- RPC: https://sepolia.base.org
- Contracts: AgentTaskManager

### 0G Testnet
- Chain ID: 16600
- RPC: https://evmrpc-testnet.0g.ai
- Contracts: AgentNFT, MockVerifier, IdentityRegistry, ReputationRegistry

## 📄 License

MIT

## 🤝 Contributing

This is a hackathon project. For production use, ensure:
1. Real TEE attestation in verifier
2. Comprehensive access control
3. Full test coverage
4. Professional security audit
5. Gas optimization
6. Cross-chain bridge security (if implementing)

---

Built for ETHGlobal Hackathon by the UberProtocol Team 🚀

