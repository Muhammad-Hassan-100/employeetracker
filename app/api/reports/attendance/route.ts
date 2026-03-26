import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { requireAdmin } from "@/lib/session"

export async function GET(request: NextRequest) {
  try {
    const { session, response } = requireAdmin(request)
    if (!session) {
      return response
    }

    const { searchParams } = new URL(request.url)
    const range = searchParams.get("range") || "thisMonth"

    const db = await getDatabase()
    const usersCollection = db.collection("users")
    const attendanceCollection = db.collection("attendance")

    // Calculate date range
    const now = new Date()
    let startDate: Date
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    switch (range) {
      case "thisWeek":
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay())
        startDate = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate())
        break
      case "lastMonth":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
        break
      case "last3Months":
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        break
      default: // thisMonth
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    // Get all employees
    const employees = await usersCollection
      .find({ role: "employee", status: "active", companyId: session.companyId })
      .toArray()

    const reports = await Promise.all(
      employees.map(async (employee) => {
        // Get attendance records for the date range
        const attendanceRecords = await attendanceCollection
          .find({
            companyId: session.companyId,
            userId: employee._id.toString(),
            date: {
              $gte: startDate.toISOString().split("T")[0],
              $lte: endDate.toISOString().split("T")[0],
            },
          })
          .toArray()

        // Calculate working days in the range (excluding weekends) starting from join date
        const employeeStartDate = new Date(employee.joinDate) > startDate ? new Date(employee.joinDate) : startDate
        const totalWorkingDays = getWorkingDaysCount(employeeStartDate, endDate)
        
        // Count different types of attendance
        const presentDays = attendanceRecords.filter((record) => record.status === "present" || !record.status).length
        const absentDays = attendanceRecords.filter((record) => record.status === "absent").length
        const leaveDays = attendanceRecords.filter((record) => record.status === "on_leave").length
        const lateDays = attendanceRecords.filter((record) => record.isLate && (record.status === "present" || !record.status)).length
        const earlyLeaveDays = attendanceRecords.filter((record) => record.isEarly && (record.status === "present" || !record.status)).length
        
        const totalHours = attendanceRecords
          .filter((record) => record.status === "present" || !record.status)
          .reduce((sum, record) => sum + (record.hoursWorked || 0), 0)
        const avgHours = presentDays > 0 ? totalHours / presentDays : 0
        const attendanceRate = totalWorkingDays > 0 ? (presentDays / totalWorkingDays) * 100 : 0

        return {
          employeeId: employee._id.toString(),
          employeeName: employee.name,
          department: employee.department || "N/A",
          totalDays: totalWorkingDays,
          presentDays,
          absentDays,
          leaveDays,
          lateDays,
          earlyLeaveDays,
          avgHours: Math.round(avgHours * 100) / 100,
          attendanceRate: Math.round(attendanceRate * 100) / 100,
        }
      }),
    )

    return NextResponse.json(reports)
  } catch (error) {
    console.error("Attendance reports error:", error)
    return NextResponse.json({ error: "Failed to fetch attendance reports" }, { status: 500 })
  }
}

function getWorkingDaysCount(startDate: Date, endDate: Date): number {
  let count = 0
  const current = new Date(startDate)

  while (current <= endDate) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Not Sunday (0) or Saturday (6)
      count++
    }
    current.setDate(current.getDate() + 1)
  }

  return count
}
