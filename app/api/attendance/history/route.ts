import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getCompanyWorkingDays } from "@/lib/company-settings"
import {
  getAttendanceWindowState,
  formatLocalDateInput,
  getLocalTimeMinutes,
  getTimeStringMinutes,
} from "@/lib/attendance-time"
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
    const attendanceCollection = db.collection("attendance")
    const leavesCollection = db.collection("leaves")
    const usersCollection = db.collection("users")
    const shiftsCollection = db.collection("shifts")
    const companiesCollection = db.collection("companies")
    const currentDate = searchParams.get("nowDate") || formatLocalDateInput()
    const requestedMinutes = Number(searchParams.get("nowMinutes"))
    const currentMinutes =
      Number.isFinite(requestedMinutes) && requestedMinutes >= 0 && requestedMinutes < 1440
        ? requestedMinutes
        : getLocalTimeMinutes()

    const [userRecords, approvedLeaves, user, company] = await Promise.all([
      attendanceCollection
        .find({ userId: userId, companyId: session.companyId })
        .sort({ date: -1 })
        .toArray(),
      leavesCollection
        .find({
          userId: userId,
          companyId: session.companyId,
          status: "approved",
        })
        .toArray(),
      usersCollection.findOne({ _id: new ObjectId(userId), companyId: session.companyId }),
      companiesCollection.findOne({ companyId: session.companyId }),
    ])

    const workingDays = getCompanyWorkingDays(company)
    const formattedRecords = await Promise.all(
      userRecords.map(async (record) => {
        const matchedLeave = approvedLeaves.find(
          (leave) => leave.startDate <= record.date && leave.endDate >= record.date,
        )
        let needsCheckoutReview = false
        let status = record.status || "present"
        let absenceReason = record.absenceReason || null

        if (user && record.checkInTime && !record.checkOutTime) {
          const shiftAssignment = await getEmployeeShiftAssignmentForDate({
            user,
            dateInput: record.date,
            workingDays,
            shiftsCollection,
            companyId: session.companyId,
          })
          if (shiftAssignment.shift?.startTime && shiftAssignment.shift?.endTime) {
            const windowState = getAttendanceWindowState({
              currentDateInput: currentDate,
              currentMinutes,
              graceMinutes: Number.isInteger(user.checkOutGraceMinutes)
                ? user.checkOutGraceMinutes
                : 0,
              lateCheckoutGraceMinutes: Number.isInteger(user.checkOutGraceMinutes)
                ? user.checkOutGraceMinutes
                : 0,
              recordDateInput: record.date,
              startMinutes: getTimeStringMinutes(shiftAssignment.shift.startTime),
              endMinutes: getTimeStringMinutes(shiftAssignment.shift.endTime),
            })
            needsCheckoutReview =
              windowState.isMissingCheckoutDeadlineReached && !windowState.isCheckoutExpired
            if (windowState.isMissingCheckoutDeadlineReached || windowState.isCheckoutExpired) {
              status = "absent"
              absenceReason = "missing_checkout"
              await attendanceCollection.updateOne(
                { _id: record._id, companyId: session.companyId },
                {
                  $set: {
                    status,
                    absenceReason,
                    checkoutWindowExpired: windowState.isCheckoutExpired,
                    updatedAt: new Date(),
                  },
                },
              )
            } else if (record.status === "absent" && record.absenceReason === "missing_checkout") {
              status = "present"
              absenceReason = null
              await attendanceCollection.updateOne(
                { _id: record._id, companyId: session.companyId },
                { $set: { status, absenceReason, updatedAt: new Date() } },
              )
            }
          }
        }

        return {
          id: record._id.toString(),
          date: record.date,
          checkInTime: record.checkInTime,
          checkOutTime: record.checkOutTime,
          breakTaken: Boolean(record.breakTaken),
          breakStartTime: record.breakStartTime || null,
          breakEndTime: record.breakEndTime || null,
          breakDurationMinutes: Number(record.breakDurationMinutes) || 0,
          breakOverageMinutes: Math.max(0, (Number(record.breakDurationMinutes) || 0) - 60),
          isLate: record.isLate,
          isEarly: record.isEarly,
          needsCheckoutReview,
          absenceReason,
          lateReason: record.lateReason,
          earlyReason: record.earlyReason,
          lateCheckoutReason: record.lateCheckoutReason || null,
          hoursWorked: record.hoursWorked,
          status,
          leaveId: record.leaveId,
          leaveReason: matchedLeave?.reason || null,
          leaveType: matchedLeave?.leaveType || null,
        }
      }),
    )

    return NextResponse.json(formattedRecords)
  } catch (error) {
    console.error("Attendance history error:", error)
    return NextResponse.json({ error: "Failed to fetch attendance history" }, { status: 500 })
  }
}
