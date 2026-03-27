import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { requireSuperAdmin } from "@/lib/session"

export async function GET(request: NextRequest) {
  try {
    const { session, response } = requireSuperAdmin(request)
    if (!session) {
      return response
    }

    const db = await getDatabase()
    const companiesCollection = db.collection("companies")
    const usersCollection = db.collection("users")

    const companies = await companiesCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    const companyIds = companies.map((company) => company.companyId)
    const [admins, employees] = await Promise.all([
      usersCollection.find({ role: "admin", companyId: { $in: companyIds } }).toArray(),
      usersCollection.find({ role: "employee", companyId: { $in: companyIds } }).toArray(),
    ])

    const adminMap = new Map(admins.map((admin) => [admin.companyId, admin]))
    const employeeCountMap = employees.reduce<Map<string, number>>((map, employee) => {
      map.set(employee.companyId, (map.get(employee.companyId) || 0) + 1)
      return map
    }, new Map())

    return NextResponse.json(
      companies.map((company) => {
        const admin = adminMap.get(company.companyId)

        return {
          companyId: company.companyId,
          name: company.name,
          domain: company.domain,
          approvalStatus: company.approvalStatus || admin?.approvalStatus || "approved",
          createdAt: company.createdAt,
          employeeCount: employeeCountMap.get(company.companyId) || 0,
          admin: admin
            ? {
                id: admin._id.toString(),
                name: admin.name,
                email: admin.email,
                status: admin.status,
                approvalStatus: admin.approvalStatus || "approved",
              }
            : null,
        }
      }),
    )
  } catch (error) {
    console.error("Super admin companies error:", error)
    return NextResponse.json({ error: "Failed to load companies" }, { status: 500 })
  }
}
