"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import AdminAttendanceMonitor from "@/components/admin-attendance-monitor"
import { getStoredUser } from "@/lib/client-session"
import type { SessionUser } from "@/lib/session"

export default function AttendanceMonitorPage() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const router = useRouter()

  useEffect(() => {
    const userData = getStoredUser()
    if (userData) {
      setUser(userData)
      if (userData.role !== "admin") {
        router.push("/dashboard/attendance")
      }
    } else {
      router.push("/login")
    }
  }, [router])

  if (!user) {
    return <div>Loading...</div>
  }

  if (user.role !== "admin") {
    return <div>Access denied. Admin only.</div>
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Attendance Monitor</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance Monitor</h1>
          <p className="text-muted-foreground">Review detailed attendance for the entire team on the selected date.</p>
        </div>
        <AdminAttendanceMonitor />
      </div>
    </>
  )
}
