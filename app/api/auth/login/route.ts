import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { buildSessionUser } from "@/lib/session"
import { getCompanyAllowEmployeePasswordChange } from "@/lib/company-settings"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Get database connection
    const db = await getDatabase()
    const usersCollection = db.collection("users")
    const companiesCollection = db.collection("companies")

    const user = await usersCollection.findOne({
      email: email.toLowerCase(),
    })

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    if (user.password !== password) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    if (user.role !== "super_admin" && user.status !== "active") {
      return NextResponse.json({ error: "This account is not active" }, { status: 403 })
    }

    if (user.role === "admin") {
      if (user.approvalStatus === "pending") {
        return NextResponse.json({ error: "Your admin account is waiting for super admin approval" }, { status: 403 })
      }

      if (user.approvalStatus === "rejected") {
        return NextResponse.json({ error: "Your admin signup request has been rejected" }, { status: 403 })
      }
    }

    if (user.role === "super_admin") {
      return NextResponse.json({
        user: buildSessionUser(user, "Platform Control", "hassan.com"),
        message: "Login successful",
      })
    }

    const company = user.companyId
      ? await companiesCollection.findOne({ companyId: user.companyId })
      : null

    if (user.role === "admin" && company?.approvalStatus && company.approvalStatus !== "approved") {
      return NextResponse.json({ error: "Your company is waiting for super admin approval" }, { status: 403 })
    }

    return NextResponse.json({
      user: buildSessionUser(user, company?.name, company?.domain, getCompanyAllowEmployeePasswordChange(company)),
      message: "Login successful",
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 })
  }
}
