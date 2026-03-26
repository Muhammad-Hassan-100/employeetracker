"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Clock3, Loader2, RefreshCw, Search, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { authFetch } from "@/lib/client-session"
import type { SessionUser } from "@/lib/session"

interface Leave {
  id: string
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  reason: string
  status: "pending" | "approved" | "rejected"
  appliedDate: string
  reviewComments?: string
}

interface AdminLeaveManagementProps {
  adminUser: SessionUser
}

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

export default function AdminLeaveManagement({ adminUser }: AdminLeaveManagementProps) {
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isReviewingId, setIsReviewingId] = useState<string | null>(null)

  const fetchLeaves = async (withLoader = false) => {
    if (withLoader) {
      setIsLoading(true)
    }

    try {
      const response = await authFetch("/api/leaves")
      const data = await response.json()

      if (!response.ok) {
        toast.error("Unable to load leave queue", {
          description: data.error || "Please try again.",
        })
        return
      }

      setLeaves(data)
    } catch {
      toast.error("Unable to load leave queue")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaves(true)
    const interval = setInterval(() => fetchLeaves(false), 20000)
    return () => clearInterval(interval)
  }, [])

  const filteredLeaves = useMemo(() => {
    return leaves
      .filter((leave) => (statusFilter === "all" ? true : leave.status === statusFilter))
      .filter((leave) => leave.employeeName.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime())
  }, [leaves, searchTerm, statusFilter])

  const handleReview = async (leaveId: string, status: "approved" | "rejected") => {
    setIsReviewingId(leaveId)

    try {
      const response = await authFetch(`/api/leaves/${leaveId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reviewedBy: adminUser.name,
          reviewComments: reviewComments[leaveId]?.trim() || undefined,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error(`Unable to ${status} request`, {
          description: data.error || "Please try again.",
        })
        return
      }

      toast.success(`Leave ${status}`, {
        description: `${status === "approved" ? "Attendance records were updated." : "The employee can submit another future request if needed."}`,
      })
      setReviewComments((prev) => ({ ...prev, [leaveId]: "" }))
      await fetchLeaves(false)
    } catch {
      toast.error("Review request failed")
    } finally {
      setIsReviewingId(null)
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
          <h2 className="text-2xl font-bold text-slate-950">Leave Approval Queue</h2>
          <p className="text-slate-600">Review and manage upcoming leave requests from your team.</p>
        </div>
        <Button variant="outline" className="rounded-2xl" onClick={() => fetchLeaves(true)}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <Clock3 className="h-10 w-10 rounded-2xl bg-amber-100 p-2 text-amber-700" />
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-bold">{leaves.filter((leave) => leave.status === "pending").length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <CheckCircle2 className="h-10 w-10 rounded-2xl bg-emerald-100 p-2 text-emerald-700" />
            <div>
              <p className="text-sm text-slate-500">Approved</p>
              <p className="text-2xl font-bold">{leaves.filter((leave) => leave.status === "approved").length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <XCircle className="h-10 w-10 rounded-2xl bg-rose-100 p-2 text-rose-700" />
            <div>
              <p className="text-sm text-slate-500">Rejected</p>
              <p className="text-2xl font-bold">{leaves.filter((leave) => leave.status === "rejected").length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <Search className="h-10 w-10 rounded-2xl bg-sky-100 p-2 text-sky-700" />
            <div>
              <p className="text-sm text-slate-500">Total</p>
              <p className="text-2xl font-bold">{leaves.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl shadow-sm">
        <CardHeader>
          <CardTitle>Queue Filters</CardTitle>
          <CardDescription>Search by employee name and filter by approval state.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search employee..."
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-52">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="rounded-3xl shadow-sm">
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
          <CardDescription>Approve or reject requests directly from this queue.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredLeaves.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              No requests match the current filter.
            </div>
          ) : (
            filteredLeaves.map((leave) => (
              <div key={leave.id} className="rounded-3xl border border-slate-200 p-5">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-950">{leave.employeeName}</h3>
                      {getStatusBadge(leave.status)}
                      <Badge variant="outline">{leave.leaveType}</Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      {leave.startDate} to {leave.endDate}
                    </p>
                    <p className="text-sm text-slate-700">{leave.reason}</p>
                    <p className="text-xs text-slate-500">Applied: {new Date(leave.appliedDate).toLocaleString()}</p>
                    {leave.reviewComments && (
                      <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                        <span className="font-semibold">Review note:</span> {leave.reviewComments}
                      </div>
                    )}
                  </div>

                  {leave.status === "pending" && (
                    <div className="w-full space-y-3 xl:w-[340px]">
                      <div className="space-y-2">
                        <Label>Review comment</Label>
                        <Textarea
                          rows={4}
                          placeholder="Optional comment for the employee..."
                          value={reviewComments[leave.id] || ""}
                          onChange={(event) =>
                            setReviewComments((prev) => ({ ...prev, [leave.id]: event.target.value }))
                          }
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleReview(leave.id, "approved")}
                          disabled={isReviewingId === leave.id}
                          className="flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700"
                        >
                          {isReviewingId === leave.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
                        </Button>
                        <Button
                          onClick={() => handleReview(leave.id, "rejected")}
                          disabled={isReviewingId === leave.id}
                          variant="destructive"
                          className="flex-1 rounded-2xl"
                        >
                          {isReviewingId === leave.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
