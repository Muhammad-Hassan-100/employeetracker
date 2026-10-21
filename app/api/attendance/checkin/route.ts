import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getCompanyAttendancePolicy, validateAttendanceActionAccess } from "@/lib/attendance-policy"
import { getCompanyWorkingDays } from "@/lib/company-settings"
import {
  formatLocalDateInput,
  getAttendanceWindowState,
  getLocalTimeMinutes,
  getLocalDateDifference,
  getPreviousLocalDateInput,
  getRecentShiftDateInputs,
  getTimeStringMinutes,
  hasShiftEndedForRecordDate,
  shiftSpansMidnight,
} from "@/lib/attendance-time"
import { getEmployeeShiftAssignmentForDate } from "@/lib/employee-schedule"
import { assertSelfOrAdmin, requireSession } from "@/lib/session"

export async function POST(request: NextRequest) {
  try {
    const { session, response } = requireSession(request)
    if (!session) {
      return response
    }

    const { userId, checkInTime, isLate, lateReason, latitude, longitude, clientPublicIp, localDate, localTimeMinutes } =
      await request.json()
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

    const company = await companiesCollection.findOne({ companyId: session.companyId })
    const attendancePolicy = getCompanyAttendancePolicy(company)
    const workingDays = getCompanyWorkingDays(company)
    const attendanceAccessError = validateAttendanceActionAccess({
      actionLabel: "Check-in",
      clientPublicIp,
      latitude,
      longitude,
      policy: attendancePolicy,
      request,
    })

    if (attendanceAccessError) {
      return NextResponse.json({ error: attendanceAccessError }, { status: 400 })
    }

    const now = new Date(checkInTime)
    const today = typeof localDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(localDate) ? localDate : formatLocalDateInput(now)
    const actionTimeMinutes = Number.isFinite(Number(localTimeMinutes)) ? Number(localTimeMinutes) : getLocalTimeMinutes(now)
    let computedIsLate = false
    let employeeCheckInBeforeMinutes = 5
    let todayShiftHasEnded = false
    let attendanceDate = today
    let selectedShiftAssignment: any = null

    try {
      const user = await usersCollection.findOne({ _id: new ObjectId(userId), companyId: session.companyId })
      if (user) {
        employeeCheckInBeforeMinutes = Number.isInteger(user.checkInBeforeMinutes) ? user.checkInBeforeMinutes : 5
        const employeeLateGraceMinutes = Number.isInteger(user.lateGraceMinutes) ? user.lateGraceMinutes : 5

        const todayShiftAssignment = await getEmployeeShiftAssignmentForDate({
          user,
          dateInput: today,
          workingDays,
          shiftsCollection,
          companyId: session.companyId,
        })
        selectedShiftAssignment = todayShiftAssignment
        const previousDate = getPreviousLocalDateInput(today)
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
              currentDateInput: today,
              currentMinutes: actionTimeMinutes,
              graceMinutes: Number.isInteger(user.checkOutGraceMinutes) ? user.checkOutGraceMinutes : 0,
              recordDateInput: previousDate,
              startMinutes,
              endMinutes,
            })
            if (!previousWindow.isCheckoutExpired) {
              attendanceDate = previousDate
              selectedShiftAssignment = previousShiftAssignment
            }
          }
        }

        for (const candidateDate of getRecentShiftDateInputs(today)) {
          const candidateShiftAssignment = await getEmployeeShiftAssignmentForDate({
            user,
            dateInput: candidateDate,
            workingDays,
            shiftsCollection,
            companyId: session.companyId,
          })

          if (!candidateShiftAssignment.shift?.startTime || !candidateShiftAssignment.shift?.endTime) {
            continue
          }

          const shiftEnded = hasShiftEndedForRecordDate({
            currentDateInput: today,
            currentMinutes: actionTimeMinutes,
            recordDateInput: candidateDate,
            startMinutes: getTimeStringMinutes(candidateShiftAssignment.shift.startTime),
            endMinutes: getTimeStringMinutes(candidateShiftAssignment.shift.endTime),
          })

          if (!shiftEnded) {
            continue
          }

          const [existingCandidateRecord, approvedLeaveForCandidate] = await Promise.all([
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

          if (!existingCandidateRecord && !approvedLeaveForCandidate) {
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
              breakTaken: false,
              breakStartTime: null,
              breakEndTime: null,
              breakDurationMinutes: 0,
              hoursWorked: 0,
              status: "absent",
              absenceReason: "no_check_in",
              autoAbsent: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
          }
        }

        if (selectedShiftAssignment?.shift?.startTime && selectedShiftAssignment?.shift?.endTime) {
          const shiftStartMinutes = getTimeStringMinutes(selectedShiftAssignment.shift.startTime)
          const shiftEndMinutes = getTimeStringMinutes(selectedShiftAssignment.shift.endTime)
          const earliestCheckInMinutes = shiftStartMinutes - employeeCheckInBeforeMinutes
          const lateCutoffMinutes = shiftStartMinutes + employeeLateGraceMinutes
          todayShiftHasEnded = hasShiftEndedForRecordDate({
            currentDateInput: today,
            currentMinutes: actionTimeMinutes,
            recordDateInput: attendanceDate,
            startMinutes: shiftStartMinutes,
            endMinutes: shiftEndMinutes,
          })

          const elapsedShiftMinutes = getLocalDateDifference(attendanceDate, today) * 1440 + actionTimeMinutes
          if (elapsedShiftMinutes < earliestCheckInMinutes) {
            return NextResponse.json(
              { error: `Check-in allowed only ${employeeCheckInBeforeMinutes} minutes before shift start` },
              { status: 400 },
            )
          }
          computedIsLate = elapsedShiftMinutes > lateCutoffMinutes
        } else {
          return NextResponse.json({ error: "No shift is assigned for today" }, { status: 400 })
        }
      }
    } catch {}

    if (computedIsLate && !lateReason) {
      return NextResponse.json({ error: "Late reason is required for late check-in" }, { status: 400 })
    }

    // Check the record belonging to the active shift date.
    let existingRecord = await attendanceCollection.findOne({
      companyId: session.companyId,
      userId: userId,
      date: attendanceDate,
    })

    if (existingRecord) {
      if (existingRecord.status === "on_leave") {
        return NextResponse.json({ error: "Cannot check in while on approved leave" }, { status: 400 })
      }
      if (existingRecord.status === "absent") {
        if (existingRecord.autoAbsent && !todayShiftHasEnded) {
          await attendanceCollection.deleteOne({ _id: existingRecord._id, companyId: session.companyId })
          existingRecord = null
        } else {
          return NextResponse.json({ error: "Shift has ended. You were marked absent for this shift." }, { status: 400 })
        }
      }
      if (existingRecord?.checkInTime) {
        return NextResponse.json({ error: "Already checked in today" }, { status: 400 })
      }
    }

    const hasLeave = await leavesCollection.findOne({
      companyId: session.companyId,
      userId: userId,
      status: "approved",
      startDate: { $lte: attendanceDate },
      endDate: { $gte: attendanceDate },
    })

    if (hasLeave) {
      return NextResponse.json({ error: "Cannot check in while on approved leave" }, { status: 400 })
    }

    const record = {
      userId,
      companyId: session.companyId,
      date: attendanceDate,
      checkInTime: new Date(checkInTime),
      checkOutTime: null,
      isLate: computedIsLate,
      isEarly: false,
      lateReason: computedIsLate ? lateReason || null : null,
      earlyReason: null,
      lateCheckoutReason: null,
      breakTaken: false,
      breakStartTime: null,
      breakEndTime: null,
      breakDurationMinutes: 0,
      hoursWorked: 0,
      status: "present",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    if (existingRecord) {
      await attendanceCollection.updateOne(
        { _id: existingRecord._id, companyId: session.companyId },
        {
          $set: {
            checkInTime: new Date(checkInTime),
            isLate: computedIsLate,
            lateReason: computedIsLate ? lateReason || null : null,
            lateCheckoutReason: null,
            breakTaken: false,
            breakStartTime: null,
            breakEndTime: null,
            breakDurationMinutes: 0,
            status: "present",
            updatedAt: new Date(),
          },
        },
      )

      return NextResponse.json({
        message: "Check-in successful",
        record: {
          id: existingRecord._id.toString(),
          ...record,
        },
      })
    } else {
      const result = await attendanceCollection.insertOne(record)

      return NextResponse.json({
        message: "Check-in successful",
        record: {
          id: result.insertedId.toString(),
          ...record,
        },
      })
    }
  } catch (error) {
    console.error("Check-in error:", error)
    return NextResponse.json({ error: "Check-in failed" }, { status: 500 })
  }
}
