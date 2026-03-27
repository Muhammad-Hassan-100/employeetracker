import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { getCompanyAttendancePolicy, validateAttendanceActionAccess } from "@/lib/attendance-policy"
import { assertSelfOrAdmin, requireSession } from "@/lib/session"

export async function POST(request: NextRequest) {
  try {
    const { session, response } = requireSession(request)
    if (!session) {
      return response
    }

    const { userId, checkOutTime, isEarly, earlyReason, latitude, longitude, clientPublicIp } = await request.json()
    const accessError = assertSelfOrAdmin(session, userId)
    if (accessError) {
      return accessError
    }

    const db = await getDatabase()
    const attendanceCollection = db.collection("attendance")
    const companiesCollection = db.collection("companies")

    const company = await companiesCollection.findOne({ companyId: session.companyId })
    const attendancePolicy = getCompanyAttendancePolicy(company)
    const attendanceAccessError = validateAttendanceActionAccess({
      actionLabel: "Check-out",
      clientPublicIp,
      latitude,
      longitude,
      policy: attendancePolicy,
      request,
    })

    if (attendanceAccessError) {
      return NextResponse.json({ error: attendanceAccessError }, { status: 400 })
    }

    const today = new Date().toISOString().split("T")[0]

    // Find today's check-in record
    const record = await attendanceCollection.findOne({
      companyId: session.companyId,
      userId: userId,
      date: today,
    })

    if (!record) {
      return NextResponse.json({ error: "No check-in record found for today" }, { status: 404 })
    }

    if (record.checkOutTime) {
      return NextResponse.json({ error: "Already checked out today" }, { status: 400 })
    }

    const checkInTime = new Date(record.checkInTime)
    const checkOutTimeDate = new Date(checkOutTime)
    const hoursWorked = Math.max(0, (checkOutTimeDate.getTime() - checkInTime.getTime()) / (1000 * 60 * 60))

    const updateResult = await attendanceCollection.updateOne(
      { userId: userId, companyId: session.companyId, date: today },
      {
        $set: {
          checkOutTime: checkOutTimeDate,
          isEarly: isEarly || false,
          earlyReason: earlyReason || null,
          hoursWorked: Math.round(hoursWorked * 100) / 100,
          updatedAt: new Date(),
        },
      },
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: "Failed to update record" }, { status: 500 })
    }

    return NextResponse.json({
      message: "Check-out successful",
      hoursWorked: Math.round(hoursWorked * 100) / 100,
    })
  } catch (error) {
    console.error("Check-out error:", error)
    return NextResponse.json({ error: "Check-out failed" }, { status: 500 })
  }
}
