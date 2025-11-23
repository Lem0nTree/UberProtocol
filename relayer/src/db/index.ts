import { Pool } from 'pg';
import config from '../config';
import logger from '../utils/logger';

export const pool = new Pool({
  connectionString: config.database.url,
});

// Test connection
pool.on('connect', () => {
  logger.info('Database connected');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error', err);
  process.exit(-1);
});

export async function initDatabase() {
  const client = await pool.connect();
  try {
    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY,
        intent_hash VARCHAR(66) UNIQUE NOT NULL,
        job_spec JSONB NOT NULL,
        intent JSONB NOT NULL,
        user_address VARCHAR(42) NOT NULL,
        status VARCHAR(20) DEFAULT 'posted',
        selected_bid_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        settled_at TIMESTAMP,
        settlement_tx_hash VARCHAR(66),
        vault_address VARCHAR(42),
        vault_data JSONB
      );

      CREATE INDEX IF NOT EXISTS idx_jobs_intent_hash ON jobs(intent_hash);
      CREATE INDEX IF NOT EXISTS idx_jobs_user ON jobs(user_address);
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bids (
        id SERIAL PRIMARY KEY,
        intent_hash VARCHAR(66) NOT NULL,
        agent_id INTEGER NOT NULL,
        agent_address VARCHAR(42) NOT NULL,
        acceptance JSONB NOT NULL,
        quote JSONB NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (intent_hash) REFERENCES jobs(intent_hash)
      );

      CREATE INDEX IF NOT EXISTS idx_bids_intent_hash ON bids(intent_hash);
      CREATE INDEX IF NOT EXISTS idx_bids_agent_id ON bids(agent_id);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS a2a_messages (
        id SERIAL PRIMARY KEY,
        topic_id VARCHAR(50) NOT NULL,
        sequence_number BIGINT NOT NULL,
        message_type VARCHAR(50) NOT NULL,
        message_data JSONB NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        processed BOOLEAN DEFAULT FALSE,
        UNIQUE(topic_id, sequence_number)
      );

      CREATE INDEX IF NOT EXISTS idx_messages_topic ON a2a_messages(topic_id);
      CREATE INDEX IF NOT EXISTS idx_messages_type ON a2a_messages(message_type);
      CREATE INDEX IF NOT EXISTS idx_messages_processed ON a2a_messages(processed);
    `);

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Database initialization failed', error);
    throw error;
  } finally {
    client.release();
  }
}

export default pool;

