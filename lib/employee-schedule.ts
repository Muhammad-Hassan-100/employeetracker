import { ObjectId, type Collection } from "mongodb"

export type EmployeeScheduleMode = "company_default" | "custom_monthly"

export interface EmployeeCustomScheduleEntry {
  date: string
  shiftId: string
}

export function normalizeEmployeeScheduleMode(value: unknown): EmployeeScheduleMode {
  return value === "custom_monthly" ? "custom_monthly" : "company_default"
}

export function normalizeEmployeeCustomSchedule(value: unknown): EmployeeCustomScheduleEntry[] {
  if (!Array.isArray(value)) {
    return []
  }

  const seenDates = new Set<string>()
  const entries: EmployeeCustomScheduleEntry[] = []

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue
    }

    const date = String((entry as { date?: unknown }).date || "").trim()
    const shiftId = String((entry as { shiftId?: unknown }).shiftId || "").trim()

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !shiftId || seenDates.has(date)) {
      continue
    }

    seenDates.add(date)
    entries.push({ date, shiftId })
  }

  return entries.sort((left, right) => left.date.localeCompare(right.date))
}

export function getMonthInputFromDate(dateInput: string) {
  return dateInput.slice(0, 7)
}

export function isDateWithinMonth(dateInput: string, monthInput: string) {
  return /^\d{4}-\d{2}$/.test(monthInput) && dateInput.startsWith(`${monthInput}-`)
}

export function getDateDayOfWeek(dateInput: string) {
  const [year, month, day] = dateInput.split("-").map(Number)
  return new Date(year, (month || 1) - 1, day || 1).getDay()
}

async function findShiftByReference({
  shiftRef,
  companyId,
  shiftsCollection,
}: {
  shiftRef: string
  companyId: string
  shiftsCollection: Collection
}) {
  try {
    const byId = await shiftsCollection.findOne({
      _id: new ObjectId(shiftRef),
      companyId,
    })

    if (byId) {
      return byId
    }
  } catch {
    // Fall through to the legacy name lookup.
  }

  return shiftsCollection.findOne({
    companyId,
    name: { $regex: new RegExp(`^${shiftRef}$`, "i") },
  })
}

export async function getEmployeeShiftAssignmentForDate({
  user,
  dateInput,
  workingDays,
  shiftsCollection,
  companyId,
}: {
  user: any
  dateInput: string
  workingDays: number[]
  shiftsCollection: Collection
  companyId: string
}) {
  const scheduleMode = normalizeEmployeeScheduleMode(user?.scheduleMode)
  const customSchedule = normalizeEmployeeCustomSchedule(user?.customSchedule)

  if (scheduleMode === "custom_monthly") {
    const customEntry = customSchedule.find((entry) => entry.date === dateInput)
    if (!customEntry) {
      return {
        scheduleMode,
        isScheduled: false,
        shift: null,
        shiftId: null,
      }
    }

    const shift = await findShiftByReference({
      shiftRef: customEntry.shiftId,
      companyId,
      shiftsCollection,
    })

    return {
      scheduleMode,
      isScheduled: Boolean(shift),
      shift: shift || null,
      shiftId: customEntry.shiftId,
    }
  }

  if (!user?.shiftId || !workingDays.includes(getDateDayOfWeek(dateInput))) {
    return {
      scheduleMode,
      isScheduled: false,
      shift: null,
      shiftId: null,
    }
  }

  const shift = await findShiftByReference({
    shiftRef: String(user.shiftId),
    companyId,
    shiftsCollection,
  })

  return {
    scheduleMode,
    isScheduled: Boolean(shift),
    shift: shift || null,
    shiftId: String(user.shiftId),
  }
}
