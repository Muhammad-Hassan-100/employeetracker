import type { NextRequest } from "next/server"

export type AttendancePolicyMode = "open" | "office_ip" | "office_location" | "hybrid"

export interface AttendancePolicy {
  mode: AttendancePolicyMode
  allowedIPs: string[]
  officeLat: number | null
  officeLng: number | null
  radiusMeters: number
}

export const DEFAULT_ATTENDANCE_POLICY: AttendancePolicy = {
  mode: "open",
  allowedIPs: [],
  officeLat: null,
  officeLng: null,
  radiusMeters: 150,
}

export const ATTENDANCE_POLICY_OPTIONS: Array<{
  value: AttendancePolicyMode
  label: string
  description: string
}> = [
  {
    value: "open",
    label: "Open Access",
    description: "Employees can check in and check out from any location.",
  },
  {
    value: "office_ip",
    label: "Office Network Only",
    description: "Attendance is allowed only from approved office public IP addresses.",
  },
  {
    value: "office_location",
    label: "Office Location Only",
    description: "Attendance is allowed only within your office location radius.",
  },
  {
    value: "hybrid",
    label: "Network and Location",
    description: "Attendance requires both an approved office IP and office location match.",
  },
]

function normalizeIpAddress(value: string) {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) {
    return ""
  }

  if (trimmed === "::1") {
    return "127.0.0.1"
  }

  if (trimmed.startsWith("::ffff:")) {
    return trimmed.slice(7)
  }

  return trimmed
}

function normalizeCoordinate(value: unknown) {
  const number = typeof value === "number" ? value : Number(value)
  return Number.isFinite(number) ? number : null
}

function normalizeRadius(value: unknown) {
  const number = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(number) || number <= 0) {
    return DEFAULT_ATTENDANCE_POLICY.radiusMeters
  }

  return Math.round(number)
}

export function normalizeAllowedIPs(value: unknown) {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,]+/)
      : []

  return Array.from(
    new Set(
      source
        .map((entry) => normalizeIpAddress(String(entry)))
        .filter(Boolean),
    ),
  )
}

export function normalizeAttendancePolicy(value: unknown): AttendancePolicy {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  const mode = source.mode

  return {
    mode: mode === "office_ip" || mode === "office_location" || mode === "hybrid" ? mode : DEFAULT_ATTENDANCE_POLICY.mode,
    allowedIPs: normalizeAllowedIPs(source.allowedIPs),
    officeLat: normalizeCoordinate(source.officeLat),
    officeLng: normalizeCoordinate(source.officeLng),
    radiusMeters: normalizeRadius(source.radiusMeters),
  }
}

export function getCompanyAttendancePolicy(company: any): AttendancePolicy {
  return normalizeAttendancePolicy(company?.attendancePolicy)
}

export function validateAttendancePolicyConfiguration(policy: AttendancePolicy) {
  if ((policy.mode === "office_ip" || policy.mode === "hybrid") && !policy.allowedIPs.length) {
    return "Add at least one approved office IP address for this attendance policy."
  }

  if (policy.mode === "office_location" || policy.mode === "hybrid") {
    if (policy.officeLat === null || policy.officeLng === null) {
      return "Enter the office latitude and longitude for this attendance policy."
    }

    if (policy.radiusMeters <= 0) {
      return "Enter a valid office radius in meters."
    }
  }

  return null
}

export function requiresAttendanceLocation(policy: AttendancePolicy) {
  return policy.mode === "office_location" || policy.mode === "hybrid"
}

export function requiresAttendanceOfficeIp(policy: AttendancePolicy) {
  return policy.mode === "office_ip" || policy.mode === "hybrid"
}

export function extractClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const candidate = forwardedFor?.split(",")[0] || realIp || ""
  return normalizeIpAddress(candidate)
}

export function resolveAttendanceClientIp(request: NextRequest, fallbackClientPublicIp?: unknown) {
  const headerIp = extractClientIp(request)
  if (headerIp) {
    return headerIp
  }

  if (process.env.NODE_ENV !== "production") {
    return normalizeIpAddress(String(fallbackClientPublicIp || ""))
  }

  return ""
}

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

export function getDistanceInMeters(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const earthRadius = 6_371_000
  const latDistance = toRadians(toLat - fromLat)
  const lngDistance = toRadians(toLng - fromLng)
  const a =
    Math.sin(latDistance / 2) ** 2 +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(lngDistance / 2) ** 2

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function validateAttendanceActionAccess({
  actionLabel,
  clientPublicIp,
  latitude,
  longitude,
  policy,
  request,
}: {
  actionLabel: "Check-in" | "Check-out"
  clientPublicIp?: unknown
  latitude?: unknown
  longitude?: unknown
  policy: AttendancePolicy
  request: NextRequest
}) {
  const configurationError = validateAttendancePolicyConfiguration(policy)
  if (configurationError) {
    return "Attendance restrictions are not configured correctly for your company. Please contact your administrator."
  }

  if (policy.mode === "open") {
    return null
  }

  if (requiresAttendanceOfficeIp(policy)) {
    const clientIp = resolveAttendanceClientIp(request, clientPublicIp)
    if (!clientIp || !policy.allowedIPs.includes(clientIp)) {
      if (policy.mode === "hybrid") {
        return `${actionLabel} is only allowed from your approved office network and office location.`
      }

      return `${actionLabel} is only allowed from your approved office network.`
    }
  }

  if (requiresAttendanceLocation(policy)) {
    const normalizedLat = normalizeCoordinate(latitude)
    const normalizedLng = normalizeCoordinate(longitude)

    if (normalizedLat === null || normalizedLng === null) {
      return "Location access is required for attendance at your company."
    }

    const distance = getDistanceInMeters(normalizedLat, normalizedLng, policy.officeLat!, policy.officeLng!)
    if (distance > policy.radiusMeters) {
      if (policy.mode === "hybrid") {
        return `${actionLabel} is only allowed from your approved office network and office location.`
      }

      return `${actionLabel} is only allowed within your company office area.`
    }
  }

  return null
}
