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
import SuperAdminEmployees from "@/components/super-admin-employees"
import { getStoredUser } from "@/lib/client-session"
import type { SessionUser } from "@/lib/session"

export default function PlatformEmployeesPage() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const router = useRouter()

  useEffect(() => {
    const storedUser = getStoredUser()
    if (!storedUser) {
      router.push("/login")
      return
    }

    if (storedUser.role !== "super_admin") {
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
      <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-white px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Employees</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <main className="flex-1 bg-gray-50 p-4 md:p-6">
        <div className="mx-auto max-w-7xl">
          <SuperAdminEmployees />
        </div>
      </main>
    </>
  )
}
