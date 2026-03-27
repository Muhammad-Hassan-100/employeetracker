import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { extractEmailDomain } from "@/lib/company-utils"
import { requireSuperAdmin } from "@/lib/session"

type RouteContext = {
  params: Promise<{ companyId: string }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { session, response } = requireSuperAdmin(request)
    if (!session) {
      return response
    }

    const { companyId } = await params
    const db = await getDatabase()
    const companiesCollection = db.collection("companies")
    const usersCollection = db.collection("users")

    const [company, admin, employeeCount] = await Promise.all([
      companiesCollection.findOne({ companyId }),
      usersCollection.findOne({ companyId, role: "admin" }),
      usersCollection.countDocuments({ companyId, role: "employee" }),
    ])

    if (!company || !admin) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    return NextResponse.json({
      companyId: company.companyId,
      name: company.name,
      domain: company.domain,
      approvalStatus: company.approvalStatus || admin.approvalStatus || "approved",
      createdAt: company.createdAt,
      employeeCount,
      admin: {
        id: admin._id.toString(),
        name: admin.name,
        email: admin.email,
        status: admin.status,
        approvalStatus: admin.approvalStatus || "approved",
      },
    })
  } catch (error) {
    console.error("Super admin company detail error:", error)
    return NextResponse.json({ error: "Failed to load company" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { session, response } = requireSuperAdmin(request)
    if (!session) {
      return response
    }

    const { companyId } = await params
    const { companyName, adminName, adminEmail, adminStatus, approvalStatus } = await request.json()

    const db = await getDatabase()
    const companiesCollection = db.collection("companies")
    const usersCollection = db.collection("users")

    const company = await companiesCollection.findOne({ companyId })
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    const admin = await usersCollection.findOne({ companyId, role: "admin" })
    if (!admin) {
      return NextResponse.json({ error: "Company admin not found" }, { status: 404 })
    }

    const trimmedCompanyName = String(companyName || "").trim()
    const trimmedAdminName = String(adminName || "").trim()
    const normalizedAdminEmail = String(adminEmail || "").toLowerCase().trim()

    if (!trimmedCompanyName || !trimmedAdminName || !normalizedAdminEmail) {
      return NextResponse.json({ error: "Company name, admin name, and admin email are required" }, { status: 400 })
    }

    if (extractEmailDomain(normalizedAdminEmail) !== company.domain) {
      return NextResponse.json({ error: `Admin email must stay on @${company.domain}` }, { status: 400 })
    }

    const duplicateAdmin = await usersCollection.findOne({
      _id: { $ne: admin._id },
      email: normalizedAdminEmail,
    })

    if (duplicateAdmin) {
      return NextResponse.json({ error: "This admin email is already in use" }, { status: 400 })
    }

    const nextApprovalStatus =
      approvalStatus === "approved" || approvalStatus === "rejected" || approvalStatus === "pending"
        ? approvalStatus
        : company.approvalStatus || admin.approvalStatus || "approved"

    const nextAdminStatus =
      adminStatus === "active" || adminStatus === "inactive"
        ? adminStatus
        : nextApprovalStatus === "approved"
          ? "active"
          : "inactive"

    await Promise.all([
      companiesCollection.updateOne(
        { companyId },
        {
          $set: {
            name: trimmedCompanyName,
            approvalStatus: nextApprovalStatus,
            updatedAt: new Date(),
          },
        },
      ),
      usersCollection.updateOne(
        { _id: admin._id },
        {
          $set: {
            name: trimmedAdminName,
            email: normalizedAdminEmail,
            status: nextAdminStatus,
            approvalStatus: nextApprovalStatus,
            companyName: trimmedCompanyName,
            updatedAt: new Date(),
          },
        },
      ),
      usersCollection.updateMany(
        { companyId, role: "employee" },
        {
          $set: {
            companyName: trimmedCompanyName,
            updatedAt: new Date(),
          },
        },
      ),
    ])

    return NextResponse.json({ message: "Company updated successfully" })
  } catch (error) {
    console.error("Super admin update company error:", error)
    return NextResponse.json({ error: "Failed to update company" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { session, response } = requireSuperAdmin(request)
    if (!session) {
      return response
    }

    const { companyId } = await params
    const db = await getDatabase()
    const companiesCollection = db.collection("companies")
    const usersCollection = db.collection("users")
    const shiftsCollection = db.collection("shifts")
    const leavesCollection = db.collection("leaves")
    const attendanceCollection = db.collection("attendance")

    const company = await companiesCollection.findOne({ companyId })
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    await Promise.all([
      companiesCollection.deleteOne({ companyId }),
      usersCollection.deleteMany({ companyId }),
      shiftsCollection.deleteMany({ companyId }),
      leavesCollection.deleteMany({ companyId }),
      attendanceCollection.deleteMany({ companyId }),
    ])

    return NextResponse.json({ message: "Company deleted successfully" })
  } catch (error) {
    console.error("Super admin delete company error:", error)
    return NextResponse.json({ error: "Failed to delete company" }, { status: 500 })
  }
}
