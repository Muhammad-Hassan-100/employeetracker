# EmployeeTracker Pro — Site Features and Flows

This document records the site's current behavior as implemented in the repository. It is intended as a baseline for future changes. When this document and the code disagree, the code is the source of truth; update this file when behavior changes.

## 1. Product overview

EmployeeTracker Pro is a multi-company workforce app. It supports three roles:

| Role | Scope | Main job |
| --- | --- | --- |
| `super_admin` | Entire platform | Review company signup requests and manage companies and employees across workspaces |
| `admin` | One company (`companyId`) | Manage employees, schedules, shifts, company rules, leave reviews, attendance visibility, and reports |
| `employee` | Own account and records | Check in/out, request leave, review attendance, and optionally change password |

Company-facing records are generally queried with the signed-in session's `companyId`. The app uses MongoDB collections `users`, `companies`, `shifts`, `attendance`, and `leaves`.

## 2. Entry, authentication, and navigation

### Public routes

- `/` — product landing page, feature overview, and links to sign in or create a company.
- `/login` — sign-in and company signup tabs. `/login?mode=signup` opens the signup tab.
- Unknown routes render the custom 404 page at `app/not-found.tsx`.

### Sign-in flow

1. A user submits email and password on `/login`.
2. `POST /api/auth/login` finds the user and checks the password and account/company state.
3. Inactive accounts cannot sign in. Admins whose account or company approval is pending/rejected are denied.
4. On success, the UI stores the returned user in browser `localStorage` under `user` and navigates to `/dashboard`.
5. Dashboard routing sends `super_admin` to `/dashboard/platform/requests`, `admin` to `/dashboard/employees`, and employees to `/dashboard/attendance`.
6. The dashboard layout reads the stored user and renders the role-specific sidebar. Missing client session redirects to `/login`.

`authFetch` adds the stored user's identity fields as request headers. The app does not use a server-managed cookie session in this flow. Individual API handlers still apply their own session/role checks.

### Company signup and approval flow

1. The applicant opens `/login?mode=signup` and provides company name/domain, admin name, work email, and password.
2. The UI and `POST /api/auth/signup` reject public email domains and require the admin email domain to match the company domain. Password minimum is six characters.
3. The server creates a company and admin account with `approvalStatus: pending`; the admin is inactive. Company defaults are Monday–Friday working days, default departments, open attendance access, and employee password changes disabled.
4. The applicant sees a submitted message and returns to the sign-in tab. The new admin cannot sign in until platform approval activates it.
5. A super admin opens Approval Requests, reviews the pending company and approves or rejects it. The company detail route can also edit approval state.
6. On approval, the company/admin become approved and the admin account becomes active. The admin can sign in and start configuring the workspace.

## 3. Role navigation and page features

### Super admin

Sidebar entries:

- **Approval Requests** — review pending company signup requests; approve or reject.
- **Companies** — view platform companies and employee counts, open company detail, and delete a company.
- **Employees** — view platform employees, activate/deactivate, or delete an employee.

`/dashboard/platform` redirects to Approval Requests. Company detail can update company name, admin name/email, admin status, and approval status. Deleting a company removes its company record, users, shifts, leaves, and attendance records.

### Company admin

Sidebar entries:

- **Add Employee** (`/dashboard/employees`) — create an employee account, choose department/position, set attendance allowances, and assign either a company-default shift or a custom monthly schedule.
- **Shifts & Rules** (`/dashboard/shifts`) — create/edit/delete shifts and configure company working days, departments, attendance access, and whether employees may change their password.
- **Attendance Monitor** (`/dashboard/attendance-monitor`) — select a date and inspect the company's attendance snapshot, including employee/schedule and attendance state.
- **All Employees** (`/dashboard/employee-list`) — view employee list and active/inactive counts; edit, activate/deactivate, or delete employees.
- **Leave Queue** (`/dashboard/leaves`) — review pending requests and view pending/approved/rejected counts; approve or reject pending leave.
- **Reports** (`/dashboard/reports`) — filter attendance summary by this week, this month, last month, or last three months; search/report employee attendance metrics and export CSV.
- **Settings** (`/dashboard/settings`) — update admin name/email and optionally password. Admin email must stay on the company's domain.

Employee detail uses `/dashboard/employees/[id]`. The view mode is linked from the attendance monitor and shows a date-filtered attendance timeline with check-in/out, hours, status, and recorded reasons. Edit mode is linked from All Employees (`?mode=edit`) and edits profile fields, department, position, schedule type, shift/custom monthly dates, and per-employee check-in/late/check-out rules.

### Employee

Sidebar entries:

