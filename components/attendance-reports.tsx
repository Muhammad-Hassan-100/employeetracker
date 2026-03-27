"use client"

import { useEffect, useMemo, useState } from "react"
import { BarChart3, Download, Loader2, Search } from "lucide-react"
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
  absentDays: number
  leaveDays: number
  lateDays: number
  earlyLeaveDays: number
  avgHours: number
  attendanceRate: number
}

function getRateBadge(rate: number) {
  if (rate >= 95) return <Badge className="bg-emerald-100 text-emerald-900">Excellent</Badge>
  if (rate >= 85) return <Badge className="bg-sky-100 text-sky-900">Good</Badge>
  if (rate >= 75) return <Badge className="bg-amber-100 text-amber-900">Average</Badge>
  return <Badge className="bg-rose-100 text-rose-900">Needs Attention</Badge>
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
      ["Employee", "Department", "Present", "Absent", "Leave", "Late", "Early", "Avg Hours", "Attendance Rate"],
      ...filteredReports.map((report) => [
        report.employeeName,
        report.department,
        report.presentDays,
        report.absentDays,
        report.leaveDays,
        report.lateDays,
        report.earlyLeaveDays,
        report.avgHours.toFixed(2),
        `${report.attendanceRate.toFixed(1)}%`,
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

  const avgAttendanceRate = reports.length
    ? (reports.reduce((sum, report) => sum + report.attendanceRate, 0) / reports.length).toFixed(1)
    : "0.0"
  const avgHours = reports.length ? (reports.reduce((sum, report) => sum + report.avgHours, 0) / reports.length).toFixed(1) : "0.0"

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Employees</p>
            <p className="text-2xl font-bold">{reports.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Avg Attendance</p>
            <p className="text-2xl font-bold">{avgAttendanceRate}%</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Late Employees</p>
            <p className="text-2xl font-bold">{reports.filter((report) => report.lateDays > 0).length}</p>
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
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
                Attendance Reports
              </CardTitle>
              <CardDescription>Use filters, review employee metrics, and export a CSV file.</CardDescription>
            </div>
            <Button className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-950">{report.employeeName}</h3>
                      {getRateBadge(report.attendanceRate)}
                    </div>
                    <p className="text-sm text-slate-500">{report.department}</p>
                  </div>
                  <div className="grid gap-3 text-center sm:grid-cols-4 xl:w-[620px] xl:grid-cols-7">
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
                      <p className="text-xs text-slate-500">Early</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xl font-bold">{report.avgHours.toFixed(1)}</p>
                      <p className="text-xs text-slate-500">Avg Hours</p>
                    </div>
                    <div className="rounded-2xl bg-slate-950 p-3 text-white">
                      <p className="text-xl font-bold">{report.attendanceRate.toFixed(0)}%</p>
                      <p className="text-xs text-slate-300">Rate</p>
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
