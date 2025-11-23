'use client'

import { useChainId, useSwitchChain } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const SUPPORTED_CHAINS = [
  { id: baseSepolia.id, name: 'Base Sepolia', testnet: true },
  { id: base.id, name: 'Base Mainnet', testnet: false },
]

export function ChainSwitcher() {
  const chainId = useChainId()
  const { switchChain, isPending } = useSwitchChain()

  const currentChain = SUPPORTED_CHAINS.find((chain) => chain.id === chainId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          className="gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80"
          disabled={isPending}
        >
          {currentChain ? (
            <>
              <span className={cn('h-2 w-2 rounded-full', currentChain.testnet ? 'bg-yellow-500' : 'bg-green-500')} />
              {currentChain.name}
            </>
          ) : (
            'Select Chain'
          )}
          <ChevronDown className="h-4 w-4 opacity-80" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_CHAINS.map((chain) => (
          <DropdownMenuItem
            key={chain.id}
            onClick={() => switchChain({ chainId: chain.id })}
            className="flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <span className={cn('h-2 w-2 rounded-full', chain.testnet ? 'bg-yellow-500' : 'bg-green-500')} />
              {chain.name}
            </div>
            {chainId === chain.id && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

