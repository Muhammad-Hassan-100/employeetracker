"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  ArrowUpRight,
  AlertTriangle,
  Building2,
  CalendarDays,
  CalendarPlus2,
  Check,
  Clock3,
  FileBarChart2,
  History,
  RefreshCw,
  ShieldCheck,
  UsersRound,
  WalletCards,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { authFetch, getStoredUser } from "@/lib/client-session"
import type { SessionUser } from "@/lib/session"
import { getLocalTimeMinutes, getNoCheckInShiftStatus, getTimeStringMinutes } from "@/lib/attendance-time"

type Employee = {
  id: string
  name: string
  email: string
  department?: string
  status: "active" | "inactive"
}

type AttendanceRow = {
  employeeId: string
  name: string
  department: string
  status: "active" | "inactive"
  attendanceStatus: string
  checkInTime: string | null
  isLate: boolean
  needsCheckoutReview: boolean
  absenceReason?: string | null
  lateOccurrencesLast30Days: number
  earlyLeaveOccurrencesLast30Days: number
  absenceOccurrencesLast30Days: number
  shift: { name: string; startTime: string; endTime: string } | null
}

type LeaveRequest = {
  id: string
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  status: "pending" | "approved" | "rejected"
}

type Company = {
  companyId: string
  name: string
  domain: string
  approvalStatus: "pending" | "approved" | "rejected"
  employeeCount: number
  createdAt: string
  admin: { name: string; email: string; status: "active" | "inactive" } | null
}

type PlatformEmployee = {
  id: string
  name: string
  companyName: string
  status: "active" | "inactive"
}

type AttendanceRecord = {
  id: string
  date: string
  checkInTime: string | null
  checkOutTime: string | null
  breakStartTime?: string | null
  breakEndTime?: string | null
  hoursWorked?: number
  status: "present" | "absent" | "on_leave"
  isLate: boolean
  isEarly: boolean
  checkoutWindowExpired?: boolean
  absenceReason?: string | null
}

type TodayAttendance = {
  isCheckedIn: boolean
  record: AttendanceRecord | null
}

type ShiftSummary = {
  shift: { name: string; startTime: string; endTime: string } | null
  user: { hasShiftAssigned: boolean; scheduleMode: string }
  attendanceRules?: { lateGraceMinutes: number }
}

type DashboardData =
  | { role: "admin"; employees: Employee[]; attendance: AttendanceRow[]; leaves: LeaveRequest[] }
  | { role: "super_admin"; companies: Company[]; employees: PlatformEmployee[] }
  | {
      role: "employee"
      attendance: TodayAttendance
      shift: ShiftSummary
      history: AttendanceRecord[]
      leaves: LeaveRequest[]
    }

async function fetchJson<T>(path: string): Promise<T> {
  const response = await authFetch(path)
  const result = await response.json()
  if (!response.ok) {
    throw new Error(result.error || "Unable to load dashboard data")
  }
  return result as T
}

function getLocalDateInput() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatDay(date = new Date()) {
  return new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(date)
}

function formatDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date)
}

function formatTime(value: string | null | undefined) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value))
}

function formatShiftTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number)
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(
    new Date(2000, 0, 1, hours, minutes),
  )
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--dashboard-ink)] sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--dashboard-muted)]">{description}</p>
      </div>
      <p className="shrink-0 text-sm text-[var(--dashboard-muted)]">{formatDay()}</p>
    </div>
  )
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral",
}: {
  label: string
  value: string | number
  detail: string
  icon: LucideIcon
  tone?: "neutral" | "green" | "amber"
}) {
  const colors = {
    neutral: "bg-[#f4f5f1] text-[#526057]",
    green: "bg-[#e8f2df] text-[var(--dashboard-green-text)]",
    amber: "bg-[#f7efdf] text-[#8a6523]",
  }

  return (
    <article className="rounded-2xl border border-[var(--dashboard-border)] bg-white p-5 shadow-[0_2px_10px_rgba(28,42,32,0.025)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[var(--dashboard-muted)]">{label}</p>
        <span className={`flex size-9 items-center justify-center rounded-xl ${colors[tone]}`}>
          <Icon className="size-[17px]" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-5 text-3xl font-semibold tracking-tight text-[var(--dashboard-ink)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--dashboard-subtle)]">{detail}</p>
    </article>
  )
}

