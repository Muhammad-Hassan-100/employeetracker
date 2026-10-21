import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getCompanyAttendancePolicy, validateAttendanceActionAccess } from "@/lib/attendance-policy"
import { getCompanyWorkingDays } from "@/lib/company-settings"
import {
  getAttendanceWindowState,
  formatLocalDateInput,
  getLocalTimeMinutes,
  getTimeStringMinutes,
} from "@/lib/attendance-time"
import { getEmployeeShiftAssignmentForDate } from "@/lib/employee-schedule"
import { assertSelfOrAdmin, requireSession } from "@/lib/session"

export async function POST(request: NextRequest) {
  try {
    const { session, response } = requireSession(request)
    if (!session) {
      return response
    }

    const {
      userId,
      checkOutTime,
      isEarly,
      earlyReason,
      latitude,
      longitude,
      clientPublicIp,
      localDate,
      localTimeMinutes,
    } = await request.json()
    const accessError = assertSelfOrAdmin(session, userId)
    if (accessError) {
      return accessError
    }

    const db = await getDatabase()
    const attendanceCollection = db.collection("attendance")
    const companiesCollection = db.collection("companies")
    const usersCollection = db.collection("users")
    const shiftsCollection = db.collection("shifts")

    const company = await companiesCollection.findOne({ companyId: session.companyId })
    const attendancePolicy = getCompanyAttendancePolicy(company)
    const workingDays = getCompanyWorkingDays(company)
    const attendanceAccessError = validateAttendanceActionAccess({
      actionLabel: "Check-out",
      clientPublicIp,
      latitude,
      longitude,
      policy: attendancePolicy,
      request,
    })

    if (attendanceAccessError) {
      return NextResponse.json({ error: attendanceAccessError }, { status: 400 })
    }
    const checkOutMoment = new Date(checkOutTime)
    const localDateInput =
      typeof localDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(localDate)
        ? localDate
        : formatLocalDateInput(checkOutMoment)
    const actionTimeMinutes = Number.isFinite(Number(localTimeMinutes))
      ? Number(localTimeMinutes)
      : getLocalTimeMinutes(checkOutMoment)
    let computedIsEarly = false
    let employeeCheckOutGraceMinutes = 0
    let employee: any = null

    try {
      employee = await usersCollection.findOne({
        _id: new ObjectId(userId),
        companyId: session.companyId,
      })
      if (employee) {
        employeeCheckOutGraceMinutes = Number.isInteger(employee.checkOutGraceMinutes)
          ? employee.checkOutGraceMinutes
          : 0
      }
    } catch {}

    // Find the latest open attendance record for this employee.
    const record = await attendanceCollection.findOne(
      {
        companyId: session.companyId,
        userId: userId,
        checkInTime: { $ne: null },
        checkOutTime: null,
        status: { $ne: "on_leave" },
        checkoutWindowExpired: { $ne: true },
      },
      {
        sort: { date: -1, updatedAt: -1 },
      },
    )

    if (!record) {
      return NextResponse.json({ error: "No check-in record found for today" }, { status: 404 })
    }

    if (record.checkOutTime) {
      return NextResponse.json({ error: "Already checked out today" }, { status: 400 })
    }

    if (record.breakStartTime && !record.breakEndTime) {
      return NextResponse.json({ error: "End your break before checking out" }, { status: 409 })
    }

    const checkInTime = new Date(record.checkInTime)
    const checkOutTimeDate = checkOutMoment
    const hoursWorked = Math.max(
      0,
      (checkOutTimeDate.getTime() - checkInTime.getTime()) / (1000 * 60 * 60),
    )
    const shiftAssignment = employee
      ? await getEmployeeShiftAssignmentForDate({
          user: employee,
          dateInput: record.date,
          workingDays,
          shiftsCollection,
          companyId: session.companyId,
        })
      : null

    if (shiftAssignment?.shift?.startTime && shiftAssignment.shift?.endTime) {
      const shiftStartMinutes = getTimeStringMinutes(shiftAssignment.shift.startTime)
      const shiftEndMinutes = getTimeStringMinutes(shiftAssignment.shift.endTime)
      const windowState = getAttendanceWindowState({
        currentDateInput: localDateInput,
        currentMinutes: actionTimeMinutes,
        graceMinutes: employeeCheckOutGraceMinutes,
        lateCheckoutGraceMinutes: employeeCheckOutGraceMinutes,
        recordDateInput: record.date,
        startMinutes: shiftStartMinutes,
        endMinutes: shiftEndMinutes,
      })

      computedIsEarly = windowState.isBeforeShiftEnd
      if (windowState.isCheckoutExpired) {
        await attendanceCollection.updateOne(
          { _id: record._id, companyId: session.companyId },
          {
            $set: {
              status: "absent",
              absenceReason: "missing_checkout",
              isEarly: false,
              earlyReason: null,
              lateCheckoutReason: null,
              hoursWorked: 0,
              checkoutWindowExpired: true,
              updatedAt: new Date(),
            },
          },
        )

        return NextResponse.json(
          {
            error:
              "The normal checkout deadline has passed. This shift is marked absent and can no longer be checked out.",
          },
          { status: 400 },
        )
      }
    } else {
      return NextResponse.json(
        { error: "No shift is assigned for this attendance day" },
        { status: 400 },
      )
    }

    if ((computedIsEarly || isEarly) && !String(earlyReason || "").trim()) {
      return NextResponse.json(
        { error: "Early checkout reason is required before shift end" },
        { status: 400 },
      )
    }

    const updateResult = await attendanceCollection.updateOne(
      { _id: record._id, companyId: session.companyId },
      {
        $set: {
          checkOutTime: checkOutTimeDate,
          status: "present",
          absenceReason: null,
          checkoutWindowExpired: false,
          isEarly: computedIsEarly || Boolean(isEarly),
          earlyReason: computedIsEarly || isEarly ? String(earlyReason || "").trim() || null : null,
          lateCheckoutReason: null,
          hoursWorked: Math.round(hoursWorked * 100) / 100,
          updatedAt: new Date(),
        },
      },
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: "Failed to update record" }, { status: 500 })
    }

    return NextResponse.json({
      message: "Check-out successful",
      hoursWorked: Math.round(hoursWorked * 100) / 100,
    })
  } catch (error) {
    console.error("Check-out error:", error)
    return NextResponse.json({ error: "Check-out failed" }, { status: 500 })
  }
}
