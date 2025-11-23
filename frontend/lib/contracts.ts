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



