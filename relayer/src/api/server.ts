import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from '../config';
import logger from '../utils/logger';
import BidManager from '../managers/bidManager';
import SettlementCoordinator from '../settlement/coordinator';
import { ethers } from 'ethers';

export class APIServer {
  private app: express.Application;
  private bidManager: BidManager;
  private settlementCoordinator: SettlementCoordinator;

  constructor(bidManager: BidManager, settlementCoordinator: SettlementCoordinator) {
    this.app = express();
    this.bidManager = bidManager;
    this.settlementCoordinator = settlementCoordinator;

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors({ origin: config.api.frontendUrl }));
    this.app.use(express.json());

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Get job details with bids
    this.app.get('/api/jobs/:intentHash', async (req: Request, res: Response) => {
      try {
        const { intentHash } = req.params;
        
        const [job, bids] = await Promise.all([
          this.bidManager.getJob(intentHash),
          this.bidManager.getBidsByIntent(intentHash),
        ]);

        if (!job) {
          return res.status(404).json({ error: 'Job not found' });
        }

        res.json({ job, bids });
      } catch (error) {
        logger.error('Error fetching job', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Get bids for a job
    this.app.get('/api/jobs/:intentHash/bids', async (req: Request, res: Response) => {
      try {
        const { intentHash } = req.params;
        const bids = await this.bidManager.getBidsByIntent(intentHash);
        res.json({ bids });
      } catch (error) {
        logger.error('Error fetching bids', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Get jobs by user
    this.app.get('/api/users/:userAddress/jobs', async (req: Request, res: Response) => {
      try {
        const { userAddress } = req.params;
        
        if (!ethers.isAddress(userAddress)) {
          return res.status(400).json({ error: 'Invalid address' });
        }

        const jobs = await this.bidManager.getJobsByUser(userAddress);
        res.json({ jobs });
      } catch (error) {
        logger.error('Error fetching user jobs', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Select winning bid
    this.app.post('/api/jobs/:intentHash/select', async (req: Request, res: Response) => {
      try {
        const { intentHash } = req.params;
        const { bidId } = req.body;

        if (!bidId || typeof bidId !== 'number') {
          return res.status(400).json({ error: 'Invalid bidId' });
        }

        const vaultAddress = await this.settlementCoordinator.selectBid(intentHash, bidId);
        res.json({ 
          success: true, 
          message: 'Bid selected successfully',
          paymentAddress: vaultAddress // Return the vault address for user to pay
        });
      } catch (error) {
        logger.error('Error selecting bid', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Execute settlement
    this.app.post('/api/jobs/:intentHash/settle', async (req: Request, res: Response) => {
      try {
        const { intentHash } = req.params;
        const { bidId, logRootHash } = req.body;

        if (!bidId || typeof bidId !== 'number') {
          return res.status(400).json({ error: 'Invalid bidId' });
        }

        const txHash = await this.settlementCoordinator.executeSettlement(
          intentHash,
          bidId,
          logRootHash || ethers.ZeroHash
        );

        res.json({ success: true, txHash });
      } catch (error) {
        logger.error('Error executing settlement', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Get settlement transaction
    this.app.get('/api/transactions/:txHash', async (req: Request, res: Response) => {
      try {
        const { txHash } = req.params;
        const txData = await this.settlementCoordinator.getSettlementTransaction(txHash);
        res.json(txData);
      } catch (error) {
        logger.error('Error fetching transaction', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  }

  start(): void {
    this.app.listen(config.api.port, () => {
      logger.info(`API server listening on port ${config.api.port}`);
    });
  }
}

export default APIServer;

