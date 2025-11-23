import { ethers } from "hardhat";
import { createJobIntent } from "./utils/createJobIntent";
import { createAcceptance } from "./utils/createAcceptance";

/**
 * Full end-to-end demo of UberProtocol
 * 
 * Demonstrates:
 * 1. User posts a job intent
 * 2. Agent creates acceptance
 * 3. User settles with agent
 */
async function main() {
  console.log("🎭 UberProtocol E2E Demo\n");

  // Get signers
  const [user, agent1, agent2] = await ethers.getSigners();
  console.log("👤 User:", user.address);
  console.log("🤖 Agent 1:", agent1.address);
  console.log("🤖 Agent 2:", agent2.address);
  console.log();

  // Deploy AgentTaskManager for demo
  console.log("📝 Deploying AgentTaskManager...");
  const AgentTaskManager = await ethers.getContractFactory("AgentTaskManager");
  const taskManager = await AgentTaskManager.deploy();
  await taskManager.waitForDeployment();
  const taskManagerAddress = await taskManager.getAddress();
  console.log("✅ AgentTaskManager deployed to:", taskManagerAddress);
  console.log();

  // Fund the contract
  console.log("💰 Funding AgentTaskManager with 1 ETH...");
  await user.sendTransaction({
    to: taskManagerAddress,
    value: ethers.parseEther("1.0")
  });
  console.log("✅ Contract funded\n");

  // Get chain ID
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  // Step 1: User creates and posts job intent
  console.log("=" .repeat(60));
  console.log("STEP 1: User Posts Job Intent");
  console.log("=" .repeat(60));

  const jobSpec = {
    topic: "defi_swap",
    ipfsUri: "ipfs://QmExampleJobSpec123",
    budget: ethers.parseEther("0.5"),
    deadline: Math.floor(Date.now() / 1000) + 86400 // 24 hours
  };

  const { intent, signature, intentHash } = await createJobIntent(
    user,
    taskManagerAddress,
    chainId,
    jobSpec,
    [agent1.address, agent2.address]
  );

  console.log("\n📤 Posting intent to contract...");
  const postTx = await taskManager.postJobIntent(intent, signature, jobSpec);
  await postTx.wait();
  console.log("✅ Job intent posted successfully!");
  console.log("   Intent Hash:", intentHash);
  console.log();

  // Step 2: Agents create acceptances (bids)
  console.log("=" .repeat(60));
  console.log("STEP 2: Agents Submit Bids");
  console.log("=" .repeat(60));

  // Agent 1 bids
  console.log("\n🤖 Agent 1 creating acceptance...");
  const agent1Acceptance = await createAcceptance(
    agent1,
    taskManagerAddress,
    chainId,
    intentHash,
    {
      expiry: Math.floor(Date.now() / 1000) + 7200,
      nonce: 1,
      conditionsHash: ethers.ZeroHash
    }
  );
  console.log("✅ Agent 1 acceptance created");

  // Agent 2 bids
  console.log("\n🤖 Agent 2 creating acceptance...");
  const agent2Acceptance = await createAcceptance(
    agent2,
    taskManagerAddress,
    chainId,
    intentHash,
    {
      expiry: Math.floor(Date.now() / 1000) + 7200,
      nonce: 1,
      conditionsHash: ethers.ZeroHash
    }
  );
  console.log("✅ Agent 2 acceptance created");
  console.log();

  // In real scenario, these would be broadcast via Hedera A2A
  console.log("📡 In production: Bids would be broadcast via Hedera HCS");
  console.log();

  // Step 3: User selects Agent 1 and settles
  console.log("=" .repeat(60));
  console.log("STEP 3: User Settles with Selected Agent");
  console.log("=" .repeat(60));

  console.log("\n👤 User selects Agent 1 as winner");
  console.log("💵 Payment amount: 0.45 ETH (90% of budget)");

  const agent1BalanceBefore = await ethers.provider.getBalance(agent1.address);
  console.log("🔍 Agent 1 balance before:", ethers.formatEther(agent1BalanceBefore), "ETH");

  const logRootHash = ethers.keccak256(ethers.toUtf8Bytes("execution-logs-hash"));

  console.log("\n📤 Settling job with Agent 1...");
  const settleTx = await taskManager.settleJobWithAgent(
    intent,
    agent1Acceptance.acceptance,
    agent1.address,
    ethers.parseEther("0.45"),
    logRootHash
  );
  const settleReceipt = await settleTx.wait();
  console.log("✅ Job settled successfully!");
  console.log("   Gas used:", settleReceipt?.gasUsed.toString());

  const agent1BalanceAfter = await ethers.provider.getBalance(agent1.address);
  console.log("🔍 Agent 1 balance after:", ethers.formatEther(agent1BalanceAfter), "ETH");
  console.log("💰 Agent 1 earned:", ethers.formatEther(agent1BalanceAfter - agent1BalanceBefore), "ETH");
  console.log();

  // Verify intent status
  const status = await taskManager.getIntentStatus(intentHash);
  console.log("📊 Intent status:", ["None", "Proposed", "Ready", "Executed", "Cancelled", "Expired"][status]);
  console.log();

  console.log("=" .repeat(60));
  console.log("🎉 Demo Complete!");
  console.log("=" .repeat(60));
  console.log();
  console.log("Summary:");
  console.log("  ✅ Job posted with ERC-8001 typed data");
  console.log("  ✅ Multiple agents submitted bids");
  console.log("  ✅ User selected winning agent");
  console.log("  ✅ Settlement executed with payment");
  console.log("  ✅ Intent marked as Executed");
  console.log();
  console.log("Next steps in full system:");
  console.log("  → Broadcast job via Hedera HCS");
  console.log("  → Agents use 0G identity & reputation");
  console.log("  → Execute trades via Coinbase CDP vaults");
  console.log("  → Upload logs to 0G storage");
  console.log("  → Submit reputation feedback");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

