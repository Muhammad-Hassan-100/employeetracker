import Link from "next/link"
import { ArrowRight, BookOpen, Clock3, FileBarChart2, ShieldCheck, UsersRound } from "lucide-react"
import PublicHeader from "@/components/public-header"

export const metadata = {
  title: "EmployeeTracker Guide | Setup, Attendance and Reports",
  description:
    "Complete EmployeeTracker instructions for administrators and employees: workspace setup, employee accounts, shifts, attendance, leave, reports, and settings.",
}

const contents = [
  ["start", "Start here"],
  ["platform-control", "Platform administrator"],
  ["admin-overview", "Admin overview"],
  ["administrator-setup", "Workspace setup"],
  ["employee-accounts", "Employee accounts"],
  ["shifts-rules", "Shifts and company rules"],
  ["attendance-rules", "Attendance monitor and statuses"],
  ["employee-overview", "Employee overview"],
  ["employee-workflow", "Attendance and breaks"],
  ["admin-leave", "Review leave requests"],
  ["leave-workflow", "Request leave"],
  ["history-settings", "History and account settings"],
  ["reports", "Reports and calculations"],
  ["admin-settings", "Administrator settings"],
  ["troubleshooting", "Troubleshooting"],
]

const statusRows = [
  [
    "Scheduled",
    "The employee has a shift assigned for the date, and that shift has not started yet.",
  ],
  [
    "Awaiting check-in",
    "The shift has started, but no check-in is recorded. Some attendance views may phrase this as Not come yet. It changes to Absent at shift end if no check-in is recorded.",
  ],
  [
    "Present",
    "The employee has checked in and is still within the shift's attendance window. A Late marker can appear alongside Present.",
  ],
  [
    "Late",
    "The employee checked in after the configured late grace period. Late describes arrival time; it does not mean the employee is absent.",
  ],
  [
    "On break",
    "The employee started their one allowed break and has not ended it yet. They must end the break before checking out.",
  ],
  [
    "Early departure",
    "The employee checked out before the scheduled shift end. A reason may be required and is saved with the attendance details.",
  ],
  [
    "Absent",
    "No check-in was recorded by the end of the shift, or a checked-in employee missed the configured check-out deadline.",
  ],
  [
    "On leave",
    "An administrator approved leave covering this date. Approved leave is shown separately and excluded from attendance-rate calculations.",
  ],
  [
    "Day off / Not scheduled",
    "The employee has no shift assigned for the date under their schedule and the company's working-day rules.",
  ],
  [
    "Inactive",
    "The employee account is inactive. This account state should remain visible independently of daily attendance.",
  ],
]

const setupRows = [
  [
    "1. Company rules",
    "Open Shifts & Rules. Set working days, departments, attendance access, and the default shift used by company schedules.",
  ],
  [
    "2. Shift definitions",
    "Add each shift with its start and end times. Overnight shifts are supported; for example, 6:00 PM–3:00 AM ends the following day.",
  ],
  [
    "3. Employee profiles",
    "Add employees with their department, position, assigned shift, and individual attendance settings where needed. The account start date is recorded when the account is created.",
  ],
  [
    "4. Schedule mode",
    "Use company working days for a repeating default schedule. Use a custom monthly schedule when an employee's assigned shifts vary by date.",
  ],
  [
    "5. Attendance timings",
    "Set how early check-in opens, the late grace period, and the check-out grace after shift end. These settings determine the status transitions described below.",
  ],
  [
    "6. Confirm the roster",
    "Review the Attendance Monitor for a current date and a future date. Check that expected employees have the right shift, and that off days appear as unscheduled.",
  ],
]

const employeeWorkflow = [
  [
    "Before the shift",
    "Open Attendance and check the assigned shift window. Check-in becomes available the configured number of minutes before shift start.",
  ],
  [
    "At arrival",
    "Check in once you arrive. If you check in after the late grace period, the record is marked Late and may ask for a reason. The shift can still count as Present after its attendance is completed.",
  ],
  [
    "During the shift",
    "Use Start break after checking in, then End break when you return. Only one break is allowed per shift. Shift time continues while the break is in progress.",
  ],
  [
    "At departure",
    "End an active break before checking out. Check out by the deadline shown on Attendance. An early check-out can require a reason.",
  ],
]

const reportRows = [
  [
    "Attendance rate",
    "Present shifts ÷ completed scheduled shifts × 100",
    "A shift is present only when it has both check-in and check-out and is not marked absent. Approved leave and unfinished shifts are excluded.",
  ],
  [
    "On-time rate",
    "(Recorded check-ins − late check-ins) ÷ recorded check-ins × 100",
    "This measures punctuality among check-ins. If there are no check-ins, the rate has no denominator and is shown as a dash.",
  ],
  [
    "Early departure rate",
    "Early departures ÷ attended shifts × 100",
    "An early departure is a check-out before the scheduled shift end. The reason is available in the attendance details.",
  ],
  [
    "Average hours",
    "Total recorded hours ÷ present shifts",
    "This is an average per present shift, not total hours for the selected period.",
  ],
]

function SectionTitle({ id, kicker, title, children }) {
  return (
    <div className="mb-6 border-b border-[var(--guide-line)] pb-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--guide-accent)]">
        {kicker}
      </p>
      <h2
        id={id}
        className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-[var(--guide-ink)] sm:text-[28px]"
      >
        {title}
      </h2>
      {children && (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--guide-muted)]">{children}</p>
      )}
    </div>
  )
}

