"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Users, Clock, AlertCircle, Search, Download } from "lucide-react"
import { toast } from "sonner"

interface AttendanceReport {
  employeeId: string
  employeeName: string
  department: string
  totalDays: number
  presentDays: number
  lateDays: number
  earlyLeaveDays: number
  avgHours: number
  attendanceRate: number
}

export default function AttendanceReports() {
  const [reports, setReports] = useState<AttendanceReport[]>([])
  const [filteredReports, setFilteredReports] = useState<AttendanceReport[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [dateRange, setDateRange] = useState("thisMonth")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAttendanceReports()
  }, [dateRange])

  useEffect(() => {
    let filtered = reports

    if (searchTerm) {
      filtered = filtered.filter((report) => report.employeeName.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    if (departmentFilter !== "all") {
      filtered = filtered.filter((report) => report.department === departmentFilter)
    }

    setFilteredReports(filtered)
  }, [searchTerm, departmentFilter, reports])

  const fetchAttendanceReports = async () => {
    try {
      const response = await fetch(`/api/reports/attendance?range=${dateRange}`)
      if (response.ok) {
        const data = await response.json()
        setReports(data)
        setFilteredReports(data)
      }
    } catch (error) {
      console.error("Error fetching reports:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getAttendanceRateBadge = (rate: number) => {
    if (rate >= 95) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>
    if (rate >= 85) return <Badge className="bg-blue-100 text-blue-800">Good</Badge>
    if (rate >= 75) return <Badge className="bg-yellow-100 text-yellow-800">Average</Badge>
    return <Badge className="bg-red-100 text-red-800">Poor</Badge>
  }

  const exportToCSV = () => {
    try {
      const csvContent = [
        [
          "Employee Name",
          "Department",
          "Total Days",
          "Present Days",
          "Late Days",
          "Early Leave",
          "Avg Hours",
          "Attendance Rate",
        ],
        ...filteredReports.map((report) => [
          report.employeeName,
          report.department,
          report.totalDays,
          report.presentDays,
          report.lateDays,
          report.earlyLeaveDays,
          report.avgHours.toFixed(1),
          `${report.attendanceRate.toFixed(1)}%`,
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `attendance-report-${new Date().toISOString().split("T")[0]}.csv`
      a.click()

      toast.success("Report exported successfully!")
    } catch (error) {
      toast.error("Failed to export report")
    }
  }

  if (isLoading) {
    return <div>Loading attendance reports...</div>
  }

  const totalEmployees = reports.length
  const avgAttendanceRate = reports.reduce((sum, r) => sum + r.attendanceRate, 0) / totalEmployees || 0
  const totalLateEmployees = reports.filter((r) => r.lateDays > 0).length

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold">{totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Avg Attendance</p>
                <p className="text-2xl font-bold">{avgAttendanceRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Late Employees</p>
                <p className="text-2xl font-bold">{totalLateEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Avg Hours</p>
                <p className="text-2xl font-bold">
                  {(reports.reduce((sum, r) => sum + r.avgHours, 0) / totalEmployees || 0).toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Reports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <BarChart className="h-6 w-6" />
                <span>Attendance Reports</span>
              </CardTitle>
              <CardDescription>Comprehensive attendance analysis for all employees</CardDescription>
            </div>
            <Button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700 cursor-pointer">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="IT">IT</SelectItem>
                <SelectItem value="HR">HR</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="Operations">Operations</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thisWeek">This Week</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
                <SelectItem value="last3Months">Last 3 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reports Table */}
          <div className="space-y-4">
            {filteredReports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No attendance reports found.</div>
            ) : (
              filteredReports.map((report) => (
                <div key={report.employeeId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{report.employeeName}</h3>
                      <p className="text-sm text-gray-600">{report.department}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getAttendanceRateBadge(report.attendanceRate)}
                      <span className="text-lg font-bold">{report.attendanceRate.toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-6 gap-4 text-sm">
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <div className="font-bold text-blue-600">{report.presentDays}</div>
                      <div className="text-gray-600">Present Days</div>
                    </div>

                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="font-bold text-gray-600">{report.totalDays}</div>
                      <div className="text-gray-600">Total Days</div>
                    </div>

                    <div className="text-center p-2 bg-red-50 rounded">
                      <div className="font-bold text-red-600">{report.lateDays}</div>
                      <div className="text-gray-600">Late Days</div>
                    </div>

                    <div className="text-center p-2 bg-yellow-50 rounded">
                      <div className="font-bold text-yellow-600">{report.earlyLeaveDays}</div>
                      <div className="text-gray-600">Early Leaves</div>
                    </div>

                    <div className="text-center p-2 bg-green-50 rounded">
                      <div className="font-bold text-green-600">{report.avgHours.toFixed(1)}</div>
                      <div className="text-gray-600">Avg Hours</div>
                    </div>

                    <div className="text-center p-2 bg-purple-50 rounded">
                      <div className="font-bold text-purple-600">
                        {((report.presentDays / report.totalDays) * 100 || 0).toFixed(0)}%
                      </div>
                      <div className="text-gray-600">Presence Rate</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
