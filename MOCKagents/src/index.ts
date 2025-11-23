import dotenv from 'dotenv';
dotenv.config();

import { Client, PrivateKey, TopicMessageQuery } from '@hashgraph/sdk';
import { ethers } from 'ethers';
import logger from './utils/logger';
import config from './config';

class SimpleBiddingAgent {
  private client: Client;
  private topicId: string;
  private signer: ethers.Wallet;

  constructor() {
    // Initialize Hedera client
    if (config.hedera.network === 'mainnet') {
      this.client = Client.forMainnet();
    } else {
      this.client = Client.forTestnet();
    }

    this.client.setOperator(
      config.hedera.accountId,
      PrivateKey.fromStringECDSA(config.hedera.privateKey)
    );

    this.topicId = config.hedera.a2aTopicId;

    // Initialize signer for EIP-712
    this.signer = new ethers.Wallet(config.agent.privateKey);

    logger.info('Simple Bidding Agent initialized', {
      agentName: config.agent.name,
      agentId: config.agent.id,
      agentAddress: config.agent.walletAddress,
      topicId: this.topicId,
    });
  }

  async start(): Promise<void> {
    try {
      logger.info('🤖 Starting agent...');

      // Subscribe to A2A topic for jobs
      await this.subscribeToJobs();

      logger.info('✨ Agent started successfully!');
      logger.info(`👂 Listening for jobs on topic: ${this.topicId}`);
    } catch (error) {
      logger.error('Failed to start agent', error);
      process.exit(1);
    }
  }

  /**
   * Subscribe to A2A topic and listen for jobs
   */
  private async subscribeToJobs(): Promise<void> {
    try {
      logger.info('Subscribing to A2A topic...');

      new TopicMessageQuery()
        .setTopicId(this.topicId)
        .setStartTime(0)
        .subscribe(this.client, null, async (message) => {
          try {
            const messageString = Buffer.from(message.contents).toString();
            const parsedMessage = JSON.parse(messageString);

            if (parsedMessage.type === 'JOB_POSTED') {
              await this.handleJobPosted(parsedMessage);
            } else if (parsedMessage.type === 'VAULT_ACCESS_GRANTED') {
              await this.handleVaultAccessGranted(parsedMessage);
            }
          } catch (error) {
            logger.error('Failed to parse message', error);
          }
        });

      logger.info('Subscribed to A2A topic successfully');
    } catch (error) {
      logger.error('Failed to subscribe to A2A topic', error);
      throw error;
    }
  }

  /**
   * Handle job posted message
   */
  private async handleJobPosted(message: any): Promise<void> {
    try {
      const { intentHash, jobSpec, intent } = message.data;

      logger.info('📬 Received job', {
        intentHash,
        topic: jobSpec.topic,
        budget: ethers.formatEther(jobSpec.budget),
      });

      // Evaluate if we should bid
      const shouldBid = await this.evaluateJob(jobSpec, intent);
      if (!shouldBid) {
        logger.info('❌ Skipping job (does not meet criteria)', { intentHash });
        return;
      }

      // Calculate our bid price
      const bidPrice = await this.calculateBidPrice(jobSpec);

      logger.info('💰 Preparing bid', {
        intentHash,
        bidPrice: ethers.formatEther(bidPrice),
      });

      // Create and submit bid
      await this.submitBid(intentHash, intent, bidPrice);

      logger.info('✅ Bid submitted successfully', { intentHash });
    } catch (error) {
      logger.error('Failed to handle job', error);
    }
  }

  /**
   * Evaluate if we should bid on this job
   */
  private async evaluateJob(jobSpec: any, intent: any): Promise<boolean> {
    // Check minimum budget
    const budget = BigInt(jobSpec.budget);
    const minBudget = ethers.parseEther(config.agent.minBudgetEth.toString());

    if (budget < minBudget) {
      logger.debug('Budget too low', {
        budget: ethers.formatEther(budget),
        minBudget: ethers.formatEther(minBudget),
      });
      return false;
    }

    // Check if job is not expired
    const now = Math.floor(Date.now() / 1000);
    if (intent.expiry < now) {
      logger.debug('Job expired', {
        expiry: intent.expiry,
        now,
      });
      return false;
    }

    // Check if we're in the participants list
    const isParticipant = intent.participants.some(
      (p: string) => p.toLowerCase() === config.agent.walletAddress.toLowerCase()
    );

    if (!isParticipant) {
      logger.debug('Not in participants list');
      return false;
    }

    // Check topic/capability match (simple implementation)
    // In production, match against agent's capabilities
    const supportedTopics = ['defi_swap', 'defi_strategy', 'token_transfer'];
    if (!supportedTopics.includes(jobSpec.topic)) {
      logger.debug('Topic not supported', { topic: jobSpec.topic });
      return false;
    }

    return true;
  }

