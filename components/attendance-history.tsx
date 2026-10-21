"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, Clock3, History, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { authFetch } from "@/lib/client-session"
import type { SessionUser } from "@/lib/session"
import { formatDurationMinutes, formatLocalDateInput, getLocalTimeMinutes } from "@/lib/attendance-time"

interface AttendanceRecord {
  id: string
  date: string
  checkInTime: string | null
  checkOutTime: string | null
  breakTaken?: boolean
  breakStartTime?: string | null
  breakEndTime?: string | null
  breakDurationMinutes?: number
  isLate: boolean
  isEarly: boolean
  needsCheckoutReview: boolean
  absenceReason?: string | null
  lateReason: string | null
  earlyReason: string | null
  lateCheckoutReason: string | null
  leaveReason: string | null
  leaveType: string | null
  hoursWorked?: number | null
  status: "present" | "absent" | "on_leave"
}

interface AttendanceHistoryProps {
  user: SessionUser
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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function formatHoursWorked(value?: number | null) {
  return Number.isFinite(value) ? Number(value).toFixed(2) : "0.00"
}

export default function AttendanceHistory({ user }: AttendanceHistoryProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [dateFilter, setDateFilter] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadRecords = async () => {
      try {
        const response = await authFetch(`/api/attendance/history?userId=${user.id}&nowDate=${formatLocalDateInput()}&nowMinutes=${getLocalTimeMinutes()}`)
        const data = await response.json()
        if (response.ok) {
          setRecords(data)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadRecords()
    const interval = setInterval(loadRecords, 20000)
    return () => clearInterval(interval)
  }, [user.id])

  const filteredRecords = useMemo(() => {
    return dateFilter ? records.filter((record) => record.date.includes(dateFilter)) : records
  }, [records, dateFilter])

  const onTimeCount = records.filter((record) => record.status === "present" && !record.isLate && !record.isEarly).length
  const avgHours = records.length
    ? (records.reduce((sum, record) => sum + (Number(record.hoursWorked) || 0), 0) / records.length).toFixed(1)
    : "0.0"

  return (
    <div className="space-y-6" data-dashboard-view="attendance-history">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Total Records</p>
            <p className="text-2xl font-bold">{records.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">On Time</p>
            <p className="text-2xl font-bold">{onTimeCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Late Days</p>
            <p className="text-2xl font-bold">{records.filter((record) => record.isLate).length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Average hours</p>
            <p className="text-2xl font-bold">{avgHours}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
                <History className="h-5 w-5 text-sky-600" />
                Attendance history
              </CardTitle>
              <CardDescription>Review your past attendance records by date.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="w-full md:w-auto" />
              <Button variant="outline" className="rounded-2xl" onClick={() => setDateFilter("")}>
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              No attendance records found.
            </div>
          ) : (
            filteredRecords.map((record) => (
              <div key={record.id} className="rounded-3xl border border-slate-200 p-5">
                <div className="grid gap-5 md:grid-cols-[minmax(180px,0.8fr)_minmax(0,1.2fr)_auto] md:items-center">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--dashboard-green-soft)] text-[var(--dashboard-green-text)]">
                      <CalendarDays className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-[var(--dashboard-ink)]">{new Date(record.date).toLocaleDateString("en-US", { weekday: "short" })}</h3>
                      <p className="mt-0.5 text-sm text-[var(--dashboard-muted)]">{new Date(record.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-[#f7f8f5] px-3 py-2.5">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--dashboard-muted)]">Check in</p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-[var(--dashboard-ink)]"><Clock3 className="size-3.5 text-[var(--dashboard-green-text)]" />{formatTime(record.checkInTime)}</p>
                    </div>
                    <div className="rounded-xl bg-[#f7f8f5] px-3 py-2.5">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--dashboard-muted)]">Check out</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--dashboard-ink)]">{formatTime(record.checkOutTime)}</p>
                    </div>
                    <div className="rounded-xl bg-[#f7f8f5] px-3 py-2.5">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--dashboard-muted)]">Hours</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--dashboard-ink)]">{formatHoursWorked(record.hoursWorked)}</p>
                    </div>
                    {record.breakTaken && <div className="rounded-xl bg-[#f7f8f5] px-3 py-2.5">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--dashboard-muted)]">Break</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--dashboard-ink)]">{record.breakEndTime ? formatDurationMinutes(Number(record.breakDurationMinutes || 0)) : "In progress"}</p>
                    </div>}
                  </div>
                  <div className="flex flex-wrap gap-2">
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
                            ? "Early departure"
                            : "On Time"}
                  </Badge>
                  {record.absenceReason === "missing_checkout" && <Badge className="bg-amber-100 text-amber-900">Absent · missing check-out</Badge>}
                  {record.absenceReason === "no_check_in" && <Badge className="bg-rose-100 text-rose-900">No check-in</Badge>}
                  </div>
                </div>
                {(record.lateReason || record.earlyReason || record.lateCheckoutReason || record.leaveReason) && (
                  <div className="mt-4 border-t border-[var(--dashboard-border-soft)] pt-3 text-sm text-[var(--dashboard-muted)]">
                    {(record.lateReason || record.earlyReason || record.lateCheckoutReason || record.leaveReason) && (
                      <>
                        {record.leaveReason && <p><span className="font-medium text-[var(--dashboard-ink-soft)]">Leave:</span> {record.leaveType || "Approved"} - {record.leaveReason}</p>}
                        {record.lateReason && <p><span className="font-medium text-[var(--dashboard-ink-soft)]">Late:</span> {record.lateReason}</p>}
                        {record.earlyReason && <p><span className="font-medium text-[var(--dashboard-ink-soft)]">Early:</span> {record.earlyReason}</p>}
                        {record.lateCheckoutReason && <p><span className="font-medium text-[var(--dashboard-ink-soft)]">Late check-out:</span> {record.lateCheckoutReason}</p>}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