function Table({ headings, rows, widths }) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <section
            key={row[0]}
            className="rounded-xl border border-[var(--guide-line)] bg-white p-4"
          >
            <h3 className="font-semibold text-[var(--guide-ink)]">{row[0]}</h3>
            <dl className="mt-3 space-y-3">
              {row.slice(1).map((cell, index) => (
                <div key={headings[index + 1]} className="min-w-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--guide-muted)]">
                    {headings[index + 1]}
                  </dt>
                  <dd className="mt-1 break-words text-sm leading-6 text-[var(--guide-muted)]">
                    {cell}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-[var(--guide-line)] md:block">
        <table className="w-full min-w-[620px] border-collapse text-left text-sm">
          {widths && (
            <colgroup>
              {widths.map((width, index) => (
                <col key={index} style={{ width }} />
              ))}
            </colgroup>
          )}
          <thead className="bg-[var(--guide-table-head)] text-xs font-semibold uppercase tracking-wide text-[var(--guide-muted)]">
            <tr>
              {headings.map((heading) => (
                <th key={heading} scope="col" className="px-4 py-3">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--guide-line)] bg-white">
            {rows.map((row) => (
              <tr key={row[0]} className="align-top">
                <th scope="row" className="px-4 py-3.5 font-semibold text-[var(--guide-ink)]">
                  {row[0]}
                </th>
                {row.slice(1).map((cell, index) => (
                  <td key={index} className="px-4 py-3.5 leading-6 text-[var(--guide-muted)]">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function Note({ title, children }) {
  return (
    <aside className="my-5 rounded-r-lg border-l-[3px] border-[var(--guide-accent)] bg-[var(--guide-note)] px-4 py-3.5">
      <h3 className="text-sm font-semibold text-[var(--guide-ink)]">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-[var(--guide-muted)]">{children}</p>
    </aside>
  )
}

export default function GuidePage() {
  return (
    <main
      className="min-h-screen bg-[var(--guide-bg)] text-[var(--guide-ink)]"
      style={{
        "--guide-bg": "#f4f5f2",
        "--guide-paper": "#ffffff",
        "--guide-ink": "#18231c",
        "--guide-muted": "#536158",
        "--guide-line": "#e1e5df",
        "--guide-accent": "#43694b",
        "--guide-table-head": "#f5f7f4",
        "--guide-note": "#f0f5ee",
      }}
    >
      <PublicHeader activePage="guide" />

      <div className="mx-auto grid max-w-[1360px] gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8 lg:px-8 lg:py-12 xl:gap-12">
        <aside className="min-w-0">
          <details className="group rounded-xl border border-[var(--guide-line)] bg-white lg:hidden">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-[var(--guide-ink)] [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <BookOpen className="size-4 text-[var(--guide-accent)]" aria-hidden="true" />
                Contents
              </span>
              <span className="text-xs font-normal text-[var(--guide-muted)]">
                {contents.length} sections
              </span>
            </summary>
            <nav
              aria-label="Guide contents"
              className="grid grid-cols-1 gap-1 border-t border-[var(--guide-line)] p-2 sm:grid-cols-2"
            >
              {contents.map(([id, label], index) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="min-w-0 rounded-lg px-3 py-2 text-sm text-[var(--guide-muted)] transition hover:bg-[var(--guide-table-head)] hover:text-[var(--guide-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--guide-accent)]"
                >
                  <span className="mr-2 text-xs text-[#8b968d]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {label}
                </a>
              ))}
            </nav>
          </details>

          <div className="hidden lg:sticky lg:top-8 lg:block">
            <div className="rounded-xl border border-[var(--guide-line)] bg-white p-4 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--guide-muted)]">
                <BookOpen className="size-4 text-[var(--guide-accent)]" /> Contents
              </p>
              <nav
                aria-label="Guide contents"
                className="mt-3 flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible"
              >
                {contents.map(([id, label], index) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className="shrink-0 rounded-lg px-3 py-2 text-sm text-[var(--guide-muted)] transition hover:bg-[var(--guide-table-head)] hover:text-[var(--guide-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--guide-accent)]"
                  >
                    <span className="mr-2 text-xs text-[#8b968d]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {label}
                  </a>
                ))}
              </nav>
              <div className="mt-4 hidden border-t border-[var(--guide-line)] pt-4 text-xs leading-5 text-[var(--guide-muted)] lg:block">
                Use this handbook to understand the workspace setup and the attendance rules
                currently used by the product.
              </div>
            </div>
          </div>
        </aside>

        <article className="min-w-0 [overflow-wrap:anywhere] rounded-2xl border border-[var(--guide-line)] bg-white px-4 py-6 shadow-[0_12px_40px_rgba(24,35,28,0.04)] sm:px-7 sm:py-9 lg:px-10 lg:py-10 xl:px-12">
          <header id="start" className="scroll-mt-6 border-b border-[var(--guide-line)] pb-7">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--guide-accent)]">
              <BookOpen className="size-4" aria-hidden="true" /> Product handbook
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[var(--guide-ink)] sm:text-[42px]">
              EmployeeTracker user guide
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--guide-muted)]">
              A role-by-role reference for every administrator and employee workspace feature: where
              to find it, how to use it, and what the system does after each action.
            </p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--guide-muted)]">
              <span>For administrators and employees</span>
              <span>Attendance and scheduling</span>
              <span>Updated October 2026</span>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <a
                href="#administrator-setup"
                className="flex min-h-12 items-center gap-2 rounded-lg border border-[var(--guide-line)] px-3 text-sm font-medium hover:bg-[var(--guide-table-head)]"
              >
                <ShieldCheck className="size-4 text-[var(--guide-accent)]" /> Admin setup
              </a>
              <a
                href="#employee-workflow"
                className="flex min-h-12 items-center gap-2 rounded-lg border border-[var(--guide-line)] px-3 text-sm font-medium hover:bg-[var(--guide-table-head)]"
              >
                <UsersRound className="size-4 text-[var(--guide-accent)]" /> Employee workflow
              </a>
              <a
                href="#reports"
                className="flex min-h-12 items-center gap-2 rounded-lg border border-[var(--guide-line)] px-3 text-sm font-medium hover:bg-[var(--guide-table-head)]"
              >
                <FileBarChart2 className="size-4 text-[var(--guide-accent)]" /> Report formulas
              </a>
            </div>
          </header>

          <section
            className="border-b border-[var(--guide-line)] py-8"
            aria-labelledby="start-here-title"
          >
            <SectionTitle
              id="start-here-title"
              kicker="Start here"
              title="Find the right workspace for your role"
            >
              After signing in, use the left sidebar to open a page. Its contents depend on your
              role and on company permissions.
            </SectionTitle>
            <Table
              headings={["Role", "What you can do", "Main pages"]}
              rows={[
                [
                  "Administrator",
                  "Manage the organization, employee accounts, schedules, attendance review, leave approvals, reports, and workspace settings.",
                  "Overview · Add employee · All employees · Attendance monitor · Leave queue · Shifts & rules · Reports · Settings",
                ],
                [
                  "Employee",
                  "Record your own shift attendance, request time off, review your attendance history, and change your password when the admin allows it.",
                  "Overview · Attendance · Leave requests · My history · Settings (when enabled)",
                ],
                [
                  "Platform administrator",
                  "Review organization signups and manage company workspaces and employee accounts across the platform.",
                  "Platform overview · Approval requests · Companies · Employees",
                ],
              ]}
              widths={["130px", "auto", "270px"]}
            />
            <Note title="Pages adapt to your role">
              The Leave page is shared: employees submit and track requests there, while
              administrators search, filter, approve, or reject them. Employee Settings appears only
              when the administrator has enabled password changes. On desktop, the sidebar can
              collapse to an icon rail; your account and Sign out remain at its bottom.
            </Note>
          </section>

          <section
            id="platform-control"
            className="scroll-mt-8 border-b border-[var(--guide-line)] py-8"
            aria-labelledby="platform-control-title"
          >
            <SectionTitle
              id="platform-control-title"
              kicker="Platform administrator"
              title="Manage workspace onboarding and platform accounts"
            >
              This role is separate from a company administrator. Platform pages cover all
              organizations and their employee accounts, not daily attendance management.
            </SectionTitle>
            <h3 className="mb-3 text-base font-semibold">Platform overview</h3>
            <p className="text-sm leading-6 text-[var(--guide-muted)]">
              The dashboard summarizes pending approvals, approved workspaces, active employees, and
              total platform records. Use the approval queue or quick actions to review new
              workspaces, inspect companies, and browse employee accounts.
            </p>
            <h3 className="mb-3 mt-7 text-base font-semibold">
              Approval requests · Dashboard → Approval requests
            </h3>
            <p className="text-sm leading-6 text-[var(--guide-muted)]">
              Review the pending, approved, and rejected totals. Each pending request shows the
              company name and domain, creation date, and administrator details. Approve or reject
              the workspace. Approval activates its organization administrator so they can sign in;
              rejection leaves that administrator inactive.
            </p>
            <h3 className="mb-3 mt-7 text-base font-semibold">
              Company workspaces · Dashboard → Companies
            </h3>
            <p className="text-sm leading-6 text-[var(--guide-muted)]">
              The list shows each company’s domain, approval state, administrator name and email,
              employee count, and creation date. Open View Details to inspect or edit company name,
              administrator name/email/status, and approval status. The company domain is read-only.
              Save or cancel the edit from the company detail page.
            </p>
            <Note title="Deleting a company removes its records">
              The delete action removes the company and its related user accounts, shifts, leave
              requests, and attendance data. The interface asks for confirmation before deletion.
              Review the company carefully before confirming.
            </Note>
            <h3 className="mb-3 mt-7 text-base font-semibold">
              Platform employees · Dashboard → Employees
            </h3>
            <p className="text-sm leading-6 text-[var(--guide-muted)]">
              Search employee or company name to find an account across workspaces. Review the
              employee’s company, email, department, position, and active state. Activate or
              deactivate an account, or delete an employee after confirming the action. These
              controls do not open company attendance tools.
            </p>
          </section>

          <section
            id="admin-overview"
            className="scroll-mt-8 border-b border-[var(--guide-line)] py-8"
            aria-labelledby="admin-overview-title"
          >
            <SectionTitle
              id="admin-overview-title"
              kicker="Administrator · Overview"
              title="Use Overview as the daily control panel"
            >
              The Overview summarizes active employees, today’s attendance, current risks, and
              pending leave work. It is a quick triage page; open the linked screens to inspect
              records.
            </SectionTitle>
            <Table
              headings={["Area", "What it shows", "Next step"]}
              rows={[
                [
                  "Summary cards",
                  "Active employees, present on shift, late arrivals, employees awaiting check-in, and leave requests waiting for review.",
                  "Open Attendance monitor for an employee’s full record or Leave queue to review requests.",
                ],
                [
                  "Shift attendance",
                  "A distribution of the team’s statuses and a short list of employees assigned to a shift or on leave.",
                  "Select Open monitor to choose a date and inspect the full roster.",
                ],
                [
                  "Needs your attention",
                  "Pending leave, no check-in after shift start, missed check-outs, and repeated late, absent, or early-departure patterns from the last 30 days.",
                  "Treat these as review prompts. Confirm the dates, schedule, and saved reasons before making a decision.",
                ],
                [
                  "Quick actions",
                  "Shortcuts to add an employee, manage shifts, and open reports.",
                  "Use these after initial setup or for common daily tasks.",
                ],
              ]}
              widths={["150px", "auto", "270px"]}
            />
            <p className="mt-4 text-sm leading-6 text-[var(--guide-muted)]">
              Today’s dashboard data refreshes periodically. Use the dedicated monitor’s Refresh
              action when you need an immediate reload. The dashboard’s repeated-pattern panel
              currently calls out at least 3 late arrivals, 3 absences, or 2 early departures within
              30 days.
            </p>
          </section>

          <section
            id="administrator-setup"
            className="scroll-mt-8 border-b border-[var(--guide-line)] py-8"
            aria-labelledby="administrator-setup-title"
          >
            <SectionTitle
              id="administrator-setup-title"
              kicker="Administrator · Setup"
              title="Set up the workspace in this order."
            >
              Start with company rules and shift definitions, then assign schedules to active
              employees. This keeps the monitor and reports aligned with the roster.
            </SectionTitle>
            <ol className="space-y-0 divide-y divide-[var(--guide-line)]">
              {setupRows.map(([title, detail]) => (
                <li key={title} className="grid gap-1 py-4 sm:grid-cols-[190px_1fr] sm:gap-5">
                  <h3 className="text-sm font-semibold text-[var(--guide-ink)]">{title}</h3>
                  <p className="text-sm leading-6 text-[var(--guide-muted)]">{detail}</p>
                </li>
              ))}
            </ol>
            <Note title="Schedule mode matters">
              A company schedule follows configured company workdays and the employee's default
              shift. A custom monthly schedule uses the shift assigned to each date. Check which
              mode the employee is using before investigating a missing or unexpected attendance
              row.
            </Note>
          </section>

          <section
            id="employee-accounts"
            className="scroll-mt-8 border-b border-[var(--guide-line)] py-8"
            aria-labelledby="employee-accounts-title"
          >
            <SectionTitle
              id="employee-accounts-title"
              kicker="Administrator · People"
              title="Create, review, and maintain employee accounts"
            >
              The employee pages cover two different jobs: adding a new account and maintaining the
              existing directory.
            </SectionTitle>
            <h3 className="mb-3 text-base font-semibold">
              Add an employee · Dashboard → Add employee
            </h3>
            <ol className="space-y-0 divide-y divide-[var(--guide-line)]">
              {[
                [
                  "Identity",
                  "Enter the employee’s full name and position. The work email is generated from the employee name and the organization’s locked company domain. Set a temporary password of at least 6 characters.",
                ],
                [
                  "Department",
                  "Choose from the department options maintained in Shifts & rules. If the right option is missing, add it in company rules first.",
                ],
                [
                  "Schedule",
                  "Choose company working days with a default shift, or choose a custom monthly schedule and assign shifts date by date. A shift must exist before employees can be assigned to it.",
                ],
                [
                  "Attendance rules",
                  "Set how many minutes before shift start check-in opens, the employee’s late-arrival grace, and the post-shift check-out deadline. These are per-employee values.",
                ],
                [
                  "Create",
                  "Submit the form. The employee account becomes available immediately and can sign in with the generated email and temporary password.",
                ],
              ].map(([title, detail]) => (
                <li key={title} className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:gap-5">
                  <h4 className="text-sm font-semibold">{title}</h4>
                  <p className="text-sm leading-6 text-[var(--guide-muted)]">{detail}</p>
                </li>
              ))}
            </ol>
            <h3 className="mb-3 mt-7 text-base font-semibold">
              All employees · Dashboard → All employees
            </h3>
            <p className="text-sm leading-6 text-[var(--guide-muted)]">
              The directory shows employee totals, active and inactive counts, and departments.
              Search by name, email, department, or position. Each employee entry lets an
              administrator open Edit, activate or deactivate the account, or delete it. Inactive
              accounts stay identifiable as Inactive and should not be treated as currently
              scheduled staff.
            </p>
            <h3 className="mb-3 mt-7 text-base font-semibold">Employee detail and editing</h3>
            <p className="text-sm leading-6 text-[var(--guide-muted)]">
              Open an employee from the monitor or directory to review their profile and attendance
              timeline. The editor can update name, work email, password, department, position,
              schedule mode, default shift, and attendance timing rules. For a custom schedule,
              choose a month, fill company workdays as a starting point if useful, then change
              individual dates. Save changes to apply them. The detail timeline is for review:
              filter it to an exact date or clear the filter to show all records. Activate or
              deactivate an account from the employee directory.
            </p>
            <Note title="Use the right date and schedule">
              Before changing an employee’s attendance settings, check their join date, active
              state, shift assignment, company workdays, and any custom monthly assignments. These
              values determine which dates the system expects them to work.
            </Note>
          </section>

          <section
            id="shifts-rules"
            className="scroll-mt-8 border-b border-[var(--guide-line)] py-8"
            aria-labelledby="shifts-rules-title"
          >
            <SectionTitle
              id="shifts-rules-title"
              kicker="Administrator · Scheduling"
              title="Define shifts and organization-wide rules"
            >
              Open Shifts & rules to manage reusable shift templates and the company settings used
              by employee schedules.
            </SectionTitle>
            <Table
              headings={["Setting", "What to do", "Effect"]}
              rows={[
                [
                  "Shift templates",
                  "Create a shift name, start time, end time, and optional description. Edit a saved shift when times change, or delete a shift that should no longer be offered.",
                  "Employees using that shift inherit its window. Overnight shifts, such as 6:00 PM to 3:00 AM, end the next day.",
                ],
                [
                  "Company workdays",
                  "Toggle each weekday as a working day or off day, then save company rules.",
                  "Company-default schedules assign the employee’s default shift only on selected workdays.",
                ],
                [
                  "Departments",
                  "Enter department names separated by commas and save.",
                  "These become the department choices in employee forms.",
                ],
                [
                  "Attendance access",
                  "Choose Open Access or Office Network Only. For office-only access, enter approved public IP addresses, separated by commas or line breaks.",
                  "Check-in, check-out, and break actions are restricted to the approved network when this policy is selected. Configure at least one IP first.",
                ],
                [
                  "Employee password permission",
                  "Choose whether employees can change their own password, then save company rules.",
                  "When blocked, employee Settings is hidden and password changes are refused. Admins can still manage accounts.",
                ],
              ]}
              widths={["170px", "auto", "270px"]}
            />
            <h3 className="mb-3 mt-7 text-base font-semibold">Custom monthly schedules</h3>
            <p className="text-sm leading-6 text-[var(--guide-muted)]">
              Select Custom monthly schedule on an employee form or in employee editing. Choose a
              month, optionally pick a shift and select Fill workdays, then inspect each date. Every
              date can be assigned a shift or set to Off. Fill workdays uses the organization’s
              workday settings as a starting point; it does not prevent individual date edits. Clear
              Month removes the assignments currently in the editor.
            </p>
            <Note title="Schedule changes affect attendance expectations">
              An unassigned date is not an expected shift. Confirm the employee’s schedule before
              using an absence or report percentage to assess attendance.
            </Note>
          </section>

          <section
            id="attendance-rules"
            className="scroll-mt-8 border-b border-[var(--guide-line)] py-8"
            aria-labelledby="attendance-rules-title"
          >
            <SectionTitle
              id="attendance-rules-title"
              kicker="Administrator · Attendance monitor"
              title="Review a day and understand its statuses"
            >
              Open Attendance monitor to inspect the whole roster for a chosen date. The roster
              includes employee identity, department, position, shift, recorded times, hours, break
              details, and saved reasons.
            </SectionTitle>
            <h3 className="mb-3 text-base font-semibold">Use the monitor filters</h3>
            <Table
              headings={["Control", "How to use it"]}
              rows={[
                [
                  "Date",
                  "Select the work date you want to review. For an overnight shift, attendance belongs to the shift’s start date even when check-out happens after midnight.",
                ],
                ["Search", "Search employee name, email, department, position, or shift name."],
                [
                  "Status",
                  "Narrow the list to a status such as Present, Late, Absent, On leave, Scheduled, Awaiting check-in, Inactive, Day off, Weekend, or Before start date.",
                ],
                ["Shift", "Show one shift or all shifts assigned on the selected date."],
                [
                  "Refresh / View details",
                  "Refresh reloads the roster. View details opens that employee’s attendance timeline and profile for review.",
                ],
              ]}
              widths={["170px", "auto"]}
            />
            <p className="mb-7 mt-3 text-sm leading-6 text-[var(--guide-muted)]">
              The current date refreshes automatically about every 30 seconds; you can also refresh
              manually. When reviewing a past date, use the same filters and select an employee’s
              details to see saved check-in/check-out times and reasons.
            </p>
            <h3 className="mb-3 text-base font-semibold">Status meanings</h3>
            <Table headings={["Status", "Meaning"]} rows={statusRows} widths={["180px", "auto"]} />
            <h3 className="mb-3 mt-7 text-base font-semibold">Important timing rules</h3>
            <ul className="space-y-3 text-sm leading-6 text-[var(--guide-muted)]">
              <li className="flex gap-3">
                <Clock3 className="mt-1 size-4 shrink-0 text-[var(--guide-accent)]" />
                <span>
                  <strong className="text-[var(--guide-ink)]">Check-in window:</strong> opens the
                  configured number of minutes before shift start. Before the shift starts, no
                  check-in is expected yet.
                </span>
              </li>
              <li className="flex gap-3">
                <Clock3 className="mt-1 size-4 shrink-0 text-[var(--guide-accent)]" />
                <span>
                  <strong className="text-[var(--guide-ink)]">Late cutoff:</strong> shift start plus
                  the employee's late grace minutes. A check-in after this cutoff is Late and
                  requires a reason. The employee can still count as Present once the shift is
                  completed correctly.
                </span>
              </li>
              <li className="flex gap-3">
                <Clock3 className="mt-1 size-4 shrink-0 text-[var(--guide-accent)]" />
                <span>
                  <strong className="text-[var(--guide-ink)]">No check-in:</strong> becomes Awaiting
                  check-in when the shift starts and becomes Absent at shift end if no check-in is
                  recorded.
                </span>
              </li>
              <li className="flex gap-3">
                <Clock3 className="mt-1 size-4 shrink-0 text-[var(--guide-accent)]" />
                <span>
                  <strong className="text-[var(--guide-ink)]">Missing check-out:</strong> after a
                  check-in, the check-out deadline is shift end plus the employee's configured
                  check-out grace. At the deadline, the shift becomes Absent and check-out is
                  closed. For a midnight shift end and 180 minutes of grace, the deadline is 3:00 AM
                  the next day.
                </span>
              </li>
            </ul>
            <p className="mt-4 text-sm leading-6 text-[var(--guide-muted)]">
              A missed check-out closes that shift’s attendance action. The employee’s next assigned
              workday is a separate scheduled shift with its own check-in window.
            </p>
            <Note title="Late and Present can both be true">
              Late records the arrival timing. Present records a completed, valid shift with
              check-in and check-out. A late employee who checks out correctly can count as present
              and late in the report.
            </Note>
          </section>

          <section
            id="employee-overview"
            className="scroll-mt-8 border-b border-[var(--guide-line)] py-8"
            aria-labelledby="employee-overview-title"
          >
            <SectionTitle
              id="employee-overview-title"
              kicker="Employee · Overview"
              title="See today’s next action at a glance"
            >
              The employee Overview shows the current attendance action, shift and schedule type,
              leave requests awaiting review, month-to-date attendance totals, recent shifts, and
              shortcuts to common tasks.
            </SectionTitle>
            <Table
              headings={["Overview area", "What it means"]}
              rows={[
                [
                  "Today’s attendance",
                  "Shows the next action or saved outcome, such as Scheduled, Awaiting check-in, checked in, On break, Shift complete, or Absent. The main button takes you to Attendance or the relevant history/leave page.",
                ],
                [
                  "Shift and schedule",
                  "Shows the assigned shift and whether your schedule follows company workdays or a custom monthly calendar.",
                ],
                [
                  "Month totals",
                  "Shows present records this month, hours recorded, and pending leave requests.",
                ],
                [
                  "Recent attendance",
                  "Displays a short list of recent dates with check-in/check-out times and statuses. Open Full history for the complete list.",
                ],
                ["Your next steps", "Links to Attendance, Leave requests, and My history."],
              ]}
              widths={["175px", "auto"]}
            />
            <p className="mt-4 text-sm leading-6 text-[var(--guide-muted)]">
              The Overview is a summary. Attendance is the place to perform check-in, break, and
              check-out actions and read the exact deadlines for your current shift.
            </p>
          </section>

          <section
            id="employee-workflow"
            className="scroll-mt-8 border-b border-[var(--guide-line)] py-8"
            aria-labelledby="employee-workflow-title"
          >
            <SectionTitle
              id="employee-workflow-title"
              kicker="Employee · Attendance"
              title="Follow this routine for every shift"
            >
              Open Attendance to see the live clock, shift window, current status, next available
              action, saved attendance, and cutoffs.
            </SectionTitle>
            <ol className="space-y-0 divide-y divide-[var(--guide-line)]">
              {employeeWorkflow.map(([title, detail], index) => (
                <li key={title} className="grid gap-2 py-4 sm:grid-cols-[34px_155px_1fr] sm:gap-4">
                  <span className="flex size-7 items-center justify-center rounded-full bg-[var(--guide-note)] text-xs font-semibold text-[var(--guide-accent)]">
                    {index + 1}
                  </span>
                  <h3 className="pt-1 text-sm font-semibold text-[var(--guide-ink)]">{title}</h3>
                  <p className="text-sm leading-6 text-[var(--guide-muted)]">{detail}</p>
                </li>
              ))}
            </ol>
            <h3 className="mb-3 mt-7 text-base font-semibold">Break rules</h3>
            <p className="text-sm leading-6 text-[var(--guide-muted)]">
              After check-in, select Start break once. The button changes to End break while the
              break is running; select it when you return. A completed break cannot be started again
              during that shift. The shift clock and total shift duration continue during the break.
              You must end a running break before checking out.
            </p>
            <h3 className="mb-3 mt-7 text-base font-semibold">Early check-out</h3>
            <p className="text-sm leading-6 text-[var(--guide-muted)]">
              Checking out before the scheduled shift end may require an explanation. The monitor
              and reports can identify early departures from the saved check-out time and attendance
              record.
            </p>
            <Note title="The page updates while it is open">
              The on-screen clock advances every second, and the attendance view refreshes
              periodically. If the action or status still looks old, refresh the page and check the
              selected shift date.
            </Note>
          </section>

          <section
            id="admin-leave"
            className="scroll-mt-8 border-b border-[var(--guide-line)] py-8"
            aria-labelledby="admin-leave-title"
          >
            <SectionTitle
              id="admin-leave-title"
              kicker="Administrator · Leave queue"
              title="Review requests before they affect attendance"
            >
              Open Leave queue to review employee requests. The page summarizes Pending, Approved,
              Rejected, and Total counts.
            </SectionTitle>
            <ol className="list-decimal space-y-3 pl-5 text-sm leading-6 text-[var(--guide-muted)] marker:font-semibold marker:text-[var(--guide-accent)]">
              <li>
                Search by employee name or filter by Pending, Approved, or Rejected to find
                requests.
              </li>
              <li>
                Read the employee, leave type, submitted date, requested date range, reason, and any
                earlier review note.
              </li>
              <li>
                For a pending request, optionally add a review comment, then select Approve or
                Reject. The result and comment are visible to the employee in their requests list.
              </li>
              <li>Use Refresh to reload the queue when you need the latest submissions.</li>
            </ol>
            <Note title="Approval changes the attendance view">
              Approved leave is displayed as On leave on the covered dates and excluded from
              attendance-rate denominators. Pending or rejected requests do not count as approved
              leave.
            </Note>
          </section>

          <section
            id="leave-workflow"
            className="scroll-mt-8 border-b border-[var(--guide-line)] py-8"
            aria-labelledby="leave-workflow-title"
          >
            <SectionTitle
              id="leave-workflow-title"
              kicker="Employee · Leave requests"
              title="Submit and track a leave request"
            >
              Open Leave requests and choose Request Leave to show the form. Employees can request
              future dates only; same-day and past-date requests are rejected by the current
              workflow.
            </SectionTitle>
            <ol className="list-decimal space-y-3 pl-5 text-sm leading-6 text-[var(--guide-muted)] marker:font-semibold marker:text-[var(--guide-accent)]">
              <li>Choose Sick, Personal, Vacation, Emergency, or Other leave.</li>
              <li>
                Select the start and end dates. The form shows the inclusive calendar-day count for
                the range, including days off.
              </li>
              <li>
                Enter a reason and submit. The request appears in Your Requests with Pending status
                until the administrator reviews it.
              </li>
              <li>
                Return to this page to see Approved or Rejected status and any review comment from
                the administrator. The list refreshes periodically.
              </li>
            </ol>
            <Note title="Check the approved dates">
              If a shift still appears as absent on a leave day, verify that the request is approved
              and that its date range covers the shift's attendance date.
            </Note>
          </section>

          <section
            id="history-settings"
            className="scroll-mt-8 border-b border-[var(--guide-line)] py-8"
            aria-labelledby="history-settings-title"
          >
            <SectionTitle
              id="history-settings-title"
              kicker="Employee · My history and Settings"
              title="Review saved shifts and manage your password"
            >
              My history is the employee’s record of previous attendance. Settings is available only
              when the administrator allows employees to change passwords.
            </SectionTitle>
            <h3 className="mb-3 text-base font-semibold">My history · Dashboard → My history</h3>
            <p className="text-sm leading-6 text-[var(--guide-muted)]">
              The history page summarizes total records, on-time shifts, late days, and average
              hours, then lists each saved attendance record. Use the date filter to focus on a day
              and Clear to remove it. Records show the date, check-in, check-out, hours, break
              duration when used, attendance status, and any saved late, early-departure, leave, or
              missing-checkout reason. The list reloads periodically.
            </p>
            <h3 className="mb-3 mt-7 text-base font-semibold">Settings · Dashboard → Settings</h3>
            <p className="text-sm leading-6 text-[var(--guide-muted)]">
              If employee password changes are enabled, enter a new password and confirm it, then
              select Update Password. The account name and work email are shown as read-only. If
              Settings is missing or access is denied, contact the administrator to change the
              organization’s employee-password permission.
            </p>
            <Note title="If you cannot sign in">
              Contact your administrator to verify your account is active and to reset or update the
              temporary password. An inactive employee account cannot use the workspace normally.
            </Note>
          </section>

          <section
            id="reports"
            className="scroll-mt-8 border-b border-[var(--guide-line)] py-8"
            aria-labelledby="reports-title"
          >
            <SectionTitle
              id="reports-title"
              kicker="Administrator · Reports"
              title="Understand attendance reports"
            >
              Choose a date range or search for an employee. The report summarizes completed
              scheduled shifts within that period.
            </SectionTitle>
            <p className="mb-5 text-sm leading-6 text-[var(--guide-muted)]">
              The range selector offers This Week, This Month, Last Month, and Last 3 Months. Search
              filters the employee rows and the CSV export uses the employees currently shown after
              search.
            </p>
            <Table
              headings={["Measure", "Calculation", "How to read it"]}
              rows={reportRows}
              widths={["150px", "260px", "auto"]}
            />
            <h3 className="mb-3 mt-7 text-base font-semibold">Summary cards and CSV export</h3>
            <p className="text-sm leading-6 text-[var(--guide-muted)]">
              Summary cards roll up completed shifts, average attendance, on-time check-ins,
              employees needing review, and average hours for the selected range. Export CSV
              downloads employee-level values for completed shifts, presence, check-ins, absences,
              leave, late arrivals, early departures, average hours, attendance rate, on-time rate,
              and early-departure rate. The CSV follows the current search results.
            </p>
            <h3 className="mb-3 mt-7 text-base font-semibold">
              When a shift is considered complete
            </h3>
            <p className="text-sm leading-6 text-[var(--guide-muted)]">
              A shift enters the completed-shift denominator after the employee checks in and checks
              out, after the configured check-out deadline passes, or after shift end when no
              check-in was recorded. Shifts still in progress are not included. Approved leave is
              counted separately and excluded from that denominator.
            </p>
            <h3 className="mb-3 mt-7 text-base font-semibold">Needs attention indicator</h3>
            <p className="text-sm leading-6 text-[var(--guide-muted)]">
              The current report flags an employee for review when attendance is below 85%, absences
              reach 3, late arrivals reach 3, early departures reach 2, or repeated lateness is high
              (at least 2 check-ins and 2 late arrivals, with at least 75% of check-ins late). Treat
              this as a review prompt, then inspect the dates and records before taking action.
            </p>
            <Note title="These figures describe attendance records">
              Attendance rates are not an overall employee performance score. Consider the selected
              period, approved leave, schedule accuracy, and any recorded reasons when reviewing a
              pattern.
            </Note>
          </section>

          <section
            id="admin-settings"
            className="scroll-mt-8 border-b border-[var(--guide-line)] py-8"
            aria-labelledby="admin-settings-title"
          >
            <SectionTitle
              id="admin-settings-title"
              kicker="Administrator · Settings"
              title="Update your account and organization branding"
            >
              Administrator Settings contains the account profile and organization dashboard color
              controls.
            </SectionTitle>
            <Table
              headings={["Control", "What it does", "Notes"]}
              rows={[
                [
                  "Full name and work email",
                  "Edit the administrator profile and save the updated settings.",
                  "Use an email address your organization controls.",
                ],
                [
                  "New password",
                  "Enter a new password to change it; leave the field empty to keep the current password.",
                  "The company domain remains read-only and cannot be changed here.",
                ],
                [
                  "Company name and domain",
                  "Review the organization identity shown on the profile.",
                  "Both fields are read-only in this screen; the company domain cannot be changed here.",
                ],
                [
                  "Organization dashboard color",
                  "Choose a preset or use the custom color picker, review the preview, then select Save brand color.",
                  "The selected primary accent is shared by organization dashboards. The default swatch restores the existing green look.",
                ],
              ]}
              widths={["190px", "auto", "250px"]}
            />
            <p className="mt-4 text-sm leading-6 text-[var(--guide-muted)]">
              Brand changes apply to the organization dashboard, including active navigation and
              primary actions. Other members’ dashboards pick up the saved color automatically.
            </p>
          </section>

          <section
            id="troubleshooting"
            className="scroll-mt-8 py-8"
            aria-labelledby="troubleshooting-title"
          >
            <SectionTitle
              id="troubleshooting-title"
              kicker="Quick checks"
              title="Troubleshoot an unexpected status"
            >
              Use these checks before changing a schedule or attendance record.
            </SectionTitle>
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-[var(--guide-ink)]">
                  An employee shows Scheduled
                </h3>
                <p className="mt-1 text-sm leading-6 text-[var(--guide-muted)]">
                  Confirm the shift start time and the date selected in the monitor. Before shift
                  start, Scheduled is expected; after the shift begins, a missing check-in should
                  become Not come yet.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--guide-ink)]">
                  An employee is marked Absent after working
                </h3>
                <p className="mt-1 text-sm leading-6 text-[var(--guide-muted)]">
                  Check whether check-in and check-out were both recorded before the employee's
                  configured deadline. A missed check-out deadline closes the action and marks the
                  shift Absent.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--guide-ink)]">
                  A late employee does not show as Present
                </h3>
                <p className="mt-1 text-sm leading-6 text-[var(--guide-muted)]">
                  Late is based on check-in time. Present in reports requires both check-in and
                  check-out, with the record not marked absent. Review the check-out time and status
                  in employee details.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--guide-ink)]">
                  A shift or day is missing
                </h3>
                <p className="mt-1 text-sm leading-6 text-[var(--guide-muted)]">
                  Verify the employee is active, the date is on or after their join date, the
                  correct schedule mode is selected, the date is a company working day when using
                  the company schedule, and the shift is assigned.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--guide-ink)]">
                  A report percentage looks unusual
                </h3>
                <p className="mt-1 text-sm leading-6 text-[var(--guide-muted)]">
                  Confirm the selected period, expected shifts, approved leave dates, and whether
                  each shift has finished. Then compare the underlying daily records; small sample
                  sizes can make percentages move sharply.
                </p>
              </div>
            </div>
          </section>

          <footer className="border-t border-[var(--guide-line)] pt-6 text-sm text-[var(--guide-muted)]">
            Need to use the workspace?{" "}
            <Link
              href="/login"
              className="font-semibold text-[var(--guide-accent)] underline decoration-[var(--guide-accent)]/40 underline-offset-4 hover:decoration-[var(--guide-accent)]"
            >
              Sign in
            </Link>{" "}
            or{" "}
            <Link
              href="/signup"
              className="font-semibold text-[var(--guide-accent)] underline decoration-[var(--guide-accent)]/40 underline-offset-4 hover:decoration-[var(--guide-accent)]"
            >
              create a workspace
            </Link>
            .
          </footer>
        </article>
      </div>

      <footer className="border-t border-[var(--guide-line)] bg-white">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-4 px-5 py-6 text-xs text-[var(--guide-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Link href="/" className="font-semibold text-[var(--guide-ink)]">
            EmployeeTracker
          </Link>
          <nav aria-label="Legal pages" className="flex gap-5">
            <Link href="/privacy" className="hover:text-[var(--guide-ink)]">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[var(--guide-ink)]">
              Terms
            </Link>
            <Link href="/cookies" className="hover:text-[var(--guide-ink)]">
              Cookies
            </Link>
          </nav>
          <span>© {new Date().getFullYear()} EmployeeTracker</span>
        </div>
      </footer>
    </main>
  )
}
