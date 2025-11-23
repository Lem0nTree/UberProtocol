import { ethers } from "hardhat";
import {
  AcceptanceAttestation,
  EIP712Domain,
  signAcceptance
} from "./eip712Signer";

/**
 * Create and sign an acceptance attestation for a job
 * 
 * Example usage:
 * ```
 * const acceptance = await createAcceptance(
 *   agentSigner,
 *   taskManagerAddress,
 *   chainId,
 *   intentHash,
 *   {
 *     expiry: Math.floor(Date.now() / 1000) + 3600,
 *     nonce: 1,
 *     conditionsHash: ethers.ZeroHash
 *   }
 * );
 * ```
 */
export async function createAcceptance(
  signer: ethers.Signer,
  taskManagerAddress: string,
  chainId: number,
  intentHash: string,
  options?: {
    expiry?: number;
    nonce?: number;
    conditionsHash?: string;
  }
): Promise<{
  acceptance: AcceptanceAttestation;
  signature: string;
}> {
  const participant = await signer.getAddress();

  // Default options
  const expiry = options?.expiry || Math.floor(Date.now() / 1000) + 3600; // 1 hour
  const nonce = options?.nonce || 1;
  const conditionsHash = options?.conditionsHash || ethers.ZeroHash;

  // Create acceptance
  const acceptance: AcceptanceAttestation = {
    intentHash,
    participant,
    nonce,
    expiry,
    conditionsHash
  };

  // EIP-712 domain
  const domain: EIP712Domain = {
    name: "ERC-8001",
    version: "1",
    chainId,
    verifyingContract: taskManagerAddress
  };

  // Sign the acceptance
  const signature = await signAcceptance(acceptance, domain, signer);

  console.log("✅ Acceptance Created:");
  console.log("  Intent Hash:", intentHash);
  console.log("  Participant:", participant);
  console.log("  Nonce:", nonce);
  console.log("  Expiry:", new Date(expiry * 1000).toISOString());

  return {
    acceptance: {
      ...acceptance,
      signature
    },
    signature
  };
}

/**
 * Example standalone script to create an acceptance
 */
async function main() {
  const [, agent] = await ethers.getSigners(); // Use second signer as agent
  
  // Replace with your deployed AgentTaskManager address
  const TASK_MANAGER_ADDRESS = process.env.TASK_MANAGER_ADDRESS || "0x...";
  const CHAIN_ID = 84532; // Base Sepolia

  // Replace with actual intent hash from a posted job
  const INTENT_HASH = process.env.INTENT_HASH || "0x...";

  const result = await createAcceptance(
    agent,
    TASK_MANAGER_ADDRESS,
    CHAIN_ID,
    INTENT_HASH,
    {
      expiry: Math.floor(Date.now() / 1000) + 7200, // 2 hours
      nonce: 1,
      conditionsHash: ethers.ZeroHash
    }
  );

  console.log("\n📋 Full Acceptance Data:");
  console.log(JSON.stringify({
    acceptance: result.acceptance,
    signature: result.signature
  }, null, 2));
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

