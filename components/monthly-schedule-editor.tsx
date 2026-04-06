"use client"

import { useMemo, useState } from "react"
import { CalendarDays, WandSparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatTimeString12Hour } from "@/lib/time"

interface ShiftOption {
  id: string
  name: string
  startTime: string
  endTime: string
}

interface CustomScheduleEntry {
  date: string
  shiftId: string
}

interface MonthlyScheduleEditorProps {
  month: string
  onMonthChange: (value: string) => void
  schedule: CustomScheduleEntry[]
  onScheduleChange: (value: CustomScheduleEntry[]) => void
  shifts: ShiftOption[]
  workingDays: number[]
  disabled?: boolean
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function getMonthDays(monthInput: string) {
  if (!/^\d{4}-\d{2}$/.test(monthInput)) {
    return []
  }

  const [year, month] = monthInput.split("-").map(Number)
  const totalDays = new Date(year, month, 0).getDate()

  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(year, (month || 1) - 1, index + 1)
    const dateInput = `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`

    return {
      dateInput,
      dayNumber: index + 1,
      weekday: date.getDay(),
      weekdayLabel: WEEKDAY_LABELS[date.getDay()],
    }
  })
}

export default function MonthlyScheduleEditor({
  month,
  onMonthChange,
  schedule,
  onScheduleChange,
  shifts,
  workingDays,
  disabled = false,
}: MonthlyScheduleEditorProps) {
  const [bulkShiftId, setBulkShiftId] = useState("")
  const monthDays = useMemo(() => getMonthDays(month), [month])
  const scheduleMap = useMemo(() => new Map(schedule.map((entry) => [entry.date, entry.shiftId])), [schedule])

  const updateDateShift = (date: string, shiftId: string) => {
    const nextEntries = schedule.filter((entry) => entry.date !== date)

    if (shiftId !== "off") {
      nextEntries.push({ date, shiftId })
    }

    onScheduleChange(nextEntries.sort((left, right) => left.date.localeCompare(right.date)))
  }

  const applyCompanyWorkingDays = () => {
    if (!bulkShiftId || !monthDays.length) {
      return
    }

    const nextEntries = monthDays
      .filter((day) => workingDays.includes(day.weekday))
      .map((day) => ({
        date: day.dateInput,
        shiftId: bulkShiftId,
      }))

    onScheduleChange(nextEntries)
  }

  return (
    <Card className="rounded-3xl shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <CalendarDays className="h-5 w-5 text-sky-600" />
          Custom Monthly Schedule
        </CardTitle>
        <CardDescription>
          Choose a month and assign any shift to any day. Days left as off will not allow attendance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <div className="space-y-2">
            <Label htmlFor="custom-schedule-month">Schedule Month</Label>
            <Input
              id="custom-schedule-month"
              type="month"
              value={month}
              disabled={disabled}
              onChange={(event) => onMonthChange(event.target.value)}
            />
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="min-w-[220px] flex-1 space-y-2">
                <Label>Quick Fill Company Working Days</Label>
                <Select value={bulkShiftId} onValueChange={setBulkShiftId} disabled={disabled || shifts.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a shift to fill weekdays" />
                  </SelectTrigger>
                  <SelectContent>
                    {shifts.map((shift) => (
                      <SelectItem key={shift.id} value={shift.id}>
                        {shift.name} ({formatTimeString12Hour(shift.startTime)} to {formatTimeString12Hour(shift.endTime)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="rounded-2xl" disabled={disabled || !bulkShiftId} onClick={applyCompanyWorkingDays}>
                  <WandSparkles className="mr-2 h-4 w-4" />
                  Fill Working Days
                </Button>
                <Button type="button" variant="outline" className="rounded-2xl" disabled={disabled} onClick={() => onScheduleChange([])}>
                  Clear Month
                </Button>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Quick fill uses your company working days as a starting point. You can still change any individual day below.
            </p>
          </div>
        </div>

        {!month ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            Select a month first to build a custom employee schedule.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {monthDays.map((day) => {
              const value = scheduleMap.get(day.dateInput) || "off"
              const companyDay = workingDays.includes(day.weekday)

              return (
                <div key={day.dateInput} className="rounded-2xl border border-slate-200 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">
                        {day.weekdayLabel}, {day.dayNumber}
                      </p>
                      <p className="text-xs text-slate-500">{day.dateInput}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${companyDay ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {companyDay ? "Working Day" : "Off Day"}
                    </span>
                  </div>
                  <Select value={value} onValueChange={(shiftId) => updateDateShift(day.dateInput, shiftId)} disabled={disabled}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select shift or off" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Off</SelectItem>
                      {shifts.map((shift) => (
                        <SelectItem key={shift.id} value={shift.id}>
                          {shift.name} ({formatTimeString12Hour(shift.startTime)} to {formatTimeString12Hour(shift.endTime)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
