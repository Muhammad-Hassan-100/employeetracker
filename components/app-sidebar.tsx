"use client"

import { useRouter, usePathname } from "next/navigation"
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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, Calendar, UserPlus, History, LogOut, Home, BarChart3, FileText } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface AppSidebarProps {
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

export function AppSidebar({ user }: AppSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = () => {
    localStorage.removeItem("user")
    toast.success("Logged out successfully!")
    router.push("/")
  }

  const employeeMenuItems = [
    {
      title: "Attendance",
      url: "/dashboard/attendance",
      icon: Clock,
    },
    {
      title: "Leave Management",
      url: "/dashboard/leaves",
      icon: FileText,
    },
    {
      title: "My History",
      url: "/dashboard/history",
      icon: History,
    },
  ]

  const adminMenuItems = [
    {
      title: "Add Employee",
      url: "/dashboard/employees",
      icon: UserPlus,
    },
    {
      title: "Manage Shifts",
      url: "/dashboard/shifts",
      icon: Calendar,
    },
    {
      title: "All Employees",
      url: "/dashboard/employee-list",
      icon: Users,
    },
    {
      title: "Leave Management",
      url: "/dashboard/leaves",
      icon: FileText,
    },
    {
      title: "Attendance Reports",
      url: "/dashboard/reports",
      icon: BarChart3,
    },
  ]

  const menuItems = user.role === "admin" ? adminMenuItems : employeeMenuItems

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-gray-900 truncate">EmployeeTracker</h1>
            <p className="text-sm text-gray-600 truncate">Welcome, {user.name}</p>
          </div>
        </div>
        <div className="mt-3">
          <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-xs">
            {user.role === "admin" ? "Administrator" : "Employee"}
          </Badge>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/"}>
                  <Link href="/">
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem> */}

              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
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

      <SidebarFooter className="border-t p-4">
        <div className="space-y-3">
          <div className="text-xs text-gray-600 space-y-1">
            <p className="truncate">
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Role:</strong> {user.role}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full justify-start text-sm bg-transparent"
            size="sm"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
