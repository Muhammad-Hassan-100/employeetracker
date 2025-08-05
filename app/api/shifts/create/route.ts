import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function POST(request: NextRequest) {
  try {
    const { name, startTime, endTime, description } = await request.json()

    const db = await getDatabase()
    const shiftsCollection = db.collection("shifts")

    const newShift = {
      name,
      startTime,
      endTime,
      description: description || "",
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
