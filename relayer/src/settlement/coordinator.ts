import { ethers } from 'ethers';
import config from '../config';
import logger from '../utils/logger';
import BidManager from '../managers/bidManager';
import CDPService from '../coinbase/cdpService';
import HederaA2AService from '../hedera/a2aService';

const TASK_MANAGER_ABI = [
  'function settleJobWithAgent(tuple(bytes32 payloadHash, uint64 expiry, uint64 nonce, address agentId, bytes32 coordinationType, uint256 coordinationValue, address[] participants) intent, tuple(bytes32 intentHash, address participant, uint64 nonce, uint64 expiry, bytes32 conditionsHash, bytes signature) acc, address payable payoutAddress, uint256 amount, bytes32 logRootHash) external',
  'function intents(bytes32) view returns (uint8 status, address proposer, uint256 budget, address paymentToken)',
];

export class SettlementCoordinator {
  private provider: ethers.JsonRpcProvider;
  private taskManager: ethers.Contract;
  private bidManager: BidManager;
  private cdpService: CDPService;
  private hederaService: HederaA2AService;

  constructor(bidManager: BidManager, cdpService: CDPService, hederaService: HederaA2AService) {
    this.provider = new ethers.JsonRpcProvider(config.base.rpc);
    this.bidManager = bidManager;
    this.cdpService = cdpService;
    this.hederaService = hederaService;

    // Initialize task manager contract
    if (config.relayer.privateKey) {
      const wallet = new ethers.Wallet(config.relayer.privateKey, this.provider);
      this.taskManager = new ethers.Contract(
        config.base.taskManagerAddress,
        TASK_MANAGER_ABI,
        wallet
      );
    } else {
      this.taskManager = new ethers.Contract(
        config.base.taskManagerAddress,
        TASK_MANAGER_ABI,
        this.provider
      );
    }

    logger.info('Settlement Coordinator initialized');
  }

  /**
   * Select winning bid
   */
  async selectBid(intentHash: string, bidId: number): Promise<string> {
    try {
      // 1. Get Job and Bid details
      const bids = await this.bidManager.getBidsByIntent(intentHash);
      const bid = bids.find(b => b.id === bidId);
      if (!bid) {
        throw new Error('Bid not found');
      }

      // 2. Create a new Vault for this job using Coinbase CDP
      // We pass the base chain ID or network ID from config if needed.
      // Defaulting to 'base-sepolia' as per typical testnet setup.
      const vault = await this.cdpService.createTradeVault('base-sepolia');
      
      // 3. Store the vault details in the database
      await this.bidManager.storeJobVault(intentHash, vault);

      // 4. Update job status
      await this.bidManager.updateJobStatus(intentHash, 'bid_selected', bidId);
      
      // 5. Share the vault access (private key/seed) with the winning agent via Hedera A2A
      // In a real production system, this data should be encrypted with the Agent's public key.
      await this.hederaService.publishMessage({
        type: 'VAULT_ACCESS_GRANTED',
        version: '1.0',
        data: {
          intentHash,
          agentId: bid.agentId,
          agentAddress: bid.agentAddress,
          vaultAddress: vault.address,
          vaultData: vault.walletData,
          timestamp: Math.floor(Date.now() / 1000),
        },
      });

      logger.info('Bid selected and vault created', { 
        intentHash, 
        bidId, 
        vaultAddress: vault.address 
      });

      return vault.address;
    } catch (error) {
      logger.error('Failed to select bid', error);
      throw error;
    }
  }

  /**
   * Execute settlement on-chain
   */
  async executeSettlement(
    intentHash: string,
    bidId: number,
    logRootHash: string = ethers.ZeroHash
  ): Promise<string> {
    try {
      // Get job and bid details
      const job = await this.bidManager.getJob(intentHash);
      if (!job) {
        throw new Error('Job not found');
      }

      const bids = await this.bidManager.getBidsByIntent(intentHash);
      const bid = bids.find(b => b.id === bidId);
      if (!bid) {
        throw new Error('Bid not found');
      }

      logger.info('Executing settlement', {
        intentHash,
        bidId,
        agentAddress: bid.agentAddress,
      });

      // Get payment token from contract
      const intentData = await this.taskManager.intents(intentHash);
      const paymentToken = intentData.paymentToken;
      const isERC20 = paymentToken !== ethers.ZeroAddress;

      logger.info('Settlement payment details', {
        paymentToken: isERC20 ? paymentToken : 'ETH',
        amount: bid.quote.price,
      });

      // Prepare transaction data
      const intent = job.intent;
      const acceptance = bid.acceptance;
      const payoutAddress = bid.agentAddress;
      const amount = bid.quote.price;

      // Execute settlement transaction
      // Note: Contract will handle ERC20 vs ETH based on paymentToken stored in intent
      const tx = await this.taskManager.settleJobWithAgent(
        intent,
        acceptance,
        payoutAddress,
        amount,
        logRootHash
      );

      logger.info('Settlement transaction sent', { txHash: tx.hash });

      // Wait for confirmation
      const receipt = await tx.wait();

      logger.info('Settlement confirmed', {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      });

      // Update job status
      await this.bidManager.markJobSettled(intentHash, receipt.hash);

      return receipt.hash;
    } catch (error) {
      logger.error('Failed to execute settlement', error);
      throw error;
    }
  }

  /**
   * Get settlement transaction
   */
  async getSettlementTransaction(txHash: string): Promise<any> {
    try {
      const [tx, receipt] = await Promise.all([
        this.provider.getTransaction(txHash),
        this.provider.getTransactionReceipt(txHash),
      ]);

      return {
        transaction: tx,
        receipt,
      };
    } catch (error) {
      logger.error('Failed to get settlement transaction', error);
      throw error;
    }
  }
}

export default SettlementCoordinator;
