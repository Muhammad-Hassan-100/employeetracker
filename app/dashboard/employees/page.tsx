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
import EmployeeManagement from "@/components/employee-management"

interface User {
  id: string
  name: string
  email: string
  role: string
}

export default function EmployeesPage() {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
      if (JSON.parse(userData).role !== "admin") {
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
    <div className="flex min-h-full flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-[var(--dashboard-border)] bg-white/90 px-4 backdrop-blur-xl sm:px-7">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Employee management</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <main className="flex-1 bg-[var(--dashboard-canvas)] px-4 py-7 sm:px-7 sm:py-9 xl:px-10">
        <div className="mx-auto max-w-[1440px] space-y-7">
          <div className="max-w-3xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--dashboard-green-text)]">Team setup</p>
            <h1 className="text-3xl font-semibold tracking-[-0.035em] text-[var(--dashboard-ink)] sm:text-[2.15rem]">Employee management</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--dashboard-muted)] sm:text-base">Create employee accounts and set their schedule and attendance rules.</p>
          </div>
          {/* Employee Management */}
          <EmployeeManagement />
        </div>
      </main>
    </div>
  )
}
