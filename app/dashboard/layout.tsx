"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Loader2 } from "lucide-react"
import { authFetch, getStoredUser } from "@/lib/client-session"
import type { SessionUser } from "@/lib/session"
import { DEFAULT_DASHBOARD_PRIMARY_COLOR, getDashboardThemeVariables } from "@/lib/company-settings"
import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const dashboardPages: Array<{ path: string; title: string }> = [
  { path: "/dashboard/attendance-monitor", title: "Attendance monitor" },
  { path: "/dashboard/employee-list", title: "All employees" },
  { path: "/dashboard/employees", title: "Employee Management" },
  { path: "/dashboard/history", title: "Attendance history" },
  { path: "/dashboard/leaves", title: "Leave Management" },
  { path: "/dashboard/reports", title: "Attendance Reports" },
  { path: "/dashboard/settings", title: "Settings" },
  { path: "/dashboard/shifts", title: "Shifts and rules" },
  { path: "/dashboard/platform/requests", title: "Approval Requests" },
  { path: "/dashboard/platform/companies", title: "Company Workspaces" },
  { path: "/dashboard/platform/employees", title: "Platform Employees" },
]

function getDashboardPageTitle(pathname: string) {
  if (pathname === "/dashboard") return "Overview"
  const exactPage = dashboardPages.find((page) => page.path === pathname)
  if (exactPage) return exactPage.title
  if (pathname.startsWith("/dashboard/platform/companies/")) return "Company Details"
  if (pathname.startsWith("/dashboard/employees/")) return "Employee Details"
  if (pathname.startsWith("/dashboard/platform")) return "Platform Overview"
  if (pathname.startsWith("/dashboard/attendance")) return "Attendance"
  return "Workspace"
}

function DashboardTopbar({ pathname }: { pathname: string }) {
  const pageTitle = getDashboardPageTitle(pathname)
  return (
    <header className="dashboard-topbar flex h-16 shrink-0 items-center gap-3 border-b border-[var(--dashboard-border)] bg-white/90 px-4 backdrop-blur-xl sm:px-6 lg:px-6">
      <SidebarTrigger className="-ml-1 rounded-lg text-[var(--dashboard-muted)] hover:bg-[#f1f3ee]" />
      <Separator orientation="vertical" className="h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden sm:block">
            <BreadcrumbLink href="/dashboard">Workspace</BreadcrumbLink>
          </BreadcrumbItem>
          {pageTitle !== "Overview" && (
            <>
              <BreadcrumbSeparator className="hidden sm:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
          {pageTitle === "Overview" && (
            <BreadcrumbItem>
              <BreadcrumbPage>Overview</BreadcrumbPage>
            </BreadcrumbItem>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [dashboardPrimaryColor, setDashboardPrimaryColor] = useState(
    DEFAULT_DASHBOARD_PRIMARY_COLOR,
  )
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const userData = getStoredUser()
    if (userData) {
      setUser(userData)
    } else {
      router.push("/login")
    }
    setIsLoading(false)
  }, [router])

  useEffect(() => {
    if (!user || user.role === "super_admin") return

    let isCurrent = true
    const loadBranding = async () => {
      try {
        const response = await authFetch("/api/company/branding")
        const data = await response.json()
        if (
          isCurrent &&
          response.ok &&
          /^#[0-9a-fA-F]{6}$/.test(data.dashboardPrimaryColor || "")
        ) {
          setDashboardPrimaryColor(data.dashboardPrimaryColor.toLowerCase())
        }
      } catch {
        // Keep the default brand color if the setting cannot be loaded.
      }
    }
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "dashboard-brand-updated") void loadBranding()
    }

    void loadBranding()
    const refreshTimer = window.setInterval(() => void loadBranding(), 30000)
    window.addEventListener("dashboard-brand-updated", loadBranding)
    window.addEventListener("storage", handleStorage)
    return () => {
      isCurrent = false
      window.clearInterval(refreshTimer)
      window.removeEventListener("dashboard-brand-updated", loadBranding)
      window.removeEventListener("storage", handleStorage)
    }
  }, [user?.companyId, user?.role])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--dashboard-canvas)]">
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--dashboard-border)] bg-white px-5 py-4 shadow-sm">
          <Loader2 className="size-5 animate-spin text-[#55774e]" />
          <p className="text-sm font-medium text-[#59655d]">Loading your workspace</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <SidebarProvider
      className="bg-[var(--dashboard-canvas)]"
      style={getDashboardThemeVariables(dashboardPrimaryColor) as React.CSSProperties}
    >
      <AppSidebar user={user} />
      <SidebarInset className="dashboard-layout-content min-w-0 flex-1 bg-[var(--dashboard-canvas)]">
        <DashboardTopbar pathname={pathname || "/dashboard"} />
        <div className="dashboard-route-outlet">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
