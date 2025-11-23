cd sm# UberProtocol Contracts Overview

## 📋 Contract Inventory

### Base L2 (Settlement & Coordination)

#### AgentTaskManager.sol
**Purpose**: ERC-8001-style job intent coordination and settlement  
**Location**: `contracts/base/AgentTaskManager.sol`  
**Size**: ~300 lines  
**Key Features**:
- Post job intents with EIP-712 signatures
- Validate acceptance attestations
- Settle jobs with payment
- Nonce management per agentId
- Status tracking (None → Proposed → Executed)

**Main Functions**:
```solidity
postJobIntent(intent, intentSig, spec) → intentHash
settleJobWithAgent(intent, acceptance, payoutAddress, amount, logRootHash)
getIntentStatus(intentHash) → Status
hashJobSpec(spec) → bytes32
```

**Type Hashes**:
- `AGENT_INTENT_TYPEHASH`
- `ACCEPTANCE_TYPEHASH`
- `JOBSPEC_TYPEHASH`
- `COORDINATION_TYPE = keccak256("UBER_JOB_V1")`

---

### 0G Testnet (Identity & Reputation)

#### AgentNFT.sol
**Purpose**: ERC-7857 AI Agent NFTs with private metadata  
**Location**: `contracts/zeroG/AgentNFT.sol`  
**Size**: ~450 lines  
**Key Features**:
- Mint agents with IntelligentData (model, memory hashes)
- Verifiable transfers with TransferValidityProof
- Clone agents with re-encryption
- Authorize usage for Sealed Executors
- Access assistant delegation

**Main Functions**:
```solidity
mint(iDatas[], to) → tokenId
iTransfer(to, tokenId, proofs[])
iClone(to, tokenId, proofs[]) → newTokenId
authorizeUsage(tokenId, user)
intelligentDataOf(tokenId) → IntelligentData[]
```

**Data Structure**:
```solidity
struct IntelligentData {
    string dataDescription;  // e.g., "model", "memory"
    bytes32 dataHash;        // Hash of encrypted data
}
```

---

#### MockVerifier.sol
**Purpose**: Simplified TEE verifier for hackathon  
**Location**: `contracts/zeroG/MockVerifier.sol`  
**Size**: ~150 lines  
**Key Features**:
- Verify AccessProof (receiver signature)
- Verify OwnershipProof (simplified TEE)
- Replay attack prevention
- Clean expired proofs

**Main Functions**:
```solidity
verifyTransferValidity(proofs[]) → outputs[]
isProofUsed(proofNonce) → bool
cleanExpiredProofs(nonces[])
```

**Note**: Production would use real TEE attestation service

---

#### IdentityRegistry.sol
**Purpose**: ERC-8004 agent identity using ERC-721  
**Location**: `contracts/zeroG/IdentityRegistry.sol`  
**Size**: ~120 lines  
**Key Features**:
- ERC-721 NFT per agent (tokenId = agentId)
- URIStorage for registration JSON
- On-chain metadata (key-value pairs)
- Three register() variants

**Main Functions**:
```solidity
register(tokenURI, metadata[]) → agentId
register(tokenURI) → agentId
register() → agentId
setMetadata(agentId, key, value)
getMetadata(agentId, key) → bytes
updateTokenURI(agentId, tokenURI)
```

**Metadata Examples**:
- `agentWallet`: EVM address for signing
- `agentName`: Human-readable name
- Custom keys per application

---

#### ReputationRegistry.sol
**Purpose**: ERC-8004 feedback and reputation system  
**Location**: `contracts/zeroG/ReputationRegistry.sol`  
**Size**: ~280 lines  
**Key Features**:
- Submit feedback with score (0-100)
- Tag-based categorization (tag1, tag2)
- On-chain aggregation (count, average)
- Revoke feedback
- Append responses

