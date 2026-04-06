import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getCompanyAttendancePolicy, requiresAttendanceLocation, requiresAttendanceOfficeIp } from "@/lib/attendance-policy"
import { formatLocalDateInput } from "@/lib/attendance-time"
import { getCompanyWorkingDays } from "@/lib/company-settings"
import { getEmployeeShiftAssignmentForDate } from "@/lib/employee-schedule"
import { assertSelfOrAdmin, requireSession } from "@/lib/session"

export async function GET(request: NextRequest) {
  try {
    const { session, response } = requireSession(request)
    if (!session) {
      return response
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const accessError = assertSelfOrAdmin(session, userId)
    if (accessError) {
      return accessError
    }

    const db = await getDatabase()
    const usersCollection = db.collection("users")
    const shiftsCollection = db.collection("shifts")
    const companiesCollection = db.collection("companies")

    const user = await usersCollection.findOne({
      _id: new ObjectId(userId),
      companyId: session.companyId,
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const company = await companiesCollection.findOne({ companyId: session.companyId })
    const attendancePolicy = getCompanyAttendancePolicy(company)
    const workingDays = getCompanyWorkingDays(company)
    const shiftAssignment = await getEmployeeShiftAssignmentForDate({
      user,
      dateInput: formatLocalDateInput(new Date()),
      workingDays,
      shiftsCollection,
      companyId: session.companyId,
    })
    const shift = shiftAssignment.shift

    return NextResponse.json({
      shift: shift ? {
        id: shift._id?.toString(),
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        description: shift.description,
      } : null,
      user: {
        hasShiftAssigned: shiftAssignment.isScheduled,
        shiftId: shiftAssignment.shiftId,
        scheduleMode: shiftAssignment.scheduleMode,
        customScheduleMonth: user.customScheduleMonth || "",
        customSchedule: user.customSchedule || [],
      },
      attendanceRules: {
        checkInBeforeMinutes: user.checkInBeforeMinutes ?? 5,
        lateGraceMinutes: user.lateGraceMinutes ?? 0,
        checkOutGraceMinutes: user.checkOutGraceMinutes ?? 0,
      },
      attendancePolicy: {
        mode: attendancePolicy.mode,
        isRestricted: attendancePolicy.mode !== "open",
        requiresLocation: requiresAttendanceLocation(attendancePolicy),
        requiresApprovedNetwork: requiresAttendanceOfficeIp(attendancePolicy),
        radiusMeters: attendancePolicy.radiusMeters,
      },
    })
  } catch (error) {
    console.error("Fetch employee shift error:", error)
    return NextResponse.json({ error: "Failed to fetch employee shift" }, { status: 500 })
  }
}
