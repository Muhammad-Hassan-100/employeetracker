import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { extractEmailDomain } from "@/lib/company-utils"
import {
  getCompanyAllowEmployeePasswordChange,
} from "@/lib/company-settings"
import { getDatabase } from "@/lib/mongodb"
import { buildSessionUser, forbidden, requireSession } from "@/lib/session"

export async function GET(request: NextRequest) {
  try {
    const { session, response } = requireSession(request)
    if (!session) {
      return response
    }

    if (session.role !== "admin" && session.role !== "employee") {
      return forbidden("Settings are only available for admin and employee accounts")
    }

    const db = await getDatabase()
    const usersCollection = db.collection("users")
    const companiesCollection = db.collection("companies")

    const [user, company] = await Promise.all([
      usersCollection.findOne({
        _id: new ObjectId(session.userId),
        companyId: session.companyId,
        role: session.role,
      }),
      companiesCollection.findOne({ companyId: session.companyId }),
    ])

    if (!user) {
      return NextResponse.json({ error: `${session.role === "admin" ? "Admin" : "Employee"} profile not found` }, { status: 404 })
    }

    const allowEmployeePasswordChange = getCompanyAllowEmployeePasswordChange(company)
    if (session.role === "employee" && !allowEmployeePasswordChange) {
      return forbidden("Your admin has not allowed employee password changes")
    }

    return NextResponse.json({
      user: buildSessionUser(user, company?.name, company?.domain, allowEmployeePasswordChange),
      profile:
        session.role === "admin"
          ? {
              name: user.name,
              email: user.email,
              companyName: company?.name || session.companyName,
              companyDomain: company?.domain || session.companyDomain,
              allowEmployeePasswordChange,
            }
          : {
              name: user.name,
              email: user.email,
              allowEmployeePasswordChange,
            },
    })
  } catch (error) {
    console.error("Fetch profile error:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session, response } = requireSession(request)
    if (!session) {
      return response
    }

    if (session.role !== "admin" && session.role !== "employee") {
      return forbidden("Settings are only available for admin and employee accounts")
    }

    const db = await getDatabase()
    const usersCollection = db.collection("users")
    const companiesCollection = db.collection("companies")
    const company = await companiesCollection.findOne({ companyId: session.companyId })
    const allowEmployeePasswordChange = getCompanyAllowEmployeePasswordChange(company)

    if (session.role === "employee") {
      if (!allowEmployeePasswordChange) {
        return forbidden("Your admin has not allowed employee password changes")
      }

      const { password } = await request.json()
      const normalizedPassword = String(password || "")

      if (normalizedPassword.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
      }

      const result = await usersCollection.findOneAndUpdate(
        {
          _id: new ObjectId(session.userId),
          companyId: session.companyId,
          role: "employee",
        },
        {
          $set: {
            password: normalizedPassword,
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after" },
      )

      if (!result) {
        return NextResponse.json({ error: "Employee profile not found" }, { status: 404 })
      }

      return NextResponse.json({
        message: "Password updated successfully",
        user: buildSessionUser(result, company?.name, company?.domain, allowEmployeePasswordChange),
      })
    }

    const { name, email, password } = await request.json()
    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
    }

    const normalizedEmail = String(email).toLowerCase().trim()
    const normalizedName = String(name).trim()
    const emailDomain = extractEmailDomain(normalizedEmail)

    if (emailDomain !== session.companyDomain) {
      return NextResponse.json(
        { error: `Admin email must stay on @${session.companyDomain}` },
        { status: 400 },
      )
    }

    if (password && String(password).length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    const duplicateUser = await usersCollection.findOne({
      _id: { $ne: new ObjectId(session.userId) },
      email: normalizedEmail,
    })

    if (duplicateUser) {
      return NextResponse.json({ error: "This email is already in use" }, { status: 400 })
    }

    const updatePayload: Record<string, unknown> = {
      name: normalizedName,
      email: normalizedEmail,
      updatedAt: new Date(),
    }

    if (password) {
      updatePayload.password = String(password)
    }

    const result = await usersCollection.findOneAndUpdate(
      {
        _id: new ObjectId(session.userId),
        companyId: session.companyId,
        role: "admin",
      },
      {
        $set: updatePayload,
      },
      { returnDocument: "after" },
    )

    if (!result) {
      return NextResponse.json({ error: "Admin profile not found" }, { status: 404 })
    }

    return NextResponse.json({
      message: "Admin profile updated successfully",
      user: buildSessionUser(result, company?.name, company?.domain, allowEmployeePasswordChange),
    })
  } catch (error) {
    console.error("Update profile error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