**Main Functions**:
```solidity
giveFeedback(agentId, score, tag1, tag2, fileuri, filehash, feedbackAuth)
revokeFeedback(agentId, feedbackIndex)
appendResponse(agentId, clientAddress, feedbackIndex, responseUri, responseHash)
getSummary(agentId, clients[], tag1, tag2) → (count, averageScore)
readFeedback(agentId, clientAddress, index) → (score, tag1, tag2, isRevoked)
```

**FeedbackAuth**:
```solidity
struct FeedbackAuth {
    uint256 agentId;
    address clientAddress;
    uint64 indexLimit;
    uint64 expiry;
    uint256 chainId;
    address identityRegistry;
    address signerAddress;
}
```

---

## 🔗 Contract Relationships

```
Base L2:
  AgentTaskManager
    ├─ Stores job intents
    ├─ Validates EIP-712 signatures
    └─ Executes settlements

0G:
  AgentNFT ←─────┐
    ├─ Uses      │
    └─ MockVerifier
  
  IdentityRegistry ←────┐
    ├─ Referenced by    │
    └─ ReputationRegistry

  (AgentNFT and IdentityRegistry are independent)
```

**Integration Points**:
1. **Relayer** listens to `JobIntentPosted` on Base
2. **Relayer** publishes to Hedera HCS
3. **Agents** read from HCS, look up identity from IdentityRegistry
4. **Agents** check reputation via ReputationRegistry
5. **Agents** submit bids back via HCS or HTTP
6. **User** selects agent, calls `settleJobWithAgent` on Base
7. **Relayer** submits feedback to ReputationRegistry after completion

---

## 📊 Storage & State

### AgentTaskManager
```solidity
mapping(bytes32 => IntentData) intents;           // intentHash → intent data
mapping(bytes32 => AgentIntent) intentDetails;    // intentHash → full intent
mapping(address => uint64) agentNonces;           // agentId → nonce
```

### AgentNFT
```solidity
mapping(uint256 => TokenData) tokens;             // tokenId → token data
  └─ TokenData: owner, authorizedUsers[], approvedUser, iDatas[]
mapping(address => address) accessAssistants;     // user → assistant
uint256 nextTokenId;
```

### IdentityRegistry
```solidity
mapping(uint256 => mapping(string => bytes)) _agentMetadata;  // agentId → key → value
uint256 _nextAgentId;
+ ERC721URIStorage tokenURI mappings
```

### ReputationRegistry
```solidity
mapping(uint256 => mapping(address => mapping(uint64 => FeedbackData))) feedback;
  └─ agentId → clientAddress → feedbackIndex → data
mapping(uint256 => mapping(address => uint64)) lastIndex;
mapping(uint256 => address[]) clients;
```

---

## 🎨 Events

### AgentTaskManager
```solidity
event JobIntentPosted(bytes32 indexed intentHash, address indexed user, JobSpec spec);
event JobSettled(bytes32 indexed intentHash, address indexed agent, uint256 amountPaid, bytes32 logRootHash);
```

### AgentNFT
```solidity
event Minted(uint256 indexed tokenId, address indexed creator, address indexed owner);
event Updated(uint256 indexed tokenId, IntelligentData[] oldDatas, IntelligentData[] newDatas);
event Transferred(uint256 tokenId, address indexed from, address indexed to);
event Cloned(uint256 indexed tokenId, uint256 indexed newTokenId, address from, address to);
event PublishedSealedKey(address indexed to, uint256 indexed tokenId, bytes[] sealedKeys);
event Authorization(address indexed from, address indexed to, uint256 indexed tokenId);
```

### IdentityRegistry
```solidity
event Registered(uint256 indexed agentId, string tokenURI, address indexed owner);
event MetadataSet(uint256 indexed agentId, string indexed indexedKey, string key, bytes value);
```

### ReputationRegistry
```solidity
event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint8 score, bytes32 indexed tag1, bytes32 tag2, string fileuri, bytes32 filehash);
event FeedbackRevoked(uint256 indexed agentId, address indexed clientAddress, uint64 indexed feedbackIndex);
event ResponseAppended(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, address indexed responder, string responseUri);
```

---

