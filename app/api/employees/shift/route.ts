import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const db = await getDatabase()
    const usersCollection = db.collection("users")
    const shiftsCollection = db.collection("shifts")

    // Get user information
    const user = await usersCollection.findOne({
      _id: new ObjectId(userId),
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get shift information if user has a shift assigned
    let shift = null
    if (user.shiftId) {
      // First try to find shift by ObjectId
      try {
        shift = await shiftsCollection.findOne({
          _id: new ObjectId(user.shiftId),
        })
      } catch (error) {
        // If not a valid ObjectId, try other methods
        console.log("Not a valid ObjectId, trying other methods")
      }

      // If not found by ObjectId, try by exact name match (case insensitive)
      if (!shift) {
        shift = await shiftsCollection.findOne({
          name: { $regex: new RegExp(`^${user.shiftId}$`, "i") },
        })
      }

      // If still not found, try partial name match (remove spaces and compare)
      if (!shift) {
        const normalizedShiftId = user.shiftId.toLowerCase().replace(/\s+/g, "")
        const allShifts = await shiftsCollection.find({}).toArray()
        
        shift = allShifts.find(s => {
          const normalizedShiftName = s.name.toLowerCase().replace(/\s+/g, "")
          return normalizedShiftName === normalizedShiftId
        })
      }

      // Log for debugging
      if (!shift) {
        console.error("Shift not found for user:", user.name, "with shiftId:", user.shiftId)
      } else {
        console.log("Found shift:", shift.name, "for user:", user.name)
      }
    }

    // Return shift information or null if no shift assigned
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
        shiftId: user.shiftId
      }
    })
  } catch (error) {
    console.error("Fetch employee shift error:", error)
    return NextResponse.json({ error: "Failed to fetch employee shift" }, { status: 500 })
  }
}
