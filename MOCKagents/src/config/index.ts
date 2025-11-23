import dotenv from 'dotenv';
dotenv.config();

export const config = {
  agent: {
    name: process.env.AGENT_NAME || 'Simple Bidding Agent',
    id: parseInt(process.env.AGENT_ID || '1'),
    walletAddress: process.env.AGENT_WALLET_ADDRESS!,
    privateKey: process.env.AGENT_PRIVATE_KEY!,
    basePriceEth: parseFloat(process.env.BASE_PRICE_ETH || '0.01'),
    priceMultiplier: parseFloat(process.env.PRICE_MULTIPLIER || '1.2'),
    minBudgetEth: parseFloat(process.env.MIN_BUDGET_ETH || '0.005'),
  },

  hedera: {
    accountId: process.env.HEDERA_ACCOUNT_ID!,
    privateKey: process.env.HEDERA_PRIVATE_KEY!,
    network: (process.env.HEDERA_NETWORK || 'testnet') as 'mainnet' | 'testnet',
    a2aTopicId: process.env.A2A_TOPIC_ID!,
  },

  zeroG: {
    rpc: process.env.ZEROG_RPC || 'https://evmrpc-testnet.0g.ai',
    identityRegistryAddress: process.env.IDENTITY_REGISTRY_ADDRESS!,
    reputationRegistryAddress: process.env.REPUTATION_REGISTRY_ADDRESS!,
  },

  base: {
    rpc: process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
    chainId: parseInt(process.env.BASE_CHAIN_ID || '84532'),
    taskManagerAddress: process.env.TASK_MANAGER_ADDRESS!,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

// Validate required configuration
const requiredFields = [
  'AGENT_WALLET_ADDRESS',
  'AGENT_PRIVATE_KEY',
  'HEDERA_ACCOUNT_ID',
  'HEDERA_PRIVATE_KEY',
  'A2A_TOPIC_ID',
  'TASK_MANAGER_ADDRESS',
  'IDENTITY_REGISTRY_ADDRESS',
];

for (const field of requiredFields) {
  if (!process.env[field]) {
    throw new Error(`Missing required environment variable: ${field}`);
  }
}

export default config;

