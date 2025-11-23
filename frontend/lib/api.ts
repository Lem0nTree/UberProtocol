/**
 * API client for UberProtocol Relayer
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_RELAYER_API_URL || 'http://localhost:3000';

export interface Job {
  id: number;
  intentHash: string;
  jobSpec: {
    topic: string;
    ipfsUri: string;
    budget: string;
    deadline: number;
  };
  intent: any;
  userAddress: string;
  status: string;
  selectedBidId?: number;
  createdAt: string;
  settledAt?: string;
  settlementTxHash?: string;
  vaultAddress?: string;
}

export interface Bid {
  id: number;
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
  status: string;
  createdAt: string;
}

export interface SelectBidResponse {
  success: boolean;
  message: string;
  paymentAddress: string;
}

export interface SettleJobResponse {
  success: boolean;
  txHash: string;
}

class RelayerAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get job details with bids
   */
  async getJob(intentHash: string): Promise<{ job: Job; bids: Bid[] }> {
    return this.fetchJson<{ job: Job; bids: Bid[] }>(`/api/jobs/${intentHash}`);
  }

  /**
   * Get bids for a job
   */
  async getBids(intentHash: string): Promise<{ bids: Bid[] }> {
    return this.fetchJson<{ bids: Bid[] }>(`/api/jobs/${intentHash}/bids`);
  }

  /**
   * Get jobs by user address
   */
  async getJobsByUser(userAddress: string): Promise<{ jobs: Job[] }> {
    return this.fetchJson<{ jobs: Job[] }>(`/api/users/${userAddress}/jobs`);
  }

  /**
   * Select winning bid
   */
  async selectBid(intentHash: string, bidId: number): Promise<SelectBidResponse> {
    return this.fetchJson<SelectBidResponse>(`/api/jobs/${intentHash}/select`, {
      method: 'POST',
      body: JSON.stringify({ bidId }),
    });
  }

  /**
   * Execute settlement
   */
  async settleJob(intentHash: string, bidId: number, logRootHash?: string): Promise<SettleJobResponse> {
    return this.fetchJson<SettleJobResponse>(`/api/jobs/${intentHash}/settle`, {
      method: 'POST',
      body: JSON.stringify({ bidId, logRootHash }),
    });
  }

  /**
   * Get settlement transaction details
   */
  async getSettlementTransaction(txHash: string): Promise<any> {
    return this.fetchJson<any>(`/api/transactions/${txHash}`);
  }
}

export const relayerAPI = new RelayerAPI();
export default relayerAPI;