## ⚠️ Error Codes

### AgentTaskManager
```solidity
error ERC8001_NotProposer();
error ERC8001_ExpiredIntent();
error ERC8001_ExpiredAcceptance(address participant);
error ERC8001_BadSignature();
error ERC8001_NotParticipant();
error ERC8001_ParticipantsNotCanonical();
error ERC8001_NonceTooLow();
error ERC8001_PayloadHashMismatch();
error IntentAlreadyExists();
error BudgetExceeded();
error InsufficientBalance();
```

### AgentNFT
```solidity
error ZeroAddress();
error NotOwner();
error NotAuthorized();
error TokenDoesNotExist();
error EmptyDataArray();
error ProofCountMismatch();
error OldDataHashMismatch();
error AccessAssistantMismatch();
```

### ReputationRegistry
```solidity
error InvalidScore();
error InvalidFeedbackAuth();
error FeedbackAuthExpired();
error InvalidChainId();
error IndexLimitExceeded();
error FeedbackNotFound();
```

---

## 📏 Size Metrics

| Contract | Lines | Functions | Events | Errors |
|----------|-------|-----------|--------|--------|
| AgentTaskManager | ~300 | 10 | 2 | 11 |
| AgentNFT | ~450 | 20 | 6 | 8 |
| MockVerifier | ~150 | 5 | 1 | 4 |
| IdentityRegistry | ~120 | 8 | 2 | 3 |
| ReputationRegistry | ~280 | 12 | 3 | 7 |
| **Total** | **~1,300** | **55** | **14** | **33** |

---

## 🔐 Access Control

| Contract | Admin Functions | Access Control Type |
|----------|----------------|---------------------|
| AgentTaskManager | withdraw() | None (hackathon) |
| AgentNFT | updateVerifier() | AccessControl (ADMIN_ROLE) |
| IdentityRegistry | transferOwnership() | Ownable |
| ReputationRegistry | None | Permissionless |
| MockVerifier | None | Permissionless |

**Production**: Add proper access control to all admin functions

---

## 💰 Token Standards

| Contract | Standard | Compliant |
|----------|----------|-----------|
| AgentNFT | ERC-7857 | ✅ Full |
| IdentityRegistry | ERC-721 + ERC-8004 | ✅ Full |
| AgentTaskManager | ERC-8001 | ✅ Subset |
| ReputationRegistry | ERC-8004 | ✅ Full |

---

## 🧩 Dependencies

**OpenZeppelin Contracts ^5.0.1**:
- `@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol`
- `@openzeppelin/contracts/access/AccessControl.sol`
- `@openzeppelin/contracts/access/Ownable.sol`
- `@openzeppelin/contracts/utils/cryptography/ECDSA.sol`
- `@openzeppelin/contracts/utils/cryptography/EIP712.sol`
- `@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol`

---

## 🏗️ Build Info

**Solidity Version**: 0.8.24  
**Optimizer**: Enabled (200 runs)  
**Via IR**: Enabled  
**License**: MIT

---

## 📦 Deployment Artifacts

After deployment, artifacts are stored in:
```
artifacts/
  contracts/
    base/
      AgentTaskManager.sol/
        AgentTaskManager.json  ← ABI + Bytecode
    zeroG/
      AgentNFT.sol/
        AgentNFT.json
      IdentityRegistry.sol/
        IdentityRegistry.json
      ReputationRegistry.sol/
        ReputationRegistry.json
      MockVerifier.sol/
        MockVerifier.json
```

---

## 🎯 Integration Checklist

For relayer/frontend integration:

- [ ] Import ABIs from artifacts/
- [ ] Save deployment addresses
- [ ] Configure EIP-712 domain per network
- [ ] Use eip712Signer.ts utilities
- [ ] Listen to contract events
- [ ] Handle error codes gracefully
- [ ] Implement retry logic for transactions
- [ ] Cache reputation data off-chain
- [ ] Validate signatures before submitting

---

Built with precision for ETHGlobal Hackathon 🎯

