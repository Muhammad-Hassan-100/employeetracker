import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import {
  formatLocalDateInput,
  getAttendanceWindowState,
  getLocalTimeMinutes,
  getRecentShiftDateInputs,
  getTimeStringMinutes,
  hasShiftEndedForRecordDate,
} from "@/lib/attendance-time"
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

    const now = new Date()
    const localDateInput = formatLocalDateInput(now)
    const currentMinutes = getLocalTimeMinutes(now)
    let activeOpenRecord: any = null

    try {
      const user = await usersCollection.findOne({
        _id: new ObjectId(userId),
        companyId: session.companyId,
      })

      if (user?.shiftId) {
        let shift: any = null

        try {
          shift = await shiftsCollection.findOne({
            _id: new ObjectId(user.shiftId),
            companyId: session.companyId,
          })
        } catch {}

        if (!shift) {
          shift = await shiftsCollection.findOne({
            companyId: session.companyId,
            name: { $regex: new RegExp(`^${user.shiftId}$`, "i") },
          })
        }

        if (shift?.startTime && shift?.endTime) {
          const shiftStartMinutes = getTimeStringMinutes(shift.startTime)
          const shiftEndMinutes = getTimeStringMinutes(shift.endTime)
          const candidateDates = getRecentShiftDateInputs(localDateInput)

          for (const candidateDate of candidateDates) {
            const shiftEnded = hasShiftEndedForRecordDate({
              currentDateInput: localDateInput,
              currentMinutes,
              recordDateInput: candidateDate,
              startMinutes: shiftStartMinutes,
              endMinutes: shiftEndMinutes,
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
              const windowState = getAttendanceWindowState({
                currentDateInput: localDateInput,
                currentMinutes,
                graceMinutes: CHECKOUT_GRACE_MINUTES,
                lateCheckoutGraceMinutes: Number.isInteger(user.checkOutGraceMinutes) ? user.checkOutGraceMinutes : 0,
                recordDateInput: openRecord.date,
                startMinutes: shiftStartMinutes,
                endMinutes: shiftEndMinutes,
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

    const todayRecord =
      activeOpenRecord ||
      (await attendanceCollection.findOne({
        companyId: session.companyId,
        userId: userId,
        date: localDateInput,
      }))

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
