import { ethers } from 'ethers';
import config from '../config';
import logger from '../utils/logger';
import BidManager from '../managers/bidManager';

const TASK_MANAGER_ABI = [
  'function settleJobWithAgent(tuple(bytes32 payloadHash, uint64 expiry, uint64 nonce, address agentId, bytes32 coordinationType, uint256 coordinationValue, address[] participants) intent, tuple(bytes32 intentHash, address participant, uint64 nonce, uint64 expiry, bytes32 conditionsHash, bytes signature) acc, address payable payoutAddress, uint256 amount, bytes32 logRootHash) external',
];

export class SettlementCoordinator {
  private provider: ethers.JsonRpcProvider;
  private taskManager: ethers.Contract;
  private bidManager: BidManager;

  constructor(bidManager: BidManager) {
    this.provider = new ethers.JsonRpcProvider(config.base.rpc);
    this.bidManager = bidManager;

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
  async selectBid(intentHash: string, bidId: number): Promise<void> {
    try {
      await this.bidManager.updateJobStatus(intentHash, 'bid_selected', bidId);
      logger.info('Bid selected', { intentHash, bidId });
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

      // Prepare transaction data
      const intent = job.intent;
      const acceptance = bid.acceptance;
      const payoutAddress = bid.agentAddress;
      const amount = bid.quote.price;

      // Execute settlement transaction
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

