import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { name, startTime, endTime, description } = await request.json()
    const db = await getDatabase()
    const shiftsCollection = db.collection("shifts")

    const updateResult = await shiftsCollection.updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          name,
          startTime,
          endTime,
          description,
          updatedAt: new Date(),
        },
      },
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 })
    }

    const updatedShift = await shiftsCollection.findOne({ _id: new ObjectId(params.id) })

    return NextResponse.json({
      message: "Shift updated successfully",
      shift: {
        id: updatedShift?._id.toString(),
        name: updatedShift?.name,
        startTime: updatedShift?.startTime,
        endTime: updatedShift?.endTime,
        description: updatedShift?.description,
      },
    })
  } catch (error) {
    console.error("Update shift error:", error)
    return NextResponse.json({ error: "Failed to update shift" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getDatabase()
    const shiftsCollection = db.collection("shifts")

    const deleteResult = await shiftsCollection.deleteOne({
      _id: new ObjectId(params.id),
    })

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 })
    }

    return NextResponse.json({
      message: "Shift deleted successfully",
    })
  } catch (error) {
    console.error("Delete shift error:", error)
    return NextResponse.json({ error: "Failed to delete shift" }, { status: 500 })
  }
}
