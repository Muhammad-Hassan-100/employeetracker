import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { requireAdmin } from "@/lib/session"

export async function POST(request: NextRequest) {
  try {
    const { session, response } = requireAdmin(request)
    if (!session) {
      return response
    }

    const { name, startTime, endTime, description } = await request.json()
    if (!name || !startTime || !endTime) {
      return NextResponse.json({ error: "Name, start time, and end time are required" }, { status: 400 })
    }

    const db = await getDatabase()
    const shiftsCollection = db.collection("shifts")

    const existingShift = await shiftsCollection.findOne({
      companyId: session.companyId,
      name: { $regex: new RegExp(`^${String(name).trim()}$`, "i") },
    })

    if (existingShift) {
      return NextResponse.json({ error: "Shift with this name already exists" }, { status: 400 })
    }

    const newShift = {
      name,
      startTime,
      endTime,
      description: description || "",
      companyId: session.companyId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await shiftsCollection.insertOne(newShift)

    return NextResponse.json({
      message: "Shift created successfully",
      shift: {
        id: result.insertedId.toString(),
        ...newShift,
      },
    })
  } catch (error) {
    console.error("Create shift error:", error)
    return NextResponse.json({ error: "Failed to create shift" }, { status: 500 })
  }
}
