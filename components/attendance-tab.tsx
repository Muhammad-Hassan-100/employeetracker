"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertCircle, CheckCircle2, Clock3, Coffee, Loader2, LogOut, Siren } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { authFetch } from "@/lib/client-session"
import {
  formatLocalDateInput,
  formatDurationMinutes,
  getAttendanceWindowState,
  getLocalDateDifference,
  getNoCheckInShiftStatus,
  getLocalTimeMinutes,
  getTimeStringFromMinutes,
  getTimeStringMinutes,
} from "@/lib/attendance-time"
import type { SessionUser } from "@/lib/session"
import { formatTimeString12Hour } from "@/lib/time"

interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
  description?: string
}

function dateInputToLocalDate(dateInput: string) {
  const [year, month, day] = dateInput.split("-").map(Number)
  return new Date(year, month - 1, day, 12)
}

interface AttendanceRecord {
  id: string
  status: "present" | "absent" | "on_leave"
  absenceReason?: string | null
  checkoutWindowExpired?: boolean
  checkInTime: string | null
  checkOutTime: string | null
  isLate: boolean
  isEarly: boolean
  lateReason?: string | null
  earlyReason?: string | null
  lateCheckoutReason?: string | null
  hoursWorked?: number
  date?: string
  breakTaken?: boolean
  breakStartTime?: string | null
  breakEndTime?: string | null
  breakDurationMinutes?: number
}

interface AttendanceTabProps {
  user: SessionUser
}

interface AttendanceRules {
  checkInBeforeMinutes: number
  lateGraceMinutes: number
  checkOutGraceMinutes: number
}

