import { keccak256, toHex, encodePacked, pad } from 'viem'
import { Bid, Job } from './api'
import { JobSpec } from './intent-signing'

export const USE_MOCK_MODE = true

// User provided addresses
export const MOCK_VAULT_ADDRESS = '0x032a80d69bC36dbD62b20D864591D05F7dFE04D3'
export const MOCK_AGENT_PAYMENT_ADDRESS = '0xa2258e85fc2443671264f07c62fdf5f1ad5a4af1'
// Placeholder for the MockUSDC address (Base Sepolia USDC by default until deployed)
export const MOCK_TOKEN_ADDRESS = '0x3Ee2bC21AACeb0d27b59278CEbd47ECDb9109085'

export function generateMockIntentHash(sender: string, nonce: bigint): string {
  return keccak256(
    encodePacked(
      ['address', 'uint256', 'uint256'],
      [sender as `0x${string}`, nonce, BigInt(Date.now())]
    )
  )
}

export function generateMockVaultAddress(): string {
  return MOCK_VAULT_ADDRESS
}
