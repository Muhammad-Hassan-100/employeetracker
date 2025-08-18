import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function POST(request: NextRequest) {
  try {
    const { userId, checkInTime, isLate, lateReason } = await request.json()

    const db = await getDatabase()
    const attendanceCollection = db.collection("attendance")
    const leavesCollection = db.collection("leaves")
    const usersCollection = db.collection("users")
    const shiftsCollection = db.collection("shifts")

    const now = new Date(checkInTime)
    const today = new Date().toISOString().split("T")[0]

    // Enforce: check-in allowed only from 5 minutes before shift start (if shift exists)
    try {
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) })
      if (user?.shiftId) {
        let shift: any = null
        // Try ObjectId first
        try {
          shift = await shiftsCollection.findOne({ _id: new ObjectId(user.shiftId) })
        } catch {}
        // Try by name (case-insensitive)
        if (!shift) {
          shift = await shiftsCollection.findOne({ name: { $regex: new RegExp(`^${user.shiftId}$`, "i") } })
        }
        // Try normalized name (remove spaces)
        if (!shift) {
          const normalizedShiftId = String(user.shiftId).toLowerCase().replace(/\s+/g, "")
          const allShifts = await shiftsCollection.find({}).toArray()
          shift = allShifts.find((s: any) => String(s.name).toLowerCase().replace(/\s+/g, "") === normalizedShiftId)
        }
        if (shift?.startTime) {
          const [h, m] = String(shift.startTime).split(":").map(Number)
          const shiftStart = new Date()
          shiftStart.setHours(h, m ?? 0, 0, 0)
          const earliestCheckIn = new Date(shiftStart.getTime() - 5 * 60 * 1000)
          if (now < earliestCheckIn) {
            return NextResponse.json(
              { error: "Check-in allowed only 5 minutes before shift start" },
              { status: 400 },
            )
          }
        }
      }
    } catch {}

    // Check if user already has an attendance record today
    const existingRecord = await attendanceCollection.findOne({
      userId: userId,
      date: today,
    })

    if (existingRecord) {
      if (existingRecord.status === "on_leave") {
        return NextResponse.json({ error: "Cannot check in while on approved leave" }, { status: 400 })
      }
      if (existingRecord.status === "leave_pending") {
        return NextResponse.json(
          { error: "Cannot check in while leave application is pending. Wait for admin decision." },
          { status: 400 },
        )
      }
      if (existingRecord.checkInTime) {
        return NextResponse.json({ error: "Already checked in today" }, { status: 400 })
      }
      // Allow check-in if status is "attendance_pending" (leave was rejected)
    }

    // Check if user has approved leave for today
    const hasLeave = await leavesCollection.findOne({
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
      date: today,
      checkInTime: new Date(checkInTime),
      checkOutTime: null,
      isLate: isLate || false,
      isEarly: false,
      lateReason: lateReason || null,
      earlyReason: null,
      hoursWorked: 0,
      status: "present",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    if (existingRecord) {
      // Update existing record
      await attendanceCollection.updateOne(
        { _id: existingRecord._id },
        {
          $set: {
            checkInTime: new Date(checkInTime),
            isLate: isLate || false,
            lateReason: lateReason || null,
            status: "present",
            updatedAt: new Date(),
          },
          $unset: {
            rejectedLeaveId: "",
            leaveRejectedAt: "",
            pendingLeaveId: "",
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
      // Create new record
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
