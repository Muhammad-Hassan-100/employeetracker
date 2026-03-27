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
