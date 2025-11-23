import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying UberProtocol contracts to 0G Testnet...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // 1. Deploy MockVerifier
  console.log("📝 Deploying MockVerifier...");
  const MockVerifier = await ethers.getContractFactory("MockVerifier");
  const verifier = await MockVerifier.deploy();
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();
  console.log("✅ MockVerifier deployed to:", verifierAddress, "\n");

  // 2. Deploy AgentNFT
  console.log("📝 Deploying AgentNFT...");
  const AgentNFT = await ethers.getContractFactory("AgentNFT");
  const agentNFT = await AgentNFT.deploy(
    "UberProtocol Agent NFT",
    "UBAGENT",
    "ipfs://", // Storage info
    verifierAddress,
    deployer.address
  );
  await agentNFT.waitForDeployment();
  const agentNFTAddress = await agentNFT.getAddress();
  console.log("✅ AgentNFT deployed to:", agentNFTAddress, "\n");

  // 3. Deploy IdentityRegistry
  console.log("📝 Deploying IdentityRegistry...");
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy();
  await identityRegistry.waitForDeployment();
  const identityRegistryAddress = await identityRegistry.getAddress();
  console.log("✅ IdentityRegistry deployed to:", identityRegistryAddress, "\n");

  // 4. Deploy ReputationRegistry
  console.log("📝 Deploying ReputationRegistry...");
  const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
  const reputationRegistry = await ReputationRegistry.deploy(identityRegistryAddress);
  await reputationRegistry.waitForDeployment();
  const reputationRegistryAddress = await reputationRegistry.getAddress();
  console.log("✅ ReputationRegistry deployed to:", reputationRegistryAddress, "\n");

  // 5. Mint a mock agent NFT
  console.log("📝 Minting mock agent NFT...");
  const mockAgentData = [
    {
      dataDescription: "model",
      dataHash: ethers.keccak256(ethers.toUtf8Bytes("gpt-4-agent-model"))
    },
    {
      dataDescription: "memory",
      dataHash: ethers.keccak256(ethers.toUtf8Bytes("agent-memory-state"))
    }
  ];
  
  const mintTx = await agentNFT.mint(mockAgentData, deployer.address);
  const mintReceipt = await mintTx.wait();
  console.log("✅ Mock agent NFT minted (tokenId: 0)\n");

  // 6. Register agent in IdentityRegistry
  console.log("📝 Registering mock agent in IdentityRegistry...");
  const agentRegistrationURI = "ipfs://QmMockAgentRegistration";
  const metadata = [
    {
      key: "agentWallet",
      value: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [deployer.address])
    },
    {
      key: "agentName",
      value: ethers.toUtf8Bytes("UberProtocol Demo Agent")
    }
  ];

  const registerTx = await identityRegistry["register(string,(string,bytes)[])"](
    agentRegistrationURI,
    metadata
  );
  const registerReceipt = await registerTx.wait();
  console.log("✅ Mock agent registered in IdentityRegistry (agentId: 1)\n");

  // Summary
  console.log("=" .repeat(60));
  console.log("🎉 Deployment Summary (0G Testnet)");
  console.log("=" .repeat(60));
  console.log("MockVerifier:        ", verifierAddress);
  console.log("AgentNFT:            ", agentNFTAddress);
  console.log("IdentityRegistry:    ", identityRegistryAddress);
  console.log("ReputationRegistry:  ", reputationRegistryAddress);
  console.log("Mock Agent NFT ID:   ", "0");
  console.log("Mock Agent ID:       ", "1");
  console.log("=" .repeat(60));

  // Save deployment addresses
  const deploymentInfo = {
    network: "0G Testnet",
    chainId: 16600,
    deployer: deployer.address,
    contracts: {
      MockVerifier: verifierAddress,
      AgentNFT: agentNFTAddress,
      IdentityRegistry: identityRegistryAddress,
      ReputationRegistry: reputationRegistryAddress
    },
    mockData: {
      agentNFTId: 0,
      registryAgentId: 1,
      agentWallet: deployer.address
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

