"use client"

import { useEffect, useMemo, useState } from "react"
import { BarChart3, Download, Info, Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { authFetch } from "@/lib/client-session"

interface AttendanceReport {
  employeeId: string
  employeeName: string
  department: string
  totalDays: number
  presentDays: number
  checkInDays: number
  absentDays: number
  leaveDays: number
  lateDays: number
  earlyLeaveDays: number
  avgHours: number
  attendanceRate: number
}

function getOnTimeRate(report: AttendanceReport) {
  return report.checkInDays > 0 ? Math.max(0, (report.checkInDays - report.lateDays) / report.checkInDays) * 100 : 0
}

function needsAttention(report: AttendanceReport) {
  const lateRate = report.checkInDays > 0 ? report.lateDays / report.checkInDays : 0
  return report.totalDays > 0 && (
    report.attendanceRate < 85 || report.absentDays >= 3 || report.lateDays >= 3 ||
    (report.checkInDays >= 2 && report.lateDays >= 2 && lateRate >= 0.75) || report.earlyLeaveDays >= 2
  )
}

function getPerformanceBadge(report: AttendanceReport) {
  if (report.totalDays === 0) return <Badge className="bg-slate-100 text-slate-700">No completed shifts</Badge>
  if (report.attendanceRate >= 95 && getOnTimeRate(report) >= 95 && report.earlyLeaveDays === 0 && report.absentDays === 0) {
    return <Badge className="bg-emerald-100 text-emerald-900">Strong</Badge>
  }
  if (!needsAttention(report)) return <Badge className="bg-sky-100 text-sky-900">On track</Badge>
  return <Badge className="bg-rose-100 text-rose-900">Needs attention</Badge>
}

function formatRate(value: number, denominator: number) {
  return denominator > 0 ? `${Math.round(value)}%` : "—"
}

export default function AttendanceReports() {
  const [reports, setReports] = useState<AttendanceReport[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [dateRange, setDateRange] = useState("thisMonth")
  const [isLoading, setIsLoading] = useState(true)

  const fetchReports = async (withLoader = false) => {
    if (withLoader) {
      setIsLoading(true)
    }

    try {
      const response = await authFetch(`/api/reports/attendance?range=${dateRange}`)
      const data = await response.json()

      if (!response.ok) {
        toast.error("Unable to load reports", {
          description: data.error || "Please try again.",
        })
        return
      }

      setReports(data)
    } catch {
      toast.error("Unable to load reports")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReports(true)
  }, [dateRange])

  const filteredReports = useMemo(() => {
    return reports.filter((report) => report.employeeName.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [reports, searchTerm])

  const exportToCSV = () => {
    const rows = [
      ["Employee", "Department", "Completed shifts", "Present", "Check-ins", "Absent", "Leave", "Late arrivals", "Early departures", "Average hours", "Attendance rate", "On-time rate", "Early departure rate"],
      ...filteredReports.map((report) => [
        report.employeeName,
        report.department,
        report.totalDays,
        report.presentDays,
        report.checkInDays,
        report.absentDays,
        report.leaveDays,
        report.lateDays,
        report.earlyLeaveDays,
        report.avgHours.toFixed(2),
        formatRate(report.attendanceRate, report.totalDays),
        formatRate(getOnTimeRate(report), report.checkInDays),
        formatRate(report.presentDays ? (report.earlyLeaveDays / report.presentDays) * 100 : 0, report.presentDays),
      ]),
    ]

    const csv = rows.map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `attendance-report-${new Date().toISOString().split("T")[0]}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success("Report exported")
  }

  const completedShifts = reports.reduce((sum, report) => sum + report.totalDays, 0)
  const totalPresent = reports.reduce((sum, report) => sum + report.presentDays, 0)
  const totalCheckIns = reports.reduce((sum, report) => sum + report.checkInDays, 0)
  const totalLate = reports.reduce((sum, report) => sum + report.lateDays, 0)
  const totalHours = reports.reduce((sum, report) => sum + report.avgHours * report.presentDays, 0)
  const avgAttendanceRate = completedShifts ? (totalPresent / completedShifts) * 100 : 0
  const onTimeRate = totalCheckIns ? Math.max(0, (totalCheckIns - totalLate) / totalCheckIns) * 100 : 0
  const avgHours = totalPresent ? totalHours / totalPresent : 0
  const attentionCount = reports.filter(needsAttention).length

  return (
    <div className="space-y-6" data-dashboard-view="attendance-reports">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Completed shifts</p>
            <p className="text-2xl font-bold">{completedShifts}</p>
            <p className="mt-1 text-xs text-slate-500">Current shifts are excluded until resolved</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Average attendance</p>
            <p className="text-2xl font-bold">{formatRate(avgAttendanceRate, completedShifts)}</p>
            <p className="mt-1 text-xs text-slate-500">Present ÷ completed scheduled shifts</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">On-time check-ins</p>
            <p className="text-2xl font-bold">{formatRate(onTimeRate, totalCheckIns)}</p>
            <p className="mt-1 text-xs text-slate-500">On-time arrivals ÷ recorded check-ins</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Needs review</p>
            <p className="text-2xl font-bold">{attentionCount}</p>
            <p className="mt-1 text-xs text-slate-500">Low attendance or repeat patterns</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Average hours</p>
            <p className="text-2xl font-bold">{avgHours.toFixed(1)}</p>
            <p className="mt-1 text-xs text-slate-500">Per attended shift</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
                Attendance Reports
              </CardTitle>
              <CardDescription>Compare attendance, punctuality, and early departures across completed scheduled shifts.</CardDescription>
            </div>
            <Button className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
              <Info className="size-4 shrink-0 text-emerald-700" aria-hidden="true" />
              How percentages are calculated
            </div>
            <div className="mt-3 grid gap-2 text-xs leading-5 text-emerald-950 sm:grid-cols-3 sm:gap-4">
              <p><span className="font-semibold">Attendance:</span> Present shifts with both check-in and check-out ÷ completed scheduled shifts. Approved leave and shifts still in progress are excluded.</p>
              <p><span className="font-semibold">On-time:</span> On-time check-ins ÷ all recorded check-ins.</p>
              <p><span className="font-semibold">Early exit:</span> Early departures ÷ attended shifts.</p>
            </div>
          </div>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search employee..."
                className="pl-10"
              />
            </div>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full md:w-56">
                <SelectValue placeholder="Choose range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thisWeek">This Week</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
                <SelectItem value="last3Months">Last 3 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              No reports found.
            </div>
          ) : (
            filteredReports.map((report) => (
              <div key={report.employeeId} className="rounded-3xl border border-slate-200 p-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0 xl:w-52">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold tracking-tight text-[var(--dashboard-ink)]">{report.employeeName}</h3>
                      {getPerformanceBadge(report)}
                    </div>
                    <p className="mt-1 text-sm text-[var(--dashboard-muted)]">{report.department}</p>
                    <div className="mt-4">
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="text-[var(--dashboard-muted)]">Attendance rate</span>
                        <span className="font-semibold text-[var(--dashboard-ink)]">{formatRate(report.attendanceRate, report.totalDays)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#edf0e9]" role="progressbar" aria-label={`${report.employeeName} attendance rate`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(report.attendanceRate)}>
                        <div className="h-full rounded-full bg-[var(--dashboard-green-text)] transition-[width] duration-300" style={{ width: `${Math.max(0, Math.min(100, report.attendanceRate))}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="grid flex-1 gap-2 text-center sm:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-9">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xl font-bold">{report.totalDays}</p>
                      <p className="text-xs text-slate-500">Completed shifts</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xl font-bold">{report.presentDays}</p>
                      <p className="text-xs text-slate-500">Present</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xl font-bold">{report.absentDays}</p>
                      <p className="text-xs text-slate-500">Absent</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xl font-bold">{report.leaveDays}</p>
                      <p className="text-xs text-slate-500">Leave</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xl font-bold">{report.lateDays}</p>
                      <p className="text-xs text-slate-500">Late</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xl font-bold">{report.earlyLeaveDays}</p>
                      <p className="text-xs text-slate-500">Early exits</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xl font-bold">{formatRate(report.presentDays ? (report.earlyLeaveDays / report.presentDays) * 100 : 0, report.presentDays)}</p>
                      <p className="text-xs text-slate-500">Early exit rate</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xl font-bold">{report.avgHours.toFixed(1)}</p>
                      <p className="text-xs text-slate-500">Average hours</p>
                    </div>
                    <div className="rounded-2xl bg-slate-950 p-3 text-white">
                      <p className="text-xl font-bold">{formatRate(getOnTimeRate(report), report.checkInDays)}</p>
                      <p className="text-xs text-slate-300">On-time rate</p>
                    </div>
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
