import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { buildSessionUser, requireAdmin } from "@/lib/session"
import { extractEmailDomain } from "@/lib/company-utils"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest) {
  try {
    const { session, response } = requireAdmin(request)
    if (!session) {
      return response
    }

    const db = await getDatabase()
    const usersCollection = db.collection("users")
    const companiesCollection = db.collection("companies")

    const [user, company] = await Promise.all([
      usersCollection.findOne({
        _id: new ObjectId(session.userId),
        companyId: session.companyId,
        role: "admin",
      }),
      companiesCollection.findOne({ companyId: session.companyId }),
    ])

    if (!user) {
      return NextResponse.json({ error: "Admin profile not found" }, { status: 404 })
    }

    return NextResponse.json({
      user: buildSessionUser(user, company?.name, company?.domain),
      profile: {
        name: user.name,
        email: user.email,
        companyName: company?.name || session.companyName,
        companyDomain: company?.domain || session.companyDomain,
      },
    })
  } catch (error) {
    console.error("Fetch admin profile error:", error)
    return NextResponse.json({ error: "Failed to fetch admin profile" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session, response } = requireAdmin(request)
    if (!session) {
      return response
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

    const db = await getDatabase()
    const usersCollection = db.collection("users")
    const companiesCollection = db.collection("companies")

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

    const company = await companiesCollection.findOne({ companyId: session.companyId })

    return NextResponse.json({
      message: "Admin profile updated successfully",
      user: buildSessionUser(result, company?.name, company?.domain),
    })
  } catch (error) {
    console.error("Update admin profile error:", error)
    return NextResponse.json({ error: "Failed to update admin profile" }, { status: 500 })
  }
}
