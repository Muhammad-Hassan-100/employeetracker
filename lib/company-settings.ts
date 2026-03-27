export const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
]

export const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5]
export const DEFAULT_DEPARTMENTS = [
  "HR",
  "IT",
  "Finance",
  "Marketing",
  "Operations",
  "Admin",
  "Sales",
  "Support",
  "Engineering",
  "Design",
]

export function normalizeWorkingDays(value: unknown): number[] {
  const source = Array.isArray(value) ? value : DEFAULT_WORKING_DAYS
  const days = source
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 6)

  return Array.from(new Set(days)).sort((left, right) => left - right)
}

export function normalizeDepartments(value: unknown): string[] {
  const source = Array.isArray(value) ? value : DEFAULT_DEPARTMENTS
  const items = source
    .map((entry) => String(entry).trim())
    .filter(Boolean)

  return Array.from(new Set(items))
}

export function getCompanyWorkingDays(company: any): number[] {
  const normalized = normalizeWorkingDays(company?.workingDays)
  return normalized.length ? normalized : DEFAULT_WORKING_DAYS
}

export function getCompanyDepartments(company: any): string[] {
  const normalized = normalizeDepartments(company?.departments)
  return normalized.length ? normalized : DEFAULT_DEPARTMENTS
}

export function isCompanyOffDay(date: Date, workingDays: number[]) {
  return !workingDays.includes(date.getDay())
}
