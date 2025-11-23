import dotenv from 'dotenv';
dotenv.config();

import logger from './utils/logger';
import { initDatabase } from './db';
import HederaA2AService, { A2AMessage, A2ABidMessage } from './hedera/a2aService';
import BaseListener from './listeners/baseListener';
import BidManager from './managers/bidManager';
import SettlementCoordinator from './settlement/coordinator';
import APIServer from './api/server';
import WSServer from './api/wsServer';
import CDPService from './coinbase/cdpService';
import config from './config';

class UberProtocolRelayer {
  private hederaService: HederaA2AService;
  private baseListener: BaseListener;
  private bidManager: BidManager;
  private settlementCoordinator: SettlementCoordinator;
  private apiServer: APIServer;
  private wsServer: WSServer;
  private cdpService: CDPService;

  constructor() {
    this.hederaService = new HederaA2AService();
    this.baseListener = new BaseListener();
    this.bidManager = new BidManager();
    this.cdpService = new CDPService();
    this.settlementCoordinator = new SettlementCoordinator(
      this.bidManager,
      this.cdpService,
      this.hederaService
    );
    this.wsServer = new WSServer();
    this.apiServer = new APIServer(this.bidManager, this.settlementCoordinator);
  }

  async start(): Promise<void> {
    try {
      logger.info('🚀 Starting UberProtocol Relayer...');

      // Initialize database
      logger.info('📦 Initializing database...');
      await initDatabase();

      // Initialize Hedera A2A topic
      if (!this.hederaService.isTopicInitialized()) {
        logger.info('🔧 Creating Hedera A2A topic...');
        const topicId = await this.hederaService.createA2ATopic();
        logger.info(`✅ A2A topic created: ${topicId}`);
      } else {
        logger.info(`✅ Using existing A2A topic: ${this.hederaService.getTopicId()}`);
      }

      // Start Base L2 event listener
      logger.info('👂 Starting Base L2 event listener...');
      await this.baseListener.startListening(async (event) => {
        await this.handleJobPosted(event);
      });

      // Subscribe to Hedera A2A topic for bids
      logger.info('📡 Subscribing to Hedera A2A topic...');
      await this.hederaService.subscribeToA2ATopic(async (message) => {
        await this.handleA2AMessage(message);
      });

      // Start API server
      logger.info('🌐 Starting API server...');
      this.apiServer.start();

      logger.info('✨ UberProtocol Relayer started successfully!');
      logger.info(`📊 API: http://localhost:${config.api.port}`);
      logger.info(`🔌 WebSocket: ws://localhost:${config.api.wsPort}`);
      logger.info(`🪐 A2A Topic: ${this.hederaService.getTopicId()}`);

      // Process past events if needed
      await this.processPastEvents();
    } catch (error) {
      logger.error('Failed to start relayer', error);
      process.exit(1);
    }
  }

  /**
   * Handle JobIntentPosted event from Base L2
   */
  private async handleJobPosted(event: any): Promise<void> {
    try {
      logger.info('📨 Processing JobIntentPosted event', {
        intentHash: event.intentHash,
        user: event.user,
      });

      // Get full intent details from contract
      const intentDetails = await this.baseListener.getIntentDetails(event.intentHash);

      // Store job in database
      await this.bidManager.storeJob({
        intentHash: event.intentHash,
        jobSpec: event.spec,
        intent: intentDetails,
        userAddress: event.user,
      });

      // Publish job to Hedera A2A topic
      await this.hederaService.publishJob({
        type: 'JOB_POSTED',
        version: '1.0',
        data: {
          intentHash: event.intentHash,
          jobSpec: event.spec,
          intent: intentDetails,
          chainId: config.base.chainId,
          taskManagerAddress: config.base.taskManagerAddress,
          timestamp: Math.floor(Date.now() / 1000),
        },
      });

      // Broadcast to WebSocket clients
      this.wsServer.broadcastJobPosted(event.intentHash, {
        jobSpec: event.spec,
        intent: intentDetails,
        user: event.user,
      });

      logger.info('✅ Job published to A2A and broadcasted', {
        intentHash: event.intentHash,
      });
    } catch (error) {
      logger.error('Failed to handle JobPosted event', error);
    }
  }

  /**
   * Handle A2A messages (primarily BID_SUBMITTED)
   */
  private async handleA2AMessage(message: A2AMessage): Promise<void> {
    try {
      if (message.type === 'BID_SUBMITTED') {
        await this.handleBidSubmitted(message as A2ABidMessage);
      }
    } catch (error) {
      logger.error('Failed to handle A2A message', error);
    }
  }

  /**
   * Handle BID_SUBMITTED message from agents
   */
  private async handleBidSubmitted(message: A2ABidMessage): Promise<void> {
    try {
      logger.info('📬 Processing BID_SUBMITTED message', {
        intentHash: message.data.intentHash,
        agentId: message.data.agentId,
      });

      // TODO: Validate EIP-712 signature of acceptance
      // const isValid = await this.validateAcceptanceSignature(message.data.acceptance);
      // if (!isValid) {
      //   logger.warn('Invalid bid signature, rejecting', { agentId: message.data.agentId });
      //   return;
      // }

      // Store bid in database
      const bidId = await this.bidManager.storeBid(message.data);

      // Broadcast to WebSocket clients
      this.wsServer.broadcastNewBid(message.data.intentHash, {
        id: bidId,
        ...message.data,
      });

      logger.info('✅ Bid processed and broadcasted', {
        bidId,
        intentHash: message.data.intentHash,
        agentId: message.data.agentId,
      });
    } catch (error) {
      logger.error('Failed to handle BID_SUBMITTED', error);
    }
  }

  /**
   * Process past events from Base L2
   */
  private async processPastEvents(): Promise<void> {
    try {
      logger.info('🔍 Checking for past events...');
      const pastEvents = await this.baseListener.getPastEvents();

      if (pastEvents.length > 0) {
        logger.info(`Found ${pastEvents.length} past events, processing...`);
        for (const event of pastEvents) {
          await this.handleJobPosted(event);
        }
        logger.info('✅ Past events processed');
      } else {
        logger.info('No past events to process');
      }
    } catch (error) {
      logger.error('Failed to process past events', error);
    }
  }
}

// Start the relayer
const relayer = new UberProtocolRelayer();
relayer.start().catch((error) => {
  logger.error('Fatal error', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});
