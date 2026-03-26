import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { requireAdmin } from "@/lib/session"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, response } = requireAdmin(request)
    if (!session) {
      return response
    }

    const db = await getDatabase()
    const usersCollection = db.collection("users")

    const employee = await usersCollection.findOne({
      _id: new ObjectId(params.id),
      role: "employee",
      companyId: session.companyId,
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
