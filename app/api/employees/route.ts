import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function GET() {
  try {
    const db = await getDatabase()
    const usersCollection = db.collection("users")

    const employees = await usersCollection.find({ role: "employee" }).sort({ createdAt: -1 }).toArray()

    const formattedEmployees = employees.map((employee) => ({
      id: employee._id.toString(),
      name: employee.name,
      email: employee.email,
      department: employee.department,
      position: employee.position,
      shift: employee.shiftId,
      joinDate: employee.joinDate,
      status: employee.status,
    }))

    return NextResponse.json(formattedEmployees)
  } catch (error) {
    console.error("Fetch employees error:", error)
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 })
  }
}
