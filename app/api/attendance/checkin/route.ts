import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function POST(request: NextRequest) {
  try {
    const { userId, checkInTime, isLate, lateReason } = await request.json()

    const db = await getDatabase()
    const attendanceCollection = db.collection("attendance")

    const today = new Date().toISOString().split("T")[0]

    // Check if user already checked in today
    const existingRecord = await attendanceCollection.findOne({
      userId: userId,
      date: today,
    })

    if (existingRecord) {
      return NextResponse.json({ error: "Already checked in today" }, { status: 400 })
    }

    const record = {
      userId,
      date: today,
      checkInTime: new Date(checkInTime),
      checkOutTime: null,
      isLate: isLate || false,
      isEarly: false,
      lateReason: lateReason || null,
      earlyReason: null,
      hoursWorked: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await attendanceCollection.insertOne(record)

    return NextResponse.json({
      message: "Check-in successful",
      record: {
        id: result.insertedId.toString(),
        ...record,
      },
    })
  } catch (error) {
    console.error("Check-in error:", error)
    return NextResponse.json({ error: "Check-in failed" }, { status: 500 })
  }
}
