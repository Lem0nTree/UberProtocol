import { ethers } from "hardhat";
import {
  AgentIntent,
  JobSpec,
  EIP712Domain,
  hashJobSpec,
  signAgentIntent,
  sortParticipants
} from "./eip712Signer";

/**
 * Create and sign a job intent for posting
 * 
 * Example usage:
 * ```
 * const jobIntent = await createJobIntent(
 *   userSigner,
 *   agentTaskManagerAddress,
 *   chainId,
 *   {
 *     topic: "defi_strategy",
 *     ipfsUri: "ipfs://QmExample",
 *     budget: ethers.parseEther("1.0"),
 *     deadline: Math.floor(Date.now() / 1000) + 86400
 *   },
 *   [agentAddress1, agentAddress2]
 * );
 * ```
 */
export async function createJobIntent(
  signer: ethers.Signer,
  taskManagerAddress: string,
  chainId: number,
  jobSpec: JobSpec,
  participants: string[],
  nonce?: number
): Promise<{
  intent: AgentIntent;
  signature: string;
  jobSpec: JobSpec;
  intentHash: string;
}> {
  const agentId = await signer.getAddress();

  // Ensure agentId is in participants
  if (!participants.includes(agentId)) {
    participants.push(agentId);
  }

  // Sort participants to make canonical
  const sortedParticipants = sortParticipants(participants);

  // Get current nonce if not provided
  let currentNonce = nonce;
  if (currentNonce === undefined) {
    const taskManager = await ethers.getContractAt("AgentTaskManager", taskManagerAddress);
    currentNonce = Number(await taskManager.agentNonces(agentId)) + 1;
  }

  // Hash the job spec
  const payloadHash = hashJobSpec(jobSpec);

  // Coordination type for UberProtocol
  const COORDINATION_TYPE = ethers.keccak256(ethers.toUtf8Bytes("UBER_JOB_V1"));

  // Create intent
  const intent: AgentIntent = {
    payloadHash,
    expiry: jobSpec.deadline,
    nonce: currentNonce,
    agentId,
    coordinationType: COORDINATION_TYPE,
    coordinationValue: jobSpec.budget,
    participants: sortedParticipants
  };

  // EIP-712 domain
  const domain: EIP712Domain = {
    name: "ERC-8001",
    version: "1",
    chainId,
    verifyingContract: taskManagerAddress
  };

  // Sign the intent
  const signature = await signAgentIntent(intent, domain, signer);

  // Compute intent hash for reference
  const { hashAgentIntent } = await import("./eip712Signer");
  const intentHash = hashAgentIntent(intent);

  console.log("✅ Job Intent Created:");
  console.log("  Intent Hash:", intentHash);
  console.log("  Agent ID:", agentId);
  console.log("  Nonce:", currentNonce);
  console.log("  Budget:", ethers.formatEther(jobSpec.budget), "ETH");
  console.log("  Participants:", sortedParticipants.length);

  return {
    intent,
    signature,
    jobSpec,
    intentHash
  };
}

/**
 * Example standalone script to create a job intent
 */
async function main() {
  const [signer] = await ethers.getSigners();
  
  // Replace with your deployed AgentTaskManager address
  const TASK_MANAGER_ADDRESS = process.env.TASK_MANAGER_ADDRESS || "0x...";
  const CHAIN_ID = 84532; // Base Sepolia

  const jobSpec: JobSpec = {
    topic: "defi_swap",
    ipfsUri: "ipfs://QmExampleJobSpecification",
    budget: ethers.parseEther("0.5"),
    deadline: Math.floor(Date.now() / 1000) + 86400 // 24 hours from now
  };

  // Example agents (replace with actual agent addresses)
  const participants = [
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
  ];

  const result = await createJobIntent(
    signer,
    TASK_MANAGER_ADDRESS,
    CHAIN_ID,
    jobSpec,
    participants
  );

  console.log("\n📋 Full Intent Data:");
  console.log(JSON.stringify({
    intent: {
      ...result.intent,
      coordinationValue: result.intent.coordinationValue.toString()
    },
    signature: result.signature,
    jobSpec: {
      ...result.jobSpec,
      budget: result.jobSpec.budget.toString()
    }
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

