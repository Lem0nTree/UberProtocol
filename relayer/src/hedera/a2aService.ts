import { Client, PrivateKey, TopicCreateTransaction, TopicMessageSubmitTransaction, TopicMessageQuery } from '@hashgraph/sdk';
import { HederaAgentAPI, coreConsensusPlugin } from 'hedera-agent-kit';
import config from '../config';
import logger from '../utils/logger';

export class HederaA2AService {
  private client: Client;
  private agentAPI: HederaAgentAPI;
  private topicId: string;

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

    // Initialize Hedera Agent API with Consensus plugin
    this.agentAPI = new HederaAgentAPI({
      client: this.client,
      configuration: {
        plugins: [coreConsensusPlugin],
      },
    });

    this.topicId = config.hedera.a2aTopicId;

    logger.info('Hedera A2A Service initialized', {
      network: config.hedera.network,
      accountId: config.hedera.accountId,
    });
  }

  /**
   * Create A2A topic for job distribution
   */
  async createA2ATopic(): Promise<string> {
    try {
      logger.info('Creating A2A topic...');

      const transaction = new TopicCreateTransaction()
        .setTopicMemo('UberProtocol A2A Job Distribution')
        .setAdminKey(this.client.operatorPublicKey!);

      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);
      const newTopicId = receipt.topicId!.toString();

      this.topicId = newTopicId;

      logger.info('A2A topic created', { topicId: newTopicId });

      // Save to config (in production, update .env or database)
      config.hedera.a2aTopicId = newTopicId;

      return newTopicId;
    } catch (error) {
      logger.error('Failed to create A2A topic', error);
      throw error;
    }
  }

  /**
   * Publish generic message to A2A topic
   */
  async publishMessage(message: A2AMessage): Promise<void> {
    try {
      if (!this.topicId) {
        throw new Error('A2A topic not initialized');
      }

      const messageString = JSON.stringify(message);

      logger.info('Publishing message to A2A topic', {
        topicId: this.topicId,
        type: message.type,
      });

      const submitTx = new TopicMessageSubmitTransaction({
        topicId: this.topicId,
        message: messageString,
      });

      const txResponse = await submitTx.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);

      logger.info('Message published to A2A topic', {
        topicId: this.topicId,
        status: receipt.status.toString(),
        type: message.type,
      });
    } catch (error) {
      logger.error('Failed to publish message to A2A topic', error);
      throw error;
    }
  }

  /**
   * Publish job to A2A topic
   */
  async publishJob(message: A2AJobMessage): Promise<void> {
    return this.publishMessage(message);
  }

  /**
   * Subscribe to A2A topic and process messages
   */
  async subscribeToA2ATopic(
    onMessage: (message: A2AMessage) => Promise<void>
  ): Promise<void> {
    try {
      if (!this.topicId) {
        throw new Error('A2A topic not initialized');
      }

      logger.info('Subscribing to A2A topic', { topicId: this.topicId });

      new TopicMessageQuery()
        .setTopicId(this.topicId)
        .setStartTime(0)
        .subscribe(this.client, null, (message) => {
          try {
            const messageString = Buffer.from(message.contents).toString();
            const parsedMessage = JSON.parse(messageString) as A2AMessage;

            logger.debug('Received A2A message', {
              type: parsedMessage.type,
              sequenceNumber: message.sequenceNumber.toString(),
            });

            // Process message asynchronously
            onMessage(parsedMessage).catch((error) => {
              logger.error('Error processing A2A message', error);
            });
          } catch (error) {
            logger.error('Failed to parse A2A message', error);
          }
        });

      logger.info('Subscribed to A2A topic successfully');
    } catch (error) {
      logger.error('Failed to subscribe to A2A topic', error);
      throw error;
    }
  }

  /**
   * Get topic ID
   */
  getTopicId(): string {
    return this.topicId;
  }

  /**
   * Check if topic is initialized
   */
  isTopicInitialized(): boolean {
    return !!this.topicId;
  }
}

// A2A Message Types
export interface A2AMessage {
  type: 'JOB_POSTED' | 'BID_SUBMITTED' | 'VAULT_ACCESS_GRANTED';
  version: string;
  data: any;
}

export interface A2AJobMessage extends A2AMessage {
  type: 'JOB_POSTED';
  data: {
    intentHash: string;
    jobSpec: {
      topic: string;
      ipfsUri: string;
      budget: string;
      deadline: number;
    };
    intent: {
      payloadHash: string;
      expiry: number;
      nonce: number;
      agentId: string;
      coordinationType: string;
      coordinationValue: string;
      participants: string[];
    };
    chainId: number;
    taskManagerAddress: string;
    timestamp: number;
  };
}

export interface A2ABidMessage extends A2AMessage {
  type: 'BID_SUBMITTED';
  data: {
    intentHash: string;
    agentId: number;
    agentAddress: string;
    acceptance: {
      intentHash: string;
      participant: string;
      nonce: number;
      expiry: number;
      conditionsHash: string;
      signature: string;
    };
    quote: {
      price: string;
      etaSeconds: number;
      detailsUri?: string;
    };
    timestamp: number;
  };
}

export interface A2AVaultAccessMessage extends A2AMessage {
  type: 'VAULT_ACCESS_GRANTED';
  data: {
    intentHash: string;
    agentId: number;
    agentAddress: string;
    vaultAddress: string;
    vaultData: any; // Encrypted wallet export or similar
    timestamp: number;
  };
}

export default HederaA2AService;
