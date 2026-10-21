"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Trash2, UsersRound } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { authFetch } from "@/lib/client-session"

interface EmployeeRecord {
  id: string
  name: string
  email: string
  department?: string
  position?: string
  status: "active" | "inactive"
  joinDate: string
  companyId: string
  companyName: string
  companyDomain: string
}

export default function SuperAdminEmployees() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const fetchEmployees = async (withLoader = false) => {
    if (withLoader) {
      setIsLoading(true)
    }

    try {
      const response = await authFetch("/api/super-admin/employees")
      const data = await response.json()

      if (!response.ok) {
        toast.error("Unable to load employees", {
          description: data.error || "Please try again.",
        })
        return
      }

      setEmployees(data)
    } catch {
      toast.error("Unable to load employees")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees(true)
  }, [])

  const filteredEmployees = useMemo(() => {
    const term = search.toLowerCase().trim()
    if (!term) {
      return employees
    }

    return employees.filter((employee) =>
      [employee.name, employee.email, employee.companyName, employee.department, employee.position]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    )
  }, [employees, search])

  const toggleEmployeeStatus = async (employee: EmployeeRecord) => {
    const nextStatus = employee.status === "active" ? "inactive" : "active"
    setBusyKey(`status-${employee.id}`)
    try {
      const response = await authFetch(`/api/super-admin/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error("Unable to update employee", {
          description: data.error || "Please try again.",
        })
        return
      }

      toast.success(`Employee ${nextStatus === "active" ? "activated" : "deactivated"}`)
      await fetchEmployees(false)
    } catch {
      toast.error("Unable to update employee")
    } finally {
      setBusyKey(null)
    }
  }

  const deleteEmployee = async (employee: EmployeeRecord) => {
    if (!window.confirm(`Delete ${employee.name} from ${employee.companyName}?`)) {
      return
    }

    setBusyKey(`delete-${employee.id}`)
    try {
      const response = await authFetch(`/api/super-admin/employees/${employee.id}`, {
        method: "DELETE",
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error("Unable to delete employee", {
          description: data.error || "Please try again.",
        })
        return
      }

      toast.success("Employee deleted")
      await fetchEmployees(false)
    } catch {
      toast.error("Unable to delete employee")
    } finally {
      setBusyKey(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    )
  }

  return (
    <Card className="rounded-3xl shadow-sm" data-dashboard-view="platform-employees">
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-violet-600" />
              All employees
            </CardTitle>
            <CardDescription>
              Review employee data across all companies without opening attendance tools.
            </CardDescription>
          </div>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by employee or company name..."
            className="w-full md:w-80"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {filteredEmployees.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            No employees match the current search.
          </div>
        ) : (
          filteredEmployees.map((employee) => (
            <div key={employee.id} className="rounded-3xl border border-slate-200 p-5">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                <div className="flex items-start gap-4">
                  <div
                    aria-hidden="true"
                    className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--dashboard-green-soft)] text-sm font-semibold text-[var(--dashboard-green-text)]"
                  >
                    {employee.name
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold tracking-tight text-[var(--dashboard-ink)]">
                        {employee.name}
                      </h3>
                      <Badge
                        className={
                          employee.status === "active"
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-slate-200 text-slate-700"
                        }
                      >
                        {employee.status}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-[var(--dashboard-muted)]">
                      {employee.email}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1 text-xs">
                      <span className="rounded-lg bg-[#f5f6f3] px-2.5 py-1 font-medium text-[var(--dashboard-ink-soft)]">
                        {employee.companyName}
                      </span>
                      <span className="rounded-lg bg-[#f5f6f3] px-2.5 py-1 text-[var(--dashboard-muted)]">
                        {employee.department || "No department"}
                      </span>
                      <span className="rounded-lg bg-[#f5f6f3] px-2.5 py-1 text-[var(--dashboard-muted)]">
                        {employee.position || "No position"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 xl:justify-end">
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    disabled={busyKey === `status-${employee.id}`}
                    onClick={() => toggleEmployeeStatus(employee)}
                  >
                    {busyKey === `status-${employee.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : employee.status === "active" ? (
                      "Deactivate"
                    ) : (
                      "Activate"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl text-rose-700"
                    disabled={busyKey === `delete-${employee.id}`}
                    onClick={() => deleteEmployee(employee)}
                  >
                    {busyKey === `delete-${employee.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
