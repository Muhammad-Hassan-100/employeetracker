import { NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { requireSession } from "@/lib/session"

export async function GET(request: NextRequest) {
  try {
    const { session, response } = requireSession(request)
    if (!session) {
      return response
    }

    const db = await getDatabase()
    const shiftsCollection = db.collection("shifts")

    const shifts = await shiftsCollection.find({ companyId: session.companyId }).sort({ createdAt: -1 }).toArray()

    const formattedShifts = shifts.map((shift) => ({
      id: shift._id.toString(),
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      description: shift.description,
      companyId: shift.companyId,
    }))

    return NextResponse.json(formattedShifts)
  } catch (error) {
    console.error("Fetch shifts error:", error)
    return NextResponse.json({ error: "Failed to fetch shifts" }, { status: 500 })
  }
}
