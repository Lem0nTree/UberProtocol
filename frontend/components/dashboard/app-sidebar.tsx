"use client"

import type * as React from "react"
import { BookOpen, User, Wallet, Settings, Command, Briefcase, Archive, Cpu } from "lucide-react"
import { cn } from "@/lib/utils"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const navMain = [
  {
    title: "Platform",
    items: [
      {
        title: "Create Job Request",
        url: "#",
        icon: Briefcase,
        isActive: true,
      },
      {
        title: "Active Jobs",
        url: "#",
        icon: Cpu,
      },
      {
        title: "Expired Jobs",
        url: "#",
        icon: Archive,
      },
    ],
  },
  {
    title: "Resources",
    items: [
      {
        title: "Academy",
        url: "#",
        icon: BookOpen,
        badge: "New",
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        title: "Profile",
        url: "#",
        icon: User,
      },
      {
        title: "Wallet",
        url: "#",
        icon: Wallet,
      },
    ],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Uber Protocol</span>
                  <span className="truncate text-xs">Unified Agent Economy</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navMain.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={item.isActive}
                      tooltip={item.title}
                      className={cn(
                        "transition-all duration-200",
                        item.isActive
                          ? "bg-white text-black hover:bg-white/90 hover:text-black rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                          : "text-sidebar-foreground/80 hover:text-sidebar-foreground",
                        item.badge === "Soon" && "text-muted-foreground/50 hover:text-muted-foreground/70",
                        item.badge === "New" && "bg-green-200 text-green-800",
                      )}
                    >
                      <a href={item.url}>
                        <item.icon
                          className={cn(item.badge === "Soon" && "opacity-50", item.badge === "New" && "opacity-100")}
                        />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                    {item.badge && (
                      <span
                        className={cn(
                          "absolute right-2 top-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium group-data-[collapsible=icon]:hidden",
                          item.badge === "Soon"
                            ? "bg-primary/20 text-primary opacity-70"
                            : "bg-primary/20 text-primary",
                          item.badge === "New" && "bg-green-500 text-white",
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
                  <Settings className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Settings</span>
                  <span className="truncate text-xs">Preferences</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
