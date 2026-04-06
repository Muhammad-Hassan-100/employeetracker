"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { CalendarClock, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { authFetch } from "@/lib/client-session"
import { ATTENDANCE_POLICY_OPTIONS, type AttendancePolicyMode } from "@/lib/attendance-policy"
import { WEEKDAY_OPTIONS } from "@/lib/company-settings"
import { formatTimeString12Hour } from "@/lib/time"

interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
  description?: string
}

const DEFAULT_START_TIME = "09:00"
const DEFAULT_END_TIME = "17:00"
const hourOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"))
const minuteOptions = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"))

type TimePart = "hour" | "minute" | "period"

function getTimeParts(value: string) {
  const [rawHours = "9", rawMinutes = "00"] = value.split(":")
  const hours = Number(rawHours)
  const isPm = hours >= 12
  const normalizedHours = hours % 12 || 12

  return {
    hour: String(normalizedHours).padStart(2, "0"),
    minute: rawMinutes.padStart(2, "0"),
    period: isPm ? "PM" : "AM",
  }
}

function buildTimeValue(parts: ReturnType<typeof getTimeParts>) {
  let hours = Number(parts.hour) % 12
  if (parts.period === "PM") {
    hours += 12
  }

  return `${String(hours).padStart(2, "0")}:${parts.minute}`
}

