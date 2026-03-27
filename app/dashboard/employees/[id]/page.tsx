"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, Mail, Pencil, Save, UserRound, X } from "lucide-react"
import { toast } from "sonner"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { authFetch, getStoredUser } from "@/lib/client-session"
import type { SessionUser } from "@/lib/session"
import { formatTimeString12Hour } from "@/lib/time"

interface Employee {
  id: string
  name: string
  email: string
  department: string
  position: string
  shift: string
  checkInBeforeMinutes: number
  lateGraceMinutes: number
  joinDate: string
  status: "active" | "inactive"
  password?: string
}

interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
}

interface AttendanceRecord {
  id: string
  date: string
  checkInTime: string | null
  checkOutTime: string | null
  isLate: boolean
  isEarly: boolean
  lateReason?: string | null
  earlyReason?: string | null
  leaveReason?: string | null
  leaveType?: string | null
  hoursWorked?: number | null
  status: "present" | "absent" | "on_leave"
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function formatTime(value: string | null) {
  if (!value) return "Not recorded"
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function formatHoursWorked(value?: number | null) {
  return Number.isFinite(value) ? Number(value).toFixed(2) : "0.00"
}

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [pageMode, setPageMode] = useState<"view" | "edit">("view")
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [editForm, setEditForm] = useState<Partial<Employee>>({})
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [attendanceDateFilter, setAttendanceDateFilter] = useState("")

  const loadData = async () => {
    try {
      const [employeeRes, attendanceRes, shiftsRes, settingsRes] = await Promise.all([
        authFetch(`/api/employees/${params.id}`),
        authFetch(`/api/attendance/history?userId=${params.id}`),
        authFetch("/api/shifts"),
        authFetch("/api/company/settings"),
      ])

      const [employeeData, attendanceData, shiftsData, settingsData] = await Promise.all([
        employeeRes.json(),
        attendanceRes.json(),
        shiftsRes.json(),
        settingsRes.json(),
      ])

      if (!employeeRes.ok) {
        toast.error("Unable to load employee", { description: employeeData.error || "Please go back and try again." })
        router.push("/dashboard/employee-list")
        return
      }

      setEmployee(employeeData)
      setEditForm(employeeData)
      if (attendanceRes.ok) {
        setAttendance(Array.isArray(attendanceData) ? attendanceData : [])
      }
      if (shiftsRes.ok) {
        setShifts(shiftsData)
      }
      if (settingsRes.ok) {
        setDepartments(settingsData.settings.departments)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const filteredAttendance = attendanceDateFilter
    ? attendance.filter((record) => record.date === attendanceDateFilter)
    : attendance

  useEffect(() => {
    const queryMode = new URLSearchParams(window.location.search).get("mode")
    const resolvedMode = queryMode === "edit" ? "edit" : "view"
    setPageMode(resolvedMode)
    setIsEditing(resolvedMode === "edit")

    const storedUser = getStoredUser()
    if (!storedUser) {
      router.push("/login")
      return
    }

    if (storedUser.role !== "admin") {
      router.push("/dashboard/attendance")
      return
    }

    setUser(storedUser)
    loadData()
  }, [params.id, router])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const payload = { ...editForm, shiftId: editForm.shift }
      delete payload.shift

      const response = await authFetch(`/api/employees/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error("Unable to save employee", { description: data.error || "Please try again." })
        return
      }

      toast.success("Employee updated")
      setIsEditing(false)
      await loadData()
    } catch {
      toast.error("Unable to save employee")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !employee || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
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
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href={pageMode === "edit" ? "/dashboard/employee-list" : "/dashboard/attendance-monitor"}>
                {pageMode === "edit" ? "All Employees" : "Attendance Monitor"}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{employee.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <main className="flex-1 bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-950">
                {pageMode === "edit" ? "Employee Editor" : "Employee Detail"}
              </h1>
              <p className="text-slate-600">
                {pageMode === "edit"
                  ? "Update profile, shift assignment and attendance settings."
                  : "Review profile, shift assignment and attendance history."}
              </p>
            </div>
            <div className="flex gap-3">
              {pageMode === "edit" ? (
                <>
                  {!isEditing ? (
                    <Button className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800" onClick={() => setIsEditing(true)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Employee
                    </Button>
                  ) : (
                    <>
                      <Button className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save
                      </Button>
                      <Button variant="outline" className="rounded-2xl" onClick={() => setIsEditing(false)}>
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <Button variant="outline" className="rounded-2xl" onClick={() => router.push("/dashboard/attendance-monitor")}>
                  <X className="mr-2 h-4 w-4" />
                  Back to Monitor
                </Button>
              )}
            </div>
          </div>

          <div className={pageMode === "edit" ? "grid gap-6" : "grid gap-6"}>
            {pageMode === "edit" && (
              <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  {isEditing ? (
                    <Input value={editForm.name || ""} onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))} />
                  ) : (
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 font-medium">{employee.name}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  {isEditing ? (
                    <Input
                      type="email"
                      value={editForm.email || ""}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
                    />
                  ) : (
                    <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3">
                      <Mail className="h-4 w-4 text-slate-500" />
                      {employee.email}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={isEditing ? editForm.password || "" : employee.password || ""}
                      readOnly={!isEditing}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, password: event.target.value }))}
                    />
                    <Button type="button" variant="outline" className="rounded-2xl" onClick={() => setShowPassword((prev) => !prev)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  {isEditing ? (
                    <Select value={editForm.department || ""} onValueChange={(value) => setEditForm((prev) => ({ ...prev, department: value }))}>
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
                  ) : (
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">{employee.department}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Position</Label>
                  {isEditing ? (
                    <Input value={editForm.position || ""} onChange={(event) => setEditForm((prev) => ({ ...prev, position: event.target.value }))} />
                  ) : (
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">{employee.position}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Shift</Label>
                  {isEditing ? (
                    <Select value={editForm.shift || ""} onValueChange={(value) => setEditForm((prev) => ({ ...prev, shift: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose shift" />
                      </SelectTrigger>
                      <SelectContent>
                        {shifts.map((shift) => (
                          <SelectItem key={shift.id} value={shift.id}>
                            {shift.name} ({formatTimeString12Hour(shift.startTime)} to {formatTimeString12Hour(shift.endTime)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      {shifts.find((shift) => shift.id === employee.shift)?.name || employee.shift || "Unassigned"}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">{employee.status}</div>
                </div>
                <div className="space-y-2">
                  <Label>Check-In Before (minutes)</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={String(editForm.checkInBeforeMinutes ?? 0)}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, checkInBeforeMinutes: Number(event.target.value) }))
                      }
                    />
                  ) : (
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">{employee.checkInBeforeMinutes}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Late Relaxation (minutes)</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={String(editForm.lateGraceMinutes ?? 0)}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, lateGraceMinutes: Number(event.target.value) }))
                      }
                    />
                  ) : (
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">{employee.lateGraceMinutes}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Joined On</Label>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">{formatDate(employee.joinDate)}</div>
                </div>
              </CardContent>
              </Card>
            )}

            {pageMode === "view" && (
              <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserRound className="h-5 w-5 text-sky-600" />
                  Attendance Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-slate-500">Filter by an exact date to review today's, yesterday's, or any earlier attendance record.</p>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={attendanceDateFilter}
                      onChange={(event) => setAttendanceDateFilter(event.target.value)}
                      className="w-full md:w-auto"
                    />
                    <Button variant="outline" className="rounded-2xl" onClick={() => setAttendanceDateFilter("")}>
                      Clear
                    </Button>
                  </div>
                </div>
                {filteredAttendance.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                    No attendance found for the selected filter.
                  </div>
                ) : (
                  filteredAttendance.map((record) => (
                    <div key={record.id} className="rounded-3xl border border-slate-200 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-semibold text-slate-950">{formatDate(record.date)}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            In: {formatTime(record.checkInTime)} | Out: {formatTime(record.checkOutTime)} | Hours: {formatHoursWorked(record.hoursWorked)}
                          </p>
                          {(record.lateReason || record.earlyReason || record.leaveReason) && (
                            <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                              {record.leaveReason && (
                                <p>
                                  <span className="font-semibold">Leave:</span> {record.leaveType || "Approved"} - {record.leaveReason}
                                </p>
                              )}
                              {record.lateReason && (
                                <p>
                                  <span className="font-semibold">Late:</span> {record.lateReason}
                                </p>
                              )}
                              {record.earlyReason && (
                                <p>
                                  <span className="font-semibold">Early:</span> {record.earlyReason}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <Badge
                          className={
                            record.status === "on_leave"
                              ? "bg-amber-100 text-amber-900"
                              : record.status === "absent"
                                ? "bg-rose-100 text-rose-900"
                                : record.isLate
                                  ? "bg-orange-100 text-orange-900"
                                  : record.isEarly
                                    ? "bg-sky-100 text-sky-900"
                                    : "bg-emerald-100 text-emerald-900"
                          }
                        >
                          {record.status === "on_leave"
                            ? "On Leave"
                            : record.status === "absent"
                              ? "Absent"
                              : record.isLate
                                ? "Late"
                                : record.isEarly
                                  ? "Early Exit"
                                  : "On Time"}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
