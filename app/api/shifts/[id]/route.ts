import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { requireAdmin } from "@/lib/session"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { session, response } = requireAdmin(request)
    if (!session) {
      return response
    }
    const { id } = await params

    const { name, startTime, endTime, description } = await request.json()
    const db = await getDatabase()
    const shiftsCollection = db.collection("shifts")
    const usersCollection = db.collection("users")

    const duplicate = await shiftsCollection.findOne({
      _id: { $ne: new ObjectId(id) },
      companyId: session.companyId,
      name: { $regex: new RegExp(`^${String(name).trim()}$`, "i") },
    })

    if (duplicate) {
      return NextResponse.json({ error: "Shift with this name already exists" }, { status: 400 })
    }

    const updateResult = await shiftsCollection.updateOne(
      { _id: new ObjectId(id), companyId: session.companyId },
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

    const updatedShift = await shiftsCollection.findOne({ _id: new ObjectId(id), companyId: session.companyId })

    await usersCollection.updateMany(
      { companyId: session.companyId, shiftId: id },
      { $set: { updatedAt: new Date() } },
    )

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

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { session, response } = requireAdmin(request)
    if (!session) {
      return response
    }
    const { id } = await params

    const db = await getDatabase()
    const shiftsCollection = db.collection("shifts")
    const usersCollection = db.collection("users")

    const assignedEmployees = await usersCollection.countDocuments({
      companyId: session.companyId,
      role: "employee",
      shiftId: id,
    })

    if (assignedEmployees > 0) {
      return NextResponse.json(
        { error: "Unassign employees from this shift before deleting it" },
        { status: 400 },
      )
    }

    const deleteResult = await shiftsCollection.deleteOne({
      _id: new ObjectId(id),
      companyId: session.companyId,
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
