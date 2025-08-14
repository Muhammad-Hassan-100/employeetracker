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
    const leavesCollection = db.collection("leaves")
    
    // Find all attendance records for the date that are marked as "absent"
    const absentRecords = await attendanceCollection.find({
      date: date,
      status: "absent"
    }).toArray()
    
    let correctedCount = 0
    
    for (const record of absentRecords) {
      // Check if this employee has approved leave for this date
      const hasLeave = await leavesCollection.findOne({
        userId: record.userId,
        status: "approved",
        startDate: { $lte: date },
        endDate: { $gte: date }
      })
      
      if (hasLeave) {
        // Update the attendance record to "on_leave"
        await attendanceCollection.updateOne(
          { _id: record._id },
          {
            $set: {
              status: "on_leave",
              leaveId: hasLeave._id.toString(),
              updatedAt: new Date()
            }
          }
        )
        correctedCount++
      }
    }
    
    return NextResponse.json({
      message: `Corrected ${correctedCount} attendance records from absent to on_leave`,
      correctedCount
    })
  } catch (error) {
    console.error("Fix attendance error:", error)
    return NextResponse.json(
      { error: "Failed to fix attendance records" },
      { status: 500 }
    )
  }
}
