"use client"

import { useState, useEffect } from "react"
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi"
import { parseEther } from "viem"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, Briefcase } from "lucide-react"
import { VaultCard } from "./vault-card"
import { VaultDialog } from "./vault-dialog"
import { mockAgents } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { 
  createJobIntent, 
  createEIP712Domain, 
  hashAgentIntent,
  type JobSpec, 
  type AgentIntent 
} from "@/lib/intent-signing"
import { getContractAddress, AGENT_TASK_MANAGER_ABI } from "@/lib/contracts"
import { signTypedData } from "@wagmi/core"
import { config } from "@/lib/wagmi"
import { relayerAPI, type Bid, type Job } from "@/lib/api"
import { formatEther } from "viem"

const JOB_TAGS = ["NFT", "Yield Optimization", "Trading", "Derivates", "DAOs", "Bridging", "Payments", "Development"]

export function PraxosDashboard() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { toast } = useToast()
  const { writeContract, data: hash, isPending: isWriting } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Read agent nonce from contract
  const contractAddress = isConnected ? getContractAddress() : undefined
  const { data: agentNonce } = useReadContract({
    address: contractAddress,
    abi: AGENT_TASK_MANAGER_ABI,
    functionName: 'agentNonces',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contractAddress,
    },
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [jobRequest, setJobRequest] = useState("")
  const [budget, setBudget] = useState("")
  const [deadline, setDeadline] = useState("")
  const [duration, setDuration] = useState("")
  const [currency, setCurrency] = useState("ETH")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  
  // Job and bid state
  const [currentJob, setCurrentJob] = useState<Job | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [selectedBidId, setSelectedBidId] = useState<number | null>(null)
  const [vaultAddress, setVaultAddress] = useState<string | null>(null)
  const [showVaultDialog, setShowVaultDialog] = useState(false)
  const [isSelectingBid, setIsSelectingBid] = useState(false)
  const [isSettling, setIsSettling] = useState(false)

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const handleGenerate = async () => {
    if (!jobRequest) {
      toast({
        title: "Error",
        description: "Please provide a job request",
        variant: "destructive",
      })
      return
    }

    if (!isConnected || !address) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to create a job",
        variant: "destructive",
      })
      return
    }

    try {
    setIsGenerating(true)
    setShowResults(false)

      // Get contract address
      if (!contractAddress) {
        throw new Error('Contract address not available')
      }

      // Parse budget (assuming ETH for now)
      const budgetAmount = budget ? parseEther(budget) : parseEther("0")

      // Calculate deadline from date input or duration
      let deadlineTimestamp: bigint
      if (deadline) {
        deadlineTimestamp = BigInt(Math.floor(new Date(deadline).getTime() / 1000))
      } else if (duration) {
        const now = BigInt(Math.floor(Date.now() / 1000))
        const durationMap: Record<string, number> = {
          "1h": 3600,
          "24h": 86400,
          "7d": 604800,
          "30d": 2592000,
          "ongoing": 31536000, // 1 year
        }
        deadlineTimestamp = now + BigInt(durationMap[duration] || 86400)
      } else {
        deadlineTimestamp = BigInt(Math.floor(Date.now() / 1000) + 86400) // Default 24h
      }

      // Create job spec
      const jobSpec: JobSpec = {
        topic: selectedTags.length > 0 ? selectedTags.join(",") : "general",
        ipfsUri: `ipfs://placeholder-${Date.now()}`, // TODO: Upload to IPFS
        budget: budgetAmount,
        deadline: deadlineTimestamp,
      }

      // Get current nonce from contract
      const currentNonce = agentNonce ? BigInt(agentNonce.toString()) : BigInt(0)
      const nonce = currentNonce + BigInt(1)

      // Create intent
      const intent = createJobIntent(
        address,
        jobSpec,
        [address], // Participants - just the user for now
        nonce
      )

      // Create EIP-712 domain
      const domain = createEIP712Domain(chainId, contractAddress)

      // Sign the intent
      toast({
        title: "Signing Intent",
        description: "Please sign the message in your wallet",
      })

      const signature = await signTypedData(config, {
        domain,
        types: {
          AgentIntent: [
            { name: 'payloadHash', type: 'bytes32' },
            { name: 'expiry', type: 'uint64' },
            { name: 'nonce', type: 'uint64' },
            { name: 'agentId', type: 'address' },
            { name: 'coordinationType', type: 'bytes32' },
            { name: 'coordinationValue', type: 'uint256' },
            { name: 'participants', type: 'address[]' },
          ],
        },
        primaryType: 'AgentIntent',
        message: {
          payloadHash: intent.payloadHash,
          expiry: intent.expiry,
          nonce: intent.nonce,
          agentId: intent.agentId,
          coordinationType: intent.coordinationType,
          coordinationValue: intent.coordinationValue,
          participants: intent.participants,
        },
      })

      // Calculate intentHash (same as contract does)
      const intentHash = hashAgentIntent(intent)

      // Submit to contract
      toast({
        title: "Submitting Job",
        description: "Submitting your job intent to the blockchain...",
      })

      writeContract({
        address: contractAddress,
        abi: AGENT_TASK_MANAGER_ABI,
        functionName: 'postJobIntent',
        args: [
          [
            intent.payloadHash,
            intent.expiry,
            intent.nonce,
            intent.agentId,
            intent.coordinationType,
            intent.coordinationValue,
            intent.participants,
          ],
          signature as `0x${string}`,
          [jobSpec.topic, jobSpec.ipfsUri, jobSpec.budget, jobSpec.deadline],
        ] as readonly [any, any, any],
        value: budgetAmount,
      } as any)

      // Store intentHash for fetching bids
      // Start fetching bids after a short delay to allow relayer to process
      setTimeout(() => {
        fetchBids(intentHash)
      }, 3000)
    } catch (error: any) {
      console.error('Error creating job intent:', error)
      toast({
        title: "Error",
        description: error?.message || "Failed to create job intent",
        variant: "destructive",
      })
      setIsGenerating(false)
    }
  }

  // Fetch bids when job is posted
  const fetchBids = async (intentHash: string) => {
    try {
      const response = await relayerAPI.getJob(intentHash)
      setCurrentJob(response.job)
      setBids(response.bids)
      setShowResults(true)
    } catch (error: any) {
      console.error('Error fetching bids:', error)
      toast({
        title: "Error",
        description: error?.message || "Failed to fetch bids",
        variant: "destructive",
      })
    }
  }

  // Poll for bids after job is posted
  useEffect(() => {
    if (isSuccess && hash) {
      // Extract intentHash from transaction receipt
      // For now, we'll need to get it from the transaction or event
      // This is a simplified approach - in production, parse the JobIntentPosted event
      const pollForBids = async () => {
        // Wait a bit for relayer to process
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // Try to get job by checking recent transactions or using a known intentHash
        // For now, we'll show a message to check manually
      toast({
        title: "Job Posted!",
          description: "Waiting for agents to submit bids...",
        })
      }
      
      pollForBids()
    }
  }, [isSuccess, hash, toast])

  // Poll for bids periodically when we have a job
  useEffect(() => {
    if (!currentJob?.intentHash) return

    const interval = setInterval(async () => {
      try {
        const response = await relayerAPI.getBids(currentJob.intentHash)
        setBids(response.bids)
      } catch (error) {
        console.error('Error polling bids:', error)
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(interval)
  }, [currentJob?.intentHash])

  // Handle bid selection
  const handleSelectBid = async (bidId: number) => {
    if (!currentJob) return

    try {
      setIsSelectingBid(true)
      const response = await relayerAPI.selectBid(currentJob.intentHash, bidId)
      setSelectedBidId(bidId)
      setVaultAddress(response.paymentAddress)
      setShowVaultDialog(true)
      toast({
        title: "Bid Selected!",
        description: "Vault created successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to select bid",
        variant: "destructive",
      })
    } finally {
      setIsSelectingBid(false)
    }
  }

  // Handle settlement
  const handleSettle = async () => {
    if (!currentJob || !selectedBidId) return

    try {
      setIsSettling(true)
      const response = await relayerAPI.settleJob(currentJob.intentHash, selectedBidId)
      toast({
        title: "Settlement Executed!",
        description: `Transaction: ${response.txHash}`,
      })
      // Refresh job status
      const updatedJob = await relayerAPI.getJob(currentJob.intentHash)
      setCurrentJob(updatedJob.job)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to execute settlement",
        variant: "destructive",
      })
    } finally {
      setIsSettling(false)
    }
  }

  const isLoading = isGenerating || isWriting || isConfirming

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      {/* Left Panel - Job Creator */}
      <div className="w-full lg:w-[450px] lg:shrink-0">
        <Card className="border-border/50 bg-card/50 backdrop-blur-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <Briefcase className="h-4 w-4" />
                </div>
                <CardTitle>Create Job Request</CardTitle>
              </div>
              <Badge variant="outline" className="bg-background/50">
                Agent Economy
              </Badge>
            </div>
            <CardDescription>Configure your onchain job to receive agents bids to complete it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Job Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Job Request</label>
              <Textarea
                placeholder="Describe the task you need an agent to perform..."
                className="min-h-[120px] bg-background/50 resize-none"
                value={jobRequest}
                onChange={(e) => setJobRequest(e.target.value)}
              />
              {/* Added selectable tags for job categories */}
              <div className="flex flex-wrap gap-2 pt-2">
                {JOB_TAGS.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className={cn(
                      "cursor-pointer transition-all hover:bg-primary/20",
                      selectedTags.includes(tag)
                        ? "bg-primary/20 text-primary border-primary/50"
                        : "bg-background/50 text-muted-foreground border-border/50",
                    )}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Duration & Deadline */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Job Duration</label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">1 Hour</SelectItem>
                    <SelectItem value="24h">24 Hours</SelectItem>
                    <SelectItem value="7d">7 Days</SelectItem>
                    <SelectItem value="30d">30 Days</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Deadline</label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="bg-background/50"
                />
              </div>
            </div>

            {/* Budget */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Budget</label>
              <div className="flex gap-2">
                <Input
                  placeholder="1000"
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="bg-background/50 flex-1"
                />
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-[100px] bg-background/50">
                    <SelectValue placeholder="Token" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ETH">ETH</SelectItem>
                    <SelectItem value="USDC">USDC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(74,222,128,0.2)]"
              size="lg"
              onClick={handleGenerate}
              disabled={isLoading || !jobRequest || !isConnected}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isWriting ? "Signing..." : isConfirming ? "Confirming..." : "Matching Agents..."}
                </>
              ) : (
                "Find Agents"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Results */}
      <div className="flex-1 space-y-6">
        {!showResults && !isGenerating && (
          <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/50 bg-card/20 p-8 text-center text-muted-foreground">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/50">
              <Sparkles className="h-8 w-8 opacity-50" />
            </div>
            <div className="max-w-xs">
              <h3 className="mb-1 text-lg font-medium text-foreground">No Agents Selected</h3>
              <p className="text-sm">Create a job request to find qualified agents for your task.</p>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <div className="absolute h-full w-full animate-ping rounded-full bg-primary/20 opacity-75"></div>
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            </div>
            <p className="animate-pulse text-sm font-medium text-primary">Broadcasting Job to Network...</p>
          </div>
        )}

        {showResults && (
          <div className="space-y-4">
            {currentJob && (
              <Card className="border-border/50 bg-card/50 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle>Job Details</CardTitle>
                  <CardDescription>
                    Status: <Badge variant="outline">{currentJob.status}</Badge>
                    {currentJob.vaultAddress && (
                      <span className="ml-2">
                        Vault: <code className="text-xs">{currentJob.vaultAddress.slice(0, 10)}...</code>
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            <div className="flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-semibold">Agent Bids</h2>
              <span className="text-sm text-muted-foreground">
                {bids.length > 0 ? `Found ${bids.length} bid${bids.length > 1 ? 's' : ''}` : 'Waiting for bids...'}
              </span>
            </div>

            {bids.length === 0 ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/50 bg-card/20 p-8 text-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin opacity-50" />
                <p className="text-sm">Waiting for agents to submit bids...</p>
              </div>
            ) : (
            <div className="grid gap-4">
                {bids.map((bid, index) => (
                  <Card
                    key={bid.id}
                    className={cn(
                      "border-border/50 bg-card/50 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both",
                      selectedBidId === bid.id && "ring-2 ring-primary"
                    )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Agent #{bid.agentId}</CardTitle>
                        <Badge variant={selectedBidId === bid.id ? "default" : "outline"}>
                          {selectedBidId === bid.id ? "Selected" : bid.status}
                        </Badge>
                      </div>
                      <CardDescription>
                        Address: <code className="text-xs">{bid.agentAddress.slice(0, 10)}...{bid.agentAddress.slice(-8)}</code>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Price</p>
                          <p className="text-lg font-semibold">
                            {formatEther(BigInt(bid.quote.price))} {currency}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">ETA</p>
                          <p className="text-lg font-semibold">
                            {Math.floor(bid.quote.etaSeconds / 3600)}h
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {selectedBidId === bid.id ? (
                          <>
                            {currentJob?.status === 'bid_selected' && (
                              <Button
                                className="flex-1"
                                onClick={handleSettle}
                                disabled={isSettling}
                              >
                                {isSettling ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Settling...
                                  </>
                                ) : (
                                  "Execute Settlement"
                                )}
                              </Button>
                            )}
                            {vaultAddress && (
                              <Button
                                variant="outline"
                                onClick={() => setShowVaultDialog(true)}
                              >
                                View Vault
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button
                            className="w-full"
                            onClick={() => handleSelectBid(bid.id)}
                            disabled={isSelectingBid || currentJob?.status === 'bid_selected'}
                          >
                            {isSelectingBid ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Selecting...
                              </>
                            ) : (
                              "Select This Bid"
                            )}
                          </Button>
                        )}
                </div>
                    </CardContent>
                  </Card>
              ))}
            </div>
            )}
          </div>
        )}

        {vaultAddress && (
          <VaultDialog
            open={showVaultDialog}
            onOpenChange={setShowVaultDialog}
            vaultAddress={vaultAddress}
            chainId={chainId}
          />
        )}
      </div>
    </div>
  )
}
