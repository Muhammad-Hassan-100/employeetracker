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
    
    // Create same-day leave application (requires admin approval)
    const leave = {
      userId,
      employeeName,
      leaveType: "emergency",
      startDate: date,
      endDate: date,
      reason,
      status: "pending", // Same-day leaves require admin approval
      appliedDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    const leaveResult = await leavesCollection.insertOne(leave)
    
    // Do NOT automatically update attendance - wait for admin approval
    // Create a temporary attendance record that shows leave is pending
    const existingRecord = await attendanceCollection.findOne({
      userId: userId,
      date: date
    })
    
    if (!existingRecord) {
      await attendanceCollection.insertOne({
        userId: userId,
        date: date,
        checkInTime: null,
        checkOutTime: null,
        isLate: false,
        isEarly: false,
        hoursWorked: 0,
        status: "leave_pending", // New status to indicate leave is pending approval
        pendingLeaveId: leaveResult.insertedId.toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    } else {
      // Update existing record to show leave is pending
      await attendanceCollection.updateOne(
        { userId: userId, date: date },
        {
          $set: {
            status: "leave_pending",
            pendingLeaveId: leaveResult.insertedId.toString(),
            updatedAt: new Date(),
          }
        }
      )
    }
    
    return NextResponse.json({
      message: "Same-day leave application submitted for admin approval",
      leaveId: leaveResult.insertedId.toString(),
      note: "This leave requires admin approval. You will be marked absent until approved."
    })
  } catch (error) {
    console.error("Same-day leave error:", error)
    return NextResponse.json(
      { error: "Failed to apply for same-day leave" },
      { status: 500 }
    )
  }
}
