"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { CalendarDays, Clock3, Eye, Loader2, RefreshCw, Search, UsersRound } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { authFetch } from "@/lib/client-session"
import { formatTimeString12Hour } from "@/lib/time"
import {
  formatDurationMinutes,
  formatLocalDateInput,
  getLocalTimeMinutes,
} from "@/lib/attendance-time"

interface SnapshotRow {
  employeeId: string
  name: string
  email: string
  department: string
  position: string
  status: string
  joinDate: string
  selectedDate: string
  attendanceStatus:
    | "present"
    | "absent"
    | "on_leave"
    | "scheduled"
    | "no_show"
    | "weekend"
    | "off_day"
    | "not_joined"
    | "inactive"
  checkInTime: string | null
  checkOutTime: string | null
  breakTaken: boolean
  breakStartTime: string | null
  breakEndTime: string | null
  breakDurationMinutes: number
  hoursWorked: number
  isLate: boolean
  isEarly: boolean
  needsCheckoutReview: boolean
  absenceReason: string | null
  lateOccurrencesLast30Days: number
  lateReason: string | null
  earlyReason: string | null
  lateCheckoutReason: string | null
  leaveReason: string | null
  leaveType: string | null
  shift: {
    id: string
    name: string
    startTime: string
    endTime: string
  } | null
}

