"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import AdminSettings from "@/components/admin-settings"
import EmployeeSettings from "@/components/employee-settings"
import { getStoredUser } from "@/lib/client-session"
import type { SessionUser } from "@/lib/session"

export default function SettingsPage() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const router = useRouter()

  useEffect(() => {
    const storedUser = getStoredUser()
    if (!storedUser) {
      router.push("/login")
      return
    }

    if (storedUser.role !== "admin" && storedUser.role !== "employee") {
      router.push("/dashboard")
      return
    }

    setUser(storedUser)
  }, [router])

  if (!user) {
    return <div>Loading...</div>
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
              <BreadcrumbPage>Settings</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            {user.role === "admin"
              ? "Update your admin account. Your company domain remains locked."
              : "Update only your own password if your admin has allowed it."}
          </p>
        </div>
        {user.role === "admin" ? (
          <AdminSettings user={user} onUserUpdate={setUser} />
        ) : (
          <EmployeeSettings user={user} onUserUpdate={setUser} onAccessDenied={() => router.replace("/dashboard/attendance")} />
        )}
      </div>
    </>
  )
}
