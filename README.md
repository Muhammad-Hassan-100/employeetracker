# Employee Tracker Pro

Multi-company employee attendance and leave management system built with Next.js and MongoDB.

## Overview

This project supports three main roles:

- `super_admin`: approves new company signups and manages platform-wide company and employee data
- `admin`: manages one company workspace, employees, shifts, rules, leaves, and attendance visibility
- `employee`: checks in, checks out, requests future leave, and reviews personal attendance history

The system is company-scoped. Each admin belongs to one company, and company data is isolated by `companyId`.

## Core Features

- Multi-company admin signup with approval workflow
- Super admin workspace for company approvals and management
- Company domain-based admin signup
- Auto-generated employee emails using the company domain
- Shift management with 12-hour UI
- Company work rules:
  - working days
  - departments
  - attendance access policy
- Attendance access policies:
  - `open`
  - `office_ip`
  - `office_location`
  - `hybrid`
- Per-employee attendance rules:
  - check-in before minutes
  - late relaxation minutes
- Future leave requests with admin approval or rejection
- Admin attendance monitor
- Employee attendance history
- Attendance reports
- Responsive dashboard UI

## Attendance Rules

Current attendance behavior:

- Employee can check in only within the allowed check-in window
- Late check-in requires a reason
- Early checkout requires a reason
- Overnight shifts are supported
- Checkout is allowed until `shift end + 6 hours`
- If checkout is not done within that 6-hour window:
  - attendance stays `present`
  - `hoursWorked` becomes `0`
  - checkout is no longer allowed
- If an employee never checks in and the shift end time passes:
  - the system auto-creates an `absent` record
  - check-in is blocked for that shift day afterward

## Company Rules

Admins manage company-wide rules from `Shifts & Rules`.

These settings are stored in the `companies` collection:

- `workingDays`
- `departments`
- `attendancePolicy`

Default values for new companies:

- Working days: Monday to Friday
- Off days: Saturday and Sunday
- Departments: default department list from `lib/company-settings.ts`
- Attendance policy: `open`

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- MongoDB
- Tailwind CSS
- Radix UI
- Sonner

## Environment

Create a `.env` file with:

```env
MONGODB_URI=mongodb://127.0.0.1:27017
```

The app connects to the `employee_tracker` database.

## Local Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Build the app:

```bash
npm run build
```

Start production server:

```bash
npm run start
```

Seed local database:

```bash
npm run seed
```

## Important Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run seed`

## Main Collections

- `users`
- `companies`
- `shifts`
- `attendance`
- `leaves`

## Key App Areas

- `app/login`
- `app/dashboard/attendance`
- `app/dashboard/leaves`
- `app/dashboard/employee-list`
- `app/dashboard/attendance-monitor`
- `app/dashboard/shifts`
- `app/dashboard/settings`
- `app/dashboard/platform/*`

## Important API Routes

- `app/api/auth/login`
- `app/api/auth/signup`
- `app/api/auth/profile`
- `app/api/company/settings`
- `app/api/employees/create`
- `app/api/employees/[id]`
- `app/api/employees/shift`
- `app/api/attendance/checkin`
- `app/api/attendance/checkout`
- `app/api/attendance/today`
- `app/api/attendance/history`
- `app/api/attendance/admin`
- `app/api/reports/attendance`
- `app/api/shifts`
- `app/api/leaves`
- `app/api/super-admin/*`

## Data Notes

- Attendance records are company-scoped
- Employee emails stay on the company domain
- Company admins cannot change the company domain
- Attendance reason fields are saved and shown in employee history, admin monitor, and employee detail timeline

## Deployment Notes

- MongoDB Atlas or local MongoDB both work
- Attendance IP restrictions behave more reliably in deployed environments than in `next dev`
- For office IP-based attendance, use the office public IP, not a device private IP
- For location-based attendance, browser geolocation permission is required

## Known Operational Notes

- The app uses lazy server-side attendance normalization for some rules, such as:
  - auto absent after shift end without check-in
  - expired checkout window after `shift end + 6 hours`
- That means records are finalized when relevant attendance routes are hit, rather than by a background scheduler

## Future Improvements

- Add a scheduled job for attendance finalization
- Add audit logs
- Add stronger automated end-to-end tests
- Add CSV/PDF exports in more places
- Add dashboard summary widgets for admins and super admin
