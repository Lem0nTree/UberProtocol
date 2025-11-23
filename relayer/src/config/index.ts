import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Hedera Configuration
  hedera: {
    accountId: process.env.HEDERA_ACCOUNT_ID!,
    privateKey: process.env.HEDERA_PRIVATE_KEY!,
    network: (process.env.HEDERA_NETWORK || 'testnet') as 'mainnet' | 'testnet',
    a2aTopicId: process.env.A2A_TOPIC_ID || '',
  },

  // Base L2 Configuration
  base: {
    rpc: process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
    chainId: parseInt(process.env.BASE_CHAIN_ID || '84532'),
    taskManagerAddress: process.env.TASK_MANAGER_ADDRESS!,
    startBlock: parseInt(process.env.BASE_START_BLOCK || '0'),
  },

  // 0G Configuration
  zeroG: {
    rpc: process.env.ZEROG_RPC || 'https://evmrpc-testnet.0g.ai',
    chainId: parseInt(process.env.ZEROG_CHAIN_ID || '16600'),
    identityRegistryAddress: process.env.IDENTITY_REGISTRY_ADDRESS!,
    reputationRegistryAddress: process.env.REPUTATION_REGISTRY_ADDRESS!,
    agentNFTAddress: process.env.AGENT_NFT_ADDRESS || '',
  },

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL!,
  },

  // API Configuration
  api: {
    port: parseInt(process.env.PORT || '3000'),
    wsPort: parseInt(process.env.WS_PORT || '3001'),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Relayer Configuration
  relayer: {
    privateKey: process.env.RELAYER_PRIVATE_KEY || '',
  },
};

// Validate required configuration
const requiredFields = [
  'HEDERA_ACCOUNT_ID',
  'HEDERA_PRIVATE_KEY',
  'TASK_MANAGER_ADDRESS',
  'IDENTITY_REGISTRY_ADDRESS',
  'REPUTATION_REGISTRY_ADDRESS',
  'DATABASE_URL',
];

for (const field of requiredFields) {
  if (!process.env[field]) {
    throw new Error(`Missing required environment variable: ${field}`);
  }
}

export default config;