export default function ShiftManagement() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [companyRules, setCompanyRules] = useState({
    workingDays: [1, 2, 3, 4, 5],
    departmentsInput: "",
    attendancePolicyMode: "open" as AttendancePolicyMode,
    allowedIPsInput: "",
    allowEmployeePasswordChange: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingRules, setIsSavingRules] = useState(false)
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "",
    startTime: DEFAULT_START_TIME,
    endTime: DEFAULT_END_TIME,
    description: "",
  })

  const fetchShifts = async (withLoader = false) => {
    if (withLoader) {
      setIsLoading(true)
    }

    try {
      const [shiftsResponse, settingsResponse] = await Promise.all([
        authFetch("/api/shifts"),
        authFetch("/api/company/settings"),
      ])
      const [shiftsData, settingsData] = await Promise.all([shiftsResponse.json(), settingsResponse.json()])

      if (!shiftsResponse.ok) {
        toast.error("Unable to load shifts", {
          description: shiftsData.error || "Please try again.",
        })
        return
      }

      setShifts(shiftsData)
      if (settingsResponse.ok) {
        const attendancePolicy = settingsData.settings.attendancePolicy
        setCompanyRules({
          workingDays: settingsData.settings.workingDays,
          departmentsInput: settingsData.settings.departments.join(", "),
          attendancePolicyMode: attendancePolicy?.mode ?? "open",
          allowedIPsInput: attendancePolicy?.allowedIPs?.join(", ") ?? "",
          allowEmployeePasswordChange: Boolean(settingsData.settings.allowEmployeePasswordChange),
        })
      }
    } catch {
      toast.error("Unable to load shifts and company rules")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchShifts(true)
    const interval = setInterval(() => fetchShifts(false), 20000)
    return () => clearInterval(interval)
  }, [])

  const resetForm = () => {
    setEditingShiftId(null)
    setForm({ name: "", startTime: DEFAULT_START_TIME, endTime: DEFAULT_END_TIME, description: "" })
  }

  const handleTimePartChange = (field: "startTime" | "endTime", part: TimePart, value: string) => {
    setForm((prev) => {
      const current = getTimeParts(prev[field])
      const next = {
        ...current,
        [part]: value,
      }

      return {
        ...prev,
        [field]: buildTimeValue(next),
      }
    })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const endpoint = editingShiftId ? `/api/shifts/${editingShiftId}` : "/api/shifts/create"
      const method = editingShiftId ? "PUT" : "POST"

      const response = await authFetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error("Unable to save shift", { description: data.error || "Please try again." })
        return
      }

      toast.success(editingShiftId ? "Shift updated" : "Shift created")
      resetForm()
      await fetchShifts(false)
    } catch {
      toast.error("Unable to save shift")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (shift: Shift) => {
    setEditingShiftId(shift.id)
    setForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      description: shift.description || "",
    })
  }

  const handleDelete = async (shiftId: string) => {
    try {
      const response = await authFetch(`/api/shifts/${shiftId}`, { method: "DELETE" })
      const data = await response.json()

      if (!response.ok) {
        toast.error("Unable to delete shift", { description: data.error || "Please try again." })
        return
      }

      toast.success("Shift deleted")
      if (editingShiftId === shiftId) {
        resetForm()
      }
      await fetchShifts(false)
    } catch {
      toast.error("Unable to delete shift")
    }
  }

  const toggleWorkingDay = (day: number) => {
    setCompanyRules((prev) => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter((entry) => entry !== day)
        : [...prev.workingDays, day].sort((left, right) => left - right),
    }))
  }

  const handleRulesSave = async () => {
    setIsSavingRules(true)

    try {
      const departments = companyRules.departmentsInput
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
      const allowedIPs = companyRules.allowedIPsInput
        .split(/[\n,]+/)
        .map((entry) => entry.trim())
        .filter(Boolean)

      const response = await authFetch("/api/company/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workingDays: companyRules.workingDays,
          departments,
          allowEmployeePasswordChange: companyRules.allowEmployeePasswordChange,
          attendancePolicy: {
            mode: companyRules.attendancePolicyMode,
            allowedIPs,
          },
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error("Unable to save company rules", {
          description: data.error || "Please review the rules and try again.",
        })
        return
      }

      setCompanyRules({
        workingDays: data.settings.workingDays,
        departmentsInput: data.settings.departments.join(", "),
        attendancePolicyMode: data.settings.attendancePolicy.mode,
        allowedIPsInput: data.settings.attendancePolicy.allowedIPs.join(", "),
        allowEmployeePasswordChange: Boolean(data.settings.allowEmployeePasswordChange),
      })
      toast.success("Company rules updated")
    } catch {
      toast.error("Unable to save company rules")
    } finally {
      setIsSavingRules(false)
    }
  }

  const requiresOfficeIp = companyRules.attendancePolicyMode === "office_ip"

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Plus className="h-5 w-5 text-emerald-600" />
              {editingShiftId ? "Edit Shift" : "Create Shift"}
            </CardTitle>
            <CardDescription>Keep shift timing accurate so attendance rules work correctly.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Shift Name</Label>
                <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Select value={getTimeParts(form.startTime).hour} onValueChange={(value) => handleTimePartChange("startTime", "hour", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Hour" />
                      </SelectTrigger>
                      <SelectContent>
                        {hourOptions.map((hour) => (
                          <SelectItem key={hour} value={hour}>
                            {hour}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={getTimeParts(form.startTime).minute}
                      onValueChange={(value) => handleTimePartChange("startTime", "minute", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Minute" />
                      </SelectTrigger>
                      <SelectContent>
                        {minuteOptions.map((minute) => (
                          <SelectItem key={minute} value={minute}>
                            {minute}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={getTimeParts(form.startTime).period}
                      onValueChange={(value) => handleTimePartChange("startTime", "period", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="AM/PM" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-slate-500">Selected time: {formatTimeString12Hour(form.startTime)}</p>
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Select value={getTimeParts(form.endTime).hour} onValueChange={(value) => handleTimePartChange("endTime", "hour", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Hour" />
                      </SelectTrigger>
                      <SelectContent>
                        {hourOptions.map((hour) => (
                          <SelectItem key={hour} value={hour}>
                            {hour}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={getTimeParts(form.endTime).minute}
                      onValueChange={(value) => handleTimePartChange("endTime", "minute", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Minute" />
                      </SelectTrigger>
                      <SelectContent>
                        {minuteOptions.map((minute) => (
                          <SelectItem key={minute} value={minute}>
                            {minute}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={getTimeParts(form.endTime).period}
                      onValueChange={(value) => handleTimePartChange("endTime", "period", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="AM/PM" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-slate-500">Selected time: {formatTimeString12Hour(form.endTime)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  rows={4}
                  placeholder="Optional notes about this shift..."
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting} className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingShiftId ? (
                    "Update Shift"
                  ) : (
                    "Create Shift"
                  )}
                </Button>
                {editingShiftId && (
                  <Button type="button" variant="outline" className="rounded-2xl" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CalendarClock className="h-5 w-5 text-sky-600" />
              Shift Library
            </CardTitle>
            <CardDescription>All saved shifts appear here for quick review and editing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            ) : shifts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                No shifts yet. Create your first shift to start assigning employees.
              </div>
            ) : (
              shifts.map((shift) => (
                <div key={shift.id} className="rounded-3xl border border-slate-200 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-950">{shift.name}</h3>
                        <Badge variant="outline">
                          {formatTimeString12Hour(shift.startTime)} to {formatTimeString12Hour(shift.endTime)}
                        </Badge>
                      </div>
                      {shift.description && <p className="mt-3 text-sm text-slate-600">{shift.description}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="rounded-2xl" onClick={() => handleEdit(shift)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button variant="outline" className="rounded-2xl text-rose-700" onClick={() => handleDelete(shift.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Work Rules and Attendance Access</CardTitle>
          <CardDescription>
            Choose weekly working days, define department options, and control where employees can check in and check out.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Working Days</Label>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {WEEKDAY_OPTIONS.map((day) => {
                const selected = companyRules.workingDays.includes(day.value)
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleWorkingDay(day.value)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      selected
                        ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <div className="font-medium">{day.label}</div>
                    <div className="text-xs">{selected ? "Working day" : "Off day"}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Departments</Label>
            <Input
              value={companyRules.departmentsInput}
              onChange={(event) => setCompanyRules((prev) => ({ ...prev, departmentsInput: event.target.value }))}
              placeholder="HR, Finance, Sales, Engineering"
            />
            <p className="text-xs text-slate-500">Enter department names separated by commas. These options will appear in employee forms.</p>
          </div>

          <div className="space-y-3">
            <Label>Attendance Access Policy</Label>
            <div className="grid gap-3 xl:grid-cols-2">
              {ATTENDANCE_POLICY_OPTIONS.map((option) => {
                const selected = companyRules.attendancePolicyMode === option.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCompanyRules((prev) => ({ ...prev, attendancePolicyMode: option.value }))}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      selected
                        ? "border-sky-300 bg-sky-50 text-sky-950"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="mt-1 text-sm">{option.description}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {requiresOfficeIp && (
            <div className="space-y-2">
              <Label>Approved Office Public IPs</Label>
              <Textarea
                rows={4}
                value={companyRules.allowedIPsInput}
                onChange={(event) => setCompanyRules((prev) => ({ ...prev, allowedIPsInput: event.target.value }))}
                placeholder="39.60.10.15, 39.60.10.16"
              />
              <p className="text-xs text-slate-500">
                Add one or more office public IP addresses. Separate them with commas or line breaks.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="employee-password-access">Employee password access</Label>
            <Select
              value={companyRules.allowEmployeePasswordChange ? "allowed" : "blocked"}
              onValueChange={(value) =>
                setCompanyRules((prev) => ({
                  ...prev,
                  allowEmployeePasswordChange: value === "allowed",
                }))
              }
            >
              <SelectTrigger id="employee-password-access" className="rounded-2xl">
                <SelectValue placeholder="Choose employee password access" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blocked">Blocked by admin</SelectItem>
                <SelectItem value="allowed">Employee can change password</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              Admin creates the initial employee password. Employees can only update it later if this permission is enabled.
            </p>
          </div>

          <Button
            onClick={handleRulesSave}
            disabled={isSavingRules}
            className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {isSavingRules ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving company rules...
              </>
            ) : (
              "Save Company Rules"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
