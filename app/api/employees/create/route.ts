import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { getCompanyDepartments } from "@/lib/company-settings"
import { ObjectId } from "mongodb"
import { requireAdmin } from "@/lib/session"
import { buildEmailLocalPart } from "@/lib/company-utils"

export async function POST(request: NextRequest) {
  try {
    const { session, response } = requireAdmin(request)
    if (!session) {
      return response
    }

    const { name, password, shift, department, position, checkInBeforeMinutes, lateGraceMinutes } = await request.json()
    if (!name || !password || !shift || !department || !position) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    const parsedCheckInBefore = Number(checkInBeforeMinutes)
    const parsedLateGrace = Number(lateGraceMinutes)

    if (
      !Number.isFinite(parsedCheckInBefore) ||
      !Number.isInteger(parsedCheckInBefore) ||
      parsedCheckInBefore < 0 ||
      !Number.isFinite(parsedLateGrace) ||
      !Number.isInteger(parsedLateGrace) ||
      parsedLateGrace < 0
    ) {
      return NextResponse.json(
        { error: "Check-in before minutes and late relaxation must be whole non-negative numbers" },
        { status: 400 },
      )
    }

    const db = await getDatabase()
    const usersCollection = db.collection("users")
    const shiftsCollection = db.collection("shifts")
    const companiesCollection = db.collection("companies")

    const [assignedShift, company] = await Promise.all([
      shiftsCollection.findOne({
        _id: new ObjectId(shift),
        companyId: session.companyId,
      }),
      companiesCollection.findOne({ companyId: session.companyId }),
    ])

    if (!assignedShift) {
      return NextResponse.json({ error: "Selected shift was not found in this workspace" }, { status: 400 })
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
      shiftId: shift,
      checkInBeforeMinutes: parsedCheckInBefore,
      lateGraceMinutes: parsedLateGrace,
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
        checkInBeforeMinutes: newEmployee.checkInBeforeMinutes,
        lateGraceMinutes: newEmployee.lateGraceMinutes,
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
