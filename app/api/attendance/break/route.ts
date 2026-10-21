import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getCompanyAttendancePolicy, validateAttendanceActionAccess } from "@/lib/attendance-policy"
import { getCompanyWorkingDays } from "@/lib/company-settings"
import { formatLocalDateInput, getAttendanceWindowState, getLocalDateDifference, getLocalTimeMinutes, getTimeStringMinutes, shiftSpansMidnight } from "@/lib/attendance-time"
import { getEmployeeShiftAssignmentForDate } from "@/lib/employee-schedule"
import { assertSelfOrAdmin, requireSession } from "@/lib/session"
import { getDatabase } from "@/lib/mongodb"

export async function POST(request: NextRequest) {
  try {
    const { session, response } = requireSession(request)
    if (!session) return response

    const body = await request.json()
    const { userId, action, clientPublicIp, localDate: requestedLocalDate, localTimeMinutes: requestedLocalMinutes } = body
    if (typeof userId !== "string" || !ObjectId.isValid(userId) || !["start", "end"].includes(action)) {
      return NextResponse.json({ error: "A valid employee and break action are required" }, { status: 400 })
    }

    const accessError = assertSelfOrAdmin(session, userId)
    if (accessError) return accessError

    const db = await getDatabase()
    const usersCollection = db.collection("users")
    const companiesCollection = db.collection("companies")
    const attendanceCollection = db.collection("attendance")
    const shiftsCollection = db.collection("shifts")
    const [company, employee] = await Promise.all([
      companiesCollection.findOne({ companyId: session.companyId }),
      usersCollection.findOne({ _id: new ObjectId(userId), companyId: session.companyId, status: { $ne: "inactive" } }),
    ])
    if (!employee) return NextResponse.json({ error: "Employee not found or inactive" }, { status: 404 })

    const attendancePolicy = getCompanyAttendancePolicy(company)
    const attendanceAccessError = validateAttendanceActionAccess({
      actionLabel: "Break",
      clientPublicIp,
      policy: attendancePolicy,
      request,
    })
    if (attendanceAccessError) return NextResponse.json({ error: attendanceAccessError }, { status: 400 })

    const record = await attendanceCollection.findOne(
      {
        companyId: session.companyId,
        userId,
        checkInTime: { $ne: null },
        checkOutTime: null,
        status: { $ne: "on_leave" },
      },
      { sort: { date: -1, updatedAt: -1 } },
    )
    if (!record) return NextResponse.json({ error: "Check in before using a break" }, { status: 409 })

    const now = new Date()
    const localDate = typeof requestedLocalDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(requestedLocalDate)
      ? requestedLocalDate
      : formatLocalDateInput(now)
    const localMinutes = Number.isFinite(Number(requestedLocalMinutes)) && Number(requestedLocalMinutes) >= 0 && Number(requestedLocalMinutes) < 1440
      ? Number(requestedLocalMinutes)
      : getLocalTimeMinutes(now)
    const workingDays = getCompanyWorkingDays(company)
    const shiftAssignment = await getEmployeeShiftAssignmentForDate({
      user: employee,
      dateInput: record.date,
      workingDays,
      shiftsCollection,
      companyId: session.companyId,
    })
    if (!shiftAssignment.shift?.startTime || !shiftAssignment.shift?.endTime) {
      return NextResponse.json({ error: "No shift is assigned for this attendance day" }, { status: 400 })
    }

    const windowState = getAttendanceWindowState({
      currentDateInput: localDate,
      currentMinutes: localMinutes,
      graceMinutes: Number.isInteger(employee.checkOutGraceMinutes) ? employee.checkOutGraceMinutes : 0,
      lateCheckoutGraceMinutes: Number.isInteger(employee.checkOutGraceMinutes) ? employee.checkOutGraceMinutes : 0,
      recordDateInput: record.date,
      startMinutes: getTimeStringMinutes(shiftAssignment.shift.startTime),
      endMinutes: getTimeStringMinutes(shiftAssignment.shift.endTime),
    })

    if (windowState.isCheckoutExpired) {
      await attendanceCollection.updateOne(
        { _id: record._id, companyId: session.companyId },
        {
          $set: {
            status: "absent",
            absenceReason: "missing_checkout",
            checkoutWindowExpired: true,
            hoursWorked: 0,
            updatedAt: new Date(),
          },
        },
      )
      return NextResponse.json({ error: "The normal checkout deadline has passed. This shift is marked absent." }, { status: 409 })
    }

    if (action === "start") {
      const shiftStartMinutes = getTimeStringMinutes(shiftAssignment.shift.startTime)
      const shiftEndMinutes = getTimeStringMinutes(shiftAssignment.shift.endTime)
      const shiftStartAbsoluteMinutes = (getLocalDateDifference(record.date, localDate) - (shiftSpansMidnight(shiftStartMinutes, shiftEndMinutes) ? 1 : 0)) * 1440 + shiftStartMinutes
      if (windowState.absoluteCurrentMinutes < shiftStartAbsoluteMinutes || !windowState.isBeforeShiftEnd) {
        return NextResponse.json({ error: "A break can only be started during your shift" }, { status: 409 })
      }
      if (record.breakTaken || record.breakStartTime || record.breakEndTime) {
        return NextResponse.json({ error: "Your one break for this shift has already been used" }, { status: 409 })
      }

      const result = await attendanceCollection.updateOne(
        {
          _id: record._id,
          companyId: session.companyId,
          checkOutTime: null,
          breakTaken: { $ne: true },
          breakStartTime: null,
        },
        { $set: { breakTaken: true, breakStartTime: now, breakEndTime: null, breakDurationMinutes: 0, updatedAt: now } },
      )
      if (!result.modifiedCount) return NextResponse.json({ error: "Break state changed. Refresh and try again." }, { status: 409 })

      return NextResponse.json({ message: "Break started", breakStartTime: now, breakEndTime: null, breakDurationMinutes: 0, breakTaken: true })
    }

    if (!record.breakTaken || !record.breakStartTime || record.breakEndTime) {
      return NextResponse.json({ error: "There is no active break to end" }, { status: 409 })
    }

    const breakDurationMinutes = Math.max(0, Math.round((now.getTime() - new Date(record.breakStartTime).getTime()) / 60000 * 100) / 100)
    const result = await attendanceCollection.updateOne(
      { _id: record._id, companyId: session.companyId, checkOutTime: null, breakEndTime: null, breakTaken: true },
      { $set: { breakEndTime: now, breakDurationMinutes, updatedAt: now } },
    )
    if (!result.modifiedCount) return NextResponse.json({ error: "Break state changed. Refresh and try again." }, { status: 409 })

    return NextResponse.json({ message: "Break ended", breakStartTime: record.breakStartTime, breakEndTime: now, breakDurationMinutes, breakTaken: true })
  } catch (error) {
    console.error("Attendance break error:", error)
    return NextResponse.json({ error: "Unable to update break" }, { status: 500 })
  }
}
