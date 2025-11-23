import { ethers } from "ethers";

/**
 * EIP-712 Domain for ERC-8001
 */
export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

/**
 * AgentIntent structure per ERC-8001
 */
export interface AgentIntent {
  payloadHash: string;
  expiry: number;
  nonce: number;
  agentId: string;
  coordinationType: string;
  coordinationValue: bigint;
  participants: string[];
}

/**
 * JobSpec structure (UberProtocol specific)
 */
export interface JobSpec {
  topic: string;
  ipfsUri: string;
  budget: bigint;
  deadline: number;
}

/**
 * AcceptanceAttestation structure per ERC-8001
 */
export interface AcceptanceAttestation {
  intentHash: string;
  participant: string;
  nonce: number;
  expiry: number;
  conditionsHash: string;
}

/**
 * EIP-712 Types for AgentIntent
 */
const AGENT_INTENT_TYPES = {
  AgentIntent: [
    { name: "payloadHash", type: "bytes32" },
    { name: "expiry", type: "uint64" },
    { name: "nonce", type: "uint64" },
    { name: "agentId", type: "address" },
    { name: "coordinationType", type: "bytes32" },
    { name: "coordinationValue", type: "uint256" },
    { name: "participants", type: "address[]" }
  ]
};

/**
 * EIP-712 Types for AcceptanceAttestation
 */
const ACCEPTANCE_TYPES = {
  AcceptanceAttestation: [
    { name: "intentHash", type: "bytes32" },
    { name: "participant", type: "address" },
    { name: "nonce", type: "uint64" },
    { name: "expiry", type: "uint64" },
    { name: "conditionsHash", type: "bytes32" }
  ]
};

/**
 * Hash a JobSpec per ERC-8001 rules
 */
export function hashJobSpec(spec: JobSpec): string {
  const JOBSPEC_TYPEHASH = ethers.keccak256(
    ethers.toUtf8Bytes("JobSpec(string topic,string ipfsUri,uint256 budget,uint64 deadline)")
  );

  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "bytes32", "bytes32", "uint256", "uint64"],
      [
        JOBSPEC_TYPEHASH,
        ethers.keccak256(ethers.toUtf8Bytes(spec.topic)),
        ethers.keccak256(ethers.toUtf8Bytes(spec.ipfsUri)),
        spec.budget,
        spec.deadline
      ]
    )
  );
}

/**
 * Hash participants array (packed)
 */
export function hashParticipants(participants: string[]): string {
  return ethers.keccak256(ethers.solidityPacked(
    participants.map(() => "address"),
    participants
  ));
}

/**
 * Compute struct hash of AgentIntent (not the full digest)
 */
export function hashAgentIntent(intent: AgentIntent): string {
  const AGENT_INTENT_TYPEHASH = ethers.keccak256(
    ethers.toUtf8Bytes(
      "AgentIntent(bytes32 payloadHash,uint64 expiry,uint64 nonce,address agentId,bytes32 coordinationType,uint256 coordinationValue,address[] participants)"
    )
  );

  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "bytes32", "uint64", "uint64", "address", "bytes32", "uint256", "bytes32"],
      [
        AGENT_INTENT_TYPEHASH,
        intent.payloadHash,
        intent.expiry,
        intent.nonce,
        intent.agentId,
        intent.coordinationType,
        intent.coordinationValue,
        hashParticipants(intent.participants)
      ]
    )
  );
}

/**
 * Sign an AgentIntent using EIP-712
 */
export async function signAgentIntent(
  intent: AgentIntent,
  domain: EIP712Domain,
  signer: ethers.Signer
): Promise<string> {
  const signature = await signer.signTypedData(
    domain,
    AGENT_INTENT_TYPES,
    intent
  );
  return signature;
}

/**
 * Compute struct hash of AcceptanceAttestation
 */
export function hashAcceptance(acceptance: AcceptanceAttestation): string {
  const ACCEPTANCE_TYPEHASH = ethers.keccak256(
    ethers.toUtf8Bytes(
      "AcceptanceAttestation(bytes32 intentHash,address participant,uint64 nonce,uint64 expiry,bytes32 conditionsHash)"
    )
  );

  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "bytes32", "address", "uint64", "uint64", "bytes32"],
      [
        ACCEPTANCE_TYPEHASH,
        acceptance.intentHash,
        acceptance.participant,
        acceptance.nonce,
        acceptance.expiry,
        acceptance.conditionsHash
      ]
    )
  );
}

/**
 * Sign an AcceptanceAttestation using EIP-712
 */
export async function signAcceptance(
  acceptance: AcceptanceAttestation,
  domain: EIP712Domain,
  signer: ethers.Signer
): Promise<string> {
  const signature = await signer.signTypedData(
    domain,
    ACCEPTANCE_TYPES,
    acceptance
  );
  return signature;
}

/**
 * Verify participants array is canonical (sorted ascending)
 */
export function verifyParticipantsCanonical(participants: string[]): boolean {
  for (let i = 1; i < participants.length; i++) {
    const prev = BigInt(participants[i - 1]);
    const curr = BigInt(participants[i]);
    if (curr <= prev) {
      return false;
    }
  }
  return true;
}

/**
 * Sort participants array to make it canonical
 */
export function sortParticipants(participants: string[]): string[] {
  return [...participants].sort((a, b) => {
    const aBig = BigInt(a);
    const bBig = BigInt(b);
    if (aBig < bBig) return -1;
    if (aBig > bBig) return 1;
    return 0;
  });
}

