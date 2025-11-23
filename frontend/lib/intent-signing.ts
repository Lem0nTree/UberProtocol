import { keccak256, encodeAbiParameters, toHex, stringToHex, pad } from 'viem'
import type { Address } from 'viem'

/**
 * EIP-712 Domain for ERC-8001
 */
export interface EIP712Domain {
  name: string
  version: string
  chainId: number
  verifyingContract: Address
}

/**
 * AgentIntent structure per ERC-8001
 */
export interface AgentIntent {
  payloadHash: `0x${string}`
  expiry: bigint
  nonce: bigint
  agentId: Address
  coordinationType: `0x${string}`
  coordinationValue: bigint
  participants: Address[]
}

/**
 * JobSpec structure (UberProtocol specific)
 */
export interface JobSpec {
  topic: string
  ipfsUri: string
  budget: bigint
  deadline: bigint
}

/**
 * EIP-712 Types for AgentIntent
 */
export const AGENT_INTENT_TYPES = {
  AgentIntent: [
    { name: 'payloadHash', type: 'bytes32' },
    { name: 'expiry', type: 'uint64' },
    { name: 'nonce', type: 'uint64' },
    { name: 'agentId', type: 'address' },
    { name: 'coordinationType', type: 'bytes32' },
    { name: 'coordinationValue', type: 'uint256' },
    { name: 'participants', type: 'address[]' },
  ],
} as const

/**
 * Hash a JobSpec per ERC-8001 rules
 */
export function hashJobSpec(spec: JobSpec): `0x${string}` {
  const JOBSPEC_TYPEHASH = keccak256(
    stringToHex('JobSpec(string topic,string ipfsUri,uint256 budget,uint64 deadline)')
  )

  return keccak256(
    encodeAbiParameters(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'uint64'],
      [
        JOBSPEC_TYPEHASH,
        keccak256(stringToHex(spec.topic)),
        keccak256(stringToHex(spec.ipfsUri)),
        spec.budget,
        spec.deadline,
      ]
    )
  )
}

/**
 * Hash participants array (packed)
 */
export function hashParticipants(participants: Address[]): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      participants.map(() => 'address' as const),
      participants
    )
  )
}

/**
 * Compute struct hash of AgentIntent (not the full digest)
 */
export function hashAgentIntent(intent: AgentIntent): `0x${string}` {
  const AGENT_INTENT_TYPEHASH = keccak256(
    stringToHex(
      'AgentIntent(bytes32 payloadHash,uint64 expiry,uint64 nonce,address agentId,bytes32 coordinationType,uint256 coordinationValue,address[] participants)'
    )
  )

  return keccak256(
    encodeAbiParameters(
      ['bytes32', 'bytes32', 'uint64', 'uint64', 'address', 'bytes32', 'uint256', 'bytes32'],
      [
        AGENT_INTENT_TYPEHASH,
        intent.payloadHash,
        intent.expiry,
        intent.nonce,
        intent.agentId,
        intent.coordinationType,
        intent.coordinationValue,
        hashParticipants(intent.participants),
      ]
    )
  )
}

/**
 * Sort participants array to make it canonical
 */
export function sortParticipants(participants: Address[]): Address[] {
  return [...participants].sort((a, b) => {
    const aBig = BigInt(a)
    const bBig = BigInt(b)
    if (aBig < bBig) return -1
    if (aBig > bBig) return 1
    return 0
  })
}

/**
 * Create EIP-712 domain for ERC-8001
 */
export function createEIP712Domain(
  chainId: number,
  verifyingContract: Address
): EIP712Domain {
  return {
    name: 'ERC-8001',
    version: '1',
    chainId,
    verifyingContract,
  }
}

/**
 * Create coordination type hash for UberProtocol
 */
export function createCoordinationType(): `0x${string}` {
  return keccak256(stringToHex('UBER_JOB_V1'))
}

/**
 * Create a job intent from job spec
 */
export function createJobIntent(
  agentId: Address,
  jobSpec: JobSpec,
  participants: Address[],
  nonce: bigint
): AgentIntent {
  // Ensure agentId is in participants
  const participantsWithAgent = participants.includes(agentId)
    ? participants
    : [...participants, agentId]

  // Sort participants to make canonical
  const sortedParticipants = sortParticipants(participantsWithAgent)

  // Hash the job spec
  const payloadHash = hashJobSpec(jobSpec)

  // Coordination type for UberProtocol
  const coordinationType = createCoordinationType()

  return {
    payloadHash,
    expiry: jobSpec.deadline,
    nonce,
    agentId,
    coordinationType,
    coordinationValue: jobSpec.budget,
    participants: sortedParticipants,
  }
}

