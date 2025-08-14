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
          },
          { upsert: true }
        )
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
