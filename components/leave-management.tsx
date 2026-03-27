"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, FileCheck2, FileClock, Loader2, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { authFetch } from "@/lib/client-session"
import type { SessionUser } from "@/lib/session"

interface Leave {
  id: string
  employeeName: string
  leaveType: "sick" | "personal" | "vacation" | "emergency" | "other"
  startDate: string
  endDate: string
  reason: string
  status: "pending" | "approved" | "rejected"
  appliedDate: string
  reviewComments?: string
}

interface LeaveManagementProps {
  user: SessionUser
}

const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]

function getStatusBadge(status: Leave["status"]) {
  switch (status) {
    case "approved":
      return <Badge className="bg-emerald-100 text-emerald-900">Approved</Badge>
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>
    default:
      return <Badge variant="secondary">Pending</Badge>
  }
}

export default function LeaveManagement({ user }: LeaveManagementProps) {
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: "",
  })

  const fetchLeaves = async (withLoader = false) => {
    if (withLoader) {
      setIsLoading(true)
    }

    try {
      const response = await authFetch(`/api/leaves?userId=${user.id}`)
      const data = await response.json()

      if (!response.ok) {
        toast.error("Unable to load leave requests", {
          description: data.error || "Please try again.",
        })
        return
      }

      setLeaves(data)
    } catch {
      toast.error("Unable to load leave requests")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaves(true)
    const interval = setInterval(() => fetchLeaves(false), 20000)
    return () => clearInterval(interval)
  }, [user.id])

  const totalDays = useMemo(() => {
    if (!form.startDate || !form.endDate) {
      return 0
    }

    const start = new Date(form.startDate)
    const end = new Date(form.endDate)
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }, [form.startDate, form.endDate])

  const handleSubmit = async () => {
    if (!form.leaveType || !form.startDate || !form.endDate || !form.reason.trim()) {
      toast.error("All leave fields are required")
      return
    }

    if (form.startDate < tomorrow) {
      toast.error("Only future leave requests are allowed", {
        description: "Same-day leave has been disabled in this system.",
      })
      return
    }

    if (form.endDate < form.startDate) {
      toast.error("End date cannot be before start date")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await authFetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          employeeName: user.name,
          ...form,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error("Leave request failed", { description: data.error || "Please try again." })
        return
      }

      setForm({ leaveType: "", startDate: "", endDate: "", reason: "" })
      setShowForm(false)
      toast.success("Leave request submitted", {
        description: "Your request is now waiting for admin approval.",
      })
      await fetchLeaves(false)
    } catch {
      toast.error("Leave request failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">Leave Requests</h2>
          <p className="text-slate-600">You can request leave for upcoming dates only.</p>
        </div>
        <Button onClick={() => setShowForm((prev) => !prev)} className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800">
          <Plus className="mr-2 h-4 w-4" />
          {showForm ? "Hide Form" : "Request Leave"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <FileClock className="h-10 w-10 rounded-2xl bg-amber-100 p-2 text-amber-700" />
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-bold">{leaves.filter((leave) => leave.status === "pending").length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <FileCheck2 className="h-10 w-10 rounded-2xl bg-emerald-100 p-2 text-emerald-700" />
            <div>
              <p className="text-sm text-slate-500">Approved</p>
              <p className="text-2xl font-bold">{leaves.filter((leave) => leave.status === "approved").length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <CalendarDays className="h-10 w-10 rounded-2xl bg-sky-100 p-2 text-sky-700" />
            <div>
              <p className="text-sm text-slate-500">Total Requests</p>
              <p className="text-2xl font-bold">{leaves.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <Card className="rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>New Leave Request</CardTitle>
            <CardDescription>Only future dates are allowed for this workflow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <Select value={form.leaveType} onValueChange={(value) => setForm((prev) => ({ ...prev, leaveType: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="personal">Personal Leave</SelectItem>
                    <SelectItem value="vacation">Vacation</SelectItem>
                    <SelectItem value="emergency">Emergency Leave</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Total Days</Label>
                <div className="rounded-2xl border bg-slate-50 px-4 py-2.5 text-sm text-slate-700">
                  {totalDays > 0 ? `${totalDays} day(s)` : "Select start and end date"}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  min={tomorrow}
                  value={form.startDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  min={form.startDate || tomorrow}
                  value={form.endDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                rows={4}
                placeholder="Describe why you need the leave..."
                value={form.reason}
                onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
              />
            </div>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Leave Request"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-3xl shadow-sm">
        <CardHeader>
          <CardTitle>Your Requests</CardTitle>
          <CardDescription>Track the status of your leave requests here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {leaves.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              No leave requests yet.
            </div>
          ) : (
            leaves.map((leave) => (
              <div key={leave.id} className="rounded-3xl border border-slate-200 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-950">
                        {leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)} Leave
                      </h3>
                      {getStatusBadge(leave.status)}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {leave.startDate} to {leave.endDate}
                    </p>
                    <p className="mt-2 text-sm text-slate-700">{leave.reason}</p>
                  </div>
                  <div className="text-sm text-slate-500">Applied: {new Date(leave.appliedDate).toLocaleDateString()}</div>
                </div>
                {leave.reviewComments && (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                    <span className="font-semibold">Admin note:</span> {leave.reviewComments}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
