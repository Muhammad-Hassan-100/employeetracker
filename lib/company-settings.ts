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
export const DEFAULT_ALLOW_EMPLOYEE_PASSWORD_CHANGE = false
export const DEFAULT_DASHBOARD_PRIMARY_COLOR = "#263c2c"
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

function parseHexColor(value: string) {
  return {
    red: Number.parseInt(value.slice(1, 3), 16),
    green: Number.parseInt(value.slice(3, 5), 16),
    blue: Number.parseInt(value.slice(5, 7), 16),
  }
}

function toHexColor({ red, green, blue }: { red: number; green: number; blue: number }) {
  return `#${[red, green, blue].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`
}

function mixHexColors(color: string, otherColor: string, colorShare: number) {
  const first = parseHexColor(color)
  const second = parseHexColor(otherColor)
  return toHexColor({
    red: first.red * colorShare + second.red * (1 - colorShare),
    green: first.green * colorShare + second.green * (1 - colorShare),
    blue: first.blue * colorShare + second.blue * (1 - colorShare),
  })
}

function getRelativeLuminance(value: string) {
  const { red, green, blue } = parseHexColor(value)
  const linearize = (channel: number) => {
    const normalized = channel / 255
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linearize(red) + 0.7152 * linearize(green) + 0.0722 * linearize(blue)
}

function getContrastWithWhite(value: string) {
  return 1.05 / (getRelativeLuminance(value) + 0.05)
}

export function normalizeDashboardPrimaryColor(value: unknown) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
    ? value.toLowerCase()
    : DEFAULT_DASHBOARD_PRIMARY_COLOR
}

export function getDashboardThemeVariables(value: unknown) {
  const brandColor = normalizeDashboardPrimaryColor(value)
  let primaryColor = brandColor
  let brandShare = 1

  while (getContrastWithWhite(primaryColor) < 4.5 && brandShare > 0.2) {
    brandShare -= 0.05
    primaryColor = mixHexColors(brandColor, "#000000", brandShare)
  }

  return {
    "--dashboard-brand": brandColor,
    "--dashboard-green": primaryColor,
    "--dashboard-green-hover": mixHexColors(primaryColor, "#000000", 0.88),
    "--dashboard-green-text": primaryColor,
    "--dashboard-green-soft": mixHexColors(brandColor, "#ffffff", 0.1),
    "--dashboard-accent": mixHexColors(brandColor, "#ffffff", 0.18),
  }
}

export function normalizeWorkingDays(value: unknown): number[] {
  const source = Array.isArray(value) ? value : DEFAULT_WORKING_DAYS
  const days = source
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 6)

  return Array.from(new Set(days)).sort((left, right) => left - right)
}

export function normalizeDepartments(value: unknown): string[] {
  const source = Array.isArray(value) ? value : DEFAULT_DEPARTMENTS
  const items = source.map((entry) => String(entry).trim()).filter(Boolean)

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

export function normalizeAllowEmployeePasswordChange(value: unknown) {
  if (value === true || value === "true") {
    return true
  }

  if (value === false || value === "false") {
    return false
  }

  return DEFAULT_ALLOW_EMPLOYEE_PASSWORD_CHANGE
}

export function getCompanyAllowEmployeePasswordChange(company: any) {
  return normalizeAllowEmployeePasswordChange(company?.allowEmployeePasswordChange)
}

export function isCompanyOffDay(date: Date, workingDays: number[]) {
  return !workingDays.includes(date.getDay())
}
