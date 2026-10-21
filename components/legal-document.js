import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import BrandMark from "@/components/brand-mark"

const documents = {
  privacy: {
    eyebrow: "Your information",
    title: "Privacy Policy",
    intro: "This draft explains how EmployeeTracker handles information in the current product. Each organization should also give its employees any workplace privacy notice required for its own use.",
    updated: "20 October 2026",
    sections: [
      ["1. Who this policy covers", "EmployeeTracker is a workforce operations service used by organizations and their employees. The organization that creates a workspace decides how it uses employee records and is generally responsible for its workplace data. EmployeeTracker provides the software that stores and displays those records. For questions about attendance, schedules, leave, or your employment records, contact your organization administrator first."],
      ["2. Information in the workspace", "Depending on how your organization uses the service, the workspace can contain administrator and employee names, work email addresses, company and department details, job positions, shift schedules, attendance dates and times, hours, break records, late or early departure reasons, leave requests and review notes, and account status. Reports may summarize attendance and working hours."],
      ["3. Account and device information", "When you sign in, the app stores the returned account profile in your browser's local storage to keep the workspace available during use. The app also sends account identity details with requests to retrieve or update records. The sidebar stores its open or closed preference in a small browser cookie. The current repository does not include an analytics or advertising tracker."],
      ["4. How information is used", "The service uses workspace information to provide accounts, assign employees to shifts, record attendance and breaks, calculate attendance summaries, submit and review leave, show team views, and produce reports. Administrators can manage their organization's settings and records. Platform administrators can review workspace signup requests and manage company accounts."],
      ["5. Sharing and service providers", "Information is available to authorized users in the relevant workspace according to their role. The application uses a database service to store workspace records. Hosting, database, and infrastructure providers used by a particular deployment may process information to operate the service. Organizations should confirm the providers and locations used in their deployment before entering personal information."],
      ["6. Retention and requests", "Workspace records are retained as needed to operate the service and according to the organization's own retention practices. The current app does not provide a general employee self-service data deletion workflow. Employees should send access, correction, or deletion requests to their organization administrator, who can assess and handle the request in line with applicable requirements."],
      ["7. Security and account responsibility", "Access is separated by workspace and account role in the application. No online service can promise absolute security. Organizations are responsible for choosing authorized administrators, protecting account credentials, and reviewing who can access employee data. The current application should receive a security review before use with sensitive or production workforce data."],
      ["8. Children and changes", "This workforce service is intended for organizations and working-age personnel, not children. This policy may be revised as the product or its data practices change. The date above identifies the latest draft review date; organizations should share applicable updates with their users."],
      ["9. Pakistan and applicable requirements", "This page is a product-specific draft for use in Pakistan and is not legal advice or a statement of compliance with any particular law. Each organization must determine which Pakistani federal and provincial requirements apply to its workforce and processing, and obtain its own advice where needed."],
    ],
  },
  terms: {
    eyebrow: "Using the service",
    title: "Terms of Service",
    intro: "These plain-language draft terms describe the intended use of EmployeeTracker by organizations and their team members. An organization should review and formally adopt suitable terms before using the service in production.",
    updated: "20 October 2026",
    sections: [
      ["1. The service", "EmployeeTracker provides organization workspaces for employee profiles, schedules, shift-based attendance, breaks, leave requests, attendance history, and reports. Features may change as the service is maintained. These terms do not promise a particular availability level, response time, or feature set."],
      ["2. Organization accounts", "A person creating a workspace must be authorized to act for that organization and provide accurate organization and administrator details. Company workspaces and administrator access may require platform review. Organizations are responsible for their workspace settings, users, schedules, attendance rules, and the accuracy of records they enter."],
      ["3. Employee accounts", "Employees should use their own assigned account, keep credentials private, and report suspected unauthorized access to their organization administrator. Access depends on the account's role and status and may be changed by the organization. Do not share credentials or attempt to access another person's workspace or records."],
      ["4. Appropriate use", "Users must use the service lawfully and only for authorized work. Do not interfere with the service, probe for unauthorized access, upload malicious content, misrepresent identity, or use records to harass or unlawfully discriminate against another person."],
      ["5. Attendance and workplace decisions", "Attendance states, shift calculations, and reports are operational records based on configured schedules and submitted actions. Organizations should review those records before relying on them for payroll, disciplinary action, statutory records, or other employment decisions. EmployeeTracker is not a payroll, legal, or human-resources adviser."],
      ["6. Organization data", "Organizations remain responsible for having an appropriate basis and providing required notices before entering employee information. They should limit access to authorized people, set retention periods, and respond to employee requests. Workspace administrators control ordinary employee and schedule management; platform-level company actions may be available to platform administrators."],
      ["7. Service changes and access", "Access may be limited or suspended when an account is inactive, an organization is awaiting approval, or a user violates these terms or creates a security or operational risk. The service may be updated, paused, or discontinued. Organizations should keep any records they need outside the service where their retention obligations require it."],
      ["8. No warranty; liability", "The service is provided as currently available. To the extent permitted by applicable law, no guarantee is made that it will be uninterrupted, error-free, or suitable for every organization's requirements. Nothing in these terms excludes a right or liability that cannot lawfully be excluded."],
      ["9. Governing law", "These draft terms are intended for Pakistan. They are subject to applicable laws of Pakistan, and disputes are to be brought before a competent court in Pakistan, subject to any mandatory rules that apply. Organizations should obtain local legal review before adopting these terms."],
      ["10. Questions", "For account access, attendance records, leave, or organization data, contact your organization's administrator. The repository does not specify a public customer-support email or postal address, so none is invented here."],
    ],
  },
  cookies: {
    eyebrow: "Browser storage",
    title: "Cookie Notice",
    intro: "EmployeeTracker uses browser storage for basic application behavior. This notice describes the storage mechanisms visible in the current codebase.",
    updated: "20 October 2026",
    sections: [
      ["1. Sidebar preference cookie", "The navigation sidebar writes a cookie named `sidebar_state` to remember whether it is open or collapsed. It is a functional preference, scoped to the site, and lasts up to seven days. It does not identify you for advertising."],
      ["2. Local storage for sign-in state", "The app currently keeps the signed-in profile in browser local storage under the key `user`. This is browser local storage, not a cookie. It lets the client show the user's workspace and attach identity details to application requests. Signing out removes this stored profile."],
      ["3. Analytics and advertising", "No analytics or advertising cookie integration is present in the current repository. Deployment changes or added services could introduce additional storage; this notice should be updated if that happens."],
      ["4. Managing browser storage", "You can clear site data using your browser settings. Clearing local storage may sign you out, and clearing the sidebar cookie resets that preference. Blocking or deleting storage can affect parts of the application that rely on it."],
      ["5. Changes", "This notice reflects the current application implementation as of 20 October 2026. If browser storage practices change, this page should be updated before the new behavior is released."],
      ["6. Pakistan-oriented draft", "This notice is a product-specific draft and does not determine whether consent or another notice is required for a particular organization or deployment. Each organization should review the applicable Pakistani federal and provincial requirements for its use."],
    ],
  },
}

