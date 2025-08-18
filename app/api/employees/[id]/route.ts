import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getDatabase()
    const usersCollection = db.collection("users")

    const employee = await usersCollection.findOne({
      _id: new ObjectId(params.id),
      role: "employee",
    })

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Return employee data including password (for admin view)
    return NextResponse.json({
      id: employee._id.toString(),
      name: employee.name,
      email: employee.email,
      department: employee.department,
      position: employee.position,
      shift: employee.shiftId,
      joinDate: employee.joinDate,
      status: employee.status,
      password: employee.password, // Include password for admin
    })
  } catch (error) {
    console.error("Fetch employee details error:", error)
    return NextResponse.json({ error: "Failed to fetch employee details" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getDatabase()
    const usersCollection = db.collection("users")
    const attendanceCollection = db.collection("attendance")

    // Delete employee
    const deleteResult = await usersCollection.deleteOne({
      _id: new ObjectId(params.id),
    })

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Also delete all attendance records for this employee
    await attendanceCollection.deleteMany({
      userId: params.id,
    })

    return NextResponse.json({
      message: "Employee deleted successfully",
    })
  } catch (error) {
    console.error("Delete employee error:", error)
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const updateData = await request.json()
    const db = await getDatabase()
    const usersCollection = db.collection("users")

    // Keep password as-is (no hashing)

    const updateResult = await usersCollection.updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      },
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    return NextResponse.json({
      message: "Employee updated successfully",
    })
  } catch (error) {
    console.error("Update employee error:", error)
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 })
  }
}
