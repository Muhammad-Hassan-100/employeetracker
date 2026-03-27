import Link from "next/link"
import { ArrowRight, BarChart3, BriefcaseBusiness, CalendarClock, CheckCircle2, ShieldCheck, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const features = [
  {
    icon: Users,
    title: "Multi-company workspace",
    description: "Each company gets its own isolated workspace with dedicated admins and employees.",
  },
  {
    icon: CalendarClock,
    title: "Shift-based attendance",
    description: "Check-in and check-out follow shift timing with built-in late and early departure logic.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Admin operations",
    description: "Employee CRUD, shift assignment, leave approval, reporting, and live team visibility.",
  },
  {
    icon: BarChart3,
    title: "Operational reporting",
    description: "Attendance rates, late arrivals, leave counts, and export-ready summaries.",
  },
]

const steps = [
  "A company admin creates a dedicated workspace.",
  "The admin builds shifts and assigns employees to them.",
  "Employees sign in to manage attendance and submit future leave requests.",
  "Approvals and records stay updated across the dashboard.",
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f4f7f3] text-slate-950">
      <div className="absolute inset-x-0 top-0 -z-10 h-[540px] bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.20),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.18),_transparent_28%),linear-gradient(180deg,_#ecfdf5_0%,_#f4f7f3_72%)]" />

      <header className="container px-4 py-4 sm:px-6 sm:py-6">
        <nav className="flex flex-col gap-4 rounded-[28px] border border-slate-200/70 bg-white/85 px-4 py-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:rounded-full sm:px-5 sm:py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-2xl bg-slate-950 p-2 text-white">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">EmployeeTracker Pro</p>
              <p className="text-xs text-slate-500">Attendance and workforce control</p>
            </div>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
            <Link href="/login" className="w-full sm:w-auto">
              <Button variant="ghost" className="w-full rounded-full">
                Login
              </Button>
            </Link>
            <Link href="/login?mode=signup" className="w-full sm:w-auto">
              <Button className="w-full rounded-full bg-slate-950 text-white hover:bg-slate-800">
                Create Company
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="container px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
        <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
              <ShieldCheck className="h-4 w-4" />
              <span className="truncate">Company-level admin and employee management</span>
            </div>
            <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Professional employee management system for modern teams.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              One system handles company signup, admin controls, employee records, shift-based attendance,
              future leave approvals, and real-time dashboard updates.
            </p>
            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-4">
              <Link href="/login?mode=signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full rounded-full bg-slate-950 px-7 text-white hover:bg-slate-800">
                  Start Your Workspace
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full rounded-full border-slate-300 bg-white px-7">
                  Sign In
                </Button>
              </Link>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {steps.map((step) => (
                <div key={step} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                  <p className="text-sm text-slate-700">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <Card className="overflow-hidden rounded-[28px] border-0 bg-slate-950 text-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
            <CardContent className="space-y-6 p-5 sm:p-7">
              <div className="rounded-[24px] bg-white/10 p-5 backdrop-blur sm:p-6">
                <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">Core Modules</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {features.map((feature) => {
                    const Icon = feature.icon
                    return (
                      <div key={feature.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                          <Icon className="h-5 w-5 text-emerald-300" />
                        </div>
                        <h2 className="font-semibold">{feature.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{feature.description}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="grid gap-4 rounded-[24px] bg-gradient-to-r from-emerald-400 to-amber-300 p-5 text-slate-950 sm:grid-cols-3">
                <div>
                  <p className="text-3xl font-extrabold">100%</p>
                  <p className="text-sm font-medium">Company scoped data</p>
                </div>
                <div>
                  <p className="text-3xl font-extrabold">Live</p>
                  <p className="text-sm font-medium">Live team visibility</p>
                </div>
                <div>
                  <p className="text-3xl font-extrabold">Shift</p>
                  <p className="text-sm font-medium">Attendance-first operations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}
