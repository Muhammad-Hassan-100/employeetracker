"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { CalendarClock, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { authFetch } from "@/lib/client-session"
import { formatTimeString12Hour } from "@/lib/time"

interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
  description?: string
}

const DEFAULT_START_TIME = "09:00"
const DEFAULT_END_TIME = "17:00"
const hourOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"))
const minuteOptions = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"))

type TimePart = "hour" | "minute" | "period"

function getTimeParts(value: string) {
  const [rawHours = "9", rawMinutes = "00"] = value.split(":")
  const hours = Number(rawHours)
  const isPm = hours >= 12
  const normalizedHours = hours % 12 || 12

  return {
    hour: String(normalizedHours).padStart(2, "0"),
    minute: rawMinutes.padStart(2, "0"),
    period: isPm ? "PM" : "AM",
  }
}

function buildTimeValue(parts: ReturnType<typeof getTimeParts>) {
  let hours = Number(parts.hour) % 12
  if (parts.period === "PM") {
    hours += 12
  }

  return `${String(hours).padStart(2, "0")}:${parts.minute}`
}

export default function ShiftManagement() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "",
    startTime: DEFAULT_START_TIME,
    endTime: DEFAULT_END_TIME,
    description: "",
  })

  const fetchShifts = async (withLoader = false) => {
    if (withLoader) {
      setIsLoading(true)
    }

    try {
      const response = await authFetch("/api/shifts")
      const data = await response.json()

      if (!response.ok) {
        toast.error("Unable to load shifts", {
          description: data.error || "Please try again.",
        })
        return
      }

      setShifts(data)
    } catch {
      toast.error("Unable to load shifts")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchShifts(true)
    const interval = setInterval(() => fetchShifts(false), 20000)
    return () => clearInterval(interval)
  }, [])

  const resetForm = () => {
    setEditingShiftId(null)
    setForm({ name: "", startTime: DEFAULT_START_TIME, endTime: DEFAULT_END_TIME, description: "" })
  }

  const handleTimePartChange = (field: "startTime" | "endTime", part: TimePart, value: string) => {
    setForm((prev) => {
      const current = getTimeParts(prev[field])
      const next = {
        ...current,
        [part]: value,
      }

      return {
        ...prev,
        [field]: buildTimeValue(next),
      }
    })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const endpoint = editingShiftId ? `/api/shifts/${editingShiftId}` : "/api/shifts/create"
      const method = editingShiftId ? "PUT" : "POST"

      const response = await authFetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error("Unable to save shift", { description: data.error || "Please try again." })
        return
      }

      toast.success(editingShiftId ? "Shift updated" : "Shift created")
      resetForm()
      await fetchShifts(false)
    } catch {
      toast.error("Unable to save shift")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (shift: Shift) => {
    setEditingShiftId(shift.id)
    setForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      description: shift.description || "",
    })
  }

  const handleDelete = async (shiftId: string) => {
    try {
      const response = await authFetch(`/api/shifts/${shiftId}`, { method: "DELETE" })
      const data = await response.json()

      if (!response.ok) {
        toast.error("Unable to delete shift", { description: data.error || "Please try again." })
        return
      }

      toast.success("Shift deleted")
      if (editingShiftId === shiftId) {
        resetForm()
      }
      await fetchShifts(false)
    } catch {
      toast.error("Unable to delete shift")
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Card className="rounded-3xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Plus className="h-5 w-5 text-emerald-600" />
            {editingShiftId ? "Edit Shift" : "Create Shift"}
          </CardTitle>
          <CardDescription>Keep shift timing accurate so attendance rules work correctly.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Shift Name</Label>
              <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={getTimeParts(form.startTime).hour} onValueChange={(value) => handleTimePartChange("startTime", "hour", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Hour" />
                    </SelectTrigger>
                    <SelectContent>
                      {hourOptions.map((hour) => (
                        <SelectItem key={hour} value={hour}>
                          {hour}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={getTimeParts(form.startTime).minute}
                    onValueChange={(value) => handleTimePartChange("startTime", "minute", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Minute" />
                    </SelectTrigger>
                    <SelectContent>
                      {minuteOptions.map((minute) => (
                        <SelectItem key={minute} value={minute}>
                          {minute}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={getTimeParts(form.startTime).period}
                    onValueChange={(value) => handleTimePartChange("startTime", "period", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="AM/PM" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-slate-500">Selected time: {formatTimeString12Hour(form.startTime)}</p>
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={getTimeParts(form.endTime).hour} onValueChange={(value) => handleTimePartChange("endTime", "hour", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Hour" />
                    </SelectTrigger>
                    <SelectContent>
                      {hourOptions.map((hour) => (
                        <SelectItem key={hour} value={hour}>
                          {hour}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={getTimeParts(form.endTime).minute}
                    onValueChange={(value) => handleTimePartChange("endTime", "minute", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Minute" />
                    </SelectTrigger>
                    <SelectContent>
                      {minuteOptions.map((minute) => (
                        <SelectItem key={minute} value={minute}>
                          {minute}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={getTimeParts(form.endTime).period}
                    onValueChange={(value) => handleTimePartChange("endTime", "period", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="AM/PM" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-slate-500">Selected time: {formatTimeString12Hour(form.endTime)}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={4}
                placeholder="Optional notes about this shift..."
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={isSubmitting} className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingShiftId ? (
                  "Update Shift"
                ) : (
                  "Create Shift"
                )}
              </Button>
              {editingShiftId && (
                <Button type="button" variant="outline" className="rounded-2xl" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-3xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <CalendarClock className="h-5 w-5 text-sky-600" />
            Shift Library
          </CardTitle>
          <CardDescription>All saved shifts appear here for quick review and editing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : shifts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              No shifts yet. Create your first shift to start assigning employees.
            </div>
          ) : (
            shifts.map((shift) => (
              <div key={shift.id} className="rounded-3xl border border-slate-200 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-950">{shift.name}</h3>
                      <Badge variant="outline">
                        {formatTimeString12Hour(shift.startTime)} to {formatTimeString12Hour(shift.endTime)}
                      </Badge>
                    </div>
                    {shift.description && <p className="mt-3 text-sm text-slate-600">{shift.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="rounded-2xl" onClick={() => handleEdit(shift)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="outline" className="rounded-2xl text-rose-700" onClick={() => handleDelete(shift.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
