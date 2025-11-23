import { Coinbase, Wallet } from '@coinbase/coinbase-sdk';
import config from '../config';
import logger from '../utils/logger';

export class CDPService {
  constructor() {
    // Configure Coinbase SDK
    Coinbase.configure({
      apiKeyName: config.coinbase.apiKeyName,
      privateKey: config.coinbase.apiPrivateKey,
    });
    
    logger.info('CDP Service initialized');
  }

  /**
   * Create a new Developer-Managed (1-of-1) Vault for a trade
   * This creates a new wallet that will be used as the vault for the job
   */
  async createTradeVault(networkId: string = 'base-sepolia'): Promise<{ address: string; walletData: any }> {
    try {
      logger.info('Creating new trade vault...', { networkId });

      // Create a new wallet
      const wallet = await Wallet.create({ networkId });
      
      // Get the default address
      const address = await wallet.getDefaultAddress();
      const addressString = address.toString(); // or address.getId()? address is usually an object but toString might give the address string

      // Export wallet data (contains seed/private key encrypted or data needed to reconstruct)
      // Since we need to share "full access", we export the data.
      // Note: for Developer-Managed wallets, we can export the data to persist it and restore later.
      const walletData = await wallet.export();

      logger.info('Trade vault created', { address: addressString });

      return {
        address: addressString,
        walletData: walletData,
      };
    } catch (error) {
      logger.error('Failed to create trade vault', error);
      throw error;
    }
  }
}

export default CDPService;

