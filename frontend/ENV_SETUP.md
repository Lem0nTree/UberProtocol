# Environment Variables Setup

Create a `.env.local` file in the `frontend` directory with the following variables:

```env
# WalletConnect Project ID
# Get one from https://cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# AgentTaskManager Contract Address
# Base Sepolia: 0x...
# Base Mainnet: 0x...
NEXT_PUBLIC_AGENT_TASK_MANAGER_ADDRESS=

# Optional: Default Chain ID (84532 for Base Sepolia, 8453 for Base Mainnet)
NEXT_PUBLIC_CHAIN_ID=84532
```

## Getting a WalletConnect Project ID

1. Go to https://cloud.walletconnect.com
2. Sign up or log in
3. Create a new project
4. Copy the Project ID
5. Add it to your `.env.local` file

## Contract Addresses

After deploying the AgentTaskManager contract, add the deployed address to `NEXT_PUBLIC_AGENT_TASK_MANAGER_ADDRESS`.

For Base Sepolia, you can deploy using:
```bash
cd smartcontracts
npm run deploy:base
```



