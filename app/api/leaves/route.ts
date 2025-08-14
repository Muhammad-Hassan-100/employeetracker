import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { CreateLeaveData } from "@/lib/models/Leave"

export async function POST(request: NextRequest) {
  try {
    const leaveData: CreateLeaveData = await request.json()
    
    const db = await getDatabase()
    const leavesCollection = db.collection("leaves")
    
    // Validate date format
    const startDate = new Date(leaveData.startDate)
    const endDate = new Date(leaveData.endDate)
    
    if (startDate > endDate) {
      return NextResponse.json(
        { error: "Start date cannot be after end date" },
        { status: 400 }
      )
    }
    
    // Check for overlapping leave applications
    const existingLeave = await leavesCollection.findOne({
      userId: leaveData.userId,
      status: { $in: ["pending", "approved"] },
      $or: [
        {
          startDate: { $lte: leaveData.endDate },
          endDate: { $gte: leaveData.startDate }
        }
      ]
    })
    
    if (existingLeave) {
      return NextResponse.json(
        { error: "You already have a leave application for overlapping dates" },
        { status: 400 }
      )
    }
    
    const leave = {
      ...leaveData,
      status: "pending",
      appliedDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    const result = await leavesCollection.insertOne(leave)
    
    return NextResponse.json({
      id: result.insertedId.toString(),
      ...leave,
    })
  } catch (error) {
    console.error("Leave application error:", error)
    return NextResponse.json(
      { error: "Failed to submit leave application" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const status = searchParams.get("status")
    
    const db = await getDatabase()
    const leavesCollection = db.collection("leaves")
    
    let query: any = {}
    
    if (userId) {
      query.userId = userId
    }
    
    if (status) {
      query.status = status
    }
    
    const leaves = await leavesCollection.find(query).sort({ appliedDate: -1 }).toArray()
    
    const formattedLeaves = leaves.map((leave) => ({
      id: leave._id.toString(),
      userId: leave.userId,
      employeeName: leave.employeeName,
      leaveType: leave.leaveType,
      startDate: leave.startDate,
      endDate: leave.endDate,
      reason: leave.reason,
      status: leave.status,
      appliedDate: leave.appliedDate,
      reviewedBy: leave.reviewedBy,
      reviewedDate: leave.reviewedDate,
      reviewComments: leave.reviewComments,
    }))
    
    return NextResponse.json(formattedLeaves)
  } catch (error) {
    console.error("Fetch leaves error:", error)
    return NextResponse.json(
      { error: "Failed to fetch leave applications" },
      { status: 500 }
    )
  }
}
