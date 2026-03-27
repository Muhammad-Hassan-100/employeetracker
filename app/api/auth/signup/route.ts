import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { DEFAULT_ATTENDANCE_POLICY } from "@/lib/attendance-policy"
import { buildSessionUser, slugifyCompanyName } from "@/lib/session"
import {
  extractEmailDomain,
  isCompanyDomainValid,
  isPublicEmailDomain,
  normalizeCompanyDomain,
} from "@/lib/company-utils"
import { DEFAULT_DEPARTMENTS, DEFAULT_WORKING_DAYS } from "@/lib/company-settings"

export async function POST(request: NextRequest) {
  try {
    const { companyName, companyDomain, adminName, email, password } = await request.json()

    if (!companyName || !companyDomain || !adminName || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    const normalizedEmail = String(email).toLowerCase().trim()
    const normalizedDomain = normalizeCompanyDomain(String(companyDomain))
    const trimmedCompany = String(companyName).trim()
    const trimmedAdmin = String(adminName).trim()
    const trimmedPassword = String(password)
    const adminEmailDomain = extractEmailDomain(normalizedEmail)

    if (trimmedPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    if (!isCompanyDomainValid(normalizedDomain)) {
      return NextResponse.json({ error: "Enter a valid company domain like company.com" }, { status: 400 })
    }

    if (isPublicEmailDomain(normalizedDomain)) {
      return NextResponse.json(
        { error: "Public domains like gmail.com are not allowed. Use your company domain." },
        { status: 400 },
      )
    }

    if (adminEmailDomain !== normalizedDomain) {
      return NextResponse.json(
        { error: "Admin email must use the same company domain you entered." },
        { status: 400 },
      )
    }

    const db = await getDatabase()
    const usersCollection = db.collection("users")
    const companiesCollection = db.collection("companies")

    const existingUser = await usersCollection.findOne({ email: normalizedEmail })
    if (existingUser) {
      return NextResponse.json({ error: "This email is already in use" }, { status: 400 })
    }

    const existingCompany = await companiesCollection.findOne({ domain: normalizedDomain })
    if (existingCompany) {
      return NextResponse.json({ error: "This company domain is already registered" }, { status: 400 })
    }

    const companyId = `${slugifyCompanyName(trimmedCompany) || "company"}-${Date.now().toString(36)}`
    const company = {
      companyId,
      name: trimmedCompany,
      domain: normalizedDomain,
      approvalStatus: "pending" as const,
      workingDays: DEFAULT_WORKING_DAYS,
      departments: DEFAULT_DEPARTMENTS,
      attendancePolicy: DEFAULT_ATTENDANCE_POLICY,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await companiesCollection.insertOne(company)

    const adminUser = {
      name: trimmedAdmin,
      email: normalizedEmail,
      password: trimmedPassword,
      role: "admin" as const,
      companyId,
      companyName: trimmedCompany,
      companyDomain: normalizedDomain,
      joinDate: new Date(),
      status: "inactive" as const,
      approvalStatus: "pending" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await usersCollection.insertOne(adminUser)

    return NextResponse.json({
      message: "Signup request submitted successfully",
    })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "Failed to create company workspace" }, { status: 500 })
  }
}
