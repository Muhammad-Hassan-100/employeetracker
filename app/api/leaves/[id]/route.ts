import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { UpdateLeaveData } from "@/lib/models/Leave"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const updateData: UpdateLeaveData = await request.json()
    
    const db = await getDatabase()
    const leavesCollection = db.collection("leaves")
    const attendanceCollection = db.collection("attendance")
    
    const leave = await leavesCollection.findOne({ _id: new ObjectId(id) })
    
    if (!leave) {
      return NextResponse.json({ error: "Leave application not found" }, { status: 404 })
    }
    
    const result = await leavesCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...updateData,
          reviewedDate: new Date(),
          updatedAt: new Date(),
        },
      }
    )
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Leave application not found" }, { status: 404 })
    }
    
    // If leave is approved, mark attendance as on_leave for the date range
    if (updateData.status === "approved") {
      const startDate = new Date(leave.startDate)
      const endDate = new Date(leave.endDate)
      
      // Generate dates between start and end date
      const dates = []
      const currentDate = new Date(startDate)
      
      while (currentDate <= endDate) {
        // Skip weekends (optional - you can remove this if leaves should include weekends)
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
          dates.push(currentDate.toISOString().split("T")[0])
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      // Create or update attendance records for leave days
      for (const date of dates) {
        const existingRecord = await attendanceCollection.findOne({
          userId: leave.userId,
          date: date
        })

        if (existingRecord && existingRecord.checkInTime) {
          // Employee already checked in, cannot approve leave
          return NextResponse.json({ 
            error: `Cannot approve leave for ${date}. Employee has already checked in.` 
          }, { status: 400 })
        }

        await attendanceCollection.updateOne(
          { userId: leave.userId, date: date },
          {
            $set: {
              userId: leave.userId,
              date: date,
              checkInTime: null,
              checkOutTime: null,
              isLate: false,
              isEarly: false,
              hoursWorked: 0,
              status: "on_leave",
              leaveId: id,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              createdAt: new Date(),
            },
            $unset: {
              pendingLeaveId: "",
              rejectedLeaveId: "",
              leaveRejectedAt: ""
            }
          },
          { upsert: true }
        )
      }
    }
    
    // If leave is rejected, update any existing attendance records back to absent (if they were on_leave due to this leave)
    if (updateData.status === "rejected") {
      const startDate = new Date(leave.startDate)
      const endDate = new Date(leave.endDate)
      
      // Check if this is a same-day leave
      const isSameDayLeave = startDate.toISOString().split("T")[0] === endDate.toISOString().split("T")[0] && 
                            startDate.toISOString().split("T")[0] === new Date().toISOString().split("T")[0]
      
      // Generate dates between start and end date
      const dates = []
      const currentDate = new Date(startDate)
      
      while (currentDate <= endDate) {
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
          dates.push(currentDate.toISOString().split("T")[0])
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      // Update attendance records from on_leave back to absent if they were marked due to this leave
      for (const date of dates) {
        const existingRecord = await attendanceCollection.findOne({
          userId: leave.userId,
          date: date
        })
        
        if (existingRecord) {
          // Check if there are any other approved leaves for this date
          const otherApprovedLeave = await db.collection("leaves").findOne({
            userId: leave.userId,
            status: "approved",
            startDate: { $lte: date },
            endDate: { $gte: date },
            _id: { $ne: new ObjectId(id) }
          })
          
          if (otherApprovedLeave) {
            // Update to reference the other approved leave
            await attendanceCollection.updateOne(
              { userId: leave.userId, date: date },
              {
                $set: {
                  leaveId: otherApprovedLeave._id.toString(),
                  updatedAt: new Date(),
                }
              }
            )
          } else {
            // No other approved leaves
            if (isSameDayLeave) {
              // For rejected same-day leaves, remove leave option but allow attendance
              // Mark as "attendance_pending" to indicate employee can still check in
              await attendanceCollection.updateOne(
                { userId: leave.userId, date: date },
                {
                  $set: {
                    status: "attendance_pending",
                    rejectedLeaveId: id,
                    leaveRejectedAt: new Date(),
                    updatedAt: new Date(),
                  },
                  $unset: {
                    leaveId: ""
                  }
                }
              )
            } else {
              // For other leaves, mark as absent if no check-in record exists
              if (!existingRecord.checkInTime) {
                await attendanceCollection.updateOne(
                  { userId: leave.userId, date: date },
                  {
                    $set: {
                      status: "absent",
                      updatedAt: new Date(),
                    },
                    $unset: {
                      leaveId: ""
                    }
                  }
                )
              }
            }
          }
        }
      }
    }
    
    return NextResponse.json({ message: "Leave application updated successfully" })
  } catch (error) {
    console.error("Update leave error:", error)
    return NextResponse.json({ error: "Failed to update leave application" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    const db = await getDatabase()
    const leavesCollection = db.collection("leaves")
    
    const result = await leavesCollection.deleteOne({ _id: new ObjectId(id) })
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Leave application not found" }, { status: 404 })
    }
    
    return NextResponse.json({ message: "Leave application deleted successfully" })
  } catch (error) {
    console.error("Delete leave error:", error)
    return NextResponse.json({ error: "Failed to delete leave application" }, { status: 500 })
  }
}
