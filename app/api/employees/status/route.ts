import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

import { ObjectId } from "mongodb"

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
    const usersCollection = db.collection("users")

    // Get user information
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if user joined by this date
    const joinDate = new Date(user.joinDate).toISOString().split("T")[0]
    if (date < joinDate) {
      return NextResponse.json({
        status: "not_joined",
        message: "Employee hasn't joined yet on this date",
        canCheckIn: false,
        canApplyLeave: false,
        canCheckOut: false
      })
    }

    // Check if it's a weekend
    const dayOfWeek = new Date(date).getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    if (isWeekend) {
      return NextResponse.json({
        status: "weekend",
        message: "Weekend - No attendance required",
        canCheckIn: false,
        canApplyLeave: false,
        canCheckOut: false
      })
    }

    // Check for approved leave
    const approvedLeave = await leavesCollection.findOne({
      userId: userId,
      status: "approved",
      startDate: { $lte: date },
      endDate: { $gte: date }
    })

    if (approvedLeave) {
      return NextResponse.json({
        status: "on_leave",
        message: "Employee is on approved leave",
        leaveDetails: {
          id: approvedLeave._id.toString(),
          type: approvedLeave.leaveType,
          reason: approvedLeave.reason,
          startDate: approvedLeave.startDate,
          endDate: approvedLeave.endDate
        },
        canCheckIn: false,
        canApplyLeave: false,
        canCheckOut: false
      })
    }

    // Check attendance record
    const attendanceRecord = await attendanceCollection.findOne({
      userId: userId,
      date: date
    })

    if (attendanceRecord) {
      if (attendanceRecord.status === "on_leave") {
        return NextResponse.json({
          status: "on_leave",
          message: "Employee is on leave",
          attendanceRecord: {
            id: attendanceRecord._id.toString(),
            ...attendanceRecord
          },
          canCheckIn: false,
          canApplyLeave: false,
          canCheckOut: false
        })
      }

      if (attendanceRecord.checkInTime && !attendanceRecord.checkOutTime) {
        return NextResponse.json({
          status: "checked_in",
          message: "Employee is checked in",
          attendanceRecord: {
            id: attendanceRecord._id.toString(),
            ...attendanceRecord
          },
          canCheckIn: false,
          canApplyLeave: false,
          canCheckOut: true
        })
      }

      if (attendanceRecord.checkInTime && attendanceRecord.checkOutTime) {
        return NextResponse.json({
          status: "completed",
          message: "Attendance completed for the day",
          attendanceRecord: {
            id: attendanceRecord._id.toString(),
            ...attendanceRecord
          },
          canCheckIn: false,
          canApplyLeave: false,
          canCheckOut: false
        })
      }

      if (attendanceRecord.status === "absent") {
        return NextResponse.json({
          status: "marked_absent",
          message: "Employee was marked absent",
          attendanceRecord: {
            id: attendanceRecord._id.toString(),
            ...attendanceRecord
          },
          canCheckIn: false,
          canApplyLeave: false,
          canCheckOut: false
        })
      }
    }

    // Check for pending leave applications for today
    const pendingLeave = await leavesCollection.findOne({
      userId: userId,
      status: "pending",
      startDate: { $lte: date },
      endDate: { $gte: date }
    })

    const today = new Date().toISOString().split("T")[0]
    const isToday = date === today

    return NextResponse.json({
      status: "available",
      message: "Employee can check in or apply for leave",
      pendingLeave: pendingLeave ? {
        id: pendingLeave._id.toString(),
        type: pendingLeave.leaveType,
        reason: pendingLeave.reason
      } : null,
      canCheckIn: isToday,
      canApplyLeave: isToday && !pendingLeave,
      canCheckOut: false,
      isToday: isToday
    })

  } catch (error) {
    console.error("Employee status check error:", error)
    return NextResponse.json(
      { error: "Failed to check employee status" },
      { status: 500 }
    )
  }
}