/** @param {{ type: "privacy" | "terms" | "cookies" }} props */
export default function LegalDocument({ type }) {
  const page = documents[type]
  if (!page) return null

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#24372a]">
      <header className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link href="/" className="inline-flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315e42] focus-visible:ring-offset-4">
          <BrandMark />
          <span><span className="block text-[15px] font-semibold tracking-[-0.03em]">EmployeeTracker</span><span className="block text-[11px] text-[#78847b]">People operations, made clear</span></span>
        </Link>
        <Link href="/" className="inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-xs font-semibold text-[#526254] transition hover:bg-[#e9ede6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315e42]"><ArrowLeft className="h-4 w-4" /> Back to home</Link>
      </header>
      <article className="mx-auto max-w-[1180px] px-5 pb-16 pt-6 sm:px-8 sm:pb-24 lg:px-12">
        <div className="overflow-hidden rounded-[28px] bg-[#20392b] text-white sm:rounded-[36px]">
          <div className="grid lg:grid-cols-[1fr_0.82fr]">
            <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c7d8af]">{page.eyebrow}</p>
              <h1 className="mt-4 text-4xl font-medium tracking-[-0.055em] sm:text-5xl">{page.title}</h1>
              <p className="mt-5 max-w-[550px] text-sm leading-7 text-[#d3ddd1]">{page.intro}</p>
              <p className="mt-7 text-[11px] text-[#c1cfbd]">Last updated {page.updated} · Pakistan-oriented draft</p>
            </div>
            <div className="relative min-h-[220px] bg-[#dce4d7] sm:min-h-[300px] lg:min-h-[400px]">
              <Image src="/policy-workspace.png" alt="A calm, considered workspace with a notebook and laptop" fill sizes="(max-width: 1024px) 100vw, 42vw" className="object-cover object-center" />
            </div>
          </div>
        </div>
        <div className="mx-auto grid max-w-[1000px] gap-10 pt-12 sm:pt-16 lg:grid-cols-[190px_1fr] lg:gap-16">
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#899489]">On this page</p>
            <nav aria-label={`${page.title} sections`} className="mt-4 flex flex-wrap gap-2 lg:flex-col lg:items-start">
              {page.sections.map(([title], index) => <a key={title} href={`#section-${index + 1}`} className="rounded-full border border-[#e1e6df] bg-white px-3 py-2 text-[11px] text-[#647168] transition hover:border-[#b9c7b4] hover:text-[#26392d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315e42] lg:border-0 lg:bg-transparent lg:px-0">{title.replace(/^\d+\. /, "")}</a>)}
            </nav>
          </aside>
          <div className="min-w-0 divide-y divide-[#e1e6df] border-y border-[#e1e6df]">
            {page.sections.map(([title, body], index) => (
              <section key={title} id={`section-${index + 1}`} className="scroll-mt-8 py-7 sm:py-8">
                <h2 className="text-lg font-semibold tracking-[-0.025em] text-[#26392d]">{title}</h2>
                <p className="mt-3 text-[13px] leading-7 text-[#68756b]">{body}</p>
              </section>
            ))}
          </div>
        </div>
      </article>
      <footer className="border-t border-[#e1e6df] bg-white">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-4 px-5 py-6 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <Link href="/" className="text-xs font-semibold text-[#35483a]">EmployeeTracker</Link>
          <nav aria-label="Legal pages" className="flex gap-5 text-xs text-[#718076]">
            <Link href="/privacy" className="hover:text-[#20392b]">Privacy</Link><Link href="/terms" className="hover:text-[#20392b]">Terms</Link><Link href="/cookies" className="hover:text-[#20392b]">Cookies</Link>
          </nav>
          <p className="text-[11px] text-[#8a948b]">Draft policies for review · Pakistan</p>
        </div>
      </footer>
    </main>
  )
}
