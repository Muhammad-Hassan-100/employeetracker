import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getCompanyWorkingDays } from "@/lib/company-settings"
import {
  formatLocalDateInput,
  getAttendanceWindowState,
  getLocalTimeMinutes,
  getPreviousLocalDateInput,
  getRecentShiftDateInputs,
  getTimeStringMinutes,
  hasShiftEndedForRecordDate,
  shiftSpansMidnight,
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

    const now = new Date()
    const requestedDate = searchParams.get("localDate")
    const localDateInput = typeof requestedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
      ? requestedDate
      : formatLocalDateInput(now)
    const requestedMinutes = Number(searchParams.get("localTimeMinutes"))
    const currentMinutes = Number.isFinite(requestedMinutes) && requestedMinutes >= 0 && requestedMinutes < 1440
      ? requestedMinutes
      : getLocalTimeMinutes(now)
    let activeOpenRecord: any = null
    let todayHasScheduledShift = false
    let todayShiftHasEnded = false
    let effectiveRecordDate = localDateInput

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
        let effectiveShiftAssignment = todayShiftAssignment
        const previousDate = getPreviousLocalDateInput(localDateInput)
        const previousShiftAssignment = await getEmployeeShiftAssignmentForDate({
          user,
          dateInput: previousDate,
          workingDays,
          shiftsCollection,
          companyId: session.companyId,
        })
        const previousShift = previousShiftAssignment.shift
        if (previousShift?.startTime && previousShift?.endTime) {
          const startMinutes = getTimeStringMinutes(previousShift.startTime)
          const endMinutes = getTimeStringMinutes(previousShift.endTime)
          if (shiftSpansMidnight(startMinutes, endMinutes)) {
            const previousWindow = getAttendanceWindowState({
              currentDateInput: localDateInput,
              currentMinutes,
              graceMinutes: Number.isInteger(user.checkOutGraceMinutes) ? user.checkOutGraceMinutes : 0,
              recordDateInput: previousDate,
              startMinutes,
              endMinutes,
            })
            if (!previousWindow.isCheckoutExpired) {
              effectiveRecordDate = previousDate
              effectiveShiftAssignment = previousShiftAssignment
            }
          }
        }
        todayHasScheduledShift = effectiveShiftAssignment.isScheduled

        if (effectiveShiftAssignment.shift?.startTime && effectiveShiftAssignment.shift?.endTime) {
          todayShiftHasEnded = hasShiftEndedForRecordDate({
            currentDateInput: localDateInput,
            currentMinutes,
            recordDateInput: effectiveRecordDate,
            startMinutes: getTimeStringMinutes(effectiveShiftAssignment.shift.startTime),
            endMinutes: getTimeStringMinutes(effectiveShiftAssignment.shift.endTime),
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
              absenceReason: "no_check_in",
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
              graceMinutes: Number.isInteger(user.checkOutGraceMinutes) ? user.checkOutGraceMinutes : 0,
              lateCheckoutGraceMinutes: Number.isInteger(user.checkOutGraceMinutes) ? user.checkOutGraceMinutes : 0,
              recordDateInput: openRecord.date,
              startMinutes: getTimeStringMinutes(recordShiftAssignment.shift.startTime),
              endMinutes: getTimeStringMinutes(recordShiftAssignment.shift.endTime),
            })

            const missingCheckoutDeadlineReached = windowState.isMissingCheckoutDeadlineReached
            if (missingCheckoutDeadlineReached || windowState.isCheckoutExpired) {
              await attendanceCollection.updateOne(
                { _id: openRecord._id, companyId: session.companyId },
                {
                  $set: {
                    status: "absent",
                    absenceReason: "missing_checkout",
                    isEarly: false,
                    earlyReason: null,
                    lateCheckoutReason: null,
                    hoursWorked: 0,
                    checkoutWindowExpired: windowState.isCheckoutExpired,
                    updatedAt: new Date(),
                  },
                },
              )
              if (!windowState.isCheckoutExpired) {
                activeOpenRecord = { ...openRecord, status: "absent", absenceReason: "missing_checkout" }
              }
            } else {
              if (openRecord.status === "absent" && openRecord.absenceReason === "missing_checkout") {
                await attendanceCollection.updateOne(
                  { _id: openRecord._id, companyId: session.companyId },
                  { $set: { status: "present", absenceReason: null, updatedAt: new Date() } },
                )
                activeOpenRecord = { ...openRecord, status: "present", absenceReason: null }
              } else {
                activeOpenRecord = openRecord
              }
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
        date: effectiveRecordDate,
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
      attendanceDate: todayRecord?.date || effectiveRecordDate,
    })
  } catch (error) {
    console.error("Today attendance error:", error)
    return NextResponse.json({ error: "Failed to check today attendance" }, { status: 500 })
  }
}
