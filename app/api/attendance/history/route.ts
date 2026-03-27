import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { assertSelfOrAdmin, requireSession } from "@/lib/session"

export async function GET(request: NextRequest) {
  try {
    const { session, response } = requireSession(request)
    if (!session) {
      return response
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const accessError = assertSelfOrAdmin(session, userId)
    if (accessError) {
      return accessError
    }

    const db = await getDatabase()
    const attendanceCollection = db.collection("attendance")
    const leavesCollection = db.collection("leaves")

    const [userRecords, approvedLeaves] = await Promise.all([
      attendanceCollection
        .find({ userId: userId, companyId: session.companyId })
        .sort({ date: -1 })
        .toArray(),
      leavesCollection
        .find({
          userId: userId,
          companyId: session.companyId,
          status: "approved",
        })
        .toArray(),
    ])

    const formattedRecords = userRecords.map((record) => {
      const matchedLeave = approvedLeaves.find((leave) => leave.startDate <= record.date && leave.endDate >= record.date)

      return {
        id: record._id.toString(),
        date: record.date,
        checkInTime: record.checkInTime,
        checkOutTime: record.checkOutTime,
        isLate: record.isLate,
        isEarly: record.isEarly,
        lateReason: record.lateReason,
        earlyReason: record.earlyReason,
        hoursWorked: record.hoursWorked,
        status: record.status || "present", // Default to present for backward compatibility
        leaveId: record.leaveId,
        leaveReason: matchedLeave?.reason || null,
        leaveType: matchedLeave?.leaveType || null,
      }
    })

    return NextResponse.json(formattedRecords)
  } catch (error) {
    console.error("Attendance history error:", error)
    return NextResponse.json({ error: "Failed to fetch attendance history" }, { status: 500 })
  }
}
