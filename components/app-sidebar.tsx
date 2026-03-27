"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BarChart3, Building2, CalendarClock, ClipboardList, Home, LogOut, Settings2, ShieldCheck, UserPlus2, UsersRound } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
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
} from "@/components/ui/sidebar"
import type { SessionUser } from "@/lib/session"
import { clearStoredUser } from "@/lib/client-session"

interface AppSidebarProps {
  user: SessionUser
}

export function AppSidebar({ user }: AppSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = () => {
    clearStoredUser()
    toast.success("Signed out", {
      description: "Your workspace session has been cleared.",
    })
    router.push("/")
  }

  const menuItems =
    user.role === "super_admin"
      ? [
          { title: "Approval Requests", url: "/dashboard/platform/requests", icon: ShieldCheck },
          { title: "Companies", url: "/dashboard/platform/companies", icon: Building2 },
          { title: "Employees", url: "/dashboard/platform/employees", icon: UsersRound },
        ]
      : user.role === "admin"
      ? [
          { title: "Add Employee", url: "/dashboard/employees", icon: UserPlus2 },
          { title: "Manage Shifts", url: "/dashboard/shifts", icon: CalendarClock },
          { title: "Attendance Monitor", url: "/dashboard/attendance-monitor", icon: Home },
          { title: "All Employees", url: "/dashboard/employee-list", icon: UsersRound },
          { title: "Leave Queue", url: "/dashboard/leaves", icon: ClipboardList },
          { title: "Reports", url: "/dashboard/reports", icon: BarChart3 },
          { title: "Settings", url: "/dashboard/settings", icon: Settings2 },
        ]
      : [
          { title: "Attendance", url: "/dashboard/attendance", icon: Home },
          { title: "Leave Requests", url: "/dashboard/leaves", icon: ClipboardList },
          { title: "My History", url: "/dashboard/history", icon: BarChart3 },
        ]

  return (
    <Sidebar className="border-r border-slate-200 bg-white">
      <SidebarHeader className="border-b border-slate-200 px-4 py-5">
        <div className="rounded-3xl bg-slate-950 p-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">
                {user.role === "super_admin" ? "Platform" : "Workspace"}
              </p>
              <h1 className="mt-1 text-lg font-bold">{user.companyName}</h1>
              <p className="mt-1 text-sm text-slate-300">{user.name}</p>
            </div>
            <Badge
              className={
                user.role === "super_admin"
                  ? "bg-amber-300 text-slate-950"
                  : user.role === "admin"
                    ? "bg-emerald-400 text-slate-950"
                    : "bg-sky-400 text-slate-950"
              }
            >
              {user.role === "super_admin" ? "Super Admin" : user.role === "admin" ? "Admin" : "Employee"}
            </Badge>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} className="h-11 rounded-2xl px-3">
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-200 p-4">
        <Button variant="outline" className="w-full rounded-2xl border-slate-300" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
