/**
 * API client for UberProtocol Relayer
 */

import { USE_MOCK_MODE, generateMockVaultAddress, MOCK_AGENT_PAYMENT_ADDRESS } from './mock-utils'
import { createMockBids, createMockJob } from './mock-data'
import { JobSpec } from './intent-signing'
import { parseEther } from 'viem'

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

// In-memory store for mocks
const mockJobs = new Map<string, Job>()
const mockBids = new Map<string, Bid[]>()

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
   * Mock helper to store job data
   */
  async createMockJob(intentHash: string, userAddress: string, jobSpec: JobSpec): Promise<void> {
    if (USE_MOCK_MODE) {
      const job = createMockJob(intentHash, userAddress, jobSpec)
      const bids = createMockBids(intentHash, jobSpec.budget)
      
      mockJobs.set(intentHash, job)
      mockBids.set(intentHash, bids)
    }
  }

  /**
   * Get job details with bids
   */
  async getJob(intentHash: string): Promise<{ job: Job; bids: Bid[] }> {
    if (USE_MOCK_MODE) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const job = mockJobs.get(intentHash)
      const bids = mockBids.get(intentHash) || []
      
      if (!job) {
        throw new Error('Job not found (mock)')
      }
      
      return { job, bids }
    }
    
    return this.fetchJson<{ job: Job; bids: Bid[] }>(`/api/jobs/${intentHash}`);
  }

  /**
   * Get bids for a job
   */
  async getBids(intentHash: string): Promise<{ bids: Bid[] }> {
    if (USE_MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 500))
      const bids = mockBids.get(intentHash) || []
      return { bids }
    }
    return this.fetchJson<{ bids: Bid[] }>(`/api/jobs/${intentHash}/bids`);
  }

  /**
   * Get jobs by user address
   */
  async getJobsByUser(userAddress: string): Promise<{ jobs: Job[] }> {
    if (USE_MOCK_MODE) {
       await new Promise(resolve => setTimeout(resolve, 500))
       // Filter mocks by user
       const userJobs = Array.from(mockJobs.values()).filter(j => j.userAddress.toLowerCase() === userAddress.toLowerCase())
       return { jobs: userJobs }
    }
    return this.fetchJson<{ jobs: Job[] }>(`/api/users/${userAddress}/jobs`);
  }

  /**
   * Select winning bid
   */
  async selectBid(intentHash: string, bidId: number): Promise<SelectBidResponse> {
    if (USE_MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const job = mockJobs.get(intentHash)
      if (job) {
        job.status = 'bid_selected'
        job.selectedBidId = bidId
        job.vaultAddress = generateMockVaultAddress()
        mockJobs.set(intentHash, job)
      }
      
      return {
        success: true,
        message: 'Bid selected successfully',
        paymentAddress: MOCK_AGENT_PAYMENT_ADDRESS
      }
    }
    
    return this.fetchJson<SelectBidResponse>(`/api/jobs/${intentHash}/select`, {
      method: 'POST',
      body: JSON.stringify({ bidId }),
    });
  }

  /**
   * Execute settlement
   */
  async settleJob(intentHash: string, bidId: number, logRootHash?: string): Promise<SettleJobResponse> {
    if (USE_MOCK_MODE) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        const job = mockJobs.get(intentHash)
        if (job) {
            job.status = 'settled'
            job.settledAt = new Date().toISOString()
            job.settlementTxHash = `0x${Math.random().toString(16).slice(2, 66)}`
            mockJobs.set(intentHash, job)
        }
        return {
            success: true,
            txHash: `0x${Math.random().toString(16).slice(2, 66)}`
        }
    }

    return this.fetchJson<SettleJobResponse>(`/api/jobs/${intentHash}/settle`, {
      method: 'POST',
      body: JSON.stringify({ bidId, logRootHash }),
    });
  }

  /**
   * Get settlement transaction details
   */
  async getSettlementTransaction(txHash: string): Promise<any> {
    if (USE_MOCK_MODE) {
        return { status: 'success', blockNumber: 12345678 }
    }
    return this.fetchJson<any>(`/api/transactions/${txHash}`);
  }
}

export const relayerAPI = new RelayerAPI();
export default relayerAPI;
