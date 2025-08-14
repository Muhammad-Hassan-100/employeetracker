"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { History, Calendar, Clock, AlertCircle } from "lucide-react"

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
  leaveId?: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface AttendanceHistoryProps {
  user: User
}

export default function AttendanceHistory({ user }: AttendanceHistoryProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([])
  const [dateFilter, setDateFilter] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAttendanceHistory()
  }, [user.id])

  useEffect(() => {
    if (dateFilter) {
      const filtered = records.filter((record) => record.date.includes(dateFilter))
      setFilteredRecords(filtered)
    } else {
      setFilteredRecords(records)
    }
  }, [dateFilter, records])

  const fetchAttendanceHistory = async () => {
    try {
      const response = await fetch(`/api/attendance/history?userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setRecords(data)
        setFilteredRecords(data)
      }
    } catch (error) {
      console.error("Error fetching attendance history:", error)
    } finally {
      setIsLoading(false)
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

  const formatTime12Hour = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString("en-US", {
      hour12: true,
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const getStatusBadge = (record: AttendanceRecord) => {
    if (record.status === "absent") {
      return <Badge variant="destructive">Absent</Badge>
    } else if (record.status === "on_leave") {
      return <Badge variant="outline">On Leave</Badge>
    } else if (record.isLate && record.isEarly) {
      return <Badge variant="destructive">Late & Early Leave</Badge>
    } else if (record.isLate) {
      return <Badge variant="destructive">Late Arrival</Badge>
    } else if (record.isEarly) {
      return <Badge variant="secondary">Early Leave</Badge>
    } else {
      return <Badge variant="default">On Time</Badge>
    }
  }

  if (isLoading) {
    return <div>Loading attendance history...</div>
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Days</p>
                <p className="text-2xl font-bold">{records.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">On Time</p>
                <p className="text-2xl font-bold">{records.filter((r) => !r.isLate && !r.isEarly).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Late Arrivals</p>
                <p className="text-2xl font-bold">{records.filter((r) => r.isLate).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <History className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Avg Hours</p>
                <p className="text-2xl font-bold">
                  {records.length > 0
                    ? (records.reduce((sum, r) => sum + r.hoursWorked, 0) / records.length).toFixed(1)
                    : "0"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <History className="h-6 w-6" />
                <span>Attendance History</span>
              </CardTitle>
              <CardDescription>View your complete attendance record</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-auto"
              />
              <Button variant="outline" onClick={() => setDateFilter("")}>
                Clear Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No attendance records found.</div>
            ) : (
              filteredRecords.map((record) => (
                <div key={record.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{formatDate(record.date)}</h3>
                      {record.status === "absent" ? (
                        <div className="text-sm text-gray-600">
                          <span>Status: Absent</span>
                        </div>
                      ) : record.status === "on_leave" ? (
                        <div className="text-sm text-gray-600">
                          <span>Status: On Leave</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>In: {record.checkInTime ? formatTime12Hour(record.checkInTime) : "N/A"}</span>
                          {record.checkOutTime && <span>Out: {formatTime12Hour(record.checkOutTime)}</span>}
                          <span>Hours: {record.hoursWorked.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    {getStatusBadge(record)}
                  </div>

                  {(record.lateReason || record.earlyReason) && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                      {record.lateReason && (
                        <p>
                          <strong>Late Reason:</strong> {record.lateReason}
                        </p>
                      )}
                      {record.earlyReason && (
                        <p>
                          <strong>Early Leave Reason:</strong> {record.earlyReason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
