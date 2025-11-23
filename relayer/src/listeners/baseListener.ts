import { ethers } from 'ethers';
import config from '../config';
import logger from '../utils/logger';

// AgentTaskManager ABI (only events we need)
const TASK_MANAGER_ABI = [
  'event JobIntentPosted(bytes32 indexed intentHash, address indexed user, tuple(string topic, string ipfsUri, uint256 budget, uint64 deadline) spec)',
  'event JobSettled(bytes32 indexed intentHash, address indexed agent, uint256 amountPaid, bytes32 logRootHash)',
];

export class BaseListener {
  private provider: ethers.JsonRpcProvider;
  private taskManager: ethers.Contract;
  private isListening: boolean = false;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.base.rpc);
    this.taskManager = new ethers.Contract(
      config.base.taskManagerAddress,
      TASK_MANAGER_ABI,
      this.provider
    );

    logger.info('Base L2 Listener initialized', {
      rpc: config.base.rpc,
      taskManager: config.base.taskManagerAddress,
    });
  }

  /**
   * Start listening to JobIntentPosted events
   */
  async startListening(
    onJobPosted: (event: JobIntentPostedEvent) => Promise<void>
  ): Promise<void> {
    if (this.isListening) {
      logger.warn('Base listener is already listening');
      return;
    }

    try {
      logger.info('Starting Base L2 event listener...');

      // Listen to JobIntentPosted events
      this.taskManager.on(
        'JobIntentPosted',
        async (intentHash: string, user: string, spec: any, event: any) => {
          try {
            const jobEvent: JobIntentPostedEvent = {
              intentHash,
              user,
              spec: {
                topic: spec.topic,
                ipfsUri: spec.ipfsUri,
                budget: spec.budget.toString(),
                deadline: Number(spec.deadline),
              },
              blockNumber: event.log.blockNumber,
              transactionHash: event.log.transactionHash,
            };

            logger.info('JobIntentPosted event detected', {
              intentHash,
              user,
              topic: spec.topic,
            });

            await onJobPosted(jobEvent);
          } catch (error) {
            logger.error('Error processing JobIntentPosted event', error);
          }
        }
      );

      this.isListening = true;
      logger.info('Base L2 event listener started successfully');
    } catch (error) {
      logger.error('Failed to start Base L2 event listener', error);
      throw error;
    }
  }

  /**
   * Get past events
   */
  async getPastEvents(fromBlock?: number): Promise<JobIntentPostedEvent[]> {
    try {
      const startBlock = fromBlock || config.base.startBlock;
      const currentBlock = await this.provider.getBlockNumber();

      logger.info('Fetching past events', {
        from: startBlock,
        to: currentBlock,
      });

      const filter = this.taskManager.filters.JobIntentPosted();
      const events = await this.taskManager.queryFilter(
        filter,
        startBlock,
        currentBlock
      );

      const mappedEvents: JobIntentPostedEvent[] = events.map((event: any) => {
        const [intentHash, user, spec] = event.args;
        return {
          intentHash,
          user,
          spec: {
            topic: spec.topic,
            ipfsUri: spec.ipfsUri,
            budget: spec.budget.toString(),
            deadline: Number(spec.deadline),
          },
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
        };
      });

      logger.info(`Found ${mappedEvents.length} past events`);
      return mappedEvents;
    } catch (error) {
      logger.error('Failed to fetch past events', error);
      throw error;
    }
  }

  /**
   * Get intent details from contract
   */
  async getIntentDetails(intentHash: string): Promise<any> {
    try {
      const taskManager = new ethers.Contract(
        config.base.taskManagerAddress,
        [
          'function getIntent(bytes32 intentHash) view returns (tuple(bytes32 payloadHash, uint64 expiry, uint64 nonce, address agentId, bytes32 coordinationType, uint256 coordinationValue, address[] participants))',
          'function getIntentStatus(bytes32 intentHash) view returns (uint8)',
        ],
        this.provider
      );

      const [intent, status] = await Promise.all([
        taskManager.getIntent(intentHash),
        taskManager.getIntentStatus(intentHash),
      ]);

      return {
        payloadHash: intent.payloadHash,
        expiry: Number(intent.expiry),
        nonce: Number(intent.nonce),
        agentId: intent.agentId,
        coordinationType: intent.coordinationType,
        coordinationValue: intent.coordinationValue.toString(),
        participants: intent.participants,
        status: Number(status),
      };
    } catch (error) {
      logger.error('Failed to get intent details', { intentHash }, error);
      throw error;
    }
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    if (this.isListening) {
      this.taskManager.removeAllListeners('JobIntentPosted');
      this.isListening = false;
      logger.info('Base L2 event listener stopped');
    }
  }
}

export interface JobIntentPostedEvent {
  intentHash: string;
  user: string;
  spec: {
    topic: string;
    ipfsUri: string;
    budget: string;
    deadline: number;
  };
  blockNumber: number;
  transactionHash: string;
}

export default BaseListener;

