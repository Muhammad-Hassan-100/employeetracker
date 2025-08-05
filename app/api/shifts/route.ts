import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function GET() {
  try {
    const db = await getDatabase()
    const shiftsCollection = db.collection("shifts")

    const shifts = await shiftsCollection.find({}).sort({ createdAt: -1 }).toArray()

    const formattedShifts = shifts.map((shift) => ({
      id: shift._id.toString(),
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      description: shift.description,
    }))

    return NextResponse.json(formattedShifts)
  } catch (error) {
    console.error("Fetch shifts error:", error)
    return NextResponse.json({ error: "Failed to fetch shifts" }, { status: 500 })
  }
}
