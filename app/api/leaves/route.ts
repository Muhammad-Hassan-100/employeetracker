import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { CreateLeaveData } from "@/lib/models/Leave"
import { ObjectId } from "mongodb"
import { assertSelfOrAdmin, requireSession } from "@/lib/session"

export async function POST(request: NextRequest) {
  try {
    const { session, response } = requireSession(request)
    if (!session) {
      return response
    }

    const leaveData: CreateLeaveData = await request.json()
    const accessError = assertSelfOrAdmin(session, leaveData.userId)
    if (accessError) {
      return accessError
    }
    
    const db = await getDatabase()
    const leavesCollection = db.collection("leaves")
    const usersCollection = db.collection("users")

    const employee = await usersCollection.findOne({
      _id: new ObjectId(leaveData.userId),
      companyId: session.companyId,
      role: "employee",
      status: "active",
    })

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }
    
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
      companyId: session.companyId,
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
      companyId: session.companyId,
      companyName: session.companyName,
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
    const { session, response } = requireSession(request)
    if (!session) {
      return response
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const status = searchParams.get("status")
    
    const db = await getDatabase()
    const leavesCollection = db.collection("leaves")
    
    const query: Record<string, any> = {
      companyId: session.companyId,
    }
    
    if (userId) {
      const accessError = assertSelfOrAdmin(session, userId)
      if (accessError) {
        return accessError
      }
      query.userId = userId
    } else if (session.role !== "admin") {
      query.userId = session.userId
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