function Panel({
  title,
  description,
  href,
  linkLabel,
  children,
}: {
  title: string
  description?: string
  href?: string
  linkLabel?: string
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--dashboard-border)] bg-white shadow-[0_2px_10px_rgba(28,42,32,0.025)]">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--dashboard-border-soft)] px-5 py-5 sm:px-6">
        <div>
          <h2 className="font-semibold text-[#202a24]">{title}</h2>
          {description && <p className="mt-1 text-sm text-[var(--dashboard-subtle)]">{description}</p>}
        </div>
        {href && linkLabel && (
          <Link href={href} className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-medium text-[var(--dashboard-green-text)] transition hover:bg-[#f1f6ed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#779c61]">
            {linkLabel}<ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

function EmptyState({ title, description, href, action }: { title: string; description: string; href?: string; action?: string }) {
  return (
    <div className="px-6 py-10 text-center">
      <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-[#f2f4ef] text-[#69776c]">
        <Check className="size-5" aria-hidden="true" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-[var(--dashboard-ink-soft)]">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[var(--dashboard-subtle)]">{description}</p>
      {href && action && (
        <Link href={href} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--dashboard-green)] px-4 text-sm font-medium text-white transition hover:bg-[var(--dashboard-green-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#779c61] focus-visible:ring-offset-2">
          {action}<ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}

function StatusTag({ label, tone }: { label: string; tone: "green" | "amber" | "slate" | "red" }) {
  const styles = {
    green: "bg-[#eaf3e5] text-[#3f6e43]",
    amber: "bg-[#f8f0df] text-[#8b6726]",
    slate: "bg-[#f0f2ef] text-[var(--dashboard-muted)]",
    red: "bg-[#faeae6] text-[#a34f3d]",
  }
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles[tone]}`}>{label}</span>
}

function statusDisplay(status: string) {
  if (status === "no_show") return { label: "Not come yet", tone: "amber" as const }
  if (status === "present") return { label: "Present", tone: "green" as const }
  if (status === "on_leave") return { label: "On leave", tone: "slate" as const }
  if (status === "scheduled") return { label: "Scheduled", tone: "slate" as const }
  if (status === "absent") return { label: "Absent", tone: "red" as const }
  if (status === "off_day" || status === "weekend") return { label: "Off day", tone: "slate" as const }
  return { label: "Not scheduled", tone: "slate" as const }
}

function AdminDashboard({ data, user }: { data: Extract<DashboardData, { role: "admin" }>; user: SessionUser }) {
  const activeEmployees = data.employees.filter((employee) => employee.status === "active")
  const activeRows = data.attendance.filter((row) => row.status === "active")
  const overviewRows = activeRows.filter((row) => ["present", "absent", "on_leave", "scheduled", "no_show"].includes(row.attendanceStatus))
  const presentRows = activeRows.filter((row) => row.attendanceStatus === "present")
  const lateRows = activeRows.filter((row) => row.isLate)
  const noShowRows = activeRows.filter((row) => row.attendanceStatus === "no_show")
  const missingCheckoutRows = activeRows.filter((row) => row.absenceReason === "missing_checkout")
  const repeatedLateRows = activeRows.filter((row) => row.lateOccurrencesLast30Days >= 3)
  const repeatedEarlyRows = activeRows.filter((row) => row.earlyLeaveOccurrencesLast30Days >= 2)
  const repeatedAbsenceRows = activeRows.filter((row) => row.absenceOccurrencesLast30Days >= 3)
  const pendingLeaves = data.leaves.filter((leave) => leave.status === "pending")
  const attendanceSummary = [
    { label: "Present", count: presentRows.length, color: "bg-[#66875c]" },
    { label: "Absent", count: activeRows.filter((row) => row.attendanceStatus === "absent").length, color: "bg-[#b76a58]" },
    { label: "On leave", count: activeRows.filter((row) => row.attendanceStatus === "on_leave").length, color: "bg-[#c4a459]" },
    { label: "Not come yet", count: noShowRows.length, color: "bg-[#d17a43]" },
    { label: "Scheduled", count: activeRows.filter((row) => row.attendanceStatus === "scheduled").length, color: "bg-[#8c9aab]" },
    { label: "Off day", count: activeRows.filter((row) => ["off_day", "weekend"].includes(row.attendanceStatus)).length, color: "bg-[#c9cec7]" },
    { label: "Not scheduled", count: activeRows.filter((row) => row.attendanceStatus === "not_joined").length, color: "bg-[#e1e5df]" },
  ]
  const scheduledCount = overviewRows.length

  return (
    <>
      <PageHeading eyebrow="Company workspace" title={`${greeting()}, ${user.name.split(" ")[0]}`} description="A clear view of today’s team activity and the actions waiting on you." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Active employees" value={activeEmployees.length} detail="People in your workspace" icon={UsersRound} />
        <StatCard label="Present on shift" value={presentRows.length} detail="Employees checked in for an assigned shift" icon={Check} tone="green" />
        <StatCard label="Late arrivals" value={lateRows.length} detail="Check-ins after allowed grace" icon={Clock3} tone={lateRows.length ? "amber" : "neutral"} />
        <StatCard label="Not come yet" value={noShowRows.length} detail="Shift started without a check-in" icon={AlertTriangle} tone={noShowRows.length ? "amber" : "neutral"} />
        <StatCard label="Leave requests" value={pendingLeaves.length} detail="Waiting for your review" icon={WalletCards} tone={pendingLeaves.length ? "amber" : "neutral"} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <Panel title="Shift attendance" description={`${scheduledCount} employees assigned to a shift or on leave`} href="/dashboard/attendance-monitor" linkLabel="Open monitor">
          <div className="space-y-5 px-5 py-5 sm:px-6">
            <div className="flex h-2 overflow-hidden rounded-full bg-[var(--dashboard-border-soft)]" role="img" aria-label="Attendance distribution">
              {attendanceSummary.map((item) => (
                <div key={item.label} className={item.color} style={{ width: `${activeRows.length ? (item.count / activeRows.length) * 100 : 0}%` }} title={`${item.label}: ${item.count}`} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
              {attendanceSummary.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm text-[var(--dashboard-muted)]">
                  <span className={`size-2 rounded-full ${item.color}`} />
                  <span>{item.label}</span><span className="ml-auto font-semibold text-[var(--dashboard-ink-soft)]">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-[var(--dashboard-border-soft)]">
            {overviewRows.length === 0 ? (
              <EmptyState title="No team activity yet" description="Attendance details will appear here as employees check in." href="/dashboard/employee-list" action="View team" />
            ) : (
              <>
              {overviewRows.slice(0, 5).map((row) => {
                  const display = statusDisplay(row.attendanceStatus)
                return (
                  <div key={row.employeeId} className="flex items-center gap-3 border-b border-[var(--dashboard-border-soft)] px-5 py-3.5 last:border-0 sm:px-6">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#eef2e9] text-xs font-semibold text-[#4c654b]">{initials(row.name)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--dashboard-ink-soft)]">{row.name}</p>
                      <p className="truncate text-xs text-[var(--dashboard-subtle)]">{row.department}{row.shift ? ` · ${row.shift.name}` : ""}</p>
                    </div>
                    <span className="hidden text-xs text-[var(--dashboard-subtle)] sm:block">{formatTime(row.checkInTime)}</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusTag label={display.label} tone={display.tone} />
                        {row.attendanceStatus === "present" && row.isLate && <StatusTag label="Late" tone="amber" />}
                      {row.absenceReason === "missing_checkout" && <StatusTag label="Missing checkout" tone="amber" />}
                    </div>
                  </div>
                )
              })}
              {overviewRows.length > 5 && (
                <p className="px-5 py-3 text-xs text-[var(--dashboard-subtle)] sm:px-6">Showing 5 of {overviewRows.length} scheduled employees</p>
              )}
              </>
            )}
          </div>
        </Panel>

        <Panel title="Needs your attention" description="Attendance patterns from the last 30 days">
          {pendingLeaves.length === 0 && noShowRows.length === 0 && missingCheckoutRows.length === 0 && repeatedLateRows.length === 0 && repeatedEarlyRows.length === 0 && repeatedAbsenceRows.length === 0 ? (
            <EmptyState title="All caught up" description="No repeated attendance patterns or pending actions need review." />
          ) : (
            <div>
              {noShowRows.slice(0, 3).map((row) => (
                <div key={`no-show-${row.employeeId}`} className="flex items-center gap-3 border-b border-[var(--dashboard-border-soft)] px-5 py-4 sm:px-6">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#faeae6] text-[#a34f3d]"><AlertTriangle className="size-4" /></div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-[var(--dashboard-ink-soft)]">{row.name}</p><p className="text-xs text-[var(--dashboard-subtle)]">Shift started, but no check-in has been recorded</p></div>
                  <StatusTag label="Not come yet" tone="amber" />
                </div>
              ))}
              {missingCheckoutRows.slice(0, 3).map((row) => (
                <div key={`checkout-${row.employeeId}`} className="flex items-center gap-3 border-b border-[var(--dashboard-border-soft)] px-5 py-4 sm:px-6">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#f7efdf] text-[#8a6523]"><Clock3 className="size-4" /></div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-[var(--dashboard-ink-soft)]">{row.name}</p><p className="text-xs text-[var(--dashboard-subtle)]">Normal checkout deadline passed; checkout is closed</p></div>
                  <StatusTag label="Absent" tone="red" />
                </div>
              ))}
              {repeatedLateRows.slice(0, 3).map((row) => (
                <div key={`repeat-late-${row.employeeId}`} className="flex items-center gap-3 border-b border-[var(--dashboard-border-soft)] px-5 py-4 sm:px-6">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#f7efdf] text-[#8a6523]"><Clock3 className="size-4" /></div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-[var(--dashboard-ink-soft)]">{row.name}</p><p className="text-xs text-[var(--dashboard-subtle)]">{row.lateOccurrencesLast30Days} late arrivals in the last 30 days</p></div>
                  <StatusTag label="Review pattern" tone="amber" />
                </div>
              ))}
              {repeatedAbsenceRows.slice(0, 3).map((row) => (
                <div key={`repeat-absence-${row.employeeId}`} className="flex items-center gap-3 border-b border-[var(--dashboard-border-soft)] px-5 py-4 sm:px-6">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#faeae6] text-[#a34f3d]"><AlertTriangle className="size-4" /></div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-[var(--dashboard-ink-soft)]">{row.name}</p><p className="text-xs text-[var(--dashboard-subtle)]">{row.absenceOccurrencesLast30Days} absent shifts in the last 30 days</p></div>
                  <StatusTag label="Review attendance" tone="red" />
                </div>
              ))}
              {repeatedEarlyRows.slice(0, 3).map((row) => (
                <div key={`repeat-early-${row.employeeId}`} className="flex items-center gap-3 border-b border-[var(--dashboard-border-soft)] px-5 py-4 sm:px-6">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#f7efdf] text-[#8a6523]"><Clock3 className="size-4" /></div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-[var(--dashboard-ink-soft)]">{row.name}</p><p className="text-xs text-[var(--dashboard-subtle)]">Left early {row.earlyLeaveOccurrencesLast30Days} times in the last 30 days</p></div>
                  <StatusTag label="Review pattern" tone="amber" />
                </div>
              ))}
              {pendingLeaves.slice(0, 4).map((leave) => (
                <div key={leave.id} className="flex items-center gap-3 border-b border-[var(--dashboard-border-soft)] px-5 py-4 last:border-0 sm:px-6">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#f7efdf] text-[#8a6523]"><CalendarDays className="size-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--dashboard-ink-soft)]">{leave.employeeName}</p>
                    <p className="text-xs text-[var(--dashboard-subtle)]">{leave.leaveType} · {formatDate(leave.startDate)}–{formatDate(leave.endDate)}</p>
                  </div>
                  <StatusTag label="Review" tone="amber" />
                </div>
              ))}
              {pendingLeaves.length > 0 && (
                <div className="border-t border-[var(--dashboard-border-soft)] px-5 py-4 sm:px-6">
                  <Link href="/dashboard/leaves" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--dashboard-green)] px-4 text-sm font-medium text-white transition hover:bg-[var(--dashboard-green-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#779c61] focus-visible:ring-offset-2">
                    Review requests<ArrowRight className="size-4" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <QuickAction href="/dashboard/employees" icon={UsersRound} title="Add an employee" description="Create an account and assign a schedule" />
        <QuickAction href="/dashboard/shifts" icon={CalendarPlus2} title="Manage shifts" description="Update team hours and company rules" />
        <QuickAction href="/dashboard/reports" icon={FileBarChart2} title="View reports" description="Review attendance trends and export CSV" />
      </div>
    </>
  )
}

function SuperAdminDashboard({ data, user }: { data: Extract<DashboardData, { role: "super_admin" }>; user: SessionUser }) {
  const pendingCompanies = data.companies.filter((company) => company.approvalStatus === "pending")
  const approvedCompanies = data.companies.filter((company) => company.approvalStatus === "approved")
  const activeEmployees = data.employees.filter((employee) => employee.status === "active")

  return (
    <>
      <PageHeading eyebrow="Platform control" title={`${greeting()}, ${user.name.split(" ")[0]}`} description="Monitor workspace onboarding and platform-wide workforce activity." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Pending approvals" value={pendingCompanies.length} detail="Company workspaces awaiting review" icon={ShieldCheck} tone={pendingCompanies.length ? "amber" : "green"} />
        <StatCard label="Approved workspaces" value={approvedCompanies.length} detail={`${data.companies.length} total companies`} icon={Building2} tone="green" />
        <StatCard label="Active employees" value={activeEmployees.length} detail="Across all company workspaces" icon={UsersRound} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Approval queue" description="Review newly requested company workspaces" href="/dashboard/platform/requests" linkLabel="Open queue">
          {pendingCompanies.length === 0 ? (
            <EmptyState title="No approvals waiting" description="New company signup requests will appear here." />
          ) : (
            <div>
              {pendingCompanies.slice(0, 5).map((company) => (
                <div key={company.companyId} className="flex flex-col gap-3 border-b border-[var(--dashboard-border-soft)] px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:px-6">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#edf2e8] text-[#49664a]"><Building2 className="size-[18px]" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--dashboard-ink-soft)]">{company.name}</p>
                    <p className="truncate text-xs text-[var(--dashboard-subtle)]">{company.domain} · Requested {formatDate(company.createdAt)}</p>
                  </div>
                  <Link href={`/dashboard/platform/companies/${company.companyId}`} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg border border-[#dfe5db] px-3 text-sm font-medium text-[#3d5940] transition hover:bg-[#f4f7f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#779c61] sm:self-auto">
                    Review<ArrowUpRight className="size-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Platform overview" description="At a glance across your workspaces">
          <div className="divide-y divide-[var(--dashboard-border-soft)]">
            <OverviewRow label="Company workspaces" value={data.companies.length} href="/dashboard/platform/companies" />
            <OverviewRow label="Pending company requests" value={pendingCompanies.length} href="/dashboard/platform/requests" />
            <OverviewRow label="Employee accounts" value={data.employees.length} href="/dashboard/platform/employees" />
            <OverviewRow label="Active employee accounts" value={activeEmployees.length} href="/dashboard/platform/employees" />
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <QuickAction href="/dashboard/platform/requests" icon={ShieldCheck} title="Review requests" description="Approve or reject workspaces" />
        <QuickAction href="/dashboard/platform/companies" icon={Building2} title="Manage companies" description="Inspect company status and admins" />
        <QuickAction href="/dashboard/platform/employees" icon={UsersRound} title="Browse employees" description="Manage accounts across the platform" />
      </div>
    </>
  )
}

function EmployeeDashboard({ data, user }: { data: Extract<DashboardData, { role: "employee" }>; user: SessionUser }) {
  const currentDate = getLocalDateInput()
  const currentMonth = currentDate.slice(0, 7)
  const monthRecords = data.history.filter((record) => record.date.startsWith(currentMonth))
  const presentCount = monthRecords.filter((record) => record.status === "present").length
  const hoursThisMonth = monthRecords.reduce((sum, record) => sum + (record.hoursWorked || 0), 0)
  const pendingLeaves = data.leaves.filter((leave) => leave.status === "pending")
  const record = data.attendance.record
  const noCheckInState = data.shift.shift
    ? getNoCheckInShiftStatus({
        currentDateInput: currentDate,
        currentMinutes: getLocalTimeMinutes(),
        recordDateInput: record?.date || currentDate,
        startMinutes: getTimeStringMinutes(data.shift.shift.startTime),
        endMinutes: getTimeStringMinutes(data.shift.shift.endTime),
      })
    : null
  const isNoShow = noCheckInState === "no_show" && !record
  const isScheduled = noCheckInState === "scheduled" && !record
  const nextAction = isNoShow ? "Not come yet" : isScheduled ? "Scheduled" : record?.breakStartTime && !record.breakEndTime
    ? "You’re on break"
    : record?.status === "absent" && record.absenceReason === "missing_checkout"
    ? "Absent · checkout missing"
    : record?.breakStartTime && !record.breakEndTime
    ? "Your shift clock is still running. Return to Attendance to end your break before checking out."
    : data.attendance.isCheckedIn
    ? "You’re checked in"
    : record?.status === "on_leave"
      ? "You’re on approved leave"
      : record?.status === "absent"
        ? "Marked absent"
        : record?.checkoutWindowExpired
          ? "Checkout window expired"
        : record?.checkOutTime
          ? "Shift completed"
          : "Ready to start your day?"
  const actionDescription = isNoShow
    ? "You can still check in before your shift ends. Add a reason for the late arrival."
    : record?.status === "absent" && record.absenceReason === "missing_checkout"
    ? "No checkout was recorded by your normal checkout deadline. This shift is absent and checkout is closed."
    : data.attendance.isCheckedIn
    ? `Checked in at ${formatTime(record?.checkInTime)}. Remember to check out when your shift ends.`
    : record?.status === "on_leave"
      ? "Your approved leave is recorded for today. You don’t need to check in."
      : record?.status === "absent"
        ? "Today’s shift was marked absent because no check-in was recorded. Contact your admin if you think this is incorrect."
        : record?.checkoutWindowExpired
          ? "Your normal checkout deadline passed. The system recorded zero hours for this shift."
        : record?.checkOutTime
          ? `You checked out at ${formatTime(record.checkOutTime)}. Your attendance is saved for today.`
          : data.shift.shift
      ? `${data.shift.shift.name} · ${formatShiftTime(data.shift.shift.startTime)}–${formatShiftTime(data.shift.shift.endTime)}`
      : data.shift.user.hasShiftAssigned
        ? "Your schedule is ready for today. Open attendance to see your next action."
        : "You don’t have a shift scheduled for today. Check your monthly schedule or contact your admin."
  const actionHref = record?.status === "on_leave" ? "/dashboard/leaves" : record?.status === "absent" || record?.checkoutWindowExpired || record?.checkOutTime ? "/dashboard/history" : "/dashboard/attendance"
  const actionLabel = record?.status === "on_leave"
    ? "View leave request"
    : record?.status === "absent" || record?.checkoutWindowExpired || record?.checkOutTime
      ? "View attendance history"
      : "Open attendance"
  const todayDisplay = isNoShow
    ? statusDisplay("no_show")
    : isScheduled
      ? statusDisplay("scheduled")
    : record?.breakStartTime && !record.breakEndTime
      ? { label: "On break", tone: "amber" as const }
      : record ? statusDisplay(record.status) : null

  return (
    <>
      <PageHeading eyebrow="Your workspace" title={`${greeting()}, ${user.name.split(" ")[0]}`} description="Your schedule, attendance, and time off in one place." />

      <section className="overflow-hidden rounded-[24px] bg-[var(--dashboard-green)] text-white shadow-[0_12px_36px_rgba(26,49,33,0.12)]">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:p-9">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.17em] text-[#c4d9b6]">Today’s attendance</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{nextAction}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#d4ded4]">{actionDescription}</p>
              {todayDisplay && <div className="mt-4 flex flex-wrap gap-2"><StatusTag label={todayDisplay.label} tone={todayDisplay.tone} />{record?.status === "present" && record.isLate && <StatusTag label="Late" tone="amber" />}</div>}
          </div>
          <Link href={actionHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--dashboard-accent)] px-5 text-sm font-semibold text-[#263b2c] transition hover:bg-[#e4f3d1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#21372a]">
            {actionLabel}<ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid border-t border-white/10 sm:grid-cols-3">
          <div className="flex items-center gap-3 px-6 py-4 sm:px-8">
            <Clock3 className="size-4 text-[#c4d9b6]" />
            <div><p className="text-xs text-[#c0cdc1]">Shift</p><p className="mt-0.5 text-sm font-medium">{data.shift.shift?.name || (data.shift.user.hasShiftAssigned ? "Scheduled" : "No shift today")}</p></div>
          </div>
          <div className="flex items-center gap-3 border-t border-white/10 px-6 py-4 sm:border-l sm:border-t-0 sm:px-8">
            <CalendarDays className="size-4 text-[#c4d9b6]" />
            <div><p className="text-xs text-[#c0cdc1]">Schedule</p><p className="mt-0.5 text-sm font-medium">{data.shift.user.scheduleMode === "custom_monthly" ? "Custom monthly" : "Company working days"}</p></div>
          </div>
          <div className="flex items-center gap-3 border-t border-white/10 px-6 py-4 sm:border-l sm:border-t-0 sm:px-8">
            <WalletCards className="size-4 text-[#c4d9b6]" />
            <div><p className="text-xs text-[#c0cdc1]">Leave requests</p><p className="mt-0.5 text-sm font-medium">{pendingLeaves.length} awaiting review</p></div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Present this month" value={presentCount} detail={`${monthRecords.length} attendance records`} icon={Check} tone="green" />
        <StatCard label="Hours recorded" value={hoursThisMonth.toFixed(1)} detail="Across this month’s attendance" icon={Clock3} />
        <StatCard label="Pending leave" value={pendingLeaves.length} detail="Requests waiting for admin review" icon={WalletCards} tone={pendingLeaves.length ? "amber" : "neutral"} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Recent attendance" description="Your latest recorded shifts" href="/dashboard/history" linkLabel="Full history">
          {data.history.length === 0 ? (
            <EmptyState title="No attendance yet" description="Your attendance entries will appear here after your first check-in." href="/dashboard/attendance" action="Go to attendance" />
          ) : (
            data.history.slice(0, 5).map((item) => {
                const display = statusDisplay(item.status)
              return (
                <div key={item.id} className="flex items-center gap-3 border-b border-[var(--dashboard-border-soft)] px-5 py-4 last:border-0 sm:px-6">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#f2f4ef] text-[#69776c]"><CalendarDays className="size-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--dashboard-ink-soft)]">{formatDate(item.date)}</p>
                    <p className="mt-0.5 text-xs text-[var(--dashboard-subtle)]">In {formatTime(item.checkInTime)} · Out {formatTime(item.checkOutTime)}</p>
                  </div>
                  <StatusTag label={display.label} tone={display.tone} />
                    {item.status === "present" && item.isLate && <StatusTag label="Late" tone="amber" />}
                </div>
              )
            })
          )}
        </Panel>

        <Panel title="Your next steps" description="Quick links to your everyday tasks">
          <div className="divide-y divide-[var(--dashboard-border-soft)]">
            <NextStep href="/dashboard/attendance" icon={Clock3} title="Check today’s attendance" description="See your shift and attendance action" />
            <NextStep href="/dashboard/leaves" icon={CalendarDays} title="Request time off" description="Submit a leave request for a future date" />
            <NextStep href="/dashboard/history" icon={History} title="Review your history" description="See previous check-ins and hours" />
          </div>
        </Panel>
      </div>
    </>
  )
}

function QuickAction({ href, icon: Icon, title, description }: { href: string; icon: LucideIcon; title: string; description: string }) {
  return (
    <Link href={href} className="group flex min-h-[92px] items-center gap-4 rounded-2xl border border-[var(--dashboard-border)] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#cbd6c4] hover:shadow-[0_8px_24px_rgba(28,42,32,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#779c61]">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#edf2e8] text-[#49664a]"><Icon className="size-[18px]" aria-hidden="true" /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[var(--dashboard-ink-soft)]">{title}</span><span className="mt-1 block text-xs leading-5 text-[var(--dashboard-subtle)]">{description}</span></span>
      <ArrowUpRight className="size-4 shrink-0 text-[#8c968e] transition group-hover:text-[var(--dashboard-green-text)]" aria-hidden="true" />
    </Link>
  )
}

function OverviewRow({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="flex min-h-14 items-center gap-3 px-5 transition hover:bg-[#fafbf9] sm:px-6">
      <span className="flex-1 text-sm text-[var(--dashboard-muted)]">{label}</span><span className="text-sm font-semibold text-[var(--dashboard-ink-soft)]">{value}</span><ArrowUpRight className="size-4 text-[#9aa39c]" />
    </Link>
  )
}

function NextStep({ href, icon: Icon, title, description }: { href: string; icon: LucideIcon; title: string; description: string }) {
  return (
    <Link href={href} className="group flex min-h-[76px] items-center gap-3 px-5 py-3 transition hover:bg-[#fafbf9] sm:px-6">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#f2f4ef] text-[#69776c]"><Icon className="size-4" aria-hidden="true" /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-[var(--dashboard-ink-soft)]">{title}</span><span className="mt-0.5 block truncate text-xs text-[var(--dashboard-subtle)]">{description}</span></span>
      <ArrowRight className="size-4 text-[#9aa39c] transition group-hover:translate-x-0.5 group-hover:text-[var(--dashboard-green-text)]" aria-hidden="true" />
    </Link>
  )
}

export default function RoleDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const storedUser = getStoredUser()
    if (!storedUser) {
      router.replace("/login")
      return
    }
    setUser(storedUser)
  }, [router])

  useEffect(() => {
    if (!user) return
    const activeUser = user
    let cancelled = false

    async function loadDashboard(showLoader = true) {
      if (showLoader) setIsLoading(true)
      if (showLoader) setError("")
      try {
        let result: DashboardData
        if (activeUser.role === "admin") {
          const [employees, attendance, leaves] = await Promise.all([
            fetchJson<Employee[]>("/api/employees"),
            fetchJson<{ rows: AttendanceRow[] }>(`/api/attendance/admin?date=${getLocalDateInput()}&nowDate=${getLocalDateInput()}&nowMinutes=${getLocalTimeMinutes()}&shiftView=current`),
            fetchJson<LeaveRequest[]>("/api/leaves?status=pending"),
          ])
          result = { role: "admin", employees, attendance: attendance.rows, leaves }
        } else if (activeUser.role === "super_admin") {
          const [companies, employees] = await Promise.all([
            fetchJson<Company[]>("/api/super-admin/companies"),
            fetchJson<PlatformEmployee[]>("/api/super-admin/employees"),
          ])
          result = { role: "super_admin", companies, employees }
        } else {
          const [attendance, shift, history, leaves] = await Promise.all([
            fetchJson<TodayAttendance>(`/api/attendance/today?userId=${encodeURIComponent(activeUser.id)}`),
            fetchJson<ShiftSummary>(`/api/employees/shift?userId=${encodeURIComponent(activeUser.id)}`),
            fetchJson<AttendanceRecord[]>(`/api/attendance/history?userId=${encodeURIComponent(activeUser.id)}`),
            fetchJson<LeaveRequest[]>(`/api/leaves?userId=${encodeURIComponent(activeUser.id)}`),
          ])
          result = { role: "employee", attendance, shift, history, leaves }
        }

        if (!cancelled) setData(result)
      } catch (loadError) {
        if (!cancelled && showLoader) setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadDashboard()
    const refreshInterval = setInterval(() => loadDashboard(false), 30000)
    return () => {
      cancelled = true
      clearInterval(refreshInterval)
    }
  }, [user, retryKey])

  if (!user || isLoading) {
    return (
      <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 h-7 w-40 animate-pulse rounded bg-[#e7eae3]" />
          <div className="mb-8 h-12 w-72 max-w-full animate-pulse rounded bg-[#e7eae3]" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl border border-[var(--dashboard-border)] bg-white" />)}
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-2"><div className="h-80 animate-pulse rounded-2xl border border-[var(--dashboard-border)] bg-white" /><div className="h-80 animate-pulse rounded-2xl border border-[var(--dashboard-border)] bg-white" /></div>
        </div>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--dashboard-border)] bg-white p-8 text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-[#f8f0df] text-[#8b6726]"><RefreshCw className="size-5" /></div>
          <h1 className="mt-4 text-xl font-semibold text-[#202a24]">Dashboard could not load</h1>
          <p className="mt-2 text-sm text-[var(--dashboard-muted)]">{error || "There was a problem loading your workspace data."}</p>
          <button type="button" onClick={() => setRetryKey((value) => value + 1)} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--dashboard-green)] px-4 text-sm font-medium text-white transition hover:bg-[var(--dashboard-green-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#779c61] focus-visible:ring-offset-2">
            <RefreshCw className="size-4" />Try again
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 py-7 sm:px-6 sm:py-9 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-7xl">
        {data.role === "admin" && <AdminDashboard data={data} user={user} />}
        {data.role === "super_admin" && <SuperAdminDashboard data={data} user={user} />}
        {data.role === "employee" && <EmployeeDashboard data={data} user={user} />}
      </div>
    </main>
  )
}
