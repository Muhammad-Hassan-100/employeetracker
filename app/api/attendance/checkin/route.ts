import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getCompanyAttendancePolicy, validateAttendanceActionAccess } from "@/lib/attendance-policy"
import {
  formatLocalDateInput,
  getLocalTimeMinutes,
  getRecentShiftDateInputs,
  getTimeStringMinutes,
  hasShiftEndedForRecordDate,
} from "@/lib/attendance-time"
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

    try {
      const user = await usersCollection.findOne({ _id: new ObjectId(userId), companyId: session.companyId })
      if (user?.shiftId) {
        employeeCheckInBeforeMinutes = Number.isInteger(user.checkInBeforeMinutes) ? user.checkInBeforeMinutes : 5
        const employeeLateGraceMinutes = Number.isInteger(user.lateGraceMinutes) ? user.lateGraceMinutes : 0
        let shift: any = null
        try {
          shift = await shiftsCollection.findOne({ _id: new ObjectId(user.shiftId), companyId: session.companyId })
        } catch {}
        if (!shift) {
          shift = await shiftsCollection.findOne({
            companyId: session.companyId,
            name: { $regex: new RegExp(`^${user.shiftId}$`, "i") },
          })
        }
        if (shift?.startTime && shift?.endTime) {
          const shiftStartMinutes = getTimeStringMinutes(shift.startTime)
          const earliestCheckInMinutes = shiftStartMinutes - employeeCheckInBeforeMinutes
          const lateCutoffMinutes = shiftStartMinutes + employeeLateGraceMinutes
          const candidateDates = getRecentShiftDateInputs(today)

          for (const candidateDate of candidateDates) {
            const shiftEnded = hasShiftEndedForRecordDate({
              currentDateInput: today,
              currentMinutes: actionTimeMinutes,
              recordDateInput: candidateDate,
              startMinutes: shiftStartMinutes,
              endMinutes: getTimeStringMinutes(shift.endTime),
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
                hoursWorked: 0,
                status: "absent",
                autoAbsent: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              })
            }
          }

          if (actionTimeMinutes < earliestCheckInMinutes) {
            return NextResponse.json(
              { error: `Check-in allowed only ${employeeCheckInBeforeMinutes} minutes before shift start` },
              { status: 400 },
            )
          }
          computedIsLate = actionTimeMinutes > lateCutoffMinutes
        }
      }
    } catch {}

    if (computedIsLate && !lateReason) {
      return NextResponse.json({ error: "Late reason is required for late check-in" }, { status: 400 })
    }

    // Check if user already has an attendance record today
    const existingRecord = await attendanceCollection.findOne({
      companyId: session.companyId,
      userId: userId,
      date: today,
    })

    if (existingRecord) {
      if (existingRecord.status === "on_leave") {
        return NextResponse.json({ error: "Cannot check in while on approved leave" }, { status: 400 })
      }
      if (existingRecord.status === "absent") {
        return NextResponse.json({ error: "Shift has ended. You were marked absent for today." }, { status: 400 })
      }
      if (existingRecord.checkInTime) {
        return NextResponse.json({ error: "Already checked in today" }, { status: 400 })
      }
    }

    const hasLeave = await leavesCollection.findOne({
      companyId: session.companyId,
      userId: userId,
      status: "approved",
      startDate: { $lte: today },
      endDate: { $gte: today },
    })

    if (hasLeave) {
      return NextResponse.json({ error: "Cannot check in while on approved leave" }, { status: 400 })
    }

    const record = {
      userId,
      companyId: session.companyId,
      date: today,
      checkInTime: new Date(checkInTime),
      checkOutTime: null,
      isLate: computedIsLate,
      isEarly: false,
      lateReason: computedIsLate ? lateReason || null : null,
      earlyReason: null,
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
