"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { ArrowRight, CalendarDays, Clock3, Loader2, UserRoundPlus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import MonthlyScheduleEditor from "@/components/monthly-schedule-editor"
import { authFetch, getStoredUser } from "@/lib/client-session"
import { buildPreviewEmail } from "@/lib/company-utils"
import { formatTimeString12Hour } from "@/lib/time"

interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
}

export default function EmployeeManagement() {
  const companyDomain = getStoredUser()?.companyDomain || ""
  const [shifts, setShifts] = useState<Shift[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [isLoadingShifts, setIsLoadingShifts] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: "",
    password: "",
    shift: "",
    department: "",
    position: "",
    checkInBeforeMinutes: "5",
    lateGraceMinutes: "5",
    checkOutGraceMinutes: "0",
    scheduleMode: "company_default",
    customScheduleMonth: new Date().toISOString().slice(0, 7),
    customSchedule: [] as Array<{ date: string; shiftId: string }>,
  })

  const fetchShifts = async () => {
    try {
      const [shiftsResponse, settingsResponse] = await Promise.all([
        authFetch("/api/shifts"),
        authFetch("/api/company/settings"),
      ])
      const [shiftsData, settingsData] = await Promise.all([
        shiftsResponse.json(),
        settingsResponse.json(),
      ])

      if (!shiftsResponse.ok) {
        toast.error("Unable to load shifts", {
          description: shiftsData.error || "Please create a shift first.",
        })
        return
      }

      setShifts(shiftsData)
      if (settingsResponse.ok) {
        setDepartments(settingsData.settings.departments)
        setWorkingDays(settingsData.settings.workingDays || [1, 2, 3, 4, 5])
      }
    } catch {
      toast.error("Unable to load employee setup data")
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
        lateGraceMinutes: "5",
        checkOutGraceMinutes: "0",
        scheduleMode: "company_default",
        customScheduleMonth: new Date().toISOString().slice(0, 7),
        customSchedule: [],
      })
    } catch {
      toast.error("Unable to add employee")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingShifts) {
    return (
      <div className="rounded-3xl border border-[var(--dashboard-border)] bg-white p-8 shadow-[0_10px_40px_-28px_rgba(30,45,32,.28)]">
        <div
          className="flex items-center gap-3 text-sm font-medium text-[var(--dashboard-muted)]"
          role="status"
        >
          <Loader2 className="size-5 animate-spin text-[var(--dashboard-green-text)]" />
          Loading employee setup...
        </div>
      </div>
    )
  }

  return (
    <Card className="overflow-hidden rounded-[28px] border-[var(--dashboard-border)] bg-white py-0 shadow-[0_18px_55px_-38px_rgba(30,45,32,.35)]">
      <CardHeader className="border-b border-[var(--dashboard-border-soft)] px-6 py-6 sm:px-8 sm:py-7">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--dashboard-green-soft)] text-[var(--dashboard-green-text)]">
            <UserRoundPlus className="size-5" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-xl font-semibold tracking-tight text-[var(--dashboard-ink)] sm:text-2xl">
              Add new employee
            </CardTitle>
            <CardDescription className="mt-1.5 max-w-2xl text-sm leading-6 text-[var(--dashboard-muted)]">
              Create a profile, choose a schedule, and set the attendance rules for this employee.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-6 py-6 sm:px-8 sm:py-8">
        <form onSubmit={handleSubmit} className="space-y-9">
          <section aria-labelledby="employee-details-heading" className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-xl bg-[#f2f4ef] text-xs font-semibold text-[var(--dashboard-green-text)]">
                01
              </div>
              <div>
                <h3
                  id="employee-details-heading"
                  className="text-sm font-semibold text-[var(--dashboard-ink)]"
                >
                  Employee details
                </h3>
                <p className="mt-0.5 text-xs text-[var(--dashboard-muted)]">
                  Basic information and account access
                </p>
              </div>
            </div>
            <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="employee-name">Full name</Label>
                <Input
                  id="employee-name"
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee-email">Generated email</Label>
                <Input
                  id="employee-email"
                  value={
                    buildPreviewEmail(form.name, companyDomain) ||
                    `name@${companyDomain || "company.com"}`
                  }
                  readOnly
                  className="bg-[#f8f9f6] text-[var(--dashboard-muted)]"
                />
                <p className="text-xs leading-5 text-[var(--dashboard-muted)]">
                  Created automatically from your company domain.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee-password">Temporary password</Label>
                <Input
                  id="employee-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  value={form.password}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                  required
                />
                <p className="text-xs leading-5 text-[var(--dashboard-muted)]">
                  At least 6 characters. The employee can change it later if enabled in settings.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee-position">Position</Label>
                <Input
                  id="employee-position"
                  value={form.position}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, position: event.target.value }))
                  }
                  required
                />
              </div>
            </div>
          </section>

          <section
            aria-labelledby="employee-schedule-heading"
            className="space-y-5 border-t border-[var(--dashboard-border-soft)] pt-7"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-xl bg-[#f2f4ef] text-xs font-semibold text-[var(--dashboard-green-text)]">
                02
              </div>
              <div>
                <h3
                  id="employee-schedule-heading"
                  className="text-sm font-semibold text-[var(--dashboard-ink)]"
                >
                  Work schedule
                </h3>
                <p className="mt-0.5 text-xs text-[var(--dashboard-muted)]">
                  Set the employee's working pattern and assigned shift
                </p>
              </div>
            </div>
            <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="employee-department">Department</Label>
                <Select
                  value={form.department}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, department: value }))}
                >
                  <SelectTrigger id="employee-department" className="w-full">
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
                <Label htmlFor="employee-schedule-mode">Schedule type</Label>
                <Select
                  value={form.scheduleMode}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      scheduleMode: value,
                      customSchedule: value === "company_default" ? [] : prev.customSchedule,
                    }))
                  }
                >
                  <SelectTrigger id="employee-schedule-mode" className="w-full">
                    <SelectValue placeholder="Choose schedule type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company_default">Use company working days</SelectItem>
                    <SelectItem value="custom_monthly">Use custom monthly schedule</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs leading-5 text-[var(--dashboard-muted)]">
                  Use company working days or assign a different shift for each date in a month.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee-default-shift">Default shift</Label>
                <Select
                  value={form.shift}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, shift: value }))}
                  disabled={form.scheduleMode !== "company_default"}
                >
                  <SelectTrigger id="employee-default-shift" className="w-full">
                    <SelectValue
                      placeholder={shifts.length ? "Choose shift" : "No shifts available"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {shifts.map((shift) => (
                      <SelectItem key={shift.id} value={shift.id}>
                        {shift.name} ({formatTimeString12Hour(shift.startTime)} to{" "}
                        {formatTimeString12Hour(shift.endTime)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs leading-5 text-[var(--dashboard-muted)]">
                  Applies on company workdays when the default schedule is selected.
                </p>
              </div>
            </div>
          </section>

          <section
            aria-labelledby="employee-attendance-heading"
            className="space-y-5 border-t border-[var(--dashboard-border-soft)] pt-7"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-xl bg-[#f2f4ef] text-xs font-semibold text-[var(--dashboard-green-text)]">
                03
              </div>
              <div>
                <h3
                  id="employee-attendance-heading"
                  className="flex items-center gap-2 text-sm font-semibold text-[var(--dashboard-ink)]"
                >
                  <Clock3 className="size-4 text-[var(--dashboard-green-text)]" />
                  Attendance rules
                </h3>
                <p className="mt-0.5 text-xs text-[var(--dashboard-muted)]">
                  Set this employee’s check-in and check-out times
                </p>
              </div>
            </div>
            <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="employee-checkin-before">
                  Early check-in window{" "}
                  <span className="font-normal text-[var(--dashboard-muted)]">(minutes)</span>
                </Label>
                <Input
                  id="employee-checkin-before"
                  type="number"
                  min={0}
                  step={1}
                  value={form.checkInBeforeMinutes}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, checkInBeforeMinutes: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee-late-grace">
                  Late arrival grace{" "}
                  <span className="font-normal text-[var(--dashboard-muted)]">(minutes)</span>
                </Label>
                <Input
                  id="employee-late-grace"
                  type="number"
                  min={0}
                  step={1}
                  value={form.lateGraceMinutes}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, lateGraceMinutes: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee-checkout-grace">
                  Check-out deadline after shift{" "}
                  <span className="font-normal text-[var(--dashboard-muted)]">(minutes)</span>
                </Label>
                <Input
                  id="employee-checkout-grace"
                  type="number"
                  min={0}
                  step={1}
                  value={form.checkOutGraceMinutes}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, checkOutGraceMinutes: event.target.value }))
                  }
                  required
                />
                <p className="text-xs leading-5 text-[var(--dashboard-muted)]">
                  If the employee has not checked out by this deadline after the shift ends, their
                  status changes to absent and check-out is closed.
                </p>
              </div>
            </div>
          </section>
          <div className="md:col-span-2">
            {form.scheduleMode === "custom_monthly" && (
              <div className="rounded-2xl border border-[var(--dashboard-border-soft)] bg-[#fbfcfa] p-4 sm:p-5">
                <MonthlyScheduleEditor
                  month={form.customScheduleMonth}
                  onMonthChange={(value) =>
                    setForm((prev) => ({ ...prev, customScheduleMonth: value, customSchedule: [] }))
                  }
                  schedule={form.customSchedule}
                  onScheduleChange={(value) =>
                    setForm((prev) => ({ ...prev, customSchedule: value }))
                  }
                  shifts={shifts}
                  workingDays={workingDays}
                />
              </div>
            )}
            <div className="flex flex-col gap-4 border-t border-[var(--dashboard-border-soft)] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-xs leading-5 text-[var(--dashboard-muted)]">
                <CalendarDays className="size-4 shrink-0" />
                Employee access starts as soon as the profile is created.
              </p>
              <Button
                type="submit"
                disabled={isSubmitting || shifts.length === 0}
                className="h-11 rounded-xl bg-[var(--dashboard-green)] px-5 text-white shadow-sm hover:bg-[var(--dashboard-green-hover)] focus-visible:ring-[var(--dashboard-green-text)]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating employee...
                  </>
                ) : (
                  <>
                    Create employee <ArrowRight className="ml-2 size-4" />
                  </>
                )}
              </Button>
            </div>
            {shifts.length === 0 && (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Create at least one shift before adding employees.
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
