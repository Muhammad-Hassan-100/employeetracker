"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Clock, CheckCircle, XCircle, AlertCircle, Loader2, FileText } from "lucide-react"
import { toast } from "sonner"

interface User {
  id: string
  name: string
  email: string
  role: string
  shiftId?: string
}

interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
  description: string
}

interface AttendanceTabProps {
  user: User
}

export default function AttendanceTab({ user }: AttendanceTabProps) {


  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [userShift, setUserShift] = useState<Shift | null>(null)
  const [lateReason, setLateReason] = useState("")
  const [earlyReason, setEarlyReason] = useState("")
  const [showLateForm, setShowLateForm] = useState(false)
  const [showEarlyForm, setShowEarlyForm] = useState(false)
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [todayStatus, setTodayStatus] = useState<"present" | "absent" | "on_leave" | "leave_pending" | "attendance_pending" | null>(null)
  const [showSameDayLeaveForm, setShowSameDayLeaveForm] = useState(false)
  const [sameDayLeaveReason, setSameDayLeaveReason] = useState("")
  const [isApplyingLeave, setIsApplyingLeave] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const [canCheckIn, setCanCheckIn] = useState(false)
  const [canApplyLeave, setCanApplyLeave] = useState(false)
  const [employeeOptions, setEmployeeOptions] = useState<any>(null)
  const [canCheckOut, setCanCheckOut] = useState(false)

  const parseTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":").map(Number)
    const date = new Date()
    date.setHours(hours, minutes, 0, 0)
    return date
  }

  // Helper: can check in only if within 5 min before shift start or later
  const canCheckInNow = (() => {
    if (!userShift) return true
    const workStartTime = parseTime(userShift.startTime)
    const earliestCheckIn = new Date(workStartTime.getTime() - 5 * 60 * 1000)
    return currentTime >= earliestCheckIn
  })()

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    checkTodayAttendance()
    fetchUserShift()

    return () => clearInterval(timer)
  }, [])

  const fetchUserShift = async () => {
    try {
      const response = await fetch(`/api/employees/shift?userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setUserShift(data.shift) // This will be null if no shift is assigned
      }
    } catch (error) {
      console.error("Error fetching user shift:", error)
    }
  }

  const checkTodayAttendance = async () => {
    try {
      // Check employee options (what actions are available)
      const optionsResponse = await fetch(`/api/employees/options?userId=${user.id}`)
      if (optionsResponse.ok) {
        const optionsData = await optionsResponse.json()
        setEmployeeOptions(optionsData)
        setCanApplyLeave(optionsData.canApplyLeave)
        setCanCheckIn(optionsData.canCheckIn)
        setStatusMessage(optionsData.message)
        
        if (optionsData.attendanceRecord) {
          setIsCheckedIn(!!optionsData.attendanceRecord.checkInTime && !optionsData.attendanceRecord.checkOutTime)
          setCanCheckOut(!!optionsData.attendanceRecord.checkInTime && !optionsData.attendanceRecord.checkOutTime)
          setTodayStatus(optionsData.attendanceRecord.status)
        } else {
          setIsCheckedIn(false)
          setCanCheckOut(false)
        }
      }

      // Also check today's attendance for additional details
      const response = await fetch(`/api/attendance/today?userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.record) {
          setIsCheckedIn(data.isCheckedIn)
          setCanCheckOut(data.isCheckedIn)
        }
      }
    } catch (error) {
      console.error("Error checking today's attendance:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckIn = async () => {
    const now = new Date()
    let isLate = false

    if (userShift) {
      const workStartTime = parseTime(userShift.startTime)
      isLate = now > workStartTime
    }

    if (isLate && !lateReason) {
      setShowLateForm(true)
      return
    }

    setIsCheckingIn(true)

    try {
      const response = await fetch("/api/attendance/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          checkInTime: now,
          isLate,
          lateReason: isLate ? lateReason : null,
        }),
      })

      if (response.ok) {
        setIsCheckedIn(true)
        setTodayStatus("present")
        setShowLateForm(false)
        setLateReason("")
        checkTodayAttendance() // Refresh the status
        toast.success("Check-in successful!", {
          description: `Welcome to work, ${user.name}!`,
        })
      } else {
        const error = await response.json()
        toast.error("Check-in failed", {
          description: error.error || "Please try again",
        })
      }
    } catch (error) {
      toast.error("Connection error", {
        description: "Unable to process check-in",
      })
    } finally {
      setIsCheckingIn(false)
    }
  }

  const handleCheckOut = async () => {
    const now = new Date()
    let isEarly = false

    if (userShift) {
      const workEndTime = parseTime(userShift.endTime)
      isEarly = now < workEndTime
    }

    if (isEarly && !earlyReason) {
      setShowEarlyForm(true)
      return
    }

    setIsCheckingOut(true)

    try {
      const response = await fetch("/api/attendance/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          checkOutTime: now,
          isEarly,
          earlyReason: isEarly ? earlyReason : null,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setIsCheckedIn(false)
        setShowEarlyForm(false)
        setEarlyReason("")
        checkTodayAttendance() // Refresh the status
        toast.success("Check-out successful!", {
          description: `Hours worked: ${data.hoursWorked}. Have a great day!`,
        })
      } else {
        const error = await response.json()
        toast.error("Check-out failed", {
          description: error.error || "Please try again",
        })
      }
    } catch (error) {
      toast.error("Connection error", {
        description: "Unable to process check-out",
      })
    } finally {
      setIsCheckingOut(false)
    }
  }

  const handleSameDayLeave = async () => {
    if (!sameDayLeaveReason.trim()) {
      toast.error("Please provide a reason for same-day leave")
      return
    }

    setIsApplyingLeave(true)
    const today = new Date().toISOString().split("T")[0]

    try {
      const response = await fetch("/api/leaves/same-day", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          employeeName: user.name,
          reason: sameDayLeaveReason,
          date: today,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success("Same-day leave applied successfully!", {
          description: result.note || "Your leave application has been submitted for admin approval.",
        })
        setShowSameDayLeaveForm(false)
        setSameDayLeaveReason("")
        checkTodayAttendance() // Refresh the status
      } else {
        const error = await response.json()
        toast.error("Failed to apply leave", {
          description: error.error || "Please try again",
        })
      }
    } catch (error) {
      toast.error("Connection error", {
        description: "Unable to apply for leave",
      })
    } finally {
      setIsApplyingLeave(false)
    }
  }

  const formatTime12Hour = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: true,
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const formatTimeOnly12Hour = (timeString: string) => {
    const [hours, minutes] = timeString.split(":").map(Number)
    const date = new Date()
    date.setHours(hours, minutes, 0, 0)
    return date.toLocaleTimeString("en-US", {
      hour12: true,
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading attendance data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Message Card */}
      {statusMessage && (
        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <p className="text-sm font-medium text-blue-800">{statusMessage}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Status Card */}
      {employeeOptions && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Today's Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Badge 
                  variant={
                    employeeOptions.currentStatus === "checked_in" ? "default" :
                    employeeOptions.currentStatus === "on_leave" ? "secondary" :
                    employeeOptions.currentStatus === "leave_pending" ? "outline" :
                    employeeOptions.currentStatus === "attendance_only" ? "destructive" :
                    "secondary"
                  }
                  className="text-sm"
                >
                  {employeeOptions.currentStatus === "checked_in" && "✅ Checked In"}
                  {employeeOptions.currentStatus === "on_leave" && "🏖️ On Leave"}
                  {employeeOptions.currentStatus === "leave_pending" && "⏳ Leave Pending"}
                  {employeeOptions.currentStatus === "attendance_only" && "⚠️ Attendance Only"}
                  {employeeOptions.currentStatus === "available" && "📅 Available"}
                </Badge>
              </div>
              {employeeOptions.pendingLeave && (
                <div className="text-right">
                  <p className="text-sm text-gray-600">Pending: {employeeOptions.pendingLeave.leaveType}</p>
                  <p className="text-xs text-gray-500">{employeeOptions.pendingLeave.reason}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Time Card */}
      <Card className="shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center space-x-2">
            <Clock className="h-6 w-6 text-blue-600" />
            <span>Current Time</span>
          </CardTitle>
          <CardDescription>{formatDate(currentTime)}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-4xl font-bold text-blue-600 mb-4 font-mono">{formatTime12Hour(currentTime)}</div>
          <Badge variant={isCheckedIn ? "default" : "secondary"} className="text-lg px-4 py-2">
            {isCheckedIn ? "✅ Checked In" : "⏰ Not Checked In"}
          </Badge>
        </CardContent>
      </Card>

      {/* Attendance Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Check In Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span>Check In</span>
            </CardTitle>
            <CardDescription>Mark your arrival for today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showLateForm && (
              <div className="space-y-2">
                <Label htmlFor="late-reason">You're checking in late. Please provide a reason:</Label>
                <Textarea
                  id="late-reason"
                  placeholder="Reason for being late..."
                  value={lateReason}
                  onChange={(e) => setLateReason(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            )}
            <Button
              onClick={handleCheckIn}
              disabled={!canCheckIn || !canCheckInNow || isCheckingIn}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isCheckingIn ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking In...</span>
                </div>
              ) : !canCheckIn ? (
                employeeOptions?.currentStatus === "on_leave" ? "On Leave Today" :
                employeeOptions?.currentStatus === "leave_pending" ? "Leave Pending Approval" :
                employeeOptions?.currentStatus === "checked_in" ? "Already Checked In" :
                "Cannot Check In"
              ) : !canCheckInNow ? (
                "Check In (Available 5 min before shift)"
              ) : (
                "Check In"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Check Out Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-700">
              <XCircle className="h-5 w-5" />
              <span>Check Out</span>
            </CardTitle>
            <CardDescription>Mark your departure for today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showEarlyForm && (
              <div className="space-y-2">
                <Label htmlFor="early-reason">You're checking out early. Please provide a reason:</Label>
                <Textarea
                  id="early-reason"
                  placeholder="Reason for leaving early..."
                  value={earlyReason}
                  onChange={(e) => setEarlyReason(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            )}
            <Button
              onClick={handleCheckOut}
              disabled={!canCheckOut || isCheckingOut}
              variant="destructive"
              className="w-full"
            >
              {isCheckingOut ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking Out...</span>
                </div>
              ) : !canCheckOut ? (
                todayStatus === "on_leave" ? "On Leave Today" :
                !isCheckedIn ? "Not Checked In" : "Cannot Check Out"
              ) : (
                "Check Out"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Today's Status */}
      {todayStatus && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5" />
              <span>Today's Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-2">
              <Badge 
                variant={
                  todayStatus === "on_leave" ? "default" : 
                  todayStatus === "present" || isCheckedIn ? "default" : 
                  "destructive"
                }
                className="text-lg px-4 py-2"
              >
                {todayStatus === "on_leave" ? "🏠 On Leave" : 
                 todayStatus === "present" || isCheckedIn ? "✅ Checked In" :
                 todayStatus === "absent" ? "❌ Absent" :
                 "⏰ Available"}
              </Badge>
              {statusMessage && (
                <p className="text-sm text-gray-600 text-center">{statusMessage}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Same Day Leave Application */}
      {canApplyLeave && (
        <Card className="shadow-sm border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-700">
              <FileText className="h-5 w-5" />
              <span>Same-Day Leave</span>
            </CardTitle>
            <CardDescription>
              Can't come to work today? Apply for same-day emergency leave
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showSameDayLeaveForm ? (
              <Button
                onClick={() => setShowSameDayLeaveForm(true)}
                variant="outline"
                className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                Apply for Same-Day Leave
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="same-day-reason">Reason for emergency leave:</Label>
                  <Textarea
                    id="same-day-reason"
                    placeholder="Please provide a reason for your emergency leave today..."
                    value={sameDayLeaveReason}
                    onChange={(e) => setSameDayLeaveReason(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSameDayLeave}
                    disabled={isApplyingLeave || !sameDayLeaveReason.trim()}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {isApplyingLeave ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Applying...</span>
                      </div>
                    ) : (
                      "Submit Leave Application"
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowSameDayLeaveForm(false)
                      setSameDayLeaveReason("")
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
                <div className="text-sm text-gray-600 p-3 bg-blue-50 rounded">
                  <strong>Note:</strong> Same-day emergency leave requires admin approval. 
                  You will not be able to check in while your application is pending. 
                  If rejected, you can then check in normally.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dynamic Work Schedule */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-yellow-700">
            <AlertCircle className="h-5 w-5" />
            <span>Your Work Schedule</span>
          </CardTitle>
          <CardDescription>
            {userShift ? `${userShift.name} - ${userShift.description}` : "No shift assigned to this employee"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userShift ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{formatTimeOnly12Hour(userShift.startTime)}</div>
                <div className="text-sm text-gray-600">Start Time</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{formatTimeOnly12Hour(userShift.endTime)}</div>
                <div className="text-sm text-gray-600">End Time</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-orange-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Shift Assigned</h3>
              <p className="text-gray-500 mb-4">
                Please contact your administrator to assign a work shift to your account.
              </p>
              <div className="text-sm text-gray-400">
                Without a shift assignment, late/early notifications will not be available.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
