"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, Clock3, History, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { authFetch } from "@/lib/client-session"
import type { SessionUser } from "@/lib/session"

interface AttendanceRecord {
  id: string
  date: string
  checkInTime: string | null
  checkOutTime: string | null
  isLate: boolean
  isEarly: boolean
  lateReason: string | null
  earlyReason: string | null
  hoursWorked: number
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

export default function AttendanceHistory({ user }: AttendanceHistoryProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [dateFilter, setDateFilter] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadRecords = async () => {
      try {
        const response = await authFetch(`/api/attendance/history?userId=${user.id}`)
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
  const avgHours = records.length ? (records.reduce((sum, record) => sum + record.hoursWorked, 0) / records.length).toFixed(1) : "0.0"

  return (
    <div className="space-y-6">
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
            <p className="text-sm text-slate-500">Avg Hours</p>
            <p className="text-2xl font-bold">{avgHours}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <History className="h-5 w-5 text-sky-600" />
                Attendance History
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
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-slate-500" />
                      <h3 className="font-semibold text-slate-950">{formatDate(record.date)}</h3>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <Clock3 className="h-4 w-4" />
                        In: {formatTime(record.checkInTime)}
                      </span>
                      <span>Out: {formatTime(record.checkOutTime)}</span>
                      <span>Hours: {record.hoursWorked.toFixed(2)}</span>
                    </div>
                    {(record.lateReason || record.earlyReason) && (
                      <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                        {record.lateReason && <p><span className="font-semibold">Late:</span> {record.lateReason}</p>}
                        {record.earlyReason && <p><span className="font-semibold">Early:</span> {record.earlyReason}</p>}
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
    </div>
  )
}
