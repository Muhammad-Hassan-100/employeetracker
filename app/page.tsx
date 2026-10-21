import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
} from "lucide-react"
import BrandMark from "@/components/brand-mark"

const questions = [
  {
    question: "Who is EmployeeTracker for?",
    answer: "It is for organizations that need a shared place to manage employee profiles, shifts, attendance, leave requests, and reports.",
  },
  {
    question: "Can employees and administrators see different things?",
    answer: "Yes. Administrators manage their company workspace and review team information. Employees use their own account for attendance, leave requests, and personal history.",
  },
  {
    question: "How does attendance work with shifts?",
    answer: "Employees check in and out against their assigned shift. The workspace records late arrivals, breaks, absence states, and attendance history based on the configured schedule.",
  },
  {
    question: "Can employees have a custom schedule?",
    answer: "Yes. An administrator can assign a company schedule or a custom monthly schedule to an employee.",
  },
]

function AttendancePreview() {
  const rows = [
    { label: "Checked in", detail: "Attendance recorded", tone: "bg-[#dfeee4] text-[#477653]" },
    { label: "Late arrival", detail: "Reason attached", tone: "bg-[#f8ecd9] text-[#9a6b28]" },
    { label: "Not come yet", detail: "Shift is in progress", tone: "bg-[#edf0ec] text-[#718075]" },
  ]

  return (
    <div className="relative mx-auto max-w-[1050px] px-4 sm:px-8">
      <div className="overflow-hidden rounded-[18px] border border-[#e5e9e2] bg-white shadow-[0_32px_90px_rgba(31,49,36,0.13)] sm:rounded-[24px]">
        <div className="flex h-12 items-center justify-between border-b border-[#edf0ec] px-4 sm:h-14 sm:px-6">
          <div className="flex items-center gap-2.5">
            <BrandMark size={28} />
            <span className="text-[11px] font-semibold text-[#34463a] sm:text-xs">EmployeeTracker</span>
          </div>
          <div className="hidden items-center gap-5 text-[10px] text-[#839087] sm:flex"><span>Overview</span><span className="font-medium text-[#36553d]">Attendance</span><span>Team</span><span>Reports</span></div>
          <span className="h-7 w-7 rounded-full bg-[#e9eee6]" aria-label="Profile" />
        </div>
        <div className="grid min-h-[260px] sm:grid-cols-[0.78fr_1.22fr] sm:min-h-[320px]">
          <div className="border-b border-[#edf0ec] p-5 sm:border-b-0 sm:border-r sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#8a968c]">Team overview</p><h3 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-[#24372a] sm:text-xl">Attendance today</h3></div>
              <span className="rounded-full border border-[#e6ebe4] px-2.5 py-1 text-[9px] font-medium text-[#6f7c70] sm:text-[10px]">Preview</span>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
              {[{ value: "Present", tone: "text-[#4e7856]" }, { value: "Late", tone: "text-[#a17535]" }, { value: "Absent", tone: "text-[#b56c5c]" }].map((item) => (
                <div key={item.value} className="rounded-xl bg-[#f7f8f5] px-2.5 py-3 sm:px-3.5"><span className={`block text-[11px] font-semibold sm:text-xs ${item.tone}`}>{item.value}</span><span className="mt-2 block h-1 w-full rounded-full bg-[#e8ece6]" /></div>
              ))}
            </div>
            <div className="mt-5 rounded-xl bg-[#f5f7f3] p-3.5 sm:mt-6 sm:p-4">
              <div className="flex items-center justify-between text-[10px] text-[#6f7d71]"><span>Shift activity</span><span>Today</span></div>
              <div className="mt-3 flex h-10 items-end gap-1.5" aria-hidden="true">{[35, 48, 42, 66, 52, 82, 61, 72, 45, 88, 60, 76, 54, 68, 43, 57, 78, 52, 64, 40, 55, 74, 47, 62].map((height, i) => <span key={i} style={{ height: `${height}%` }} className={`flex-1 rounded-t-[3px] ${i > 15 ? "bg-[#c8d6bf]" : "bg-[#718c6d]"}`} />)}</div>
            </div>
          </div>
          <div className="p-4 sm:p-7">
            <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#8a968c]">Shift activity</p><h3 className="mt-1.5 text-sm font-semibold text-[#314237] sm:text-base">Today at a glance</h3></div><span className="rounded-lg border border-[#e6ebe4] px-2.5 py-1.5 text-[9px] text-[#718075] sm:text-[10px]">All shifts</span></div>
            <div className="mt-4 space-y-2 sm:mt-5 sm:space-y-2.5">
              {rows.map((row) => <div key={row.label} className="flex items-center justify-between gap-2 rounded-xl border border-[#edf0ec] px-3 py-2.5 sm:px-4 sm:py-3"><div className="flex min-w-0 items-center gap-2.5"><span className={`h-2 w-2 shrink-0 rounded-full ${row.tone.split(" ")[0]}`} /><div className="min-w-0"><p className="truncate text-[10px] font-medium text-[#35463a] sm:text-xs">{row.label}</p><p className="mt-0.5 truncate text-[9px] text-[#96a097] sm:text-[10px]">{row.detail}</p></div></div><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-medium sm:px-2.5 sm:text-[10px] ${row.tone}`}>{row.label}</span></div>)}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-[#edf0ec] pt-3 text-[9px] text-[#9aa39b] sm:mt-5 sm:text-[10px]"><span>Attendance updates as team members check in</span><span className="hidden sm:inline">Open monitor →</span></div>
          </div>
        </div>
      </div>
      <span className="pointer-events-none absolute -right-1 top-10 -z-10 h-40 w-40 rounded-full bg-[#dce6d5] blur-3xl sm:right-0 sm:top-20 sm:h-56 sm:w-56" />
    </div>
  )
}

function SchedulePreview() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
  return (
    <div className="rounded-2xl border border-[#e7ebe5] bg-white p-4 shadow-[0_18px_55px_rgba(30,48,36,0.07)] sm:p-5">
      <div className="flex items-center justify-between border-b border-[#edf0ec] pb-4"><div><p className="text-[9px] font-medium uppercase tracking-[0.16em] text-[#8b978c]">Schedules</p><p className="mt-1 text-sm font-semibold text-[#334439]">Team shifts</p></div><CalendarDays className="h-4 w-4 text-[#81947b]" /></div>
      <div className="mt-4 grid grid-cols-[72px_repeat(5,minmax(0,1fr))] gap-1.5 sm:grid-cols-[84px_repeat(5,minmax(0,1fr))] sm:gap-2">
        <span />{days.map((day) => <span key={day} className="pb-1 text-center text-[9px] font-medium text-[#89958a]">{day}</span>)}
        {["Morning", "Afternoon", "Evening"].map((shift, row) => <div key={shift} className="contents"><span className="self-center text-[9px] text-[#7e8b80]">{shift}</span>{days.map((day, col) => <span key={`${day}-${shift}`} className={`h-9 rounded-md sm:h-10 ${((row + col) % 4 === 0 || (row === 1 && col === 3)) ? "bg-[#e7eee3]" : "bg-[#f6f7f4]"}`} />)}</div>)}
      </div>
      <div className="mt-4 flex gap-4 border-t border-[#edf0ec] pt-3 text-[9px] text-[#879288]"><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-[#b8c9b0]" /> Assigned shift</span><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-[#edf0ec]" /> Day off</span></div>
    </div>
  )
}

function LeavePreview() {
  return (
    <div className="rounded-2xl border border-[#e7ebe5] bg-white p-4 shadow-[0_18px_55px_rgba(30,48,36,0.07)] sm:p-5">
      <div className="flex items-center justify-between border-b border-[#edf0ec] pb-4"><div><p className="text-[9px] font-medium uppercase tracking-[0.16em] text-[#8b978c]">Leave queue</p><p className="mt-1 text-sm font-semibold text-[#334439]">Requests to review</p></div><CalendarDays className="h-4 w-4 text-[#81947b]" /></div>
      <div className="mt-4 space-y-2.5">
        {["Annual leave", "Personal leave"].map((item) => <div key={item} className="flex items-center justify-between gap-2 rounded-xl border border-[#edf0ec] p-3"><div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eef2ea] text-[9px] font-semibold text-[#536c52]">TM</span><div><p className="text-[10px] font-medium text-[#3a4b3e]">Team member</p><p className="mt-0.5 text-[9px] text-[#939e94]">{item} · Date range</p></div></div><span className="rounded-full bg-[#f7eedf] px-2 py-1 text-[9px] font-medium text-[#9a713b]">Pending</span></div>)}
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-[#edf0ec] pt-3 text-[9px] text-[#879288]"><Check className="h-3.5 w-3.5 text-[#6d8967]" /> Decisions stay visible to the employee</div>
    </div>
  )
}

function ReportsPreview() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#202c24] p-4 sm:p-5">
      <div className="flex items-start justify-between"><div><p className="text-[9px] font-medium uppercase tracking-[0.16em] text-[#a7b5a5]">Reports</p><p className="mt-1 text-sm font-semibold text-white">Attendance trends</p></div><BarChart3 className="h-4 w-4 text-[#c6d5b8]" /></div>
      <div className="mt-5 flex h-28 items-end gap-2 border-b border-white/10 px-1 sm:h-36 sm:gap-3" aria-hidden="true">{[32, 48, 41, 60, 54, 73, 64, 82, 70, 91, 77, 88].map((height, index) => <span key={index} style={{ height: `${height}%` }} className={`flex-1 rounded-t-[4px] ${index % 3 === 0 ? "bg-[#b4c6a5]" : "bg-[#6e886c]"}`} />)}</div>
      <div className="mt-3 flex justify-between text-[9px] text-[#a5b0a4]"><span>Attendance summary</span><span>Export CSV</span></div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <main className="overflow-hidden bg-[#fbfcfa] text-[#202d23]">
      <header className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-5 sm:px-8 sm:py-6 lg:px-12">
        <Link href="/" aria-label="EmployeeTracker home" className="inline-flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#496b4f] focus-visible:ring-offset-4">
          <BrandMark size={36} />
          <span className="text-[15px] font-semibold tracking-[-0.035em]">EmployeeTracker</span>
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-[13px] text-[#69756b] transition hover:text-[#20392b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#496b4f]">Platform</a>
          <a href="#how-it-works" className="text-[13px] text-[#69756b] transition hover:text-[#20392b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#496b4f]">How it works</a>
          <a href="#questions" className="text-[13px] text-[#69756b] transition hover:text-[#20392b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#496b4f]">Questions</a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="hidden min-h-11 items-center rounded-full px-3 text-[13px] font-medium text-[#455349] transition hover:bg-[#f0f3ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#496b4f] sm:inline-flex">Log in</Link>
          <Link href="/signup" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#213a2b] px-4 text-[13px] font-medium text-white transition hover:bg-[#304d38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#496b4f] focus-visible:ring-offset-2 sm:px-5">Get started <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
      </header>

      <section className="px-5 pb-12 pt-12 sm:px-8 sm:pb-16 sm:pt-16 lg:pt-20">
        <div className="mx-auto max-w-[820px] text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[#e6ebe3] bg-white px-3 py-1.5 text-[10px] font-medium tracking-wide text-[#61735f] shadow-sm"><span className="h-1.5 w-1.5 rounded-full bg-[#8da27e]" /> People operations, made clear</div>
          <h1 className="mx-auto max-w-[780px] text-[clamp(2.8rem,6.4vw,5.25rem)] font-medium leading-[1.02] tracking-[-0.065em] text-[#20392b]">A better rhythm for your workday.</h1>
          <p className="mx-auto mt-5 max-w-[560px] text-[15px] leading-7 text-[#6b776d] sm:text-base">People, shifts, attendance, and time off - together in one simple workspace.</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full bg-[#213a2b] px-6 text-sm font-medium text-white transition hover:bg-[#304d38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#496b4f] focus-visible:ring-offset-2">Create your workspace <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#e2e8df] bg-white px-5 text-sm font-medium text-[#435448] transition hover:bg-[#f4f6f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#496b4f]">Sign in</Link>
          </div>
          <p className="mt-4 text-[10px] text-[#98a098]">For administrators and employees</p>
        </div>
        <div className="mt-12 sm:mt-16"><AttendancePreview /></div>
      </section>

      <section id="features" className="scroll-mt-8 border-y border-[#e8ebe6] bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-[1120px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-4 sm:grid-cols-[0.9fr_1.1fr] sm:items-end">
            <div><p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#788a74]">One connected workspace</p><h2 className="mt-3 max-w-md text-3xl font-medium leading-tight tracking-[-0.05em] text-[#20392b] sm:text-4xl">The everyday essentials, working together.</h2></div>
            <p className="max-w-[480px] text-sm leading-6 text-[#758077] sm:justify-self-end">Keep the practical details in sync, from the first shift assignment to the end-of-month report.</p>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-2 md:gap-5">
            <SchedulePreview />
            <LeavePreview />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-8 mx-auto grid max-w-[1120px] gap-10 px-5 py-16 sm:px-8 sm:py-20 md:grid-cols-[0.9fr_1.1fr] md:items-center lg:px-12 lg:py-24">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#788a74]">Made for the real workday</p>
          <h2 className="mt-3 max-w-md text-3xl font-medium leading-tight tracking-[-0.05em] text-[#20392b] sm:text-4xl">Keep the whole team on the same page.</h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-[#758077]">Give administrators a clear view of team activity and employees a straightforward way to manage their own workday.</p>
          <ul className="mt-6 space-y-3 text-[13px] text-[#58675b]">
            {["Role-specific views for admins and employees", "Company-wide or custom monthly schedules", "Attendance history and exportable reports"].map((item) => <li key={item} className="flex items-start gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#6c8969]" />{item}</li>)}
          </ul>
          <Link href="/signup" className="mt-7 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#36543b] transition hover:text-[#20392b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#496b4f]">Explore EmployeeTracker <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="relative">
          <div className="absolute -inset-5 -z-10 rounded-[32px] bg-[#eef2eb]" />
          <Image src="/workforce-team.png" alt="Coworkers planning their day together" width={1536} height={1024} sizes="(max-width: 768px) 100vw, 50vw" className="aspect-[1.35/1] w-full rounded-[22px] object-cover object-center shadow-[0_24px_60px_rgba(35,52,39,0.1)] sm:rounded-[28px]" />
          <div className="absolute bottom-3 left-3 rounded-xl border border-white/60 bg-white/90 px-3.5 py-3 shadow-lg backdrop-blur sm:bottom-5 sm:left-5 sm:px-4">
            <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-[#849087]">A shared view</p><p className="mt-1 text-xs font-semibold text-[#34463a]">Every shift, a little clearer.</p>
          </div>
        </div>
      </section>

      <section className="bg-[#17231b] py-16 text-white sm:py-20 lg:py-24">
        <div className="mx-auto max-w-[1120px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-8 md:grid-cols-[0.85fr_1.15fr] md:items-center md:gap-14">
            <div><p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#b5c5a9]">Useful visibility</p><h2 className="mt-3 max-w-md text-3xl font-medium leading-tight tracking-[-0.05em] sm:text-4xl">See patterns. Make better decisions.</h2><p className="mt-4 max-w-md text-sm leading-7 text-[#c2cbc0]">Attendance reports bring scheduled days, presence, absences, late arrivals, and working hours into one reviewable view.</p><Link href="/signup" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-4 text-xs font-medium text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dce7c7]">Start with your team <ArrowRight className="h-4 w-4" /></Link></div>
            <ReportsPreview />
          </div>
        </div>
      </section>

      <section id="questions" className="scroll-mt-8 bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto grid max-w-[1120px] gap-8 px-5 sm:px-8 md:grid-cols-[0.75fr_1.25fr] md:gap-16 lg:px-12">
          <div><p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#788a74]">Good to know</p><h2 className="mt-3 text-3xl font-medium tracking-[-0.05em] text-[#20392b] sm:text-4xl">A few common questions.</h2><p className="mt-4 max-w-sm text-sm leading-6 text-[#758077]">See how the workspace fits into your team's day.</p></div>
          <div className="divide-y divide-[#e8ebe6] border-y border-[#e8ebe6]">
            {questions.map((item) => <details key={item.question} className="group py-4"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-[#33463a] marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#496b4f]"><span>{item.question}</span><ChevronDown className="h-4 w-4 shrink-0 text-[#869286] transition-transform group-open:rotate-180" /></summary><p className="max-w-[590px] pb-2 pr-8 text-[13px] leading-6 text-[#758077]">{item.answer}</p></details>)}
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="mx-auto flex max-w-[1120px] flex-col items-start justify-between gap-5 rounded-[22px] bg-[#eaf0e6] px-6 py-8 sm:flex-row sm:items-center sm:px-9 sm:py-9">
          <div><p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#71846d]">Bring your workday together</p><h2 className="mt-2 text-2xl font-medium tracking-[-0.045em] text-[#20392b] sm:text-3xl">Start with a workspace of your own.</h2></div>
          <Link href="/signup" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-[#213a2b] px-5 text-sm font-medium text-white transition hover:bg-[#304d38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#496b4f] focus-visible:ring-offset-2">Create a workspace <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <footer className="border-t border-[#e6e9e4] bg-white">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-5 px-5 py-6 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <Link href="/" className="text-sm font-semibold tracking-[-0.03em] text-[#26392d]">EmployeeTracker</Link>
          <nav aria-label="Legal pages" className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#707b72]"><Link href="/privacy" className="hover:text-[#20392b]">Privacy</Link><Link href="/terms" className="hover:text-[#20392b]">Terms</Link><Link href="/cookies" className="hover:text-[#20392b]">Cookies</Link></nav>
          <p className="text-[11px] text-[#8a938b]">© {new Date().getFullYear()} EmployeeTracker</p>
        </div>
      </footer>
    </main>
  )
}
