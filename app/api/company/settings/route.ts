import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { getCompanyDepartments, getCompanyWorkingDays, normalizeDepartments, normalizeWorkingDays } from "@/lib/company-settings"
import { requireAdmin } from "@/lib/session"

export async function GET(request: NextRequest) {
  try {
    const { session, response } = requireAdmin(request)
    if (!session) {
      return response
    }

    const db = await getDatabase()
    const companiesCollection = db.collection("companies")
    const company = await companiesCollection.findOne({ companyId: session.companyId })

    if (!company) {
      return NextResponse.json({ error: "Company settings not found" }, { status: 404 })
    }

    const workingDays = getCompanyWorkingDays(company)
    const departments = getCompanyDepartments(company)

    return NextResponse.json({
      settings: {
        workingDays,
        offDays: [0, 1, 2, 3, 4, 5, 6].filter((day) => !workingDays.includes(day)),
        departments,
      },
    })
  } catch (error) {
    console.error("Fetch company settings error:", error)
    return NextResponse.json({ error: "Failed to load company settings" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session, response } = requireAdmin(request)
    if (!session) {
      return response
    }

    const { workingDays, departments } = await request.json()
    const normalizedWorkingDays = normalizeWorkingDays(workingDays)
    const normalizedDepartments = normalizeDepartments(departments)

    if (!normalizedWorkingDays.length) {
      return NextResponse.json({ error: "Select at least one working day" }, { status: 400 })
    }

    if (!normalizedDepartments.length) {
      return NextResponse.json({ error: "Add at least one department" }, { status: 400 })
    }

    const db = await getDatabase()
    const companiesCollection = db.collection("companies")

    const result = await companiesCollection.updateOne(
      { companyId: session.companyId },
      {
        $set: {
          workingDays: normalizedWorkingDays,
          departments: normalizedDepartments,
          updatedAt: new Date(),
        },
      },
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Company settings not found" }, { status: 404 })
    }

    return NextResponse.json({
      message: "Company settings updated successfully",
      settings: {
        workingDays: normalizedWorkingDays,
        offDays: [0, 1, 2, 3, 4, 5, 6].filter((day) => !normalizedWorkingDays.includes(day)),
        departments: normalizedDepartments,
      },
    })
  } catch (error) {
    console.error("Update company settings error:", error)
    return NextResponse.json({ error: "Failed to update company settings" }, { status: 500 })
  }
}
