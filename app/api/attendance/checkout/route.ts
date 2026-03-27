import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getCompanyAttendancePolicy, validateAttendanceActionAccess } from "@/lib/attendance-policy"
import { formatLocalDateInput, getLocalTimeMinutes, getTimeStringMinutes, isBeforeShiftEnd } from "@/lib/attendance-time"
import { assertSelfOrAdmin, requireSession } from "@/lib/session"

export async function POST(request: NextRequest) {
  try {
    const { session, response } = requireSession(request)
    if (!session) {
      return response
    }

    const { userId, checkOutTime, isEarly, earlyReason, latitude, longitude, clientPublicIp, localDate, localTimeMinutes } =
      await request.json()
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
    const today =
      typeof localDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(localDate) ? localDate : formatLocalDateInput(checkOutMoment)
    const actionTimeMinutes = Number.isFinite(Number(localTimeMinutes)) ? Number(localTimeMinutes) : getLocalTimeMinutes(checkOutMoment)

    // Find today's check-in record
    const record = await attendanceCollection.findOne({
      companyId: session.companyId,
      userId: userId,
      date: today,
    })

    if (!record) {
      return NextResponse.json({ error: "No check-in record found for today" }, { status: 404 })
    }

    if (record.checkOutTime) {
      return NextResponse.json({ error: "Already checked out today" }, { status: 400 })
    }

    const checkInTime = new Date(record.checkInTime)
    const checkOutTimeDate = checkOutMoment
    const hoursWorked = Math.max(0, (checkOutTimeDate.getTime() - checkInTime.getTime()) / (1000 * 60 * 60))
    let computedIsEarly = false

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

        if (shift?.endTime) {
          const shiftStartMinutes = getTimeStringMinutes(shift.startTime)
          const shiftEndMinutes = getTimeStringMinutes(shift.endTime)
          computedIsEarly = isBeforeShiftEnd(actionTimeMinutes, shiftStartMinutes, shiftEndMinutes)
        }
      }
    } catch {}

    if ((computedIsEarly || isEarly) && !String(earlyReason || "").trim()) {
      return NextResponse.json({ error: "Early checkout reason is required before shift end" }, { status: 400 })
    }

    const updateResult = await attendanceCollection.updateOne(
      { userId: userId, companyId: session.companyId, date: today },
      {
        $set: {
          checkOutTime: checkOutTimeDate,
          isEarly: computedIsEarly || Boolean(isEarly),
          earlyReason: computedIsEarly || isEarly ? String(earlyReason || "").trim() || null : null,
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
