export function formatLocalDateInput(value = new Date()) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export function getLocalTimeMinutes(value = new Date()) {
  return value.getHours() * 60 + value.getMinutes()
}

export function getTimeStringMinutes(time: string) {
  const [hours = "0", minutes = "0"] = String(time).split(":")
  return Number(hours) * 60 + Number(minutes)
}

export function shiftSpansMidnight(startMinutes: number, endMinutes: number) {
  return endMinutes <= startMinutes
}

export function getPreviousLocalDateInput(dateInput: string) {
  const [year, month, day] = dateInput.split("-").map(Number)
  const value = new Date(year, (month || 1) - 1, day || 1)
  value.setDate(value.getDate() - 1)
  return formatLocalDateInput(value)
}

export function getRecentShiftDateInputs(dateInput: string) {
  return [getPreviousLocalDateInput(dateInput), dateInput]
}

export function resolveAttendanceRecordDate(dateInput: string, currentMinutes: number, startMinutes: number, endMinutes: number) {
  if (shiftSpansMidnight(startMinutes, endMinutes) && currentMinutes < endMinutes) {
    return getPreviousLocalDateInput(dateInput)
  }

  return dateInput
}

export function getLocalDateDifference(fromDateInput: string, toDateInput: string) {
  const [fromYear, fromMonth, fromDay] = fromDateInput.split("-").map(Number)
  const [toYear, toMonth, toDay] = toDateInput.split("-").map(Number)
  const fromDate = new Date(fromYear, (fromMonth || 1) - 1, fromDay || 1)
  const toDate = new Date(toYear, (toMonth || 1) - 1, toDay || 1)

  return Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000)
}

export function getShiftEndAbsoluteMinutes(startMinutes: number, endMinutes: number) {
  return shiftSpansMidnight(startMinutes, endMinutes) ? endMinutes + 1440 : endMinutes
}

export function getAttendanceWindowState({
  currentDateInput,
  currentMinutes,
  graceMinutes,
  lateCheckoutGraceMinutes = 0,
  recordDateInput,
  startMinutes,
  endMinutes,
}: {
  currentDateInput: string
  currentMinutes: number
  graceMinutes: number
  lateCheckoutGraceMinutes?: number
  recordDateInput: string
  startMinutes: number
  endMinutes: number
}) {
  const dayDifference = getLocalDateDifference(recordDateInput, currentDateInput)
  const absoluteCurrentMinutes = dayDifference * 1440 + currentMinutes
  const shiftEndAbsoluteMinutes = getShiftEndAbsoluteMinutes(startMinutes, endMinutes)
  const normalCheckoutDeadlineMinutes = shiftEndAbsoluteMinutes + lateCheckoutGraceMinutes
  const checkoutDeadlineMinutes = shiftEndAbsoluteMinutes + graceMinutes

  return {
    isBeforeShiftEnd: absoluteCurrentMinutes < shiftEndAbsoluteMinutes,
    isAfterNormalCheckoutWindow: absoluteCurrentMinutes > normalCheckoutDeadlineMinutes,
    isCheckoutExpired: absoluteCurrentMinutes > checkoutDeadlineMinutes,
    shiftEndAbsoluteMinutes,
    normalCheckoutDeadlineMinutes,
    checkoutDeadlineMinutes,
    absoluteCurrentMinutes,
  }
}

export function hasShiftEndedForRecordDate({
  currentDateInput,
  currentMinutes,
  recordDateInput,
  startMinutes,
  endMinutes,
}: {
  currentDateInput: string
  currentMinutes: number
  recordDateInput: string
  startMinutes: number
  endMinutes: number
}) {
  const dayDifference = getLocalDateDifference(recordDateInput, currentDateInput)
  const absoluteCurrentMinutes = dayDifference * 1440 + currentMinutes
  return absoluteCurrentMinutes >= getShiftEndAbsoluteMinutes(startMinutes, endMinutes)
}

export function normalizeShiftTimeline(currentMinutes: number, startMinutes: number, endMinutes: number) {
  const isOvernight = shiftSpansMidnight(startMinutes, endMinutes)

  return {
    isOvernight,
    adjustedCurrentMinutes: isOvernight && currentMinutes < startMinutes ? currentMinutes + 1440 : currentMinutes,
    adjustedEndMinutes: isOvernight ? endMinutes + 1440 : endMinutes,
  }
}

export function isBeforeShiftEnd(currentMinutes: number, startMinutes: number, endMinutes: number) {
  const { adjustedCurrentMinutes, adjustedEndMinutes } = normalizeShiftTimeline(currentMinutes, startMinutes, endMinutes)
  return adjustedCurrentMinutes < adjustedEndMinutes
}

export function getTimeStringFromMinutes(totalMinutes: number) {
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440
  const hours = Math.floor(normalizedMinutes / 60)
  const minutes = normalizedMinutes % 60

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}
