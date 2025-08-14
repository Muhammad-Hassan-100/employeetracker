import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function POST(request: NextRequest) {
  try {
    const { userId, employeeName, reason, date } = await request.json()
    
    if (!userId || !employeeName || !reason || !date) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      )
    }
    
    const db = await getDatabase()
    const leavesCollection = db.collection("leaves")
    const attendanceCollection = db.collection("attendance")
    
    // Check if employee already has attendance for today
    const existingAttendance = await attendanceCollection.findOne({
      userId: userId,
      date: date
    })
    
    if (existingAttendance && existingAttendance.checkInTime) {
      return NextResponse.json(
        { error: "Cannot apply for leave after checking in" },
        { status: 400 }
      )
    }

    if (existingAttendance && existingAttendance.status === "on_leave") {
      return NextResponse.json(
        { error: "Leave already applied for today" },
        { status: 400 }
      )
    }
    
    // Check if employee already has a leave application for today
    const existingLeave = await leavesCollection.findOne({
      userId: userId,
      startDate: date,
      endDate: date,
      status: { $in: ["pending", "approved"] }
    })
    
    if (existingLeave) {
      return NextResponse.json(
        { error: "Leave application already exists for today" },
        { status: 400 }
      )
    }
    
    // Create same-day leave application with auto-approval for emergencies
    const leave = {
      userId,
      employeeName,
      leaveType: "emergency",
      startDate: date,
      endDate: date,
      reason,
      status: "approved", // Auto-approve same-day emergency leave
      appliedDate: new Date(),
      reviewedBy: "System (Same-day Auto-approval)",
      reviewedDate: new Date(),
      reviewComments: "Auto-approved same-day emergency leave",
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    const leaveResult = await leavesCollection.insertOne(leave)
    
    // Create or update attendance record for leave
    await attendanceCollection.updateOne(
      { userId: userId, date: date },
      {
        $set: {
          userId: userId,
          date: date,
          checkInTime: null,
          checkOutTime: null,
          isLate: false,
          isEarly: false,
          hoursWorked: 0,
          status: "on_leave",
          leaveId: leaveResult.insertedId.toString(),
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    )
    
    return NextResponse.json({
      message: "Same-day leave applied successfully",
      leaveId: leaveResult.insertedId.toString(),
    })
  } catch (error) {
    console.error("Same-day leave error:", error)
    return NextResponse.json(
      { error: "Failed to apply for same-day leave" },
      { status: 500 }
    )
  }
}
