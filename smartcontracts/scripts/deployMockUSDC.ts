import { ethers } from "hardhat";

async function main() {
  console.log("Deploying MockUSDC...");

  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();

  await mockUSDC.waitForDeployment();

  const address = await mockUSDC.getAddress();
  console.log(`MockUSDC deployed to: ${address}`);
  
  // Verify instructions
  console.log("\nTo verify on Base Sepolia:");
  console.log(`npx hardhat verify --network baseSepolia ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

