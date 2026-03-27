import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { requireSuperAdmin } from "@/lib/session"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { session, response } = requireSuperAdmin(request)
    if (!session) {
      return response
    }

    const { id } = await params
    const { status } = await request.json()

    if (status !== "active" && status !== "inactive") {
      return NextResponse.json({ error: "A valid employee status is required" }, { status: 400 })
    }

    const db = await getDatabase()
    const usersCollection = db.collection("users")

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(id), role: "employee" },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      },
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Employee updated successfully" })
  } catch (error) {
    console.error("Super admin update employee error:", error)
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { session, response } = requireSuperAdmin(request)
    if (!session) {
      return response
    }

    const { id } = await params
    const db = await getDatabase()
    const usersCollection = db.collection("users")
    const attendanceCollection = db.collection("attendance")
    const leavesCollection = db.collection("leaves")

    const result = await usersCollection.deleteOne({ _id: new ObjectId(id), role: "employee" })
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    await Promise.all([
      attendanceCollection.deleteMany({ userId: id }),
      leavesCollection.deleteMany({ userId: id }),
    ])

    return NextResponse.json({ message: "Employee deleted successfully" })
  } catch (error) {
    console.error("Super admin delete employee error:", error)
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 })
  }
}
