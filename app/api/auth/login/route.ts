import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Get database connection
    const db = await getDatabase()
    const usersCollection = db.collection("users")

    // Find user with matching email (check both admin and employee)
    const user = await usersCollection.findOne({
      email: email.toLowerCase(),
      status: "active",
    })

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // Check password in plain text
    if (user.password !== password) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // Return user data (excluding password)
    return NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role, // Auto-detected from database
        department: user.department,
        position: user.position,
        shiftId: user.shiftId,
      },
      message: "Login successful",
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 })
  }
}
