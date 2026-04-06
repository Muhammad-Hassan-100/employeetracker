import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { getCompanyDepartments } from "@/lib/company-settings"
import { ObjectId } from "mongodb"
import { requireAdmin } from "@/lib/session"
import { buildEmailLocalPart } from "@/lib/company-utils"
import {
  getMonthInputFromDate,
  isDateWithinMonth,
  normalizeEmployeeCustomSchedule,
  normalizeEmployeeScheduleMode,
} from "@/lib/employee-schedule"

export async function POST(request: NextRequest) {
  try {
    const { session, response } = requireAdmin(request)
    if (!session) {
      return response
    }

    const {
      name,
      password,
      shift,
      department,
      position,
      checkInBeforeMinutes,
      lateGraceMinutes,
      checkOutGraceMinutes,
      scheduleMode,
      customScheduleMonth,
      customSchedule,
    } = await request.json()
    if (!name || !password || !department || !position) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    const normalizedScheduleMode = normalizeEmployeeScheduleMode(scheduleMode)
    const normalizedCustomSchedule = normalizeEmployeeCustomSchedule(customSchedule)
    const normalizedCustomScheduleMonth = typeof customScheduleMonth === "string" ? customScheduleMonth.trim() : ""

    if (normalizedScheduleMode === "company_default" && !shift) {
      return NextResponse.json({ error: "Select a default shift for company-rule scheduling" }, { status: 400 })
    }

    if (normalizedScheduleMode === "custom_monthly") {
      if (!/^\d{4}-\d{2}$/.test(normalizedCustomScheduleMonth)) {
        return NextResponse.json({ error: "Select a valid month for the custom schedule" }, { status: 400 })
      }

      if (!normalizedCustomSchedule.length) {
        return NextResponse.json({ error: "Add at least one scheduled day for the custom month" }, { status: 400 })
      }

      if (normalizedCustomSchedule.some((entry) => !isDateWithinMonth(entry.date, normalizedCustomScheduleMonth))) {
        return NextResponse.json({ error: "Each custom shift must belong to the selected schedule month" }, { status: 400 })
      }
    }

    const parsedCheckInBefore = Number(checkInBeforeMinutes)
    const parsedLateGrace = Number(lateGraceMinutes)
    const parsedCheckOutGrace = Number(checkOutGraceMinutes)

    if (
      !Number.isFinite(parsedCheckInBefore) ||
      !Number.isInteger(parsedCheckInBefore) ||
      parsedCheckInBefore < 0 ||
      !Number.isFinite(parsedLateGrace) ||
      !Number.isInteger(parsedLateGrace) ||
      parsedLateGrace < 0 ||
      !Number.isFinite(parsedCheckOutGrace) ||
      !Number.isInteger(parsedCheckOutGrace) ||
      parsedCheckOutGrace < 0
    ) {
      return NextResponse.json(
        { error: "Check-in before, late relaxation, and normal check-out minutes must be whole non-negative numbers" },
        { status: 400 },
      )
    }

    const db = await getDatabase()
    const usersCollection = db.collection("users")
    const shiftsCollection = db.collection("shifts")
    const companiesCollection = db.collection("companies")

    const company = await companiesCollection.findOne({ companyId: session.companyId })

    let assignedShift = null
    if (normalizedScheduleMode === "company_default") {
      try {
        assignedShift = await shiftsCollection.findOne({
          _id: new ObjectId(shift),
          companyId: session.companyId,
        })
      } catch {
        return NextResponse.json({ error: "Selected shift is invalid" }, { status: 400 })
      }

      if (!assignedShift) {
        return NextResponse.json({ error: "Selected shift was not found in this workspace" }, { status: 400 })
      }
    }

    if (normalizedScheduleMode === "custom_monthly") {
      let uniqueShiftIds: ObjectId[] = []
      try {
        uniqueShiftIds = Array.from(new Set(normalizedCustomSchedule.map((entry) => entry.shiftId))).map((entry) => new ObjectId(entry))
      } catch {
        return NextResponse.json({ error: "One or more custom schedule shifts are invalid" }, { status: 400 })
      }

      const validShiftCount = await shiftsCollection.countDocuments({
        companyId: session.companyId,
        _id: { $in: uniqueShiftIds },
      })

      if (validShiftCount !== uniqueShiftIds.length) {
        return NextResponse.json({ error: "One or more custom schedule shifts are not available in this workspace" }, { status: 400 })
      }
    }

    const availableDepartments = getCompanyDepartments(company)
    if (!availableDepartments.includes(String(department))) {
      return NextResponse.json({ error: "Choose a department from your company settings" }, { status: 400 })
    }

    const emailLocalPart = buildEmailLocalPart(String(name))
    if (!emailLocalPart) {
      return NextResponse.json({ error: "Enter a valid employee name" }, { status: 400 })
    }

    let email = `${emailLocalPart}@${session.companyDomain}`
    let suffix = 1

    while (await usersCollection.findOne({ email })) {
      email = `${emailLocalPart}${suffix}@${session.companyDomain}`
      suffix += 1
    }

    const newEmployee = {
      name,
      email,
      password,
      role: "employee",
      companyId: session.companyId,
      companyName: session.companyName,
      companyDomain: session.companyDomain,
      department,
      position,
      shiftId: normalizedScheduleMode === "company_default" ? shift : "",
      scheduleMode: normalizedScheduleMode,
      customScheduleMonth:
        normalizedScheduleMode === "custom_monthly"
          ? normalizedCustomScheduleMonth
          : normalizedCustomSchedule.length
            ? getMonthInputFromDate(normalizedCustomSchedule[0].date)
            : "",
      customSchedule: normalizedScheduleMode === "custom_monthly" ? normalizedCustomSchedule : [],
      checkInBeforeMinutes: parsedCheckInBefore,
      lateGraceMinutes: parsedLateGrace,
      checkOutGraceMinutes: parsedCheckOutGrace,
      joinDate: new Date(),
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await usersCollection.insertOne(newEmployee)

    return NextResponse.json({
      message: "Employee created successfully",
      employee: {
        id: result.insertedId.toString(),
        name: newEmployee.name,
        email: newEmployee.email,
        department: newEmployee.department,
        position: newEmployee.position,
        role: newEmployee.role,
        shiftId: newEmployee.shiftId,
        scheduleMode: newEmployee.scheduleMode,
        customScheduleMonth: newEmployee.customScheduleMonth,
        customSchedule: newEmployee.customSchedule,
        checkInBeforeMinutes: newEmployee.checkInBeforeMinutes,
        lateGraceMinutes: newEmployee.lateGraceMinutes,
        checkOutGraceMinutes: newEmployee.checkOutGraceMinutes,
        joinDate: newEmployee.joinDate,
        status: newEmployee.status,
        companyId: newEmployee.companyId,
      },
    })
  } catch (error) {
    console.error("Create employee error:", error)
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 })
  }
}