function formatTime(value: string | null) {
  if (!value) {
    return "Not recorded"
  }

  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function getStatusBadge(status: SnapshotRow["attendanceStatus"], isLate = false) {
  switch (status) {
    case "inactive":
      return <Badge className="bg-slate-200 text-slate-700">Inactive</Badge>
    case "present":
      return (
        <>
          <Badge className="bg-emerald-100 text-emerald-900">Present</Badge>
          {isLate && <Badge className="bg-orange-100 text-orange-900">Late</Badge>}
        </>
      )
    case "on_leave":
      return <Badge className="bg-amber-100 text-amber-900">On Leave</Badge>
    case "scheduled":
      return <Badge className="bg-slate-100 text-slate-700">Scheduled</Badge>
    case "no_show":
      return <Badge className="bg-orange-100 text-orange-900">Awaiting check-in</Badge>
    case "weekend":
      return <Badge className="bg-sky-100 text-sky-900">Weekend</Badge>
    case "off_day":
      return <Badge className="bg-slate-200 text-slate-700">Day off</Badge>
    case "not_joined":
      return <Badge className="bg-slate-200 text-slate-700">Before start date</Badge>
    case "absent":
      return (
        <>
          <Badge className="bg-rose-100 text-rose-900">Absent</Badge>
          {isLate && <Badge className="bg-orange-100 text-orange-900">Late</Badge>}
        </>
      )
    default:
      return <Badge className="bg-rose-100 text-rose-900">Absent</Badge>
  }
}

function formatHoursWorked(value?: number | null) {
  return Number.isFinite(value) ? Number(value).toFixed(2) : "0.00"
}

export default function AdminAttendanceMonitor() {
  const [selectedDate, setSelectedDate] = useState(formatLocalDateInput())
  const lastCurrentDate = useRef(formatLocalDateInput())
  const [rows, setRows] = useState<SnapshotRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [shiftFilter, setShiftFilter] = useState("all")

  const fetchSnapshot = async (withLoader = false) => {
    if (withLoader) {
      setIsLoading(true)
    }

    try {
      const now = new Date()
      const currentDate = formatLocalDateInput(now)
      const shiftView = selectedDate === currentDate ? "&shiftView=current" : ""
      const response = await authFetch(
        `/api/attendance/admin?date=${selectedDate}&nowDate=${currentDate}&nowMinutes=${getLocalTimeMinutes(now)}${shiftView}`,
      )
      const data = await response.json()

      if (!response.ok) {
        toast.error("Unable to load attendance snapshot", {
          description: data.error || "Please try again.",
        })
        return
      }

      setRows(data.rows)
    } catch {
      toast.error("Unable to load attendance snapshot")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSnapshot(true)
  }, [selectedDate])

  useEffect(() => {
    const interval = setInterval(() => {
      const currentDate = formatLocalDateInput()
      if (currentDate !== lastCurrentDate.current) {
        if (selectedDate === lastCurrentDate.current) {
          setSelectedDate(currentDate)
        }
        lastCurrentDate.current = currentDate
      }
      fetchSnapshot(false)
    }, 30000)

    return () => clearInterval(interval)
  }, [selectedDate])

  const filteredRows = useMemo(() => {
    return rows
      .filter((row) =>
        [row.name, row.email, row.department, row.position, row.shift?.name || ""]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      )
      .filter((row) =>
        statusFilter === "all"
          ? true
          : statusFilter === "late"
            ? row.status === "active" && row.isLate
            : row.attendanceStatus === statusFilter,
      )
      .filter((row) => (shiftFilter === "all" ? true : row.shift?.name === shiftFilter))
  }, [rows, searchTerm, shiftFilter, statusFilter])

  const uniqueShiftNames = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.shift?.name).filter(Boolean))) as string[]
  }, [rows])

  const presentCount = rows.filter((row) => row.attendanceStatus === "present").length
  const absentCount = rows.filter((row) => row.attendanceStatus === "absent").length
  const leaveCount = rows.filter((row) => row.attendanceStatus === "on_leave").length
  const scheduledCount = rows.filter((row) => row.attendanceStatus === "scheduled").length
  const lateCount = rows.filter((row) => row.isLate).length
  const noShowCount = rows.filter((row) => row.attendanceStatus === "no_show").length
  const missingCheckoutCount = rows.filter(
    (row) => row.status === "active" && row.absenceReason === "missing_checkout",
  ).length
  const repeatedLateCount = rows.filter((row) => row.lateOccurrencesLast30Days >= 3).length

  return (
    <div className="space-y-6" data-dashboard-view="attendance-monitor">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Present</p>
            <p className="text-2xl font-bold">{presentCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Absent</p>
            <p className="text-2xl font-bold">{absentCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">On Leave</p>
            <p className="text-2xl font-bold">{leaveCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Scheduled</p>
            <p className="text-2xl font-bold">{scheduledCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Late</p>
            <p className="text-2xl font-bold">{lateCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Awaiting check-in</p>
            <p className="text-2xl font-bold">{noShowCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Missing check-out</p>
            <p className="text-2xl font-bold">{missingCheckoutCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Frequent late arrivals</p>
            <p className="text-2xl font-bold">{repeatedLateCount}</p>
            <p className="mt-1 text-xs text-slate-500">3+ times in 30 days</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <UsersRound className="h-5 w-5 text-emerald-600" />
                Attendance monitor
              </CardTitle>
              <CardDescription>
                Review attendance for every employee on the selected date.
              </CardDescription>
            </div>
            <Button variant="outline" className="rounded-2xl" onClick={() => fetchSnapshot(true)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1fr_0.7fr_0.7fr]">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Date</label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Search</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search employee..."
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="no_show">Awaiting check-in</SelectItem>
                  <SelectItem value="weekend">Weekend</SelectItem>
                  <SelectItem value="off_day">Day off</SelectItem>
                  <SelectItem value="not_joined">Before start date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Shift</label>
              <Select value={shiftFilter} onValueChange={setShiftFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All shifts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All shifts</SelectItem>
                  {uniqueShiftNames.map((shiftName) => (
                    <SelectItem key={shiftName} value={shiftName}>
                      {shiftName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              No attendance rows match the selected filters.
            </div>
          ) : (
            filteredRows.map((row) => (
              <div key={row.employeeId} className="rounded-3xl border border-slate-200 p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-950">{row.name}</h3>
                      {getStatusBadge(row.attendanceStatus, row.isLate)}
                      {row.status === "active" && row.breakStartTime && !row.breakEndTime && (
                        <Badge className="bg-amber-100 text-amber-900">On break</Badge>
                      )}
                      {row.status === "active" && row.isEarly && (
                        <Badge className="bg-sky-100 text-sky-900">Early departure</Badge>
                      )}
                      {row.status === "active" && row.absenceReason === "missing_checkout" && (
                        <Badge className="bg-amber-100 text-amber-900">Missing check-out</Badge>
                      )}
                      {row.status === "active" && row.absenceReason === "no_check_in" && (
                        <Badge className="bg-rose-100 text-rose-900">No check-in</Badge>
                      )}
                      {row.status === "active" && row.lateOccurrencesLast30Days >= 3 && (
                        <Badge className="bg-orange-100 text-orange-900">
                          {row.lateOccurrencesLast30Days} late arrivals in 30 days
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">{row.email}</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
                      <span>{row.department}</span>
                      <span>{row.position}</span>
                      <span>
                        {row.shift
                          ? `${row.shift.name} (${formatTimeString12Hour(row.shift.startTime)} - ${formatTimeString12Hour(row.shift.endTime)})`
                          : "No shift"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-700">
                      <span className="flex items-center gap-1">
                        <Clock3 className="h-4 w-4" />
                        Check-in: {formatTime(row.checkInTime)}
                      </span>
                      <span>Check-out: {formatTime(row.checkOutTime)}</span>
                      <span>Hours worked: {formatHoursWorked(row.hoursWorked)}</span>
                      {row.breakTaken && (
                        <span
                          className={
                            row.breakStartTime && !row.breakEndTime
                              ? "font-medium text-amber-800"
                              : ""
                          }
                        >
                          Break:{" "}
                          {row.breakStartTime && !row.breakEndTime
                            ? "In progress"
                            : formatDurationMinutes(Number(row.breakDurationMinutes || 0))}
                        </span>
                      )}
                    </div>
                    {(row.lateReason ||
                      row.earlyReason ||
                      row.lateCheckoutReason ||
                      row.leaveReason) && (
                      <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                        {row.leaveReason && (
                          <p>
                            <span className="font-semibold">Leave:</span> {row.leaveType} -{" "}
                            {row.leaveReason}
                          </p>
                        )}
                        {row.lateReason && (
                          <p>
                            <span className="font-semibold">Late:</span> {row.lateReason}
                          </p>
                        )}
                        {row.earlyReason && (
                          <p>
                            <span className="font-semibold">Early:</span> {row.earlyReason}
                          </p>
                        )}
                        {row.lateCheckoutReason && (
                          <p>
                            <span className="font-semibold">Late check-out:</span>{" "}
                            {row.lateCheckoutReason}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <Link href={`/dashboard/employees/${row.employeeId}?mode=view`}>
                    <Button variant="outline" className="rounded-2xl">
                      <Eye className="mr-2 h-4 w-4" />
                      View details
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
