import { getAddress } from 'viem'
import type { Address } from 'viem'

// AgentTaskManager ABI (minimal for frontend use)
export const AGENT_TASK_MANAGER_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'payloadHash', type: 'bytes32' },
          { name: 'expiry', type: 'uint64' },
          { name: 'nonce', type: 'uint64' },
          { name: 'agentId', type: 'address' },
          { name: 'coordinationType', type: 'bytes32' },
          { name: 'coordinationValue', type: 'uint256' },
          { name: 'participants', type: 'address[]' },
        ],
        name: 'intent',
        type: 'tuple',
      },
      { name: 'intentSig', type: 'bytes' },
      {
        components: [
          { name: 'topic', type: 'string' },
          { name: 'ipfsUri', type: 'string' },
          { name: 'budget', type: 'uint256' },
          { name: 'deadline', type: 'uint64' },
        ],
        name: 'spec',
        type: 'tuple',
      },
    ],
    name: 'postJobIntent',
    outputs: [{ name: 'intentHash', type: 'bytes32' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'intentHash', type: 'bytes32' }],
    name: 'getIntentStatus',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'intentHash', type: 'bytes32' }],
    name: 'getIntent',
    outputs: [
      {
        components: [
          { name: 'payloadHash', type: 'bytes32' },
          { name: 'expiry', type: 'uint64' },
          { name: 'nonce', type: 'uint64' },
          { name: 'agentId', type: 'address' },
          { name: 'coordinationType', type: 'bytes32' },
          { name: 'coordinationValue', type: 'uint256' },
          { name: 'participants', type: 'address[]' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'agentId', type: 'address' }],
    name: 'agentNonces',
    outputs: [{ name: '', type: 'uint64' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'intentHash', type: 'bytes32' },
      { indexed: true, name: 'user', type: 'address' },
      {
        components: [
          { name: 'topic', type: 'string' },
          { name: 'ipfsUri', type: 'string' },
          { name: 'budget', type: 'uint256' },
          { name: 'deadline', type: 'uint64' },
        ],
        indexed: false,
        name: 'spec',
        type: 'tuple',
      },
    ],
    name: 'JobIntentPosted',
    type: 'event',
  },
  {
    inputs: [
      {
        components: [
          { name: 'payloadHash', type: 'bytes32' },
          { name: 'expiry', type: 'uint64' },
          { name: 'nonce', type: 'uint64' },
          { name: 'agentId', type: 'address' },
          { name: 'coordinationType', type: 'bytes32' },
          { name: 'coordinationValue', type: 'uint256' },
          { name: 'participants', type: 'address[]' },
        ],
        name: 'intent',
        type: 'tuple',
      },
      {
        components: [
          { name: 'intentHash', type: 'bytes32' },
          { name: 'participant', type: 'address' },
          { name: 'nonce', type: 'uint64' },
          { name: 'expiry', type: 'uint64' },
          { name: 'conditionsHash', type: 'bytes32' },
          { name: 'signature', type: 'bytes' },
        ],
        name: 'acc',
        type: 'tuple',
      },
      { name: 'payoutAddress', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'logRootHash', type: 'bytes32' },
    ],
    name: 'settleJobWithAgent',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'intentHash', type: 'bytes32' }],
    name: 'intents',
    outputs: [
      { name: 'status', type: 'uint8' },
      { name: 'proposer', type: 'address' },
      { name: 'budget', type: 'uint256' },
      { name: 'paymentToken', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

// ERC20 Token ABI (minimal for transfers)
export const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

/**
 * Get contract address from environment variable
 */
export function getContractAddress(): Address {
  const address = process.env.NEXT_PUBLIC_AGENT_TASK_MANAGER_ADDRESS
  if (!address) {
    throw new Error('NEXT_PUBLIC_AGENT_TASK_MANAGER_ADDRESS is not set')
  }
  return getAddress(address)
}

/**
 * Get USDC contract address for Base Sepolia
 * Base Sepolia USDC: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
 * Base Mainnet USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
 */
export function getUSDCAddress(chainId?: number): Address {
  // Base Sepolia testnet USDC
  if (chainId === 84532) {
    return getAddress('0x036CbD53842c5426634e7929541eC2318f3dCF7e')
  }
  // Base Mainnet USDC
  if (chainId === 8453) {
    return getAddress('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')
  }
  // Default to Base Sepolia
  return getAddress('0x036CbD53842c5426634e7929541eC2318f3dCF7e')
}