interface AttendancePolicySummary {
  mode: "open" | "office_ip"
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
  const [shiftDate, setShiftDate] = useState<string | null>(null)
  const [record, setRecord] = useState<AttendanceRecord | null>(null)
  const [hasShiftAssignedToday, setHasShiftAssignedToday] = useState(false)
  const [attendanceRules, setAttendanceRules] = useState<AttendanceRules>({
    checkInBeforeMinutes: 5,
    lateGraceMinutes: 5,
    checkOutGraceMinutes: 0,
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
  const [isUpdatingBreak, setIsUpdatingBreak] = useState(false)

  const refreshAttendance = async () => {
    try {
      const now = new Date()
      const localDate = formatLocalDateInput(now)
      const localTimeMinutes = getLocalTimeMinutes(now)
      const attendanceQuery = `userId=${user.id}&localDate=${localDate}&localTimeMinutes=${localTimeMinutes}`
      const [shiftResponse, todayResponse] = await Promise.all([
        authFetch(`/api/employees/shift?${attendanceQuery}`),
        authFetch(`/api/attendance/today?${attendanceQuery}`),
      ])

      if (shiftResponse.ok) {
        const shiftData = await shiftResponse.json()
        setShift(shiftData.shift)
        setShiftDate(shiftData.shiftDate || localDate)
        setHasShiftAssignedToday(Boolean(shiftData.user?.hasShiftAssigned))
        setAttendanceRules({
          checkInBeforeMinutes: shiftData.attendanceRules?.checkInBeforeMinutes ?? 5,
          lateGraceMinutes: shiftData.attendanceRules?.lateGraceMinutes ?? 5,
          checkOutGraceMinutes: shiftData.attendanceRules?.checkOutGraceMinutes ?? 0,
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
  const currentDateInput = useMemo(() => formatLocalDateInput(currentTime), [currentTime])
  const attendanceDateInput = record?.date || shiftDate || currentDateInput
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
  const hasOpenCheckIn = Boolean(record?.checkInTime && !record?.checkOutTime)
  const isOnBreak = Boolean(record?.breakStartTime && !record?.breakEndTime)
  const hasUsedBreak = Boolean(record?.breakTaken || record?.breakStartTime || record?.breakEndTime)
  const breakElapsedSeconds = isOnBreak && record?.breakStartTime
    ? Math.max(0, Math.floor((currentTime.getTime() - new Date(record.breakStartTime).getTime()) / 1000))
    : 0
  const isAlreadyCompleted = Boolean(record?.checkInTime && record?.checkOutTime)
  const isOnLeave = record?.status === "on_leave"
  const isAbsent = record?.status === "absent"
  const elapsedShiftMinutes = getLocalDateDifference(attendanceDateInput, currentDateInput) * 1440 + currentTimeMinutes
  const canCheckInWindow = earliestCheckIn === null || elapsedShiftMinutes >= earliestCheckIn
  const isLate = lateCutoff !== null && elapsedShiftMinutes > lateCutoff
  const checkoutWindowState =
    shiftStartMinutes !== null && shiftEndMinutes !== null
      ? getAttendanceWindowState({
          currentDateInput,
          currentMinutes: currentTimeMinutes,
          graceMinutes: attendanceRules.checkOutGraceMinutes,
          lateCheckoutGraceMinutes: attendanceRules.checkOutGraceMinutes,
          recordDateInput: attendanceDateInput,
          startMinutes: shiftStartMinutes,
          endMinutes: shiftEndMinutes,
        })
      : null
  const isCheckoutExpired = Boolean(record?.checkoutWindowExpired || checkoutWindowState?.isCheckoutExpired)
  const isCheckedIn = hasOpenCheckIn && !isCheckoutExpired
  const isMissingCheckoutAbsent = Boolean(
    record?.absenceReason === "missing_checkout" || (hasOpenCheckIn && isCheckoutExpired),
  )
  const shiftStartAbsoluteMinutes = shiftStartMinutes !== null && shiftEndMinutes !== null && checkoutWindowState
    ? shiftStartMinutes
    : null
  const canStartBreak = Boolean(
    isCheckedIn && !hasUsedBreak && checkoutWindowState?.isBeforeShiftEnd && shiftStartAbsoluteMinutes !== null &&
    checkoutWindowState.absoluteCurrentMinutes >= shiftStartAbsoluteMinutes,
  )
  const noCheckInStatus = shift && shiftStartMinutes !== null && shiftEndMinutes !== null
    ? getNoCheckInShiftStatus({
        currentDateInput,
        currentMinutes: currentTimeMinutes,
        recordDateInput: attendanceDateInput,
        startMinutes: shiftStartMinutes,
        endMinutes: shiftEndMinutes,
      })
    : null
  const isScheduledForShift = noCheckInStatus === "scheduled" && !record
  const isNoShow = noCheckInStatus === "no_show" && !isCheckedIn && !isAlreadyCompleted && !isOnLeave && !isAbsent
  const isEarly = Boolean(checkoutWindowState?.isBeforeShiftEnd)
  const hasMissedShift =
    isAbsent ||
    Boolean(
      shift &&
        checkoutWindowState &&
        !checkoutWindowState.isBeforeShiftEnd &&
        !isCheckedIn &&
        !isAlreadyCompleted &&
        !isOnLeave,
    )
  const shouldRequireEarlyReason = isCheckedIn && isEarly
  const earliestCheckInLabel = earliestCheckIn !== null
    ? formatTimeString12Hour(getTimeStringFromMinutes(earliestCheckIn))
    : null
  const lateCutoffLabel = lateCutoff !== null
    ? formatTimeString12Hour(getTimeStringFromMinutes(lateCutoff))
    : null
  const normalCheckoutCutoffLabel = checkoutWindowState
    ? formatTimeString12Hour(getTimeStringFromMinutes(checkoutWindowState.normalCheckoutDeadlineMinutes))
    : null
  const isScheduledOffDay = !hasShiftAssignedToday && !isCheckedIn && !isAlreadyCompleted && !isOnLeave && !hasMissedShift
  const checkInDisabled =
    isCheckingIn || isCheckedIn || isAlreadyCompleted || isOnLeave || isScheduledOffDay || hasMissedShift || !canCheckInWindow
  const checkOutDisabled = isCheckingOut || !isCheckedIn || isOnLeave || isOnBreak || isCheckoutExpired
  const attendanceAccessMessage = getAttendanceAccessMessage(attendancePolicy)

  const statusMeta = isOnLeave
    ? { label: "Approved Leave", tone: "bg-amber-100 text-amber-900" }
    : isScheduledOffDay
      ? { label: "Off Day", tone: "bg-slate-200 text-slate-900" }
    : hasMissedShift
      ? { label: "Absent", tone: "bg-rose-100 text-rose-900" }
    : isNoShow
      ? { label: "Not come yet", tone: "bg-orange-100 text-orange-900" }
    : isOnBreak
      ? { label: "On break", tone: "bg-amber-100 text-amber-900" }
    : record?.isLate
      ? { label: "Late", tone: "bg-orange-100 text-orange-900" }
    : isCheckedIn
      ? { label: "Checked In", tone: "bg-emerald-100 text-emerald-900" }
      : isAlreadyCompleted
        ? { label: "Checked Out", tone: "bg-sky-100 text-sky-900" }
        : isScheduledForShift
          ? { label: "Scheduled", tone: "bg-slate-100 text-slate-900" }
          : { label: "Ready to Start", tone: "bg-slate-100 text-slate-900" }

  const handleCheckIn = async () => {
    if (hasMissedShift) {
      toast.error("Shift missed", {
        description: "Your shift has already ended, so you are marked absent for today.",
      })
      return
    }

    if (isScheduledOffDay) {
      toast.error("No shift scheduled", {
        description: "This employee does not have a shift assigned for today.",
      })
      return
    }

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
    if (isOnBreak) {
      toast.error("End your break first", { description: "Your checkout is available after you return from your break." })
      return
    }
    const actionTime = new Date()
    const actionTimeMinutes = getLocalTimeMinutes(actionTime)
    const actionLocalDateInput = formatLocalDateInput(actionTime)
    const checkoutStateAtAction =
      shiftStartMinutes !== null && shiftEndMinutes !== null
        ? getAttendanceWindowState({
            currentDateInput: actionLocalDateInput,
            currentMinutes: actionTimeMinutes,
            graceMinutes: attendanceRules.checkOutGraceMinutes,
            lateCheckoutGraceMinutes: attendanceRules.checkOutGraceMinutes,
            recordDateInput: record?.date || actionLocalDateInput,
            startMinutes: shiftStartMinutes,
            endMinutes: shiftEndMinutes,
          })
        : null
    const isEarlyAtAction = Boolean(checkoutStateAtAction?.isBeforeShiftEnd)
    if (checkoutStateAtAction?.isCheckoutExpired) {
      toast.error("Checkout deadline passed", {
        description: "This shift is marked absent and can no longer be checked out.",
      })
      await refreshAttendance()
      return
    }

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
          localDate: actionLocalDateInput,
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

  const handleBreakAction = async (action: "start" | "end") => {
    setIsUpdatingBreak(true)
    try {
      const clientPublicIp = attendancePolicy.requiresApprovedNetwork ? await getClientPublicIp() : undefined
      const response = await authFetch("/api/attendance/break", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          action,
          localDate: formatLocalDateInput(),
          localTimeMinutes: getLocalTimeMinutes(),
          ...(clientPublicIp ? { clientPublicIp } : {}),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(action === "start" ? "Could not start break" : "Could not end break", { description: data.error || "Please try again." })
        await refreshAttendance()
        return
      }
      toast.success(action === "start" ? "Break started" : "Welcome back", {
        description: action === "start" ? "Your shift clock keeps running during this break." : `Break recorded: ${formatDurationMinutes(Number(data.breakDurationMinutes || 0))}.`,
      })
      await refreshAttendance()
    } catch {
      toast.error("Break update failed", { description: "Please check your connection and try again." })
    } finally {
      setIsUpdatingBreak(false)
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
    <div className="space-y-6" data-dashboard-view="employee-attendance">
      <section className="overflow-hidden rounded-[28px] border border-[var(--dashboard-border-soft)] bg-white shadow-[0_12px_34px_rgba(31,48,35,0.06)]">
        <div className="grid lg:grid-cols-[1.12fr_0.88fr]">
          <div className="relative overflow-hidden bg-[linear-gradient(135deg,#f4f7ef_0%,#ffffff_72%)] p-6 sm:p-9">
            <div className="absolute -right-20 -top-24 size-64 rounded-full bg-[#e7efdf]/70 blur-3xl" />
            <div className="relative">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dashboard-muted)]">{shiftDate && shiftDate !== currentDateInput ? "Your active shift" : "Your shift today"}</p>
                  <p className="mt-1 text-sm text-[var(--dashboard-muted)]">{formatDate(dateInputToLocalDate(shiftDate || currentDateInput))}</p>
                </div>
                <Badge className={`${statusMeta.tone} border-0 px-3 py-1.5 text-sm`}>{statusMeta.label}</Badge>
              </div>

              <div className="mt-8 flex items-end gap-3">
                <Clock3 className="mb-2 size-6 text-[var(--dashboard-green-text)]" />
                <p className="text-5xl font-semibold tracking-[-0.06em] text-[var(--dashboard-ink)] sm:text-6xl">{formatClock(currentTime)}</p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/90 bg-white/85 p-4 shadow-sm shadow-slate-900/[0.03]">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--dashboard-muted)]">Shift window</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--dashboard-ink)]">
                    {shift ? `${formatTimeString12Hour(shift.startTime)} – ${formatTimeString12Hour(shift.endTime)}` : "No shift assigned"}
                  </p>
                  <p className="mt-1 text-sm text-[var(--dashboard-muted)]">{shift?.name || "Check your schedule with your manager"}</p>
                </div>
                <div className="rounded-2xl border border-white/90 bg-white/85 p-4 shadow-sm shadow-slate-900/[0.03]">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--dashboard-muted)]">Shift attendance</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--dashboard-ink)]">
                    {record?.checkInTime
                      ? `${formatTime(record.checkInTime)} check-in`
                      : isScheduledForShift && shift
                        ? `Starts at ${formatTimeString12Hour(shift.startTime)}`
                        : isNoShow
                          ? "Not come yet"
                          : hasMissedShift
                            ? "Shift ended · Absent"
                            : isOnLeave
                              ? "Approved leave"
                              : "Attendance pending"}
                  </p>
                  <p className="mt-1 text-sm text-[var(--dashboard-muted)]">
                    {isMissingCheckoutAbsent
                      ? record?.checkoutWindowExpired
                        ? "Checkout correction window closed"
                        : "Absent status · checkout correction open"
                      : record?.isLate
                        ? `Late arrival${record.lateReason ? ` · ${record.lateReason}` : ""}`
                        : isCheckedIn
                          ? "You are clocked in for this shift"
                          : isNoShow
                            ? "No check-in has been recorded"
                            : isScheduledForShift
                              ? `Check-in opens at ${earliestCheckInLabel}`
                              : isAlreadyCompleted
                                ? "Your shift attendance is complete"
                                : isOnLeave
                            ? "You do not need to check in for this shift"
                                  : "Your attendance details will appear here"}
                  </p>
                </div>
              </div>

              {attendancePolicy.isRestricted && (
                <div className="relative mt-4 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-900">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">Attendance access is restricted</p>
                    <p className="text-sky-800">{attendanceAccessMessage}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-[var(--dashboard-border-soft)] p-6 sm:p-8 lg:border-l lg:border-t-0">
            <div className="flex h-full flex-col justify-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--dashboard-muted)]">Next action</p>

              {isOnLeave ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
                  <p className="font-semibold">You’re on approved leave</p>
                  <p className="mt-1 text-sm text-amber-800">No check-in or checkout is needed for today.</p>
                </div>
              ) : isScheduledOffDay ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-800">
                  <p className="font-semibold">No shift scheduled</p>
                  <p className="mt-1 text-sm text-slate-600">Attendance actions are unavailable for today.</p>
                </div>
              ) : isAlreadyCompleted ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
                  <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="size-5" /> Shift complete</div>
                  <p className="mt-1 text-sm text-emerald-800">Checked out at {formatTime(record?.checkOutTime)}. Your attendance is saved.</p>
                </div>
              ) : hasMissedShift && !isMissingCheckoutAbsent ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-950">
                  <p className="font-semibold">Absent · no check-in recorded</p>
                  <p className="mt-1 text-sm text-rose-800">The shift has ended, so check-in is closed for today.</p>
                </div>
              ) : isMissingCheckoutAbsent && !isCheckedIn ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-950">
                  <p className="font-semibold">Absent · checkout missing</p>
                  <p className="mt-1 text-sm text-rose-800">The normal checkout deadline has passed. This shift is marked absent and checkout is closed.</p>
                </div>
              ) : isCheckedIn ? (
                <div className="mt-4">
                  <div className="rounded-2xl border border-[var(--dashboard-border-soft)] bg-white p-5">
                    <div className="flex items-center gap-2 text-sm font-medium text-[var(--dashboard-green-text)]">
                      <span className="size-2 rounded-full bg-[var(--dashboard-green-text)]" />
                      You’re checked in
                    </div>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--dashboard-ink)]">End your shift</h2>
                    <p className="mt-1 text-sm leading-6 text-[var(--dashboard-muted)]">
                      {attendancePolicy.requiresLocation
                        ? "Check out when you finish work. Location permission will be requested first."
                        : "Record your checkout to save today’s hours."}
                    </p>
                    {(canStartBreak || hasUsedBreak) && (
                      <div className={`mt-4 rounded-xl border p-4 ${isOnBreak ? "border-amber-200 bg-amber-50" : "border-[var(--dashboard-border-soft)] bg-[#f7f8f5]"}`}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <Coffee className={`mt-0.5 size-5 ${isOnBreak ? "text-amber-700" : "text-[var(--dashboard-green-text)]"}`} />
                            <div>
                              <p className="font-semibold text-[var(--dashboard-ink)]">{isOnBreak ? "Break in progress" : record?.breakEndTime ? "Break complete" : "Your shift break"}</p>
                              <p className="mt-1 text-sm text-[var(--dashboard-muted)]">
                                {isOnBreak
                                  ? `Elapsed ${Math.floor(breakElapsedSeconds / 60)}m ${String(breakElapsedSeconds % 60).padStart(2, "0")}s · shift clock continues`
                                  : record?.breakEndTime
                                    ? `${formatDurationMinutes(Number(record.breakDurationMinutes || 0))} recorded · no second break this shift`
                                    : "One break per shift. Your shift time continues while you are away."}
                              </p>
                            </div>
                          </div>
                          {isOnBreak ? (
                            <Button onClick={() => handleBreakAction("end")} disabled={isUpdatingBreak} className="h-11 rounded-xl bg-[var(--dashboard-green)] px-4 font-semibold text-white hover:bg-[var(--dashboard-green-hover)]">
                              {isUpdatingBreak ? <><Loader2 className="mr-2 size-4 animate-spin" />Saving...</> : <><Coffee className="mr-2 size-4" />End break</>}
                            </Button>
                          ) : canStartBreak ? (
                            <Button variant="outline" onClick={() => handleBreakAction("start")} disabled={isUpdatingBreak} className="h-11 rounded-xl border-[var(--dashboard-border-soft)] bg-white px-4 font-semibold">
                              {isUpdatingBreak ? <><Loader2 className="mr-2 size-4 animate-spin" />Starting...</> : <><Coffee className="mr-2 size-4" />Start break</>}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    )}
                    <Button onClick={handleCheckOut} disabled={checkOutDisabled} className="mt-5 h-12 w-full rounded-xl bg-[var(--dashboard-green)] font-semibold text-white shadow-sm transition hover:bg-[var(--dashboard-green-hover)]">
                      {isCheckingOut ? <><Loader2 className="mr-2 size-4 animate-spin" />Checking out…</> : <><LogOut className="mr-2 size-4" />Check out</>}
                    </Button>
                    {(showEarlyReason || shouldRequireEarlyReason) && (
                      <div className="mt-4 space-y-2">
                        <Label htmlFor="early-reason">Early checkout reason</Label>
                        <Textarea id="early-reason" value={earlyReason} onChange={(event) => setEarlyReason(event.target.value)} placeholder="Explain why you are leaving before shift end..." className="min-h-[90px] rounded-xl" />
                      </div>
                    )}
                    {shouldRequireEarlyReason && <p className="mt-3 text-sm text-amber-800">A reason is required because you’re checking out before shift end.</p>}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-[var(--dashboard-border-soft)] bg-white p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--dashboard-muted)]">
                    <span className={`size-2 rounded-full ${isNoShow ? "bg-orange-500" : "bg-slate-300"}`} />
                    {isNoShow ? "Not come yet" : isScheduledForShift ? "Scheduled" : "Check-in"}
                  </div>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--dashboard-ink)]">
                    {isNoShow ? "Check in when you arrive" : isScheduledForShift ? "Your shift hasn’t started" : "Start your shift"}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-[var(--dashboard-muted)]">
                    {isNoShow
                      ? isLate
                        ? "A late arrival reason is required before you check in."
                        : "A check-in hasn’t been recorded yet. You may still check in until shift end."
                      : isScheduledForShift && canCheckInWindow
                        ? "Your early check-in window is open. Check in now to start your shift."
                      : `Check-in opens ${attendanceRules.checkInBeforeMinutes} minutes before your shift.`}
                  </p>
                  <Button onClick={handleCheckIn} disabled={checkInDisabled} className="mt-5 h-12 w-full rounded-xl bg-[var(--dashboard-green)] font-semibold text-white shadow-sm transition hover:bg-[var(--dashboard-green-hover)]">
                    {isCheckingIn ? <><Loader2 className="mr-2 size-4 animate-spin" />Checking in…</> : !canCheckInWindow ? `Opens at ${earliestCheckInLabel}` : <><CheckCircle2 className="mr-2 size-4" />{isLate ? "Check in · late" : "Check in"}</>}
                  </Button>
                  {showLateReason && !hasMissedShift && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="late-reason">Late arrival reason</Label>
                      <Textarea id="late-reason" value={lateReason} onChange={(event) => setLateReason(event.target.value)} placeholder="Explain why you are checking in late..." className="min-h-[90px] rounded-xl" />
                    </div>
                  )}
                  {isNoShow && isLate && <p className="mt-3 text-sm text-orange-800">Your late grace period has passed. Add a reason to continue.</p>}
                  {!canCheckInWindow && shift && <p className="mt-3 text-center text-xs text-[var(--dashboard-muted)]">Earliest check-in: {earliestCheckInLabel}</p>}
                </div>
              )}

              {attendancePolicy.isRestricted && <p className="mt-4 text-xs leading-5 text-[var(--dashboard-muted)]">Company attendance restrictions apply to this action.</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-[var(--dashboard-border-soft)] bg-white p-5 shadow-[0_8px_24px_rgba(31,48,35,0.04)] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--dashboard-muted)]">Attendance record</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-[var(--dashboard-ink)]">This shift at a glance</h2>
          </div>
          {record?.isLate && <Badge className="border-0 bg-orange-100 text-orange-900">Late check-in</Badge>}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Check in", value: formatTime(record?.checkInTime) },
            { label: "Check out", value: formatTime(record?.checkOutTime) },
            { label: "Break", value: isOnBreak ? "In progress" : hasUsedBreak ? formatDurationMinutes(Number(record?.breakDurationMinutes || 0)) : "Not taken" },
            { label: "Hours worked", value: record?.hoursWorked?.toFixed?.(2) ?? "0.00" },
            { label: "Late cutoff", value: lateCutoffLabel ?? "Not configured" },
            { label: "Absent if no checkout", value: normalCheckoutCutoffLabel || (shift ? formatTimeString12Hour(shift.endTime) : "Shift end") },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl bg-[#f7f8f5] px-4 py-3.5">
              <p className="text-xs font-medium text-[var(--dashboard-muted)]">{item.label}</p>
              <p className="mt-1.5 text-base font-semibold text-[var(--dashboard-ink)]">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[24px] border border-[var(--dashboard-border-soft)] bg-white p-5 shadow-[0_8px_24px_rgba(31,48,35,0.04)] sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--dashboard-muted)]">Status guide</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-[var(--dashboard-ink)]">How this shift’s attendance is marked</h2>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Scheduled", detail: "Before your shift starts", tone: "bg-slate-100 text-slate-700" },
            { label: "Not come yet", detail: "Shift started; no check-in recorded", tone: "bg-orange-100 text-orange-900" },
            { label: "Late", detail: `Check in after ${lateCutoffLabel || "your grace period"}`, tone: "bg-amber-100 text-amber-900" },
            { label: "Absent", detail: `No check-in by shift end, or no checkout by ${normalCheckoutCutoffLabel || "the normal checkout cutoff"}`, tone: "bg-rose-100 text-rose-900" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-[var(--dashboard-border-soft)] p-4">
              <Badge className={`${item.tone} border-0`}>{item.label}</Badge>
              <p className="mt-2 text-sm leading-5 text-[var(--dashboard-muted)]">{item.detail}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-[var(--dashboard-muted)]">
          If you checked in but miss checkout, you are marked absent at {normalCheckoutCutoffLabel || "your normal checkout cutoff"}. Checkout is closed after that deadline.
        </p>
      </section>

      {(record?.lateReason || record?.earlyReason || record?.lateCheckoutReason || isOnLeave || isScheduledOffDay) && (
        <section className="rounded-[20px] border border-[var(--dashboard-border-soft)] bg-white p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--dashboard-ink)]"><Siren className="size-4 text-amber-600" />Attendance notes</h2>
          <div className="mt-3 space-y-1.5 text-sm text-[var(--dashboard-muted)]">
            {record?.lateReason && <p><span className="font-medium text-[var(--dashboard-ink-soft)]">Late reason:</span> {record.lateReason}</p>}
            {record?.earlyReason && <p><span className="font-medium text-[var(--dashboard-ink-soft)]">Early checkout:</span> {record.earlyReason}</p>}
            {record?.lateCheckoutReason && <p><span className="font-medium text-[var(--dashboard-ink-soft)]">Late checkout:</span> {record.lateCheckoutReason}</p>}
            {isOnLeave && <p>Your leave is approved for today.</p>}
            {isScheduledOffDay && <p>No shift is assigned for today.</p>}
          </div>
        </section>
      )}
    </div>
  )
}