- **Attendance** (`/dashboard/attendance`) — today's shift, attendance policy, check-in/check-out action, and action reasons where needed.
- **Leave Requests** (`/dashboard/leaves`) — submit future leave and review own request statuses.
- **My History** (`/dashboard/history`) — view personal attendance records and summary counts.
- **Settings** — shown only when the company admin has enabled employee password changes; employees can update their own password.

## 4. Main workflows

### Admin setup and employee onboarding

1. Admin creates shifts with a name, start time, end time, and optional description. Shift times are stored as 24-hour strings; UI time display uses 12-hour formatting.
2. Admin sets working days, department options, attendance access policy, and employee password-change permission in Shifts & Rules.
3. Admin adds an employee. Employee email is generated from the employee name and the company's domain. Admin chooses department, position, join date, schedule type, and attendance rules.
4. For `company_default`, employee gets one default shift and works on company working days. For `custom_monthly`, admin chooses a month and assigns shifts to specific dates; the default shift is not used for scheduled dates.
5. Admin can later edit these fields or deactivate/delete the employee from All Employees. Inactive employees are excluded from normal company attendance/reporting queries and cannot submit a leave request.

### Attendance lifecycle

1. Attendance page loads the employee's shift assignment for today and the current attendance record. Shift assignment uses company working days or the employee's custom monthly dates.
2. Check-in is available within the shift's allowed early window (`checkInBeforeMinutes`, defaulting to five minutes when not set). The server rejects an action with no assigned shift, an off-day, approved leave, an existing check-in, or an already-finalized absence.
3. A check-in after the shift start plus the employee's `lateGraceMinutes` is late and requires a reason. The app records check-in time and late state.
4. Check-out requires an open check-in record and its shift assignment. Before shift end, a reason is required and the record is marked early. After the employee's normal checkout grace (`checkOutGraceMinutes`), a late checkout reason is required.
5. Checkout remains available until six hours after shift end. Once that fixed window expires, checkout is closed, the record remains `present`, `hoursWorked` is set to zero, and the record is marked expired. Within the allowed window, actual elapsed hours are saved (rounded to two decimal places).
6. Overnight shifts are supported. After-midnight actions can attach to the previous local shift date.
7. If no check-in exists after a scheduled shift ends, attendance routes can create an `absent` record. This is lazy finalization: it runs when relevant attendance routes are requested, not through a background job.

Attendance statuses are `present`, `absent`, and `on_leave`; `isLate` and `isEarly` add detail to a present record. The UI shows late, early exit, on leave, absent, or on time states and displays saved reasons in history/detail views.

### Leave request and review

1. Employee enters leave type, date range, and reason. The UI requires all fields, a future start date, and an end date on/after the start date.
2. `POST /api/leaves` verifies the employee belongs to the current company and is active, checks the date order, and rejects an overlap with an existing pending or approved request.
3. A new request is saved as `pending` and appears in the employee's request list and admin Leave Queue.
4. Admin approves or rejects a pending request. Approval marks scheduled leave dates `on_leave` in attendance; it is blocked if the employee already checked in on one of those dates. Rejection removes/fixes attendance records associated with that leave where applicable.
5. Request status, reviewer/date/comments are displayed in the employee and admin leave views.

### Attendance monitoring and reports

- The monitor requests a company snapshot for a selected date. It combines employee status, schedule, attendance, approved leave, and off-day information.
- Reports aggregate active employees across a selected period: scheduled days, present/absent/leave days, late arrivals, early exits, average hours, and attendance rate. Custom monthly schedules contribute their explicit scheduled dates.
- CSV export is generated in the browser from the currently loaded report rows.

### Profile/settings

- Admin can change their name, email on the same company domain, and password.
- Employee password changes are available only if the admin enables the company-wide option. The UI checks password strength/confirmation and the server enforces the minimum length and company permission.
- Sidebar refreshes the current admin/employee profile from `/api/auth/profile` so the displayed user/settings permission can update.

## 5. Company rules and scheduling behavior

- Default working days are Monday through Friday; working-day values use JavaScript weekday numbering (`0` Sunday through `6` Saturday).
- Company departments are configurable. New companies use the defaults in `lib/company-settings.ts`.
- Attendance access currently supports `open` and `office_ip`. For office IP, at least one approved public IP must be configured; the server compares it with request IP headers (with a development fallback).
- Employees have configurable check-in-before, late-grace, and check-out-grace minutes.
- Custom schedules are month-specific date-to-shift assignments and are validated against the selected month and shifts in that company.

## 6. API route map

All routes are under `app/api`. Protected calls receive session headers through `authFetch`; handlers use session/role helpers in `lib/session.ts` and commonly scope data by `companyId`.