  /**
   * Calculate bid price based on job
   */
  private async calculateBidPrice(jobSpec: any): Promise<bigint> {
    // Simple pricing: base price + complexity multiplier
    const basePrice = ethers.parseEther(config.agent.basePriceEth.toString());
    const budget = BigInt(jobSpec.budget);

    // Bid slightly lower than budget (e.g., 90%)
    const ourBid = (budget * BigInt(90)) / BigInt(100);

    // Ensure we meet minimum price
    return ourBid < basePrice ? basePrice : ourBid;
  }

  /**
   * Submit bid to A2A topic
   */
  private async submitBid(
    intentHash: string,
    intent: any,
    bidPrice: bigint
  ): Promise<void> {
    try {
      // Create AcceptanceAttestation
      const acceptance = await this.createAcceptance(intentHash, intent);

      // Create bid message
      const bidMessage = {
        type: 'BID_SUBMITTED',
        version: '1.0',
        data: {
          intentHash,
          agentId: config.agent.id,
          agentAddress: config.agent.walletAddress,
          acceptance,
          quote: {
            price: bidPrice.toString(),
            etaSeconds: 3600, // 1 hour ETA
            detailsUri: '', // Optional: link to detailed execution plan
          },
          timestamp: Math.floor(Date.now() / 1000),
        },
      };

      // Publish to A2A topic
      const messageString = JSON.stringify(bidMessage);
      const { TopicMessageSubmitTransaction } = await import('@hashgraph/sdk');

      const submitTx = new TopicMessageSubmitTransaction({
        topicId: this.topicId,
        message: messageString,
      });

      await submitTx.execute(this.client);

      logger.info('Bid published to A2A topic', { intentHash });
    } catch (error) {
      logger.error('Failed to submit bid', error);
      throw error;
    }
  }

  /**
   * Handle vault access granted message
   */
  private async handleVaultAccessGranted(message: any): Promise<void> {
    try {
      const { intentHash, agentAddress, vaultAddress, vaultData } = message.data;

      // Verify this message is for this agent
      if (agentAddress.toLowerCase() !== config.agent.walletAddress.toLowerCase()) {
        logger.debug('Vault access message not for this agent', {
          messageAgent: agentAddress,
          ourAgent: config.agent.walletAddress,
        });
        return;
      }

      logger.info('🔐 Vault access granted', {
        intentHash,
        vaultAddress,
        agentAddress,
      });

      // Store vault credentials securely
      // In production, decrypt vaultData if encrypted
      // For now, log that we received access
      logger.info('✅ Vault credentials received', {
        intentHash,
        vaultAddress,
        // Note: In production, store vaultData securely (encrypted storage)
      });

      // Agent can now use vault to execute the job
      // The vault address and credentials are available for job execution
    } catch (error) {
      logger.error('Failed to handle vault access granted', error);
    }
  }

  /**
   * Create EIP-712 AcceptanceAttestation
   */
  private async createAcceptance(intentHash: string, intent: any): Promise<any> {
    // EIP-712 domain for ERC-8001
    const domain = {
      name: 'ERC-8001',
      version: '1',
      chainId: config.base.chainId,
      verifyingContract: config.base.taskManagerAddress,
    };

    // AcceptanceAttestation type
    const types = {
      AcceptanceAttestation: [
        { name: 'intentHash', type: 'bytes32' },
        { name: 'participant', type: 'address' },
        { name: 'nonce', type: 'uint64' },
        { name: 'expiry', type: 'uint64' },
        { name: 'conditionsHash', type: 'bytes32' },
      ],
    };

    // Create acceptance
    const acceptance = {
      intentHash,
      participant: config.agent.walletAddress,
      nonce: 1,
      expiry: intent.expiry, // Match intent expiry
      conditionsHash: ethers.ZeroHash, // No additional conditions
    };

    // Sign acceptance
    const signature = await this.signer.signTypedData(domain, types, acceptance);

    return {
      ...acceptance,
      signature,
    };
  }
}

// Start the agent
const agent = new SimpleBiddingAgent();
agent.start().catch((error) => {
  logger.error('Fatal error', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down agent...');
  process.exit(0);
});

