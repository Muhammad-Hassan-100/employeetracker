import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { requireAdmin } from "@/lib/session"

function isWeekend(date: Date) {
  const day = date.getDay()
  return day === 0 || day === 6
}

function normalizeDateParam(value: string | null) {
  if (!value) {
    return new Date().toISOString().split("T")[0]
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString().split("T")[0]
}

export async function GET(request: NextRequest) {
  try {
    const { session, response } = requireAdmin(request)
    if (!session) {
      return response
    }

    const { searchParams } = new URL(request.url)
    const selectedDate = normalizeDateParam(searchParams.get("date"))

    if (!selectedDate) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
    }

    const db = await getDatabase()
    const usersCollection = db.collection("users")
    const attendanceCollection = db.collection("attendance")
    const leavesCollection = db.collection("leaves")
    const shiftsCollection = db.collection("shifts")

    const [employees, attendanceRecords, approvedLeaves, shifts] = await Promise.all([
      usersCollection
        .find({
          companyId: session.companyId,
          role: "employee",
        })
        .sort({ name: 1 })
        .toArray(),
      attendanceCollection
        .find({
          companyId: session.companyId,
          date: selectedDate,
        })
        .toArray(),
      leavesCollection
        .find({
          companyId: session.companyId,
          status: "approved",
          startDate: { $lte: selectedDate },
          endDate: { $gte: selectedDate },
        })
        .toArray(),
      shiftsCollection.find({ companyId: session.companyId }).toArray(),
    ])

    const attendanceByUserId = new Map(attendanceRecords.map((record) => [record.userId, record]))
    const leaveByUserId = new Map(approvedLeaves.map((leave) => [leave.userId, leave]))
    const shiftById = new Map(shifts.map((shift) => [shift._id.toString(), shift]))
    const selectedDateObject = new Date(`${selectedDate}T00:00:00`)
    const weekend = isWeekend(selectedDateObject)

    const rows = employees.map((employee) => {
      const record = attendanceByUserId.get(employee._id.toString())
      const approvedLeave = leaveByUserId.get(employee._id.toString())
      const joinDate = new Date(employee.joinDate)
      const joinDateString = joinDate.toISOString().split("T")[0]
      const shift = employee.shiftId ? shiftById.get(employee.shiftId) : null

      let derivedStatus: string
      if (selectedDate < joinDateString) {
        derivedStatus = "not_joined"
      } else if (record?.status) {
        derivedStatus = record.status
      } else if (approvedLeave) {
        derivedStatus = "on_leave"
      } else if (weekend) {
        derivedStatus = "weekend"
      } else {
        derivedStatus = "absent"
      }

      return {
        employeeId: employee._id.toString(),
        name: employee.name,
        email: employee.email,
        department: employee.department || "N/A",
        position: employee.position || "N/A",
        status: employee.status,
        joinDate: employee.joinDate,
        selectedDate,
        attendanceStatus: derivedStatus,
        checkInTime: record?.checkInTime || null,
        checkOutTime: record?.checkOutTime || null,
        hoursWorked: record?.hoursWorked || 0,
        isLate: Boolean(record?.isLate),
        isEarly: Boolean(record?.isEarly),
        lateReason: record?.lateReason || null,
        earlyReason: record?.earlyReason || null,
        leaveReason: approvedLeave?.reason || null,
        leaveType: approvedLeave?.leaveType || null,
        shift: shift
          ? {
              id: shift._id.toString(),
              name: shift.name,
              startTime: shift.startTime,
              endTime: shift.endTime,
            }
          : null,
      }
    })

    return NextResponse.json({
      date: selectedDate,
      weekend,
      rows,
    })
  } catch (error) {
    console.error("Admin attendance snapshot error:", error)
    return NextResponse.json({ error: "Failed to fetch attendance snapshot" }, { status: 500 })
  }
}
