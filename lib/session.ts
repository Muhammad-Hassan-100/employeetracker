import { ObjectId } from "mongodb"
import { NextRequest, NextResponse } from "next/server"
import { extractEmailDomain } from "@/lib/company-utils"

export type UserRole = "super_admin" | "admin" | "employee"
export type ApprovalStatus = "pending" | "approved" | "rejected"

export interface SessionUser {
  id: string
  name: string
  email: string
  role: UserRole
  companyId: string
  companyName: string
  companyDomain: string
  department?: string
  position?: string
  shiftId?: string
  status?: "active" | "inactive"
  approvalStatus?: ApprovalStatus
  allowEmployeePasswordChange?: boolean
}

export interface RequestSession {
  userId: string
  companyId: string
  companyName: string
  companyDomain: string
  role: UserRole
  name: string
  email: string
  approvalStatus?: ApprovalStatus
}

export function buildSessionUser(
  user: any,
  companyName?: string,
  companyDomain?: string,
  allowEmployeePasswordChange?: boolean,
): SessionUser {
  const fallbackCompanyName = user.role === "super_admin" ? "Platform Control" : "Workspace"
  const fallbackCompanyDomain = user.role === "super_admin" ? "hassan.com" : extractEmailDomain(user.email)

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId || "platform",
    companyName: companyName || user.companyName || fallbackCompanyName,
    companyDomain: companyDomain || user.companyDomain || fallbackCompanyDomain,
    department: user.department,
    position: user.position,
    shiftId: user.shiftId,
    status: user.status,
    approvalStatus: user.approvalStatus,
    allowEmployeePasswordChange: allowEmployeePasswordChange ?? user.allowEmployeePasswordChange ?? false,
  }
}

export function readRequestSession(request: NextRequest): RequestSession | null {
  const userId = request.headers.get("x-user-id")
  const companyId = request.headers.get("x-company-id")
  const companyName = request.headers.get("x-company-name")
  const companyDomain = request.headers.get("x-company-domain")
  const role = request.headers.get("x-user-role") as UserRole | null
  const name = request.headers.get("x-user-name")
  const email = request.headers.get("x-user-email")

  if (!userId || !companyId || !companyName || !companyDomain || !role || !name || !email) {
    return null
  }

  const approvalStatus = request.headers.get("x-approval-status") as ApprovalStatus | null

  return { userId, companyId, companyName, companyDomain, role, name, email, approvalStatus: approvalStatus || undefined }
}

export function unauthorized(message = "Authentication required") {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbidden(message = "You are not allowed to perform this action") {
  return NextResponse.json({ error: message }, { status: 403 })
}

export function requireSession(request: NextRequest) {
  const session = readRequestSession(request)
  if (!session) {
    return { response: unauthorized(), session: null }
  }

  return { response: null, session }
}

export function requireAdmin(request: NextRequest) {
  const { session, response } = requireSession(request)
  if (!session) {
    return { response, session: null }
  }

  if (session.role !== "admin") {
    return { response: forbidden("Admin access required"), session: null }
  }

  return { response: null, session }
}

export function requireSuperAdmin(request: NextRequest) {
  const { session, response } = requireSession(request)
  if (!session) {
    return { response, session: null }
  }

  if (session.role !== "super_admin") {
    return { response: forbidden("Super admin access required"), session: null }
  }

  return { response: null, session }
}

export function assertSelfOrAdmin(session: RequestSession, targetUserId: string) {
  if (session.role === "admin" || session.role === "super_admin") {
    return null
  }

  if (session.userId !== targetUserId) {
    return forbidden("You can only access your own records")
  }

  return null
}

export function toObjectId(id: string) {
  try {
    return new ObjectId(id)
  } catch {
    return null
  }
}

export function slugifyCompanyName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
