import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0]

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const db = await getDatabase()
    const attendanceCollection = db.collection("attendance")
    const leavesCollection = db.collection("leaves")

    // Check current attendance status
    const attendanceRecord = await attendanceCollection.findOne({
      userId: userId,
      date: date
    })

    // Check if there's any pending leave for today
    const pendingLeave = await leavesCollection.findOne({
      userId: userId,
      startDate: { $lte: date },
      endDate: { $gte: date },
      status: "pending"
    })

    // Check if there's any approved leave for today
    const approvedLeave = await leavesCollection.findOne({
      userId: userId,
      startDate: { $lte: date },
      endDate: { $gte: date },
      status: "approved"
    })

    // Check if there's any rejected same-day leave for today
    const rejectedTodayLeave = await leavesCollection.findOne({
      userId: userId,
      startDate: date,
      endDate: date,
      status: "rejected",
      appliedDate: {
        $gte: new Date(date + "T00:00:00.000Z"),
        $lt: new Date(date + "T23:59:59.999Z")
      }
    })

    let canApplyLeave = true
    let canCheckIn = true
    let message = ""
    let currentStatus = "available"

    // Determine current status and available actions
    if (attendanceRecord?.checkInTime) {
      canApplyLeave = false
      canCheckIn = false
      currentStatus = "checked_in"
      message = "Already checked in for today"
    } else if (approvedLeave) {
      canApplyLeave = false
      canCheckIn = false
      currentStatus = "on_leave"
      message = "On approved leave"
    } else if (pendingLeave) {
      canApplyLeave = false
      canCheckIn = false
      currentStatus = "leave_pending"
      message = "Leave application pending admin approval"
    } else if (rejectedTodayLeave && attendanceRecord?.status === "attendance_pending") {
      canApplyLeave = false
      canCheckIn = true
      currentStatus = "attendance_only"
      message = "Leave request rejected. Only attendance option available."
    } else if (attendanceRecord?.status === "attendance_pending") {
      canApplyLeave = false
      canCheckIn = true
      currentStatus = "attendance_only"
      message = "Only attendance option available"
    } else {
      // Employee can apply for leave anytime during the day
      canApplyLeave = true
      canCheckIn = true
      currentStatus = "available"
      message = "You can check in or apply for same-day leave"
    }

    return NextResponse.json({
      canApplyLeave,
      canCheckIn,
      currentStatus,
      message,
      attendanceRecord: attendanceRecord ? {
        id: attendanceRecord._id.toString(),
        status: attendanceRecord.status,
        checkInTime: attendanceRecord.checkInTime,
        checkOutTime: attendanceRecord.checkOutTime
      } : null,
      pendingLeave: pendingLeave ? {
        id: pendingLeave._id.toString(),
        leaveType: pendingLeave.leaveType,
        reason: pendingLeave.reason,
        status: pendingLeave.status
      } : null,
      approvedLeave: approvedLeave ? {
        id: approvedLeave._id.toString(),
        leaveType: approvedLeave.leaveType,
        reason: approvedLeave.reason
      } : null
    })
  } catch (error) {
    console.error("Employee options error:", error)
    return NextResponse.json(
      { error: "Failed to get employee options" },
      { status: 500 }
    )
  }
}
