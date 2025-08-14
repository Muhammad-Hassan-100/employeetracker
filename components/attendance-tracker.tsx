"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, AlertTriangle, CheckCircle, Clock } from "lucide-react"
import { toast } from "sonner"

interface EmployeeStatus {
  id: string
  name: string
  department: string
}

interface DailyStatusSummary {
  date: string
  totalEmployees: number
  presentEmployees: EmployeeStatus[]
  absentEmployees: EmployeeStatus[]
  onLeaveEmployees: EmployeeStatus[]
  summary: {
    present: number
    absent: number
    onLeave: number
  }
}

export default function AttendanceTracker() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [statusData, setStatusData] = useState<DailyStatusSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isMarking, setIsMarking] = useState(false)
  const [isFixing, setIsFixing] = useState(false)

  const checkDailyStatus = async () => {
    setIsLoading(true)
    try {
      // First, sync attendance with leaves for this date
      await syncAttendanceWithLeaves()
      
      const response = await fetch(`/api/attendance/mark-absent?date=${selectedDate}`)
      if (response.ok) {
        const data = await response.json()
        setStatusData(data)
      } else {
        toast.error("Failed to fetch daily status")
      }
    } catch (error) {
      console.error("Error fetching daily status:", error)
      toast.error("Error fetching daily status")
    } finally {
      setIsLoading(false)
    }
  }

  const syncAttendanceWithLeaves = async () => {
    try {
      // Sync for the selected date only
      const response = await fetch("/api/attendance/sync-leaves", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: selectedDate,
          endDate: selectedDate,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.details.totalChanges > 0) {
          toast.success(`Synced ${result.details.totalChanges} attendance records with leaves`)
        }
      }
    } catch (error) {
      console.error("Error syncing attendance with leaves:", error)
      // Don't show error toast here as it's a background operation
    }
  }

  const markAbsentEmployees = async () => {
    setIsMarking(true)
    try {
      const response = await fetch("/api/attendance/mark-absent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ date: selectedDate }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        // Refresh the status after marking
        checkDailyStatus()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to mark absent employees")
      }
    } catch (error) {
      console.error("Error marking absent employees:", error)
      toast.error("Error marking absent employees")
    } finally {
      setIsMarking(false)
    }
  }

  const fixAttendanceStatus = async () => {
    setIsFixing(true)
    try {
      const response = await fetch("/api/attendance/fix-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ date: selectedDate }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        // Refresh the status after fixing
        checkDailyStatus()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to fix attendance status")
      }
    } catch (error) {
      console.error("Error fixing attendance status:", error)
      toast.error("Error fixing attendance status")
    } finally {
      setIsFixing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Daily Attendance Tracker</h2>
        <p className="text-gray-600">Track and manage daily attendance status</p>
      </div>

      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Date</CardTitle>
          <CardDescription>Choose a date to check attendance status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
            <Button onClick={checkDailyStatus} disabled={isLoading}>
              {isLoading ? "Loading..." : "Check Status"}
            </Button>
            {statusData && (
              <>
                <Button
                  onClick={fixAttendanceStatus}
                  disabled={isFixing}
                  variant="outline"
                  className="border-blue-300 text-blue-700"
                >
                  {isFixing ? "Fixing..." : "Fix Status"}
                </Button>
                <Button
                  onClick={markAbsentEmployees}
                  disabled={isMarking}
                  variant="destructive"
                >
                  {isMarking ? "Marking..." : "Mark Absent Employees"}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Summary */}
      {statusData && (
        <>
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Employees</p>
                    <p className="text-2xl font-bold text-blue-600">{statusData.summary.present + statusData.summary.absent + statusData.summary.onLeave}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Present</p>
                    <p className="text-2xl font-bold text-green-600">{statusData.summary.present}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-600">Absent</p>
                    <p className="text-2xl font-bold text-red-600">{statusData.summary.absent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm text-gray-600">On Leave</p>
                    <p className="text-2xl font-bold text-yellow-600">{statusData.summary.onLeave}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Employee Lists */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Present Employees */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Present Employees</span>
                  <Badge variant="default">{statusData.presentEmployees.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {statusData.presentEmployees.length === 0 ? (
                    <p className="text-gray-500 text-sm">No employees present</p>
                  ) : (
                    statusData.presentEmployees.map((employee) => (
                      <div key={employee.id} className="p-2 bg-green-50 rounded">
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-sm text-gray-600">{employee.department}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Absent Employees */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span>Absent Employees</span>
                  <Badge variant="destructive">{statusData.absentEmployees.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {statusData.absentEmployees.length === 0 ? (
                    <p className="text-gray-500 text-sm">No employees absent</p>
                  ) : (
                    statusData.absentEmployees.map((employee) => (
                      <div key={employee.id} className="p-2 bg-red-50 rounded">
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-sm text-gray-600">{employee.department}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* On Leave Employees */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-yellow-600" />
                  <span>On Leave</span>
                  <Badge variant="secondary">{statusData.onLeaveEmployees.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {statusData.onLeaveEmployees.length === 0 ? (
                    <p className="text-gray-500 text-sm">No employees on leave</p>
                  ) : (
                    statusData.onLeaveEmployees.map((employee) => (
                      <div key={employee.id} className="p-2 bg-yellow-50 rounded">
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-sm text-gray-600">{employee.department}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Summary for {formatDate(statusData.date)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Total Working Days:</strong> {statusData.totalEmployees}</p>
                  <p><strong>Attendance Rate:</strong> {statusData.totalEmployees > 0 ? ((statusData.summary.present / statusData.totalEmployees) * 100).toFixed(1) : 0}%</p>
                </div>
                <div>
                  <p><strong>Leave Rate:</strong> {statusData.totalEmployees > 0 ? ((statusData.summary.onLeave / statusData.totalEmployees) * 100).toFixed(1) : 0}%</p>
                  <p><strong>Absence Rate:</strong> {statusData.totalEmployees > 0 ? ((statusData.summary.absent / statusData.totalEmployees) * 100).toFixed(1) : 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
