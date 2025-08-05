import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const db = await getDatabase()
    const attendanceCollection = db.collection("attendance")

    const userRecords = await attendanceCollection.find({ userId: userId }).sort({ date: -1 }).toArray()

    const formattedRecords = userRecords.map((record) => ({
      id: record._id.toString(),
      date: record.date,
      checkInTime: record.checkInTime,
      checkOutTime: record.checkOutTime,
      isLate: record.isLate,
      isEarly: record.isEarly,
      lateReason: record.lateReason,
      earlyReason: record.earlyReason,
      hoursWorked: record.hoursWorked,
    }))

    return NextResponse.json(formattedRecords)
  } catch (error) {
    console.error("Attendance history error:", error)
    return NextResponse.json({ error: "Failed to fetch attendance history" }, { status: 500 })
  }
}
