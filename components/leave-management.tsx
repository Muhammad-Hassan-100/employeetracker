"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, FileText, Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface Leave {
  id: string
  userId: string
  employeeName: string
  leaveType: "sick" | "personal" | "vacation" | "emergency" | "other"
  startDate: string
  endDate: string
  reason: string
  status: "pending" | "approved" | "rejected"
  appliedDate: string
  reviewedBy?: string
  reviewedDate?: string
  reviewComments?: string
}

interface LeaveManagementProps {
  user: User
}

export default function LeaveManagement({ user }: LeaveManagementProps) {
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showApplyForm, setShowApplyForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [leaveForm, setLeaveForm] = useState({
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: "",
  })

  useEffect(() => {
    fetchLeaves()
  }, [user.id])

  const fetchLeaves = async () => {
    try {
      const response = await fetch(`/api/leaves?userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setLeaves(data)
      } else {
        toast.error("Failed to fetch leave applications")
      }
    } catch (error) {
      console.error("Error fetching leaves:", error)
      toast.error("Error fetching leave applications")
    } finally {
      setIsLoading(false)
    }
  }

  const handleApplyLeave = async () => {
    if (!leaveForm.leaveType || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
      toast.error("Please fill in all required fields")
      return
    }

    if (new Date(leaveForm.startDate) > new Date(leaveForm.endDate)) {
      toast.error("Start date cannot be after end date")
      return
    }

    if (new Date(leaveForm.startDate) < new Date()) {
      toast.error("Start date cannot be in the past")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/leaves", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          employeeName: user.name,
          ...leaveForm,
        }),
      })

      if (response.ok) {
        toast.success("Leave application submitted successfully!")
        setShowApplyForm(false)
        setLeaveForm({
          leaveType: "",
          startDate: "",
          endDate: "",
          reason: "",
        })
        fetchLeaves()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to submit leave application")
      }
    } catch (error) {
      console.error("Error applying for leave:", error)
      toast.error("Error submitting leave application")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "approved":
        return <Badge variant="default">Approved</Badge>
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getLeaveTypeBadge = (type: string) => {
    const colors = {
      sick: "bg-red-100 text-red-800",
      personal: "bg-blue-100 text-blue-800",
      vacation: "bg-green-100 text-green-800",
      emergency: "bg-orange-100 text-orange-800",
      other: "bg-gray-100 text-gray-800",
    }
    
    return (
      <Badge className={colors[type as keyof typeof colors] || colors.other}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    )
  }

  const calculateLeaveDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const timeDiff = end.getTime() - start.getTime()
    const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1
    return dayDiff
  }

  if (isLoading) {
    return <div className="flex justify-center items-center p-8">Loading leave applications...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Leave Management</h2>
          <p className="text-gray-600">Apply for leaves and track your applications</p>
        </div>
        <Button
          onClick={() => setShowApplyForm(!showApplyForm)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Apply for Leave
        </Button>
      </div>

      {/* Apply Leave Form */}
      {showApplyForm && (
        <Card>
          <CardHeader>
            <CardTitle>Apply for Leave</CardTitle>
            <CardDescription>Submit a new leave application</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leaveType">Leave Type</Label>
                <Select
                  value={leaveForm.leaveType}
                  onValueChange={(value) =>
                    setLeaveForm({ ...leaveForm, leaveType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
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
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={leaveForm.startDate}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, startDate: e.target.value })
                  }
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={leaveForm.endDate}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, endDate: e.target.value })
                  }
                  min={leaveForm.startDate || new Date().toISOString().split("T")[0]}
                />
              </div>

              {leaveForm.startDate && leaveForm.endDate && (
                <div className="space-y-2">
                  <Label>Total Days</Label>
                  <div className="p-2 bg-gray-100 rounded">
                    {calculateLeaveDays(leaveForm.startDate, leaveForm.endDate)} days
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="Please provide a reason for your leave..."
                value={leaveForm.reason}
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, reason: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleApplyLeave}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Submit Application
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowApplyForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leave Applications */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Your Leave Applications</h3>
        
        {leaves.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No leave applications found</p>
              <p className="text-sm text-gray-400">Click "Apply for Leave" to submit your first application</p>
            </CardContent>
          </Card>
        ) : (
          leaves.map((leave) => (
            <Card key={leave.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      {getLeaveTypeBadge(leave.leaveType)}
                      {getStatusBadge(leave.status)}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>
                          <Calendar className="h-4 w-4 inline mr-1" />
                          {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                        </span>
                        <span>
                          <Clock className="h-4 w-4 inline mr-1" />
                          {calculateLeaveDays(leave.startDate, leave.endDate)} days
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Applied on: {formatDate(leave.appliedDate)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="font-medium">Reason:</p>
                      <p className="text-gray-700">{leave.reason}</p>
                    </div>
                    
                    {leave.reviewComments && (
                      <div className="mt-3 p-3 bg-gray-50 rounded">
                        <p className="text-sm font-medium">Admin Comments:</p>
                        <p className="text-sm text-gray-700">{leave.reviewComments}</p>
                        {leave.reviewedDate && (
                          <p className="text-xs text-gray-500 mt-1">
                            Reviewed on: {formatDate(leave.reviewedDate)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
