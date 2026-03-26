import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { assertSelfOrAdmin, requireSession } from "@/lib/session"

export async function GET(request: NextRequest) {
  try {
    const { session, response } = requireSession(request)
    if (!session) {
      return response
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const accessError = assertSelfOrAdmin(session, userId)
    if (accessError) {
      return accessError
    }

    const db = await getDatabase()
    const usersCollection = db.collection("users")
    const shiftsCollection = db.collection("shifts")

    const user = await usersCollection.findOne({
      _id: new ObjectId(userId),
      companyId: session.companyId,
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    let shift = null
    if (user.shiftId) {
      try {
        shift = await shiftsCollection.findOne({
          _id: new ObjectId(user.shiftId),
          companyId: session.companyId,
        })
      } catch (error) {
        shift = null
      }

      if (!shift) {
        shift = await shiftsCollection.findOne({
          companyId: session.companyId,
          name: { $regex: new RegExp(`^${user.shiftId}$`, "i") },
        })
      }
    }

    return NextResponse.json({
      shift: shift ? {
        id: shift._id?.toString(),
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        description: shift.description,
      } : null,
      user: {
        hasShiftAssigned: !!user.shiftId,
        shiftId: user.shiftId,
      },
      attendanceRules: {
        checkInBeforeMinutes: user.checkInBeforeMinutes ?? 5,
        lateGraceMinutes: user.lateGraceMinutes ?? 0,
      },
    })
  } catch (error) {
    console.error("Fetch employee shift error:", error)
    return NextResponse.json({ error: "Failed to fetch employee shift" }, { status: 500 })
  }
}
