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

export function normalizeShiftTimeline(currentMinutes: number, startMinutes: number, endMinutes: number) {
  const isOvernight = endMinutes <= startMinutes

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
