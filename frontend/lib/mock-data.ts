import type { AssetType } from "@/components/dashboard/asset-icon"

export interface Asset {
  name: string
  type: AssetType
  provider: string
  country: string
  rating: string
  description: string
}

export interface Vault {
  id: string
  name: string
  description: string
  apr: number
  matchPercentage: number
  isNew?: boolean
  assets: Asset[]
}

export interface Agent {
  id: string
  name: string
  description: string
  score: number
  price: string
  chain: string
  tags: ("TEE" | "Confidential Computing" | "New")[]
  details: {
    modelWeight: string
    size: string
    date: string
  }
}

export const mockVaults: Vault[] = [
  {
    id: "1",
    name: "Global Sovereign Yield Alpha",
    description:
      "Diversified exposure to short-term government bonds across G7 nations, optimized for yield and currency stability.",
    apr: 5.42,
    matchPercentage: 98,
    isNew: true,
    assets: [
      {
        name: "US Treasury Bill 3M",
        type: "bond",
        provider: "BlackRock",
        country: "USA",
        rating: "AAA",
        description:
          "Short-term US government debt obligation backed by the full faith and credit of the US government.",
      },
      {
        name: "UK Gilt 1Y",
        type: "bond",
        provider: "Vanguard",
        country: "UK",
        rating: "AA",
        description: "British government bonds denominated in GBP.",
      },
      {
        name: "German Bund 6M",
        type: "bond",
        provider: "Invesco",
        country: "Germany",
        rating: "AAA",
        description: "Federal Republic of Germany government debt.",
      },
    ],
  },
  {
    id: "2",
    name: "Real Estate Income Plus",
    description: "High-yield REIT strategy focusing on commercial and industrial properties in emerging tech hubs.",
    apr: 8.15,
    matchPercentage: 94,
    assets: [
      {
        name: "Vanguard Real Estate ETF",
        type: "reit",
        provider: "Vanguard",
        country: "USA",
        rating: "A",
        description: "Invests in stocks issued by real estate investment trusts (REITs).",
      },
      {
        name: "Prologis Industrial Fund",
        type: "reit",
        provider: "J.P. Morgan",
        country: "Global",
        rating: "A+",
        description: "Logistics real estate solutions focused on high-barrier markets.",
      },
      {
        name: "Digital Realty Trust",
        type: "reit",
        provider: "BlackRock",
        country: "USA",
        rating: "BBB+",
        description: "Data center real estate investment trust.",
      },
      {
        name: "Simon Property Group",
        type: "reit",
        provider: "Fidelity",
        country: "USA",
        rating: "A-",
        description: "Retail real estate ownership and management.",
      },
      {
        name: "Public Storage",
        type: "reit",
        provider: "State Street",
        country: "USA",
        rating: "A",
        description: "Self-storage facility real estate investment trust.",
      },
      {
        name: "Realty Income Corp",
        type: "reit",
        provider: "Invesco",
        country: "USA",
        rating: "A-",
        description: "Commercial real estate with long-term net lease agreements.",
      },
    ],
  },
  {
    id: "3",
    name: "Tech Innovation Debt Fund",
    description:
      "Senior secured lending to late-stage venture-backed technology companies with strong recurring revenue.",
    apr: 11.2,
    matchPercentage: 88,
    assets: [
      {
        name: "Silicon Valley Debt Fund IV",
        type: "fund",
        provider: "Goldman Sachs",
        country: "USA",
        rating: "BBB",
        description: "Private credit facility for Series C+ SaaS companies.",
      },
      {
        name: "Horizon Tech Lending",
        type: "fund",
        provider: "BlackRock",
        country: "USA",
        rating: "BBB-",
        description: "Venture debt financing for life science and healthcare tech.",
      },
    ],
  },
  {
    id: "4",
    name: "Emerging Markets Green Bond",
    description: "ESG-focused sovereign and corporate debt from high-growth developing economies.",
    apr: 6.85,
    matchPercentage: 82,
    assets: [
      {
        name: "Brazil Green Energy Bond",
        type: "commodity",
        provider: "J.P. Morgan",
        country: "Brazil",
        rating: "BB+",
        description: "Financing for renewable energy infrastructure projects.",
      },
      {
        name: "India Solar Infrastructure",
        type: "commodity",
        provider: "Fidelity",
        country: "India",
        rating: "BBB-",
        description: "Solar park development bonds backed by government PPAs.",
      },
      {
        name: "Vietnam Wind Power",
        type: "commodity",
        provider: "Vanguard",
        country: "Vietnam",
        rating: "BB",
        description: "Offshore wind farm development financing.",
      },
    ],
  },
]

export const mockAgents: Agent[] = [
  {
    id: "1",
    name: "Nexus Prime Solver",
    description: "High-performance general purpose agent optimized for complex reasoning tasks and data analysis.",
    score: 98,
    price: "0.05 ETH",
    chain: "Ethereum",
    tags: ["TEE", "New"],
    details: {
      modelWeight: "70B",
      size: "42GB",
      date: "2024-03-15",
    },
  },
  {
    id: "2",
    name: "SecureCompute Node Alpha",
    description:
      "Privacy-preserving computation agent specializing in sensitive data processing within trusted execution environments.",
    score: 95,
    price: "120 USDC",
    chain: "Arbitrum",
    tags: ["Confidential Computing", "TEE"],
    details: {
      modelWeight: "13B",
      size: "8GB",
      date: "2024-02-28",
    },
  },
  {
    id: "3",
    name: "CodeWeaver V4",
    description:
      "Specialized code generation and auditing agent with extensive knowledge of Solidity and Rust smart contracts.",
    score: 92,
    price: "0.08 ETH",
    chain: "Optimism",
    tags: [],
    details: {
      modelWeight: "34B",
      size: "24GB",
      date: "2024-01-10",
    },
  },
  {
    id: "4",
    name: "MarketSentinel Bot",
    description: "Real-time market analysis agent capable of high-frequency data processing and trend prediction.",
    score: 88,
    price: "50 USDC",
    chain: "Base",
    tags: ["New"],
    details: {
      modelWeight: "7B",
      size: "5GB",
      date: "2024-03-20",
    },
  },
]
