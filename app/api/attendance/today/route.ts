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

    const today = new Date().toISOString().split("T")[0]
    const todayRecord = await attendanceCollection.findOne({
      companyId: session.companyId,
      userId: userId,
      date: today,
    })

    return NextResponse.json({
      isCheckedIn: !!todayRecord && !!todayRecord.checkInTime && !todayRecord.checkOutTime,
      record: todayRecord
        ? {
            id: todayRecord._id.toString(),
            ...todayRecord,
          }
        : null,
    })
  } catch (error) {
    console.error("Today attendance error:", error)
    return NextResponse.json({ error: "Failed to check today attendance" }, { status: 500 })
  }
}
