import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function POST(request: NextRequest) {
  try {
    const { date } = await request.json()
    
    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 })
    }
    
    const db = await getDatabase()
    const attendanceCollection = db.collection("attendance")
    
    // Find all attendance records with "attendance_pending" status for the given date
    const pendingRecords = await attendanceCollection.find({
      date: date,
      status: "attendance_pending"
    }).toArray()
    
    let autoMarkedAbsent = 0
    
    // Check current time - only auto-mark after work hours (e.g., 6 PM)
    const now = new Date()
    const targetDate = new Date(date)
    const workEndTime = new Date(targetDate)
    workEndTime.setHours(18, 0, 0, 0) // 6 PM
    
    // Only auto-mark if it's past work hours or if it's a future date being processed
    if (now >= workEndTime || date < now.toISOString().split("T")[0]) {
      for (const record of pendingRecords) {
        // Check if employee never checked in
        if (!record.checkInTime) {
          await attendanceCollection.updateOne(
            { _id: record._id },
            {
              $set: {
                status: "absent",
                autoMarkedAt: new Date(),
                updatedAt: new Date()
              },
              $unset: {
                rejectedLeaveId: "",
                leaveRejectedAt: ""
              }
            }
          )
          autoMarkedAbsent++
        }
      }
    }
    
    return NextResponse.json({
      message: `Auto-marked ${autoMarkedAbsent} employees as absent for ${date}`,
      autoMarkedAbsent,
      workEndTime: workEndTime.toISOString(),
      currentTime: now.toISOString()
    })
  } catch (error) {
    console.error("Auto mark absent error:", error)
    return NextResponse.json(
      { error: "Failed to auto mark absent employees" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0]
    
    const db = await getDatabase()
    const attendanceCollection = db.collection("attendance")
    const usersCollection = db.collection("users")
    
    // Find all attendance records with "attendance_pending" status
    const pendingRecords = await attendanceCollection.find({
      date: date,
      status: "attendance_pending"
    }).toArray()
    
    const pendingEmployees = []
    
    for (const record of pendingRecords) {
      const employee = await usersCollection.findOne({ 
        _id: record.userId 
      })
      
      if (employee) {
        pendingEmployees.push({
          id: employee._id.toString(),
          name: employee.name,
          department: employee.department,
          rejectedAt: record.leaveRejectedAt,
          hasCheckedIn: !!record.checkInTime
        })
      }
    }
    
    const now = new Date()
    const workEndTime = new Date(date)
    workEndTime.setHours(18, 0, 0, 0) // 6 PM
    
    return NextResponse.json({
      date,
      pendingEmployees,
      canAutoMark: now >= workEndTime || date < now.toISOString().split("T")[0],
      workEndTime: workEndTime.toISOString(),
      currentTime: now.toISOString()
    })
  } catch (error) {
    console.error("Get pending employees error:", error)
    return NextResponse.json(
      { error: "Failed to get pending employees" },
      { status: 500 }
    )
  }
}
