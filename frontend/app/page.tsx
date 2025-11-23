import { PraxosDashboard } from "@/components/dashboard/praxos-dashboard"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Wallet } from 'lucide-react'

export default function Page() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background dark">
        <AppSidebar />
        <SidebarInset className="bg-background">
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/40 px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
            </div>
            <Button variant="outline" className="gap-2 rounded-full border-primary/20 hover:bg-primary/10 hover:text-primary">
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </Button>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <PraxosDashboard />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
