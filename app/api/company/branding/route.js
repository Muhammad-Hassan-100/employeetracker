import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { DEFAULT_DASHBOARD_PRIMARY_COLOR, normalizeDashboardPrimaryColor } from "@/lib/company-settings"
import { requireAdmin, requireSession } from "@/lib/session"

export async function GET(request) {
  try {
    const { session, response } = requireSession(request)
    if (!session) return response
    if (session.role === "super_admin") {
      return NextResponse.json({ error: "Company branding is not available for platform accounts" }, { status: 403 })
    }

    const company = await (await getDatabase()).collection("companies").findOne(
      { companyId: session.companyId },
      { projection: { dashboardPrimaryColor: 1 } },
    )
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 })

    return NextResponse.json(
      { dashboardPrimaryColor: normalizeDashboardPrimaryColor(company.dashboardPrimaryColor) },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("Fetch company branding error:", error)
    return NextResponse.json({ error: "Failed to load company branding" }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const { session, response } = requireAdmin(request)
    if (!session) return response

    const body = await request.json()
    if (typeof body.dashboardPrimaryColor !== "string" || !/^#[0-9a-fA-F]{6}$/.test(body.dashboardPrimaryColor)) {
      return NextResponse.json({ error: "Choose a valid six-digit hex color" }, { status: 400 })
    }

    const dashboardPrimaryColor = normalizeDashboardPrimaryColor(body.dashboardPrimaryColor)
    const result = await (await getDatabase()).collection("companies").updateOne(
      { companyId: session.companyId },
      { $set: { dashboardPrimaryColor, updatedAt: new Date() } },
    )
    if (!result.matchedCount) return NextResponse.json({ error: "Company not found" }, { status: 404 })

    return NextResponse.json({ message: "Dashboard brand color updated", dashboardPrimaryColor })
  } catch (error) {
    console.error("Update company branding error:", error)
    return NextResponse.json({ error: "Failed to update company branding" }, { status: 500 })
  }
}
