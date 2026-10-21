import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { getCompanyWorkingDays, isCompanyOffDay } from "@/lib/company-settings"
import { getEmployeeShiftAssignmentForDate } from "@/lib/employee-schedule"
import { requireAdmin } from "@/lib/session"
import {
  formatLocalDateInput,
  getAttendanceWindowState,
  getNoCheckInShiftStatus,
  getLocalTimeMinutes,
  getPreviousLocalDateInput,
  getTimeStringMinutes,
  shiftSpansMidnight,
} from "@/lib/attendance-time"

function normalizeDateParam(value: string | null) {
  if (!value) {
    return formatLocalDateInput()
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

    const currentDate = normalizeDateParam(searchParams.get("nowDate")) || formatLocalDateInput()
    const requestedMinutes = Number(searchParams.get("nowMinutes"))
    const currentMinutes =
      Number.isFinite(requestedMinutes) && requestedMinutes >= 0 && requestedMinutes < 1440
        ? requestedMinutes
        : getLocalTimeMinutes()
    const includeActiveOvernight =
      searchParams.get("shiftView") === "current" && selectedDate === currentDate
    const previousDate = getPreviousLocalDateInput(selectedDate)
    const recordDates = includeActiveOvernight ? [previousDate, selectedDate] : [selectedDate]
    const periodEndDate = selectedDate > currentDate ? currentDate : selectedDate
    let periodStartDate = periodEndDate
    for (let day = 1; day < 30; day += 1) {
      periodStartDate = getPreviousLocalDateInput(periodStartDate)
    }

    const db = await getDatabase()
    const usersCollection = db.collection("users")
    const attendanceCollection = db.collection("attendance")
    const leavesCollection = db.collection("leaves")
    const shiftsCollection = db.collection("shifts")
    const companiesCollection = db.collection("companies")

    const [employees, attendanceRecords, approvedLeaves, patternRecords, shifts, company] =
      await Promise.all([
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
            date: { $in: recordDates },
          })
          .toArray(),
        leavesCollection
          .find({
            companyId: session.companyId,
            status: "approved",
            startDate: { $lte: selectedDate },
            endDate: { $gte: previousDate },
          })
          .toArray(),
        attendanceCollection
          .find({
            companyId: session.companyId,
            date: { $gte: periodStartDate, $lte: periodEndDate },
          })
          .toArray(),
        shiftsCollection.find({ companyId: session.companyId }).toArray(),
        companiesCollection.findOne({ companyId: session.companyId }),
      ])

    const attendanceByUserDate = new Map(
      attendanceRecords.map((record) => [`${record.userId}:${record.date}`, record]),
    )
    const patternCountsByUserId = new Map<string, { late: number; early: number; absent: number }>()
    for (const record of patternRecords) {
      const counts = patternCountsByUserId.get(record.userId) || { late: 0, early: 0, absent: 0 }
      if (record.isLate) counts.late += 1
      if (record.isEarly) counts.early += 1
      if (record.status === "absent") counts.absent += 1
      patternCountsByUserId.set(record.userId, counts)
    }
    const selectedDateObject = new Date(`${selectedDate}T00:00:00`)
    const workingDays = getCompanyWorkingDays(company)
    const weekend = isCompanyOffDay(selectedDateObject, workingDays)

    const rows = await Promise.all(
      employees.map(async (employee) => {
        const joinDate = new Date(employee.joinDate)
        const joinDateString = joinDate.toISOString().split("T")[0]
        const shiftAssignment = await getEmployeeShiftAssignmentForDate({
          user: employee,
          dateInput: selectedDate,
          workingDays,
          shiftsCollection,
          companyId: session.companyId,
        })
        let attendanceDate = selectedDate
        let effectiveShiftAssignment = shiftAssignment

        if (includeActiveOvernight) {
          const previousShiftAssignment = await getEmployeeShiftAssignmentForDate({
            user: employee,
            dateInput: previousDate,
            workingDays,
            shiftsCollection,
            companyId: session.companyId,
          })
          const previousShift = previousShiftAssignment.shift
          if (previousShift?.startTime && previousShift?.endTime) {
            const startMinutes = getTimeStringMinutes(previousShift.startTime)
            const endMinutes = getTimeStringMinutes(previousShift.endTime)
            const previousShiftWindow = getAttendanceWindowState({
              currentDateInput: currentDate,
              currentMinutes,
              graceMinutes: Number.isInteger(employee.checkOutGraceMinutes)
                ? employee.checkOutGraceMinutes
                : 0,
              recordDateInput: previousDate,
              startMinutes,
              endMinutes,
            })
            const previousShiftIsCurrent =
              shiftSpansMidnight(startMinutes, endMinutes) && !previousShiftWindow.isCheckoutExpired

            if (previousShiftIsCurrent) {
              attendanceDate = previousDate
              effectiveShiftAssignment = previousShiftAssignment
            }
          }
        }

        const record = attendanceByUserDate.get(`${employee._id.toString()}:${attendanceDate}`)
        const approvedLeave = approvedLeaves.find(
          (leave) =>
            leave.userId === employee._id.toString() &&
            leave.startDate <= attendanceDate &&
            leave.endDate >= attendanceDate,
        )
        const shift = effectiveShiftAssignment.shift

        let derivedStatus: string
        let needsCheckoutReview = false
        let absenceReason: string | null = null
        if (employee.status === "inactive") {
          derivedStatus = "inactive"
        } else if (attendanceDate < joinDateString) {
          derivedStatus = "not_joined"
        } else if (approvedLeave) {
          derivedStatus = "on_leave"
        } else if (
          record?.status === "absent" &&
          record.autoAbsent &&
          record.absenceReason === "no_check_in" &&
          shift?.startTime &&
          shift?.endTime
        ) {
          derivedStatus = getNoCheckInShiftStatus({
            currentDateInput: currentDate,
            currentMinutes,
            recordDateInput: attendanceDate,
            startMinutes: getTimeStringMinutes(shift.startTime),
            endMinutes: getTimeStringMinutes(shift.endTime),
          })
          if (derivedStatus !== "absent") {
            absenceReason = null
            await attendanceCollection.deleteOne({ _id: record._id, companyId: session.companyId })
          } else {
            absenceReason = "no_check_in"
          }
        } else if (
          record?.checkInTime &&
          !record?.checkOutTime &&
          shift?.startTime &&
          shift?.endTime
        ) {
          const windowState = getAttendanceWindowState({
            currentDateInput: currentDate,
            currentMinutes,
            graceMinutes: Number.isInteger(employee.checkOutGraceMinutes)
              ? employee.checkOutGraceMinutes
              : 0,
            lateCheckoutGraceMinutes: Number.isInteger(employee.checkOutGraceMinutes)
              ? employee.checkOutGraceMinutes
              : 0,
            recordDateInput: attendanceDate,
            startMinutes: getTimeStringMinutes(shift.startTime),
            endMinutes: getTimeStringMinutes(shift.endTime),
          })
          needsCheckoutReview =
            windowState.isMissingCheckoutDeadlineReached && !windowState.isCheckoutExpired
          if (windowState.isMissingCheckoutDeadlineReached || windowState.isCheckoutExpired) {
            derivedStatus = "absent"
            absenceReason = "missing_checkout"
            if (record.status !== "absent" || record.absenceReason !== absenceReason) {
              await attendanceCollection.updateOne(
                { _id: record._id, companyId: session.companyId },
                {
                  $set: {
                    status: "absent",
                    absenceReason,
                    checkoutWindowExpired: true,
                    updatedAt: new Date(),
                  },
                },
              )
            }
          } else {
            derivedStatus =
              record.status === "absent" && record.absenceReason === "missing_checkout"
                ? "present"
                : record.status || "present"
            if (
              derivedStatus === "present" &&
              record.status === "absent" &&
              record.absenceReason === "missing_checkout"
            ) {
              absenceReason = null
              await attendanceCollection.updateOne(
                { _id: record._id, companyId: session.companyId },
                { $set: { status: "present", absenceReason: null, updatedAt: new Date() } },
              )
            }
          }
        } else if (record?.status) {
          derivedStatus = record.status
          absenceReason = record.absenceReason || null
        } else if (!effectiveShiftAssignment.isScheduled) {
          derivedStatus = "off_day"
        } else if (!shift || selectedDate > currentDate) {
          derivedStatus = "scheduled"
        } else {
          derivedStatus = getNoCheckInShiftStatus({
            currentDateInput: currentDate,
            currentMinutes,
            recordDateInput: attendanceDate,
            startMinutes: getTimeStringMinutes(shift.startTime),
            endMinutes: getTimeStringMinutes(shift.endTime),
          })
        }

        if (derivedStatus === "absent" && !absenceReason && !record?.checkInTime) {
          absenceReason = "no_check_in"
        }

        if (
          derivedStatus === "absent" &&
          absenceReason === "no_check_in" &&
          !record &&
          !approvedLeave
        ) {
          await attendanceCollection.updateOne(
            { companyId: session.companyId, userId: employee._id.toString(), date: attendanceDate },
            {
              $setOnInsert: {
                companyId: session.companyId,
                userId: employee._id.toString(),
                date: attendanceDate,
                checkInTime: null,
                checkOutTime: null,
                isLate: false,
                isEarly: false,
                lateReason: null,
                earlyReason: null,
                lateCheckoutReason: null,
                hoursWorked: 0,
                status: "absent",
                absenceReason: "no_check_in",
                autoAbsent: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            },
            { upsert: true },
          )
        }

        return {
          employeeId: employee._id.toString(),
          name: employee.name,
          email: employee.email,
          department: employee.department || "N/A",
          position: employee.position || "N/A",
          status: employee.status,
          joinDate: employee.joinDate,
          selectedDate: attendanceDate,
          attendanceStatus: derivedStatus,
          checkInTime: record?.checkInTime || null,
          checkOutTime: record?.checkOutTime || null,
          breakTaken: Boolean(record?.breakTaken),
          breakStartTime: record?.breakStartTime || null,
          breakEndTime: record?.breakEndTime || null,
          breakDurationMinutes: Number(record?.breakDurationMinutes) || 0,
          hoursWorked: record?.hoursWorked || 0,
          isLate: Boolean(record?.isLate),
          isEarly: Boolean(record?.isEarly),
          needsCheckoutReview,
          absenceReason,
          lateOccurrencesLast30Days: patternCountsByUserId.get(employee._id.toString())?.late || 0,
          earlyLeaveOccurrencesLast30Days:
            patternCountsByUserId.get(employee._id.toString())?.early || 0,
          absenceOccurrencesLast30Days:
            patternCountsByUserId.get(employee._id.toString())?.absent || 0,
          lateReason: record?.lateReason || null,
          earlyReason: record?.earlyReason || null,
          lateCheckoutReason: record?.lateCheckoutReason || null,
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
      }),
    )

    return NextResponse.json({
      date: selectedDate,
      currentDate,
      weekend,
      rows,
    })
  } catch (error) {
    console.error("Admin attendance snapshot error:", error)
    return NextResponse.json({ error: "Failed to fetch attendance snapshot" }, { status: 500 })
  }
}
