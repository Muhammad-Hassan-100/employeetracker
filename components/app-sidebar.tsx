"use client"

import Link from "next/link"
import BrandMark from "@/components/brand-mark"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  BarChart3,
  Building2,
  CalendarClock,
  ClipboardList,
  Home,
  LogOut,
  Settings2,
  ShieldCheck,
  UserPlus2,
  UsersRound,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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
  useSidebar,
} from "@/components/ui/sidebar"
import type { SessionUser } from "@/lib/session"
import { authFetch, clearStoredUser, setStoredUser } from "@/lib/client-session"

interface AppSidebarProps {
  user: SessionUser
}

export function AppSidebar({ user }: AppSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()
  const [currentUser, setCurrentUser] = useState(user)

  useEffect(() => setCurrentUser(user), [user])

  useEffect(() => {
    if (isMobile) setOpenMobile(false)
  }, [isMobile, pathname, setOpenMobile])

  useEffect(() => {
    if (user.role === "super_admin") return
    let isCancelled = false

    const syncCurrentUser = async () => {
      try {
        const response = await authFetch("/api/auth/profile")
        if (!response.ok) {
          if (response.status === 403 && user.role === "employee") {
            const nextUser = { ...user, allowEmployeePasswordChange: false }
            setCurrentUser(nextUser)
            setStoredUser(nextUser)
          }
          return
        }

        const data = await response.json()
        if (!data.user || isCancelled) return
        setCurrentUser(data.user)
        setStoredUser(data.user)
      } catch {
        // Keep the current sidebar available when profile refresh fails.
      }
    }

    syncCurrentUser()
    return () => { isCancelled = true }
  }, [user])

  const handleLogout = () => {
    clearStoredUser()
    toast.success("Signed out", { description: "Your workspace session has been cleared." })
    router.push("/")
  }

  const menuItems = currentUser.role === "super_admin"
    ? [
        { title: "Overview", url: "/dashboard", icon: Home },
        { title: "Approval requests", url: "/dashboard/platform/requests", icon: ShieldCheck },
        { title: "Companies", url: "/dashboard/platform/companies", icon: Building2 },
        { title: "Employees", url: "/dashboard/platform/employees", icon: UsersRound },
      ]
    : currentUser.role === "admin"
      ? [
          { title: "Overview", url: "/dashboard", icon: Home },
          { title: "Add employee", url: "/dashboard/employees", icon: UserPlus2 },
          { title: "All employees", url: "/dashboard/employee-list", icon: UsersRound },
          { title: "Attendance monitor", url: "/dashboard/attendance-monitor", icon: ClipboardList },
          { title: "Leave queue", url: "/dashboard/leaves", icon: CalendarClock },
          { title: "Shifts & rules", url: "/dashboard/shifts", icon: CalendarClock },
          { title: "Reports", url: "/dashboard/reports", icon: BarChart3 },
          { title: "Settings", url: "/dashboard/settings", icon: Settings2 },
        ]
      : [
          { title: "Overview", url: "/dashboard", icon: Home },
          { title: "Attendance", url: "/dashboard/attendance", icon: ClipboardList },
          { title: "Leave requests", url: "/dashboard/leaves", icon: CalendarClock },
          { title: "My history", url: "/dashboard/history", icon: BarChart3 },
          ...(currentUser.allowEmployeePasswordChange
            ? [{ title: "Settings", url: "/dashboard/settings", icon: Settings2 }]
            : []),
        ]

  const workspaceLabel = currentUser.role === "super_admin"
    ? "Platform control"
    : currentUser.role === "admin"
      ? "Company workspace"
      : "Employee workspace"

  return (
    <Sidebar collapsible="icon" className="border-r border-[#e6e9e2] bg-[var(--dashboard-sidebar)] text-[var(--dashboard-ink-soft)]">
      <SidebarHeader className="border-b border-[var(--dashboard-border)] px-4 py-5 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
        <Link href="/dashboard" className="flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-brand)] group-data-[collapsible=icon]:justify-center">
          <BrandMark size={40} className="group-data-[collapsible=icon]:size-8" />
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-sm font-semibold tracking-tight text-[#17251c]">EmployeeTracker</span>
            <span className="mt-0.5 block truncate text-xs text-[var(--dashboard-subtle)]">{currentUser.companyName}</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3 py-5 group-data-[collapsible=icon]:px-0">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#69766d]">
            {workspaceLabel}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    className="h-10 rounded-xl px-3 text-[13px] font-medium text-[#48564c] transition-colors data-[active=true]:bg-[var(--dashboard-green-soft)] data-[active=true]:text-[var(--dashboard-green-text)] data-[active=true]:shadow-[inset_2px_0_0_var(--dashboard-brand)] hover:bg-[var(--dashboard-green-soft)] hover:text-[var(--dashboard-green-text)] focus-visible:ring-2 focus-visible:ring-[var(--dashboard-brand)]"
                  >
                    <Link href={item.url}>
                      <item.icon className="size-[17px]" aria-hidden="true" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-[var(--dashboard-border)] p-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-1">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--dashboard-green-soft)] text-xs font-semibold text-[var(--dashboard-green-text)] group-data-[collapsible=icon]:size-8">
            {currentUser.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-xs font-semibold text-[#223128]">{currentUser.name}</span>
            <span className="mt-0.5 block truncate text-[11px] text-[#849087]">{currentUser.role === "super_admin" ? "Super admin" : currentUser.role}</span>
          </span>
        </div>
        <Button
          variant="ghost"
          className="mt-1 h-10 w-full justify-start rounded-xl px-3 text-xs font-medium text-[#536158] hover:bg-[#e8ece6] hover:text-[#203128] focus-visible:ring-2 focus-visible:ring-[#496b4f] group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 size-4 group-data-[collapsible=icon]:mr-0" aria-hidden="true" />
          <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
