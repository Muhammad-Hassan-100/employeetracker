import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getCompanyWorkingDays } from "@/lib/company-settings"
import {
  formatLocalDateInput,
  getAttendanceWindowState,
  getLocalTimeMinutes,
  getRecentShiftDateInputs,
  getTimeStringMinutes,
  hasShiftEndedForRecordDate,
} from "@/lib/attendance-time"
import { getEmployeeShiftAssignmentForDate } from "@/lib/employee-schedule"
import { assertSelfOrAdmin, requireSession } from "@/lib/session"

const CHECKOUT_GRACE_MINUTES = 360

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

    const now = new Date()
    const localDateInput = formatLocalDateInput(now)
    const currentMinutes = getLocalTimeMinutes(now)
    let activeOpenRecord: any = null
    let todayHasScheduledShift = false
    let todayShiftHasEnded = false

    try {
      const user = await usersCollection.findOne({
        _id: new ObjectId(userId),
        companyId: session.companyId,
      })

      if (user) {
        const company = await companiesCollection.findOne({ companyId: session.companyId })
        const workingDays = getCompanyWorkingDays(company)
        const candidateDates = getRecentShiftDateInputs(localDateInput)
        const todayShiftAssignment = await getEmployeeShiftAssignmentForDate({
          user,
          dateInput: localDateInput,
          workingDays,
          shiftsCollection,
          companyId: session.companyId,
        })
        todayHasScheduledShift = todayShiftAssignment.isScheduled

        if (todayShiftAssignment.shift?.startTime && todayShiftAssignment.shift?.endTime) {
          todayShiftHasEnded = hasShiftEndedForRecordDate({
            currentDateInput: localDateInput,
            currentMinutes,
            recordDateInput: localDateInput,
            startMinutes: getTimeStringMinutes(todayShiftAssignment.shift.startTime),
            endMinutes: getTimeStringMinutes(todayShiftAssignment.shift.endTime),
          })
        }

        for (const candidateDate of candidateDates) {
          const shiftAssignment = await getEmployeeShiftAssignmentForDate({
            user,
            dateInput: candidateDate,
            workingDays,
            shiftsCollection,
            companyId: session.companyId,
          })

          if (!shiftAssignment.shift?.startTime || !shiftAssignment.shift?.endTime) {
            continue
          }

          const shiftEnded = hasShiftEndedForRecordDate({
            currentDateInput: localDateInput,
            currentMinutes,
            recordDateInput: candidateDate,
            startMinutes: getTimeStringMinutes(shiftAssignment.shift.startTime),
            endMinutes: getTimeStringMinutes(shiftAssignment.shift.endTime),
          })

          if (!shiftEnded) {
            continue
          }

          const [existingRecord, approvedLeave] = await Promise.all([
            attendanceCollection.findOne({
              companyId: session.companyId,
              userId: userId,
              date: candidateDate,
            }),
            leavesCollection.findOne({
              companyId: session.companyId,
              userId: userId,
              status: "approved",
              startDate: { $lte: candidateDate },
              endDate: { $gte: candidateDate },
            }),
          ])

          if (!existingRecord && !approvedLeave) {
            await attendanceCollection.insertOne({
              userId,
              companyId: session.companyId,
              date: candidateDate,
              checkInTime: null,
              checkOutTime: null,
              isLate: false,
              isEarly: false,
              lateReason: null,
              earlyReason: null,
              lateCheckoutReason: null,
              hoursWorked: 0,
              status: "absent",
              autoAbsent: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
          }
        }

        const openRecord = await attendanceCollection.findOne(
          {
            companyId: session.companyId,
            userId: userId,
            checkInTime: { $ne: null },
            checkOutTime: null,
            status: { $ne: "on_leave" },
            checkoutWindowExpired: { $ne: true },
          },
          { sort: { date: -1, updatedAt: -1 } },
        )

        if (openRecord) {
          const recordShiftAssignment = await getEmployeeShiftAssignmentForDate({
            user,
            dateInput: openRecord.date,
            workingDays,
            shiftsCollection,
            companyId: session.companyId,
          })

          if (recordShiftAssignment.shift?.startTime && recordShiftAssignment.shift?.endTime) {
            const windowState = getAttendanceWindowState({
              currentDateInput: localDateInput,
              currentMinutes,
              graceMinutes: CHECKOUT_GRACE_MINUTES,
              lateCheckoutGraceMinutes: Number.isInteger(user.checkOutGraceMinutes) ? user.checkOutGraceMinutes : 0,
              recordDateInput: openRecord.date,
              startMinutes: getTimeStringMinutes(recordShiftAssignment.shift.startTime),
              endMinutes: getTimeStringMinutes(recordShiftAssignment.shift.endTime),
            })

            if (windowState.isCheckoutExpired) {
              await attendanceCollection.updateOne(
                { _id: openRecord._id, companyId: session.companyId },
                {
                  $set: {
                    status: "present",
                    isEarly: false,
                    earlyReason: null,
                    lateCheckoutReason: null,
                    hoursWorked: 0,
                    checkoutWindowExpired: true,
                    updatedAt: new Date(),
                  },
                },
              )
            } else {
              activeOpenRecord = openRecord
            }
          }
        }
      }
    } catch {}

    let todayRecord =
      activeOpenRecord ||
      (await attendanceCollection.findOne({
        companyId: session.companyId,
        userId: userId,
        date: localDateInput,
      }))

    if (todayRecord?.status === "absent" && todayRecord.autoAbsent && (!todayHasScheduledShift || !todayShiftHasEnded)) {
      await attendanceCollection.deleteOne({ _id: todayRecord._id, companyId: session.companyId })
      todayRecord = null
    }

    return NextResponse.json({
      isCheckedIn:
        !!todayRecord && !!todayRecord.checkInTime && !todayRecord.checkOutTime && !todayRecord.checkoutWindowExpired,
      record: todayRecord
        ? {
            id: todayRecord._id.toString(),
            ...todayRecord,
          }
        : null,
    })
  } catch (error) {
    console.error("Today attendance error:", error)
    return NextResponse.json({ error: "Failed to check today attendance" }, { status: 500 })
  }
}
