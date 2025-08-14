import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate } = await request.json()
    
    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Start date and end date are required" }, { status: 400 })
    }
    
    const db = await getDatabase()
    const attendanceCollection = db.collection("attendance")
    const leavesCollection = db.collection("leaves")
    
    // Get all approved leaves that overlap with the given date range
    const approvedLeaves = await leavesCollection.find({
      status: "approved",
      $or: [
        {
          startDate: { $lte: endDate },
          endDate: { $gte: startDate }
        }
      ]
    }).toArray()
    
    let syncedRecords = 0
    let correctedRecords = 0
    
    for (const leave of approvedLeaves) {
      const leaveStartDate = new Date(leave.startDate)
      const leaveEndDate = new Date(leave.endDate)
      
      // Generate dates for this leave
      const currentDate = new Date(Math.max(leaveStartDate.getTime(), new Date(startDate).getTime()))
      const endDateLimit = new Date(Math.min(leaveEndDate.getTime(), new Date(endDate).getTime()))
      
      while (currentDate <= endDateLimit) {
        // Skip weekends
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
          const dateStr = currentDate.toISOString().split("T")[0]
          
          // Check if attendance record exists
          const existingRecord = await attendanceCollection.findOne({
            userId: leave.userId,
            date: dateStr
          })
          
          if (existingRecord) {
            // Update existing record if it's not already on_leave or if it has wrong leaveId
            if (existingRecord.status !== "on_leave" || existingRecord.leaveId !== leave._id.toString()) {
              await attendanceCollection.updateOne(
                { _id: existingRecord._id },
                {
                  $set: {
                    status: "on_leave",
                    leaveId: leave._id.toString(),
                    updatedAt: new Date(),
                    // Only update these if the record was previously absent
                    ...(existingRecord.status === "absent" && {
                      checkInTime: null,
                      checkOutTime: null,
                      isLate: false,
                      isEarly: false,
                      hoursWorked: 0,
                    })
                  }
                }
              )
              correctedRecords++
            }
          } else {
            // Create new attendance record for leave
            await attendanceCollection.insertOne({
              userId: leave.userId,
              date: dateStr,
              checkInTime: null,
              checkOutTime: null,
              isLate: false,
              isEarly: false,
              hoursWorked: 0,
              status: "on_leave",
              leaveId: leave._id.toString(),
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            syncedRecords++
          }
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
    }
    
    // Also check for attendance records marked as absent but should be on leave
    const absentRecords = await attendanceCollection.find({
      date: { $gte: startDate, $lte: endDate },
      status: "absent"
    }).toArray()
    
    let additionalCorrections = 0
    
    for (const record of absentRecords) {
      // Check if this employee has approved leave for this date
      const hasLeave = await leavesCollection.findOne({
        userId: record.userId,
        status: "approved",
        startDate: { $lte: record.date },
        endDate: { $gte: record.date }
      })
      
      if (hasLeave) {
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
        additionalCorrections++
      }
    }
    
    return NextResponse.json({
      message: `Sync completed successfully`,
      details: {
        newLeaveRecords: syncedRecords,
        correctedExistingRecords: correctedRecords,
        additionalCorrections: additionalCorrections,
        totalChanges: syncedRecords + correctedRecords + additionalCorrections
      }
    })
  } catch (error) {
    console.error("Sync attendance with leaves error:", error)
    return NextResponse.json(
      { error: "Failed to sync attendance with leaves" },
      { status: 500 }
    )
  }
}

// GET endpoint to preview what would be synced
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    
    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Start date and end date are required" }, { status: 400 })
    }
    
    const db = await getDatabase()
    const attendanceCollection = db.collection("attendance")
    const leavesCollection = db.collection("leaves")
    const usersCollection = db.collection("users")
    
    // Find inconsistencies
    const inconsistencies = []
    
    // Check for approved leaves without proper attendance records
    const approvedLeaves = await leavesCollection.find({
      status: "approved",
      startDate: { $lte: endDate },
      endDate: { $gte: startDate }
    }).toArray()
    
    for (const leave of approvedLeaves) {
      const employee = await usersCollection.findOne({ _id: leave.userId })
      const leaveStartDate = new Date(leave.startDate)
      const leaveEndDate = new Date(leave.endDate)
      
      const currentDate = new Date(Math.max(leaveStartDate.getTime(), new Date(startDate).getTime()))
      const endDateLimit = new Date(Math.min(leaveEndDate.getTime(), new Date(endDate).getTime()))
      
      while (currentDate <= endDateLimit) {
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
          const dateStr = currentDate.toISOString().split("T")[0]
          
          const attendanceRecord = await attendanceCollection.findOne({
            userId: leave.userId,
            date: dateStr
          })
          
          if (!attendanceRecord) {
            inconsistencies.push({
              type: "missing_attendance",
              employeeName: employee?.name || "Unknown",
              employeeId: leave.userId,
              date: dateStr,
              leaveType: leave.leaveType,
              issue: "No attendance record for approved leave"
            })
          } else if (attendanceRecord.status !== "on_leave") {
            inconsistencies.push({
              type: "wrong_status",
              employeeName: employee?.name || "Unknown",
              employeeId: leave.userId,
              date: dateStr,
              currentStatus: attendanceRecord.status,
              expectedStatus: "on_leave",
              leaveType: leave.leaveType,
              issue: `Marked as ${attendanceRecord.status} but should be on leave`
            })
          }
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
    }
    
    // Check for absent records that should be on leave
    const absentRecords = await attendanceCollection.find({
      date: { $gte: startDate, $lte: endDate },
      status: "absent"
    }).toArray()
    
    for (const record of absentRecords) {
      const hasLeave = await leavesCollection.findOne({
        userId: record.userId,
        status: "approved",
        startDate: { $lte: record.date },
        endDate: { $gte: record.date }
      })
      
      if (hasLeave) {
        const employee = await usersCollection.findOne({ _id: record.userId })
        inconsistencies.push({
          type: "absent_with_leave",
          employeeName: employee?.name || "Unknown",
          employeeId: record.userId,
          date: record.date,
          currentStatus: "absent",
          expectedStatus: "on_leave",
          leaveType: hasLeave.leaveType,
          issue: "Marked absent but has approved leave"
        })
      }
    }
    
    return NextResponse.json({
      dateRange: { startDate, endDate },
      inconsistencies,
      summary: {
        totalIssues: inconsistencies.length,
        missingAttendance: inconsistencies.filter(i => i.type === "missing_attendance").length,
        wrongStatus: inconsistencies.filter(i => i.type === "wrong_status").length,
        absentWithLeave: inconsistencies.filter(i => i.type === "absent_with_leave").length
      }
    })
  } catch (error) {
    console.error("Preview sync error:", error)
    return NextResponse.json(
      { error: "Failed to preview sync" },
      { status: 500 }
    )
  }
}
