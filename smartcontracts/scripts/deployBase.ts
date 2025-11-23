import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying UberProtocol contracts to Base Sepolia...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Deploy AgentTaskManager
  console.log("📝 Deploying AgentTaskManager...");
  const AgentTaskManager = await ethers.getContractFactory("AgentTaskManager");
  const taskManager = await AgentTaskManager.deploy();
  await taskManager.waitForDeployment();
  const taskManagerAddress = await taskManager.getAddress();
  console.log("✅ AgentTaskManager deployed to:", taskManagerAddress, "\n");

  // Fund the contract with some ETH for demo settlements
  console.log("📝 Funding AgentTaskManager with 0.1 ETH for demo...");
  const fundTx = await deployer.sendTransaction({
    to: taskManagerAddress,
    value: ethers.parseEther("0.1")
  });
  await fundTx.wait();
  console.log("✅ AgentTaskManager funded\n");

  // Get domain info
  const domainSeparator = await taskManager.eip712Domain();
  
  // Summary
  console.log("=" .repeat(60));
  console.log("🎉 Deployment Summary (Base Sepolia)");
  console.log("=" .repeat(60));
  console.log("AgentTaskManager:    ", taskManagerAddress);
  console.log("Contract Balance:    ", "0.1 ETH");
  console.log("EIP-712 Domain:");
  console.log("  Name:              ", domainSeparator.name);
  console.log("  Version:           ", domainSeparator.version);
  console.log("  ChainId:           ", domainSeparator.chainId);
  console.log("  VerifyingContract: ", domainSeparator.verifyingContract);
  console.log("=" .repeat(60));

  // Save deployment addresses
  const deploymentInfo = {
    network: "Base Sepolia",
    chainId: 84532,
    deployer: deployer.address,
    contracts: {
      AgentTaskManager: taskManagerAddress
    },
    eip712Domain: {
      name: domainSeparator.name,
      version: domainSeparator.version,
      chainId: domainSeparator.chainId.toString(),
      verifyingContract: domainSeparator.verifyingContract
    }
  };

  console.log("\n📄 Deployment info:", JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

