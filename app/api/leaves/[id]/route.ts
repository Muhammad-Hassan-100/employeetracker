import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { UpdateLeaveData } from "@/lib/models/Leave"
import { requireAdmin } from "@/lib/session"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, response } = requireAdmin(request)
    if (!session) {
      return response
    }

    const { id } = params
    const updateData: UpdateLeaveData = await request.json()
    
    const db = await getDatabase()
    const leavesCollection = db.collection("leaves")
    const attendanceCollection = db.collection("attendance")
    
    const leave = await leavesCollection.findOne({ _id: new ObjectId(id), companyId: session.companyId })
    
    if (!leave) {
      return NextResponse.json({ error: "Leave application not found" }, { status: 404 })
    }
    
    const result = await leavesCollection.updateOne(
      { _id: new ObjectId(id), companyId: session.companyId },
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
    
    if (updateData.status === "approved") {
      const startDate = new Date(leave.startDate)
      const endDate = new Date(leave.endDate)
      const dates = []
      const currentDate = new Date(startDate)
      
      while (currentDate <= endDate) {
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
          dates.push(currentDate.toISOString().split("T")[0])
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      // Create or update attendance records for leave days
      for (const date of dates) {
        const existingRecord = await attendanceCollection.findOne({
          userId: leave.userId,
          companyId: session.companyId,
          date: date
        })

        if (existingRecord && existingRecord.checkInTime) {
          return NextResponse.json({ 
            error: `Cannot approve leave for ${date}. Employee has already checked in.` 
          }, { status: 400 })
        }

        await attendanceCollection.updateOne(
          { userId: leave.userId, date: date },
          {
            $set: {
              userId: leave.userId,
              companyId: session.companyId,
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
            }
          },
          { upsert: true }
        )
      }
    }
    
    if (updateData.status === "rejected") {
      const startDate = new Date(leave.startDate)
      const endDate = new Date(leave.endDate)
      const today = new Date().toISOString().split("T")[0]
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
          companyId: session.companyId,
          date: date
        })
        
        if (existingRecord) {
          const otherApprovedLeave = await db.collection("leaves").findOne({
            userId: leave.userId,
            companyId: session.companyId,
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
            if (existingRecord.leaveId !== id || existingRecord.checkInTime) {
              continue
            }

            if (date >= today) {
              await attendanceCollection.deleteOne({
                _id: existingRecord._id,
                companyId: session.companyId,
              })
            } else {
              await attendanceCollection.updateOne(
                { _id: existingRecord._id, companyId: session.companyId },
                {
                  $set: {
                    status: "absent",
                    updatedAt: new Date(),
                  },
                  $unset: {
                    leaveId: "",
                  },
                },
              )
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
    const { session, response } = requireAdmin(request)
    if (!session) {
      return response
    }

    const { id } = params
    
    const db = await getDatabase()
    const leavesCollection = db.collection("leaves")
    
    const result = await leavesCollection.deleteOne({ _id: new ObjectId(id), companyId: session.companyId })
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Leave application not found" }, { status: 404 })
    }
    
    return NextResponse.json({ message: "Leave application deleted successfully" })
  } catch (error) {
    console.error("Delete leave error:", error)
    return NextResponse.json({ error: "Failed to delete leave application" }, { status: 500 })
  }
}
