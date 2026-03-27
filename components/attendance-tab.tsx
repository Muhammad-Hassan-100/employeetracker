"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertCircle, CheckCircle2, Clock3, Loader2, LogOut, Siren } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { authFetch } from "@/lib/client-session"
import { formatLocalDateInput, getLocalTimeMinutes, getTimeStringMinutes } from "@/lib/attendance-time"
import type { SessionUser } from "@/lib/session"
import { formatTimeString12Hour } from "@/lib/time"

interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
  description?: string
}

interface AttendanceRecord {
  id: string
  status: "present" | "absent" | "on_leave"
  checkInTime: string | null
  checkOutTime: string | null
  isLate: boolean
  isEarly: boolean
  lateReason?: string | null
  earlyReason?: string | null
  hoursWorked?: number
}

interface AttendanceTabProps {
  user: SessionUser
}

interface AttendanceRules {
  checkInBeforeMinutes: number
  lateGraceMinutes: number
}

interface AttendancePolicySummary {
  mode: "open" | "office_ip" | "office_location" | "hybrid"
  isRestricted: boolean
  requiresLocation: boolean
  requiresApprovedNetwork: boolean
  radiusMeters: number
}

function formatClock(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function formatTime(time?: string | null) {
  if (!time) {
    return "Not recorded"
  }

  return new Date(time).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function getAttendanceAccessMessage(policy: AttendancePolicySummary) {
  if (policy.mode === "office_ip") {
    return "Check-in and check-out are allowed only from your approved office network."
  }

  if (policy.mode === "office_location") {
    return `Check-in and check-out are allowed only within your office radius of ${policy.radiusMeters} meters.`
  }

  if (policy.mode === "hybrid") {
    return `Check-in and check-out require both your approved office network and office location within ${policy.radiusMeters} meters.`
  }

  return ""
}

async function getClientPublicIp() {
  try {
    const response = await fetch("https://api.ipify.org?format=json", { cache: "no-store" })
    if (!response.ok) {
      return undefined
    }

    const data = await response.json()
    return typeof data.ip === "string" ? data.ip : undefined
  } catch {
    return undefined
  }
}

export default function AttendanceTab({ user }: AttendanceTabProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [shift, setShift] = useState<Shift | null>(null)
  const [record, setRecord] = useState<AttendanceRecord | null>(null)
  const [attendanceRules, setAttendanceRules] = useState<AttendanceRules>({
    checkInBeforeMinutes: 5,
    lateGraceMinutes: 0,
  })
  const [attendancePolicy, setAttendancePolicy] = useState<AttendancePolicySummary>({
    mode: "open",
    isRestricted: false,
    requiresLocation: false,
    requiresApprovedNetwork: false,
    radiusMeters: 150,
  })
  const [lateReason, setLateReason] = useState("")
  const [earlyReason, setEarlyReason] = useState("")
  const [showLateReason, setShowLateReason] = useState(false)
  const [showEarlyReason, setShowEarlyReason] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  const refreshAttendance = async () => {
    try {
      const [shiftResponse, todayResponse] = await Promise.all([
        authFetch(`/api/employees/shift?userId=${user.id}`),
        authFetch(`/api/attendance/today?userId=${user.id}`),
      ])

      if (shiftResponse.ok) {
        const shiftData = await shiftResponse.json()
        setShift(shiftData.shift)
        setAttendanceRules({
          checkInBeforeMinutes: shiftData.attendanceRules?.checkInBeforeMinutes ?? 5,
          lateGraceMinutes: shiftData.attendanceRules?.lateGraceMinutes ?? 0,
        })
        setAttendancePolicy({
          mode: shiftData.attendancePolicy?.mode ?? "open",
          isRestricted: Boolean(shiftData.attendancePolicy?.isRestricted),
          requiresLocation: Boolean(shiftData.attendancePolicy?.requiresLocation),
          requiresApprovedNetwork: Boolean(shiftData.attendancePolicy?.requiresApprovedNetwork),
          radiusMeters: shiftData.attendancePolicy?.radiusMeters ?? 150,
        })
      }

      if (todayResponse.ok) {
        const todayData = await todayResponse.json()
        setRecord(todayData.record)
      }
    } catch {
      toast.error("Unable to load attendance", {
        description: "Please check your connection and try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setCurrentTime(new Date())
    refreshAttendance()

    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000)
    const refreshTimer = setInterval(() => {
      refreshAttendance()
    }, 15000)

    return () => {
      clearInterval(clockTimer)
      clearInterval(refreshTimer)
    }
  }, [user.id])

  const currentTimeMinutes = useMemo(() => getLocalTimeMinutes(currentTime), [currentTime])
  const shiftStartMinutes = useMemo(() => (shift ? getTimeStringMinutes(shift.startTime) : null), [shift])
  const shiftEndMinutes = useMemo(() => (shift ? getTimeStringMinutes(shift.endTime) : null), [shift])
  const earliestCheckIn = useMemo(
    () => (shiftStartMinutes !== null ? shiftStartMinutes - attendanceRules.checkInBeforeMinutes : null),
    [attendanceRules.checkInBeforeMinutes, shiftStartMinutes],
  )
  const lateCutoff = useMemo(
    () => (shiftStartMinutes !== null ? shiftStartMinutes + attendanceRules.lateGraceMinutes : null),
    [attendanceRules.lateGraceMinutes, shiftStartMinutes],
  )
  const isCheckedIn = Boolean(record?.checkInTime && !record?.checkOutTime)
  const isAlreadyCompleted = Boolean(record?.checkInTime && record?.checkOutTime)
  const isOnLeave = record?.status === "on_leave"
  const canCheckInWindow = earliestCheckIn === null || currentTimeMinutes >= earliestCheckIn
  const isLate = lateCutoff !== null && currentTimeMinutes > lateCutoff
  const isEarly = shiftEndMinutes !== null && currentTimeMinutes < shiftEndMinutes
  const shouldRequireEarlyReason = isCheckedIn && isEarly
  const earliestCheckInLabel = earliestCheckIn !== null
    ? formatTimeString12Hour(`${String(Math.floor(earliestCheckIn / 60)).padStart(2, "0")}:${String(earliestCheckIn % 60).padStart(2, "0")}`)
    : null
  const lateCutoffLabel = lateCutoff !== null
    ? formatTimeString12Hour(`${String(Math.floor(lateCutoff / 60)).padStart(2, "0")}:${String(lateCutoff % 60).padStart(2, "0")}`)
    : null
  const checkInDisabled = isCheckingIn || isCheckedIn || isAlreadyCompleted || isOnLeave || !canCheckInWindow
  const checkOutDisabled = isCheckingOut || !isCheckedIn || isOnLeave
  const attendanceAccessMessage = getAttendanceAccessMessage(attendancePolicy)

  const statusMeta = isOnLeave
    ? { label: "Approved Leave", tone: "bg-amber-100 text-amber-900" }
    : isCheckedIn
      ? { label: "Checked In", tone: "bg-emerald-100 text-emerald-900" }
      : isAlreadyCompleted
        ? { label: "Checked Out", tone: "bg-sky-100 text-sky-900" }
        : { label: "Ready to Start", tone: "bg-slate-100 text-slate-900" }

  const handleCheckIn = async () => {
    if (isLate && !lateReason.trim()) {
      setShowLateReason(true)
      toast.error("Late reason required", {
        description: "Please explain the late arrival before checking in.",
      })
      return
    }

    setIsCheckingIn(true)

    try {
      const actionTime = new Date()
      const clientPublicIp = attendancePolicy.requiresApprovedNetwork ? await getClientPublicIp() : undefined
      let locationPayload: { latitude?: number; longitude?: number } = {}
      if (attendancePolicy.requiresLocation) {
        if (typeof window === "undefined" || !window.navigator.geolocation) {
          throw new Error("Location access is required for attendance on this company policy.")
        }

        locationPayload = await new Promise((resolve, reject) => {
          window.navigator.geolocation.getCurrentPosition(
            (position) =>
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              }),
            () => reject(new Error("Location access is required for attendance on this company policy.")),
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            },
          )
        })
      }

      const response = await authFetch("/api/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          checkInTime: actionTime.toISOString(),
          localDate: formatLocalDateInput(actionTime),
          localTimeMinutes: getLocalTimeMinutes(actionTime),
          isLate,
          lateReason: isLate ? lateReason.trim() : null,
          ...(clientPublicIp ? { clientPublicIp } : {}),
          ...locationPayload,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error("Check-in failed", { description: data.error || "Please try again." })
        return
      }

      setLateReason("")
      setShowLateReason(false)
      toast.success("Checked in successfully", {
        description: shift ? `Your active shift is ${shift.name}.` : "Attendance marked for today.",
      })
      await refreshAttendance()
    } catch (error) {
      toast.error("Check-in failed", {
        description: error instanceof Error ? error.message : "Unable to complete the request.",
      })
    } finally {
      setIsCheckingIn(false)
    }
  }

  const handleCheckOut = async () => {
    const actionTime = new Date()
    const actionTimeMinutes = getLocalTimeMinutes(actionTime)
    const isEarlyAtAction = shiftEndMinutes !== null && actionTimeMinutes < shiftEndMinutes

    if (isEarlyAtAction && !earlyReason.trim()) {
      setShowEarlyReason(true)
      toast.error("Early checkout reason required", {
        description: "Please explain why you are leaving before shift end.",
      })
      return
    }

    setIsCheckingOut(true)

    try {
      const clientPublicIp = attendancePolicy.requiresApprovedNetwork ? await getClientPublicIp() : undefined
      let locationPayload: { latitude?: number; longitude?: number } = {}
      if (attendancePolicy.requiresLocation) {
        if (typeof window === "undefined" || !window.navigator.geolocation) {
          throw new Error("Location access is required for attendance on this company policy.")
        }

        locationPayload = await new Promise((resolve, reject) => {
          window.navigator.geolocation.getCurrentPosition(
            (position) =>
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              }),
            () => reject(new Error("Location access is required for attendance on this company policy.")),
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            },
          )
        })
      }

      const response = await authFetch("/api/attendance/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          checkOutTime: actionTime.toISOString(),
          localDate: formatLocalDateInput(actionTime),
          localTimeMinutes: getLocalTimeMinutes(actionTime),
          isEarly: isEarlyAtAction,
          earlyReason: isEarlyAtAction ? earlyReason.trim() : null,
          ...(clientPublicIp ? { clientPublicIp } : {}),
          ...locationPayload,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        if (String(data.error || "").toLowerCase().includes("early checkout reason")) {
          setShowEarlyReason(true)
        }
        toast.error("Check-out failed", { description: data.error || "Please try again." })
        return
      }

      setEarlyReason("")
      setShowEarlyReason(false)
      toast.success("Checked out successfully", {
        description: `Total hours worked today: ${data.hoursWorked}.`,
      })
      await refreshAttendance()
    } catch (error) {
      toast.error("Check-out failed", {
        description: error instanceof Error ? error.message : "Unable to complete the request.",
      })
    } finally {
      setIsCheckingOut(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm text-slate-600">Loading attendance workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="rounded-3xl border-0 bg-slate-950 text-white shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Clock3 className="h-6 w-6 text-emerald-300" />
              Live Shift Clock
            </CardTitle>
            <CardDescription className="text-slate-300">{formatDate(currentTime)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="text-5xl font-extrabold tracking-tight">{formatClock(currentTime)}</div>
            <div className="flex flex-wrap gap-3">
              <Badge className={`${statusMeta.tone} border-0 px-3 py-1.5 text-sm`}>{statusMeta.label}</Badge>
              {shift && <Badge className="border-0 bg-white/10 px-3 py-1.5 text-sm text-white">{shift.name}</Badge>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-slate-400">Shift Window</p>
                <p className="mt-1 text-lg font-semibold">
                  {shift
                    ? `${formatTimeString12Hour(shift.startTime)} to ${formatTimeString12Hour(shift.endTime)}`
                    : "No shift assigned yet"}
                </p>
                {shift && (
                  <p className="mt-2 text-xs text-slate-300">
                    Check-in before: {attendanceRules.checkInBeforeMinutes} min | Late grace: {attendanceRules.lateGraceMinutes} min
                  </p>
                )}
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-slate-400">Today</p>
                <p className="mt-1 text-lg font-semibold">
                  {record?.checkInTime ? `${formatTime(record.checkInTime)} check-in` : "Waiting for attendance"}
                </p>
                <p className="mt-2 text-xs text-slate-300">
                  {isCheckedIn
                    ? "You are currently clocked in."
                    : isAlreadyCompleted
                      ? "Your attendance is complete for today."
                      : isOnLeave
                        ? "Your approved leave is active today."
                        : "Use the action cards to start or end your shift."}
                </p>
              </div>
            </div>
            {attendancePolicy.isRestricted && (
              <div className="flex items-start gap-3 rounded-2xl border border-sky-400/30 bg-sky-400/10 p-4 text-sky-50">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium">Attendance access is restricted by your company.</p>
                  <p className="text-sky-100">{attendanceAccessMessage}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="rounded-3xl border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
                Check In
              </CardTitle>
              <CardDescription>
                {isOnLeave
                  ? "Check-in is disabled because your leave is approved for today."
                  : isAlreadyCompleted
                    ? "You already completed today's attendance."
                    : isCheckedIn
                      ? "You are already checked in for this shift."
                      : canCheckInWindow
                        ? attendancePolicy.requiresLocation
                          ? "Your shift is ready to start. Location permission will be requested when you continue."
                          : "Your shift is ready to start."
                        : `Check-in opens at ${earliestCheckInLabel}.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleCheckIn}
                disabled={checkInDisabled}
                className="h-16 w-full rounded-[22px] bg-emerald-600 text-lg font-semibold shadow-lg shadow-emerald-200 hover:bg-emerald-700"
              >
                {isCheckingIn ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Preparing check-in...
                  </>
                ) : (
                  "Check In"
                )}
              </Button>

              {showLateReason && (
                <div className="space-y-2">
                  <Label htmlFor="late-reason">Late arrival reason</Label>
                  <Textarea
                    id="late-reason"
                    value={lateReason}
                    onChange={(event) => setLateReason(event.target.value)}
                    placeholder="Explain why you are checking in late..."
                    className="min-h-[110px]"
                  />
                </div>
              )}

              {!canCheckInWindow && !isCheckedIn && !isAlreadyCompleted && shift && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="text-sm">
                    Check-in becomes available {attendanceRules.checkInBeforeMinutes} minutes before your shift starts.
                    Earliest time: {earliestCheckInLabel}
                  </p>
                </div>
              )}

              {isLate && !isCheckedIn && !isAlreadyCompleted && (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
                  <Siren className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="text-sm">You are past the late grace window, so a late arrival reason is required before check-in.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-rose-200 bg-gradient-to-br from-rose-50 to-white shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-rose-700">
                <LogOut className="h-5 w-5" />
                Check Out
              </CardTitle>
              <CardDescription>
                {isOnLeave
                  ? "Check-out is disabled because your leave is approved for today."
                  : isAlreadyCompleted
                    ? "You already checked out for today."
                    : isCheckedIn
                      ? attendancePolicy.requiresLocation
                        ? "End your shift here when you are ready to leave. Location permission will be requested first."
                        : "End your shift here when you are ready to leave."
                      : "Check-out becomes available after you check in."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleCheckOut}
                disabled={checkOutDisabled}
                className="h-16 w-full rounded-[22px] bg-rose-600 text-lg font-semibold shadow-lg shadow-rose-200 hover:bg-rose-700"
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Preparing check-out...
                  </>
                ) : (
                  "Check Out"
                )}
              </Button>

              {(showEarlyReason || shouldRequireEarlyReason) && (
                <div className="space-y-2">
                  <Label htmlFor="early-reason">Early checkout reason</Label>
                  <Textarea
                    id="early-reason"
                    value={earlyReason}
                    onChange={(event) => setEarlyReason(event.target.value)}
                    placeholder="Explain why you are checking out early..."
                    className="min-h-[110px]"
                  />
                </div>
              )}

              {shouldRequireEarlyReason && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                  <Siren className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="text-sm">You are checking out before shift end, so an early checkout reason is required.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="rounded-3xl border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Attendance Summary</CardTitle>
          <CardDescription>Today's attendance details are shown here.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Check In</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{formatTime(record?.checkInTime)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Check Out</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{formatTime(record?.checkOutTime)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Hours Worked</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{record?.hoursWorked?.toFixed?.(2) ?? "0.00"}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Earliest Check In</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{earliestCheckInLabel ?? "Available now"}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Late Cutoff</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{lateCutoffLabel ?? "Not configured"}</p>
          </div>
        </CardContent>
      </Card>

      {(isLate || isEarly || isOnLeave) && (
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Siren className="h-5 w-5 text-amber-600" />
              Attendance Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            {isLate && <p>You are currently past shift start time, so a late reason is required for check-in.</p>}
            {lateCutoff && shift && <p>Late mark cutoff: {lateCutoffLabel}</p>}
            {isEarly && isCheckedIn && <p>You are checking out before shift end, so an early checkout reason is required.</p>}
            {isOnLeave && <p>Your leave has been approved for today, so attendance actions remain disabled.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
