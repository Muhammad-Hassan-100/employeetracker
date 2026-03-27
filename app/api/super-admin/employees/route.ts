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
    const usersCollection = db.collection("users")
    const companiesCollection = db.collection("companies")

    const [employees, companies] = await Promise.all([
      usersCollection.find({ role: "employee" }).sort({ createdAt: -1 }).toArray(),
      companiesCollection.find({}).toArray(),
    ])

    const companyMap = new Map(companies.map((company) => [company.companyId, company]))

    return NextResponse.json(
      employees.map((employee) => {
        const company = companyMap.get(employee.companyId)

        return {
          id: employee._id.toString(),
          name: employee.name,
          email: employee.email,
          department: employee.department,
          position: employee.position,
          status: employee.status,
          joinDate: employee.joinDate,
          companyId: employee.companyId,
          companyName: company?.name || employee.companyName || "Unknown Company",
          companyDomain: company?.domain || employee.companyDomain || "",
        }
      }),
    )
  } catch (error) {
    console.error("Super admin employees error:", error)
    return NextResponse.json({ error: "Failed to load employees" }, { status: 500 })
  }
}
