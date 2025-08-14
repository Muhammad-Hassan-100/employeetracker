import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    const userId = searchParams.get("userId")

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 })
    }

    const db = await getDatabase()
    const leavesCollection = db.collection("leaves")
    const usersCollection = db.collection("users")

    let query: any = {
      status: "approved",
      startDate: { $lte: date },
      endDate: { $gte: date }
    }

    if (userId) {
      query.userId = userId
    }

    const leaves = await leavesCollection.find(query).toArray()

    // Enrich with employee details
    const enrichedLeaves = await Promise.all(
      leaves.map(async (leave) => {
        const employee = await usersCollection.findOne({ _id: leave.userId })
        return {
          id: leave._id.toString(),
          userId: leave.userId,
          employeeName: employee?.name || "Unknown",
          employeeDepartment: employee?.department || "Unknown",
          leaveType: leave.leaveType,
          startDate: leave.startDate,
          endDate: leave.endDate,
          reason: leave.reason,
          status: leave.status,
          appliedDate: leave.appliedDate,
          reviewedBy: leave.reviewedBy,
          reviewedDate: leave.reviewedDate,
          reviewComments: leave.reviewComments,
          isActiveToday: true
        }
      })
    )

    return NextResponse.json({
      date,
      totalOnLeave: enrichedLeaves.length,
      leaves: enrichedLeaves
    })
  } catch (error) {
    console.error("Get active leaves error:", error)
    return NextResponse.json(
      { error: "Failed to fetch active leaves" },
      { status: 500 }
    )
  }
}
