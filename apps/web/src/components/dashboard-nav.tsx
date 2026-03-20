
"use client"

import { Link, usePathname } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { 
  LayoutDashboard, 
  Bot, 
  Network, 
  Route, 
  MessageSquare, 
  Cpu, 
  Database, 
  Box,
  Settings
} from "lucide-react"

export function DashboardNav() {
  const pathname = usePathname()
  const t = useTranslations("Dashboard")

  const items = [
    {
      title: t("title"),
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: t("agents"),
      href: "/agents",
      icon: Bot,
    },
    {
      title: t("entryPoints"),
      href: "/entry-points",
      icon: Network,
    },
    {
      title: t("routing"),
      href: "/routing",
      icon: Route,
    },
    {
      title: t("channels"),
      href: "/channels",
      icon: MessageSquare,
    },
    {
      title: t("skills"),
      href: "/skills",
      icon: Cpu,
    },
    {
      title: t("memory"),
      href: "/memory",
      icon: Database,
    },
    {
      title: t("sandbox"),
      href: "/sandbox",
      icon: Box,
    },
    {
      title: t("settings"),
      href: "/settings",
      icon: Settings,
    },
  ]

  return (
    <nav className="grid items-start gap-2">
      {items.map((item, index) => {
        const Icon = item.icon
        // Simple active check: if pathname starts with item.href
        // Special case for dashboard home to avoid matching everything
        const isActive = item.href === "/dashboard" 
          ? pathname === "/dashboard" 
          : pathname.startsWith(item.href)

        return (
          <Link
            key={index}
            href={item.href}
          >
            <span
              className={cn(
                "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                isActive ? "bg-accent text-accent-foreground" : "transparent"
              )}
            >
              <Icon className="mr-2 h-4 w-4" />
              <span>{item.title}</span>
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
