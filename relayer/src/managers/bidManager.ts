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
