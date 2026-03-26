"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Loader2, UserPlus2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { authFetch, getStoredUser } from "@/lib/client-session"
import { buildPreviewEmail } from "@/lib/company-utils"
import { formatTimeString12Hour } from "@/lib/time"

interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
}

const departments = [
  "HR",
  "IT",
  "Finance",
  "Marketing",
  "Operations",
  "Admin",
  "Sales",
  "Support",
  "Engineering",
  "Design",
]

export default function EmployeeManagement() {
  const companyDomain = getStoredUser()?.companyDomain || ""
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoadingShifts, setIsLoadingShifts] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: "",
    password: "",
    shift: "",
    department: "",
    position: "",
    checkInBeforeMinutes: "5",
    lateGraceMinutes: "0",
  })

  const fetchShifts = async () => {
    try {
      const response = await authFetch("/api/shifts")
      const data = await response.json()

      if (!response.ok) {
        toast.error("Unable to load shifts", { description: data.error || "Please create a shift first." })
        return
      }

      setShifts(data)
    } catch {
      toast.error("Unable to load shifts")
    } finally {
      setIsLoadingShifts(false)
    }
  }

  useEffect(() => {
    fetchShifts()
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await authFetch("/api/employees/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error("Unable to add employee", {
          description: data.error || "Please review the form and try again.",
        })
        return
      }

      toast.success("Employee added", {
        description: `${data.employee.name} added as ${data.employee.email}.`,
      })
      setForm({
        name: "",
        password: "",
        shift: "",
        department: "",
        position: "",
        checkInBeforeMinutes: "5",
        lateGraceMinutes: "0",
      })
    } catch {
      toast.error("Unable to add employee")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingShifts) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <Card className="rounded-3xl shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <UserPlus2 className="h-6 w-6 text-emerald-600" />
          Add New Employee
        </CardTitle>
        <CardDescription>Create an employee profile and assign a shift immediately.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
          </div>
          <div className="space-y-2">
            <Label>Generated Email</Label>
            <Input value={buildPreviewEmail(form.name, companyDomain) || `name@${companyDomain || "company.com"}`} readOnly />
            <p className="text-xs text-slate-500">The employee email is generated automatically using your company domain.</p>
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input
              type="password"
              minLength={6}
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Position</Label>
            <Input value={form.position} onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value }))} required />
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={form.department} onValueChange={(value) => setForm((prev) => ({ ...prev, department: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Choose department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((department) => (
                  <SelectItem key={department} value={department}>
                    {department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Assigned Shift</Label>
            <Select value={form.shift} onValueChange={(value) => setForm((prev) => ({ ...prev, shift: value }))}>
              <SelectTrigger>
                <SelectValue placeholder={shifts.length ? "Choose shift" : "No shifts available"} />
              </SelectTrigger>
              <SelectContent>
                {shifts.map((shift) => (
                  <SelectItem key={shift.id} value={shift.id}>
                    {shift.name} ({formatTimeString12Hour(shift.startTime)} to {formatTimeString12Hour(shift.endTime)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Check-In Before (minutes)</Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={form.checkInBeforeMinutes}
              onChange={(event) => setForm((prev) => ({ ...prev, checkInBeforeMinutes: event.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Late Relaxation (minutes)</Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={form.lateGraceMinutes}
              onChange={(event) => setForm((prev) => ({ ...prev, lateGraceMinutes: event.target.value }))}
              required
            />
          </div>
          <div className="md:col-span-2">
            <Button
              type="submit"
              disabled={isSubmitting || shifts.length === 0}
              className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating employee...
                </>
              ) : (
                "Create Employee"
              )}
            </Button>
            {shifts.length === 0 && (
              <p className="mt-3 text-sm text-amber-700">Create at least one shift before adding employees.</p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
