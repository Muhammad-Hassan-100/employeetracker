"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react"
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
      const response = await fetch(`/api/attendance/today?userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setIsCheckedIn(data.isCheckedIn)
      }
    } catch (error) {
      console.error("Error checking attendance:", error)
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
        setShowLateForm(false)
        setLateReason("")
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
              disabled={isCheckedIn || isCheckingIn || !canCheckInNow}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isCheckingIn ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking In...</span>
                </div>
              ) : isCheckedIn ? (
                "Already Checked In"
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
              disabled={!isCheckedIn || isCheckingOut}
              variant="destructive"
              className="w-full"
            >
              {isCheckingOut ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking Out...</span>
                </div>
              ) : !isCheckedIn ? (
                "Not Checked In"
              ) : (
                "Check Out"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

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
