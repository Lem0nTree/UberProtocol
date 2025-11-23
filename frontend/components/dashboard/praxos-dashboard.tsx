"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, Briefcase } from "lucide-react"
import { VaultCard } from "./vault-card"
import { mockAgents } from "@/lib/mock-data"

export function PraxosDashboard() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [jobRequest, setJobRequest] = useState("")
  const [budget, setBudget] = useState("")
  const [deadline, setDeadline] = useState("")
  const [duration, setDuration] = useState("")
  const [currency, setCurrency] = useState("ETH")

  const handleGenerate = () => {
    if (!jobRequest) return

    setIsGenerating(true)
    setShowResults(false)
    // Simulate API call
    setTimeout(() => {
      setIsGenerating(false)
      setShowResults(true)
    }, 2000)
  }

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
              disabled={isGenerating || !jobRequest}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Matching Agents...
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
            <div className="flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-semibold">Available Agents</h2>
              <span className="text-sm text-muted-foreground">Found {mockAgents.length} matches</span>
            </div>
            <div className="grid gap-4">
              {mockAgents.map((agent, index) => (
                <div
                  key={agent.id}
                  className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <VaultCard agent={agent} index={index} currency={currency} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
