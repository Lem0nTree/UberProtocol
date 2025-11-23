"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronRight, Cpu, Calendar, Scale, Database } from "lucide-react"
import type { Agent } from "@/lib/mock-data"

interface AgentCardProps {
  agent: Agent
  index: number
  currency: string
}

export function VaultCard({ agent, index, currency }: AgentCardProps) {
  // Assuming mock data price is in "0.05 ETH" format, we extract the number and append selected currency
  const numericPrice = Number.parseFloat(agent.price.split(" ")[0])
  // Simple conversion logic for demo purposes (1 ETH = 2000 USDC approx)
  const displayPrice =
    currency === "USDC" ? `${(numericPrice * 2000).toLocaleString()} USDC` : `${numericPrice} ${currency}`

  return (
    <Card className="group relative overflow-hidden border-border/50 bg-card/50 transition-all hover:border-primary/50 hover:bg-card/80">
      <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <CardHeader className="flex flex-col gap-4 pb-2 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="space-y-1 md:flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold leading-none tracking-tight">{agent.name}</h3>
            {agent.tags.includes("New") && (
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">
                New
              </Badge>
            )}
            {agent.tags.includes("TEE") && (
              <Badge variant="outline" className="border-green-500/20 text-green-500">
                TEE
              </Badge>
            )}
            {agent.tags.includes("Confidential Computing") && (
              <Badge variant="outline" className="border-purple-500/20 text-purple-500">
                Confidential
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{agent.description}</p>
        </div>

        <div className="flex items-center justify-between gap-4 md:flex-col md:items-end md:justify-start md:gap-1 md:text-right">
          <div className="flex flex-col items-start md:items-end">
            <div className="text-xl font-bold text-primary">{displayPrice}</div>
            <span className="text-xs font-normal text-muted-foreground">Job Price</span>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-green-500">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Score: {agent.score}/100
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3 w-full sm:w-auto">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5" />
                <span>{agent.details.modelWeight}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" />
                <span>{agent.details.size}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>{agent.details.date}</span>
              </div>
              <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                <Cpu className="h-3.5 w-3.5" />
                <span>{agent.chain}</span>
              </div>
            </div>
          </div>

          <Button className="w-full sm:w-auto group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            Select Agent
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
