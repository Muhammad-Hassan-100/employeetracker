import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { getCompanyWorkingDays } from "@/lib/company-settings"
import {
  getLocalDateDifference,
  getShiftEndAbsoluteMinutes,
  getTimeStringMinutes,
  formatLocalDateInput,
} from "@/lib/attendance-time"
import {
  getDateDayOfWeek,
  normalizeEmployeeCustomSchedule,
  normalizeEmployeeScheduleMode,
} from "@/lib/employee-schedule"
import { requireAdmin } from "@/lib/session"

function dateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function dateFromInput(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function getEmployeeStartDate(value: unknown, fallback: string) {
  if (!value) return fallback
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const parsed = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? fallback : dateInput(parsed)
}

function shiftDateInputs(startInput: string, endInput: string) {
  const dates: string[] = []
  const date = dateFromInput(startInput)
  const endDate = dateFromInput(endInput)
  while (date <= endDate) {
    dates.push(dateInput(date))
    date.setDate(date.getDate() + 1)
  }
  return dates
}

function getReportRange(range: string, todayInput: string) {
  const today = dateFromInput(todayInput)
  const start = new Date(today)
  const end = new Date(today)

  switch (range) {
    case "thisWeek":
      start.setDate(today.getDate() - today.getDay())
      break
    case "lastMonth":
      start.setDate(1)
      start.setMonth(start.getMonth() - 1)
      end.setDate(0)
      break
    case "last3Months":
      start.setDate(1)
      start.setMonth(start.getMonth() - 3)
      break
    case "thisMonth":
    default:
      start.setDate(1)
      break
  }

  return { startInput: dateInput(start), endInput: dateInput(end) }
}

export async function GET(request: NextRequest) {
  try {
    const { session, response } = requireAdmin(request)
    if (!session) return response

    const { searchParams } = new URL(request.url)
    const range = searchParams.get("range") || "thisMonth"
    const todayInput = formatLocalDateInput()
    const { startInput, endInput } = getReportRange(range, todayInput)
    const dates = shiftDateInputs(startInput, endInput)

    const db = await getDatabase()
    const usersCollection = db.collection("users")
    const attendanceCollection = db.collection("attendance")
    const companiesCollection = db.collection("companies")
    const shiftsCollection = db.collection("shifts")
    const leavesCollection = db.collection("leaves")

    const [employees, company, shifts, attendanceRecords, approvedLeaves] = await Promise.all([
      usersCollection
        .find({ role: "employee", status: "active", companyId: session.companyId })
        .toArray(),
      companiesCollection.findOne({ companyId: session.companyId }),
      shiftsCollection.find({ companyId: session.companyId }).toArray(),
      attendanceCollection
        .find({
          companyId: session.companyId,
          date: { $gte: startInput, $lte: endInput },
        })
        .toArray(),
      leavesCollection
        .find({
          companyId: session.companyId,
          status: "approved",
          startDate: { $lte: endInput },
          endDate: { $gte: startInput },
        })
        .toArray(),
    ])

    const workingDays = getCompanyWorkingDays(company)
    const shiftByReference = new Map<string, (typeof shifts)[number]>()
    for (const shift of shifts) {
      shiftByReference.set(shift._id.toString(), shift)
      shiftByReference.set(
        String(shift.name || "")
          .trim()
          .toLowerCase(),
        shift,
      )
    }
    const attendanceByEmployeeDate = new Map(
      attendanceRecords.map((record) => [`${record.userId}:${record.date}`, record]),
    )

    const reports = employees.map((employee) => {
      const employeeId = employee._id.toString()
      const employeeStartInput = getEmployeeStartDate(employee.joinDate, startInput)
      const customSchedule = normalizeEmployeeCustomSchedule(employee.customSchedule)
      const scheduleMode = normalizeEmployeeScheduleMode(employee.scheduleMode)
      const approvedEmployeeLeaves = approvedLeaves.filter((leave) => leave.userId === employeeId)
      let totalDays = 0
      let presentDays = 0
      let checkInDays = 0
      let absentDays = 0
      let leaveDays = 0
      let lateDays = 0
      let earlyLeaveDays = 0
      let totalHours = 0

      for (const date of dates) {
        if (date < employeeStartInput || date > todayInput) continue

        const scheduledReference =
          scheduleMode === "custom_monthly"
            ? customSchedule.find((entry) => entry.date === date)?.shiftId
            : workingDays.includes(getDateDayOfWeek(date))
              ? String(employee.shiftId || "")
              : ""
        const shift =
          shiftByReference.get(String(scheduledReference || "").trim()) ||
          shiftByReference.get(
            String(scheduledReference || "")
              .trim()
              .toLowerCase(),
          )
        if (!shift?.startTime || !shift?.endTime) continue

        const record = attendanceByEmployeeDate.get(`${employeeId}:${date}`)
        const approvedLeave = approvedEmployeeLeaves.some(
          (leave) => leave.startDate <= date && leave.endDate >= date,
        )
        if (approvedLeave) {
          leaveDays += 1
          continue
        }

        const dayDifference = getLocalDateDifference(date, todayInput)
        const absoluteCurrentMinutes =
          dayDifference * 1440 + new Date().getHours() * 60 + new Date().getMinutes()
        const shiftEndMinutes = getShiftEndAbsoluteMinutes(
          getTimeStringMinutes(shift.startTime),
          getTimeStringMinutes(shift.endTime),
        )
        const completedByCheckout = Boolean(record?.checkInTime && record?.checkOutTime)
        const completedByDeadline =
          absoluteCurrentMinutes >= shiftEndMinutes + (Number(employee.checkOutGraceMinutes) || 0)
        const completedNoShow = !record?.checkInTime && absoluteCurrentMinutes >= shiftEndMinutes
        if (!completedByCheckout && !completedByDeadline && !completedNoShow) continue

        totalDays += 1
        if (record?.checkInTime) checkInDays += 1
        if (record?.isLate && record.checkInTime) lateDays += 1
        if (record?.isEarly && record.checkOutTime) earlyLeaveDays += 1

        if (record?.checkInTime && record?.checkOutTime && record.status !== "absent") {
          presentDays += 1
          totalHours += Number(record.hoursWorked) || 0
        } else {
          absentDays += 1
        }
      }

      return {
        employeeId,
        employeeName: employee.name,
        department: employee.department || "N/A",
        totalDays,
        presentDays,
        checkInDays,
        absentDays,
        leaveDays,
        lateDays,
        earlyLeaveDays,
        avgHours: presentDays > 0 ? Math.round((totalHours / presentDays) * 100) / 100 : 0,
        attendanceRate: totalDays > 0 ? Math.round((presentDays / totalDays) * 10000) / 100 : 0,
      }
    })

    return NextResponse.json(reports)
  } catch (error) {
    console.error("Attendance reports error:", error)
    return NextResponse.json({ error: "Failed to fetch attendance reports" }, { status: 500 })
  }
}
