import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { requireAdmin } from "@/lib/session"
import { extractEmailDomain } from "@/lib/company-utils"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { session, response } = requireAdmin(request)
    if (!session) {
      return response
    }
    const { id } = await params

    const db = await getDatabase()
    const usersCollection = db.collection("users")

    const employee = await usersCollection.findOne({
      _id: new ObjectId(id),
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
      checkInBeforeMinutes: employee.checkInBeforeMinutes ?? 5,
      lateGraceMinutes: employee.lateGraceMinutes ?? 0,
      joinDate: employee.joinDate,
      status: employee.status,
      password: employee.password, // Include password for admin
    })
  } catch (error) {
    console.error("Fetch employee details error:", error)
    return NextResponse.json({ error: "Failed to fetch employee details" }, { status: 500 })
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
    const usersCollection = db.collection("users")
    const attendanceCollection = db.collection("attendance")
    const leavesCollection = db.collection("leaves")

    const deleteResult = await usersCollection.deleteOne({
      _id: new ObjectId(id),
      companyId: session.companyId,
    })

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    await attendanceCollection.deleteMany({
      userId: id,
      companyId: session.companyId,
    })

    await leavesCollection.deleteMany({
      userId: id,
      companyId: session.companyId,
    })

    return NextResponse.json({
      message: "Employee deleted successfully",
    })
  } catch (error) {
    console.error("Delete employee error:", error)
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { session, response } = requireAdmin(request)
    if (!session) {
      return response
    }
    const { id } = await params

    const updateData = await request.json()
    const db = await getDatabase()
    const usersCollection = db.collection("users")
    const shiftsCollection = db.collection("shifts")

    if (updateData.checkInBeforeMinutes !== undefined) {
      const parsedCheckInBefore = Number(updateData.checkInBeforeMinutes)
      if (!Number.isFinite(parsedCheckInBefore) || !Number.isInteger(parsedCheckInBefore) || parsedCheckInBefore < 0) {
        return NextResponse.json(
          { error: "Check-in before minutes must be a whole non-negative number" },
          { status: 400 },
        )
      }
      updateData.checkInBeforeMinutes = parsedCheckInBefore
    }

    if (updateData.lateGraceMinutes !== undefined) {
      const parsedLateGrace = Number(updateData.lateGraceMinutes)
      if (!Number.isFinite(parsedLateGrace) || !Number.isInteger(parsedLateGrace) || parsedLateGrace < 0) {
        return NextResponse.json(
          { error: "Late relaxation must be a whole non-negative number" },
          { status: 400 },
        )
      }
      updateData.lateGraceMinutes = parsedLateGrace
    }

    if (updateData.email) {
      const normalizedEmail = String(updateData.email).toLowerCase()
      const domain = extractEmailDomain(normalizedEmail)

      if (domain !== session.companyDomain) {
        return NextResponse.json(
          { error: `Employee email must stay on @${session.companyDomain}` },
          { status: 400 },
        )
      }

      const duplicateUser = await usersCollection.findOne({
        _id: { $ne: new ObjectId(id) },
        email: normalizedEmail,
      })

      if (duplicateUser) {
        return NextResponse.json({ error: "This email is already in use" }, { status: 400 })
      }

      updateData.email = normalizedEmail
    }

    if (updateData.shiftId) {
      const shift = await shiftsCollection.findOne({
        _id: new ObjectId(updateData.shiftId),
        companyId: session.companyId,
      })

      if (!shift) {
        return NextResponse.json({ error: "Selected shift was not found in this workspace" }, { status: 400 })
      }
    }

    const updateResult = await usersCollection.updateOne(
      { _id: new ObjectId(id), companyId: session.companyId, role: "employee" },
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
