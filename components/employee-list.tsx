"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Pencil, Search, ToggleLeft, Trash2, UsersRound } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { authFetch } from "@/lib/client-session"

interface Employee {
  id: string
  name: string
  email: string
  department: string
  position: string
  shift: string
  joinDate: string
  status: "active" | "inactive"
}

export default function EmployeeList() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const fetchEmployees = async (withLoader = false) => {
    if (withLoader) {
      setIsLoading(true)
    }

    try {
      const response = await authFetch("/api/employees")
      const data = await response.json()

      if (!response.ok) {
        toast.error("Unable to load employees", { description: data.error || "Please try again." })
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
    const interval = setInterval(() => fetchEmployees(false), 20000)
    return () => clearInterval(interval)
  }, [])

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) =>
      [employee.name, employee.email, employee.department, employee.position]
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
    )
  }, [employees, searchTerm])

  const handleToggleStatus = async (employee: Employee) => {
    setBusyId(employee.id)
    try {
      const nextStatus = employee.status === "active" ? "inactive" : "active"
      const response = await authFetch(`/api/employees/${employee.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error("Unable to update employee", { description: data.error || "Please try again." })
        return
      }

      toast.success(`Employee ${nextStatus === "active" ? "activated" : "deactivated"}`)
      await fetchEmployees(false)
    } catch {
      toast.error("Unable to update employee")
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (employee: Employee) => {
    setBusyId(employee.id)
    try {
      const response = await authFetch(`/api/employees/${employee.id}`, { method: "DELETE" })
      const data = await response.json()

      if (!response.ok) {
        toast.error("Unable to delete employee", { description: data.error || "Please try again." })
        return
      }

      toast.success("Employee deleted")
      await fetchEmployees(false)
    } catch {
      toast.error("Unable to delete employee")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <UsersRound className="h-10 w-10 rounded-2xl bg-sky-100 p-2 text-sky-700" />
            <div>
              <p className="text-sm text-slate-500">Total Employees</p>
              <p className="text-2xl font-bold">{employees.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Active</p>
            <p className="text-2xl font-bold">{employees.filter((employee) => employee.status === "active").length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Inactive</p>
            <p className="text-2xl font-bold">{employees.filter((employee) => employee.status === "inactive").length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Departments</p>
            <p className="text-2xl font-bold">{new Set(employees.map((employee) => employee.department)).size}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-2xl">Employees Directory</CardTitle>
              <CardDescription>Search, review, and manage employees from one place.</CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search employees..."
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              No employees found.
            </div>
          ) : (
            filteredEmployees.map((employee) => (
              <div key={employee.id} className="rounded-3xl border border-slate-200 p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-950">{employee.name}</h3>
                      <Badge className={employee.status === "active" ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-700"}>
                        {employee.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">{employee.email}</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
                      <span>Department: {employee.department}</span>
                      <span>Position: {employee.position}</span>
                      <span>Shift: {employee.shift || "Unassigned"}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => router.push(`/dashboard/employees/${employee.id}?mode=edit`)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="outline" className="rounded-2xl" disabled={busyId === employee.id} onClick={() => handleToggleStatus(employee)}>
                      <ToggleLeft className="mr-2 h-4 w-4" />
                      {employee.status === "active" ? "Deactivate" : "Activate"}
                    </Button>
                    <Button variant="outline" className="rounded-2xl text-rose-700" disabled={busyId === employee.id} onClick={() => handleDelete(employee)}>
                      {busyId === employee.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