| Route | Methods | Purpose / access |
| --- | --- | --- |
| `/api/auth/login` | POST | Sign in and return session user |
| `/api/auth/signup` | POST | Create pending company and admin request |
| `/api/auth/profile` | GET, PUT | Read/update admin profile or employee password (employee changes gated by company setting) |
| `/api/company/settings` | GET, PUT | Read/update company rules; admin only |
| `/api/employees/create` | POST | Create employee; admin only |
| `/api/employees` | GET | List employees in the admin's company |
| `/api/employees/[id]` | GET, PUT, DELETE | Read/edit/delete a company employee; admin only |
| `/api/employees/[id]/details` | GET | Employee detail data |
| `/api/employees/[id]/status` | PUT | Activate/deactivate employee; admin only |
| `/api/employees/shift` | GET | Resolve employee's shift and attendance policy for attendance UI |
| `/api/employees/status` | GET | Resolve current employee day status |
| `/api/shifts` | GET | List company shifts; admin only |
| `/api/shifts/create` | POST | Create company shift; admin only |
| `/api/shifts/[id]` | PUT, DELETE | Update/delete company shift; admin only |
| `/api/attendance/today` | GET | Read today's state and lazily finalize eligible absence/expired records; self/admin access |
| `/api/attendance/checkin` | POST | Validate and record check-in; self/admin access |
| `/api/attendance/checkout` | POST | Validate and record check-out; self/admin access |
| `/api/attendance/history` | GET | Read attendance history; self/admin access |
| `/api/attendance/admin` | GET | Selected-date company snapshot; admin only |
| `/api/reports/attendance` | GET | Period attendance summaries; admin only |
| `/api/leaves` | GET, POST | List own/company requests or submit leave; admin can list company queue |
| `/api/leaves/active` | GET | Read active leave data |
| `/api/leaves/[id]` | PUT, DELETE | Review/delete leave; admin only |
| `/api/super-admin/companies` | GET | List platform companies; super admin only |
| `/api/super-admin/companies/[companyId]` | GET, PUT, DELETE | Read/update/delete company and related data; super admin only |
| `/api/super-admin/employees` | GET | List platform employees; super admin only |
| `/api/super-admin/employees/[id]` | PUT, DELETE | Activate/deactivate/delete platform employee; super admin only |

## 7. Data and code map

- `app/` — public pages, dashboard routes, layouts, and API route handlers.
- `components/` — feature UI: employee management/list, shifts/rules, attendance, leaves, reports, settings, and super-admin tools.
- `lib/models/` — TypeScript shapes for User, Shift, Attendance, and Leave MongoDB documents.
- `lib/session.ts`, `lib/client-session.ts` — client session storage/header construction and server API authorization helpers.
- `lib/employee-schedule.ts`, `lib/attendance-time.ts`, `lib/attendance-policy.ts`, `lib/company-settings.ts` — scheduling, date/time windows, attendance access, and company defaults/normalization.
- `scripts/seed-database.js` — local seed script; consult it for current seed data rather than assuming demo accounts.
- `README.md` — setup, environment, and operational notes.

## 8. Current implementation notes and known gaps

These details matter when changing behavior:

1. README currently mentions `office_location` and `hybrid` attendance modes. The current policy type and UI only implement `open` and `office_ip`; `requiresAttendanceLocation()` currently returns `false`, so location-based enforcement is not active.
2. README's general statement that signup is company-domain based is implemented as domain matching and public-domain rejection, but this code does not verify that the applicant owns the domain through email verification.
3. Attendance auto-absence and checkout-window finalization are lazy and happen when attendance endpoints run. There is no scheduled worker/job in this repository.
4. The leave form enforces future dates in the browser, while the leave POST handler itself checks date ordering and overlap but does not independently reject past dates.
5. Leave approval date expansion skips Saturday/Sunday directly, rather than consulting the company's configured working days or custom employee schedule.
6. Leave approval updates the request status before processing every attendance date. If a later date fails due to an existing check-in, the handler returns an error after the status update; check this behavior before changing the approval flow.
7. The README lists more extensive future improvements; audit logs, scheduled finalization, and PDF export are not implemented in the current app flow.
8. Current authentication is not production-safe: passwords are stored and compared as plain text, while API identity is derived from client-supplied headers populated from `localStorage` rather than a signed server session. Treat this as a security gap that should be fixed before relying on the app with real accounts/data. The presence of a password-hashing dependency does not mean it is used by these routes.

## 9. Updating this document

When adding or changing a user-facing feature, update the affected role/page section and workflow above. When adding an API endpoint or changing authorization/data scope, update the API map and session/data notes. For attendance, schedules, or leave changes, update the explicit business rules and known gaps so future work can distinguish implemented behavior from planned behavior.
