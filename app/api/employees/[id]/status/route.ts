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

    const { status } = await request.json()
    const db = await getDatabase()
    const usersCollection = db.collection("users")

    const updateResult = await usersCollection.updateOne(
      { _id: new ObjectId(id), companyId: session.companyId, role: "employee" },
      {
        $set: {
          status: status,
          updatedAt: new Date(),
        },
      },
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    const updatedEmployee = await usersCollection.findOne({ _id: new ObjectId(id) })

    return NextResponse.json({
      message: "Employee status updated successfully",
      employee: {
        id: updatedEmployee?._id.toString(),
        status: updatedEmployee?.status,
      },
    })
  } catch (error) {
    console.error("Update employee status error:", error)
    return NextResponse.json({ error: "Failed to update employee status" }, { status: 500 })
  }
}
