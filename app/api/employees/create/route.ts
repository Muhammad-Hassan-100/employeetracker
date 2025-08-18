import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, shift, department, position } = await request.json()

    const db = await getDatabase()
    const usersCollection = db.collection("users")

    // Check if employee already exists
    const existingEmployee = await usersCollection.findOne({
      email: email.toLowerCase(),
    })

    if (existingEmployee) {
      return NextResponse.json(
        {
          error: "Employee with this email already exists",
        },
        { status: 400 },
      )
    }

    // Create new employee with plain text password
    const newEmployee = {
      name,
      email: email.toLowerCase(),
      password, // store as plain text per request
      role: "employee",
      department,
      position,
      shiftId: shift,
      joinDate: new Date(),
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await usersCollection.insertOne(newEmployee)

    return NextResponse.json({
      message: "Employee created successfully",
      employee: {
        id: result.insertedId.toString(),
        name: newEmployee.name,
        email: newEmployee.email,
        department: newEmployee.department,
        position: newEmployee.position,
        role: newEmployee.role,
        shiftId: newEmployee.shiftId,
        joinDate: newEmployee.joinDate,
        status: newEmployee.status,
      },
    })
  } catch (error) {
    console.error("Create employee error:", error)
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 })
  }
}
