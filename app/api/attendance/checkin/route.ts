import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function POST(request: NextRequest) {
  try {
    const { userId, checkInTime, isLate, lateReason } = await request.json()

    const db = await getDatabase()
    const attendanceCollection = db.collection("attendance")
    const leavesCollection = db.collection("leaves")

    const today = new Date().toISOString().split("T")[0]

    // Check if user already has an attendance record today
    const existingRecord = await attendanceCollection.findOne({
      userId: userId,
      date: today,
    })

    if (existingRecord) {
      if (existingRecord.status === "on_leave") {
        return NextResponse.json({ 
          error: "Cannot check in while on approved leave" 
        }, { status: 400 })
      }
      if (existingRecord.status === "leave_pending") {
        return NextResponse.json({ 
          error: "Cannot check in while leave application is pending. Wait for admin decision." 
        }, { status: 400 })
      }
      if (existingRecord.checkInTime) {
        return NextResponse.json({ 
          error: "Already checked in today" 
        }, { status: 400 })
      }
      // Allow check-in if status is "attendance_pending" (leave was rejected)
    }

    // Check if user has approved leave for today
    const hasLeave = await leavesCollection.findOne({
      userId: userId,
      status: "approved",
      startDate: { $lte: today },
      endDate: { $gte: today }
    })

    if (hasLeave) {
      return NextResponse.json({ 
        error: "Cannot check in while on approved leave" 
      }, { status: 400 })
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
      const result = await attendanceCollection.updateOne(
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
            pendingLeaveId: ""
          }
        }
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
