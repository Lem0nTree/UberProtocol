import pool from '../db';
import logger from '../utils/logger';
import { A2ABidMessage } from '../hedera/a2aService';

export class BidManager {
  /**
   * Store a new job
   */
  async storeJob(job: {
    intentHash: string;
    jobSpec: any;
    intent: any;
    userAddress: string;
  }): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO jobs (intent_hash, job_spec, intent, user_address, status)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (intent_hash) DO NOTHING`,
        [job.intentHash, JSON.stringify(job.jobSpec), JSON.stringify(job.intent), job.userAddress, 'posted']
      );

      logger.info('Job stored', { intentHash: job.intentHash });
    } catch (error) {
      logger.error('Failed to store job', error);
      throw error;
    }
  }

  /**
   * Store a bid
   */
  async storeBid(bid: A2ABidMessage['data']): Promise<number> {
    try {
      const result = await pool.query(
        `INSERT INTO bids (intent_hash, agent_id, agent_address, acceptance, quote, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          bid.intentHash,
          bid.agentId,
          bid.agentAddress,
          JSON.stringify(bid.acceptance),
          JSON.stringify(bid.quote),
          'pending',
        ]
      );

      const bidId = result.rows[0].id;
      logger.info('Bid stored', { bidId, intentHash: bid.intentHash, agentId: bid.agentId });
      return bidId;
    } catch (error) {
      logger.error('Failed to store bid', error);
      throw error;
    }
  }

  /**
   * Get all bids for an intent
   */
  async getBidsByIntent(intentHash: string): Promise<any[]> {
    try {
      const result = await pool.query(
        `SELECT id, intent_hash, agent_id, agent_address, acceptance, quote, status, created_at
         FROM bids
         WHERE intent_hash = $1
         ORDER BY created_at ASC`,
        [intentHash]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        intentHash: row.intent_hash,
        agentId: row.agent_id,
        agentAddress: row.agent_address,
        acceptance: row.acceptance,
        quote: row.quote,
        status: row.status,
        createdAt: row.created_at,
      }));
    } catch (error) {
      logger.error('Failed to get bids', error);
      throw error;
    }
  }

  /**
   * Get job details
   */
  async getJob(intentHash: string): Promise<any | null> {
    try {
      const result = await pool.query(
        `SELECT id, intent_hash, job_spec, intent, user_address, status, 
                selected_bid_id, created_at, settled_at, settlement_tx_hash
         FROM jobs
         WHERE intent_hash = $1`,
        [intentHash]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        intentHash: row.intent_hash,
        jobSpec: row.job_spec,
        intent: row.intent,
        userAddress: row.user_address,
        status: row.status,
        selectedBidId: row.selected_bid_id,
        createdAt: row.created_at,
        settledAt: row.settled_at,
        settlementTxHash: row.settlement_tx_hash,
      };
    } catch (error) {
      logger.error('Failed to get job', error);
      throw error;
    }
  }

  /**
   * Update job status
   */
  async updateJobStatus(intentHash: string, status: string, selectedBidId?: number): Promise<void> {
    try {
      if (selectedBidId) {
        await pool.query(
          `UPDATE jobs 
           SET status = $1, selected_bid_id = $2
           WHERE intent_hash = $3`,
          [status, selectedBidId, intentHash]
        );
      } else {
        await pool.query(
          `UPDATE jobs 
           SET status = $1
           WHERE intent_hash = $2`,
          [status, intentHash]
        );
      }

      logger.info('Job status updated', { intentHash, status });
    } catch (error) {
      logger.error('Failed to update job status', error);
      throw error;
    }
  }

  /**
   * Mark job as settled
   */
  async markJobSettled(intentHash: string, txHash: string): Promise<void> {
    try {
      await pool.query(
        `UPDATE jobs 
         SET status = $1, settled_at = NOW(), settlement_tx_hash = $2
         WHERE intent_hash = $3`,
        ['settled', txHash, intentHash]
      );

      logger.info('Job marked as settled', { intentHash, txHash });
    } catch (error) {
      logger.error('Failed to mark job as settled', error);
      throw error;
    }
  }

  /**
   * Store job vault details
   */
  async storeJobVault(intentHash: string, vault: { address: string; walletData: any }): Promise<void> {
    try {
      await pool.query(
        `UPDATE jobs 
         SET vault_address = $1, vault_data = $2
         WHERE intent_hash = $3`,
        [vault.address, JSON.stringify(vault.walletData), intentHash]
      );

      logger.info('Job vault stored', { intentHash, vaultAddress: vault.address });
    } catch (error) {
      logger.error('Failed to store job vault', error);
      throw error;
    }
  }

  /**
   * Get all jobs for a user
   */
  async getJobsByUser(userAddress: string): Promise<any[]> {
    try {
      const result = await pool.query(
        `SELECT intent_hash, job_spec, status, created_at, settled_at
         FROM jobs
         WHERE user_address = $1
         ORDER BY created_at DESC`,
        [userAddress]
      );

      return result.rows.map((row: any) => ({
        intentHash: row.intent_hash,
        jobSpec: row.job_spec,
        status: row.status,
        createdAt: row.created_at,
        settledAt: row.settled_at,
      }));
    } catch (error) {
      logger.error('Failed to get jobs by user', error);
      throw error;
    }
  }
}

export default BidManager;
