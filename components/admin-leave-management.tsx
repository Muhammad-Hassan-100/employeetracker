"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Calendar, Clock, FileText, CheckCircle, XCircle, Eye, Users, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

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
  attendanceStatus?: "synced" | "not_synced" | "partial" | "unknown"
}

interface AdminLeaveManagementProps {
  adminUser: any
}

export default function AdminLeaveManagement({ adminUser }: AdminLeaveManagementProps) {
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [filteredLeaves, setFilteredLeaves] = useState<Leave[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null)
  const [reviewComments, setReviewComments] = useState("")
  const [isReviewing, setIsReviewing] = useState(false)

  useEffect(() => {
    fetchLeaves()
  }, [])

  useEffect(() => {
    let filtered = leaves

    if (statusFilter !== "all") {
      filtered = filtered.filter((leave) => leave.status === statusFilter)
    }

    if (searchTerm) {
      filtered = filtered.filter((leave) =>
        leave.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Sort leaves with priority for same-day urgent leaves
    filtered = filtered.sort((a, b) => {
      const today = new Date().toISOString().split("T")[0]
      const aIsSameDay = a.startDate === today && a.status === "pending"
      const bIsSameDay = b.startDate === today && b.status === "pending"
      
      // Same-day pending leaves go first
      if (aIsSameDay && !bIsSameDay) return -1
      if (!aIsSameDay && bIsSameDay) return 1
      
      // Then sort by urgency (leaves starting soon)
      const aStartDate = new Date(a.startDate)
      const bStartDate = new Date(b.startDate)
      const now = new Date()
      
      const aDaysUntilStart = Math.ceil((aStartDate.getTime() - now.getTime()) / (1000 * 3600 * 24))
      const bDaysUntilStart = Math.ceil((bStartDate.getTime() - now.getTime()) / (1000 * 3600 * 24))
      
      // Pending leaves starting within 3 days get priority
      if (a.status === "pending" && b.status === "pending") {
        if (aDaysUntilStart <= 3 && bDaysUntilStart > 3) return -1
        if (aDaysUntilStart > 3 && bDaysUntilStart <= 3) return 1
      }
      
      // Finally sort by application date (newest first)
      return new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime()
    })

    setFilteredLeaves(filtered)
  }, [leaves, statusFilter, searchTerm])

  const fetchLeaves = async () => {
    try {
      const response = await fetch("/api/leaves")
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

  const handleReviewLeave = async (leaveId: string, status: "approved" | "rejected") => {
    setIsReviewing(true)

    try {
      const response = await fetch(`/api/leaves/${leaveId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          reviewedBy: adminUser.name,
          reviewComments: reviewComments || undefined,
        }),
      })

      if (response.ok) {
        toast.success(`Leave application ${status} successfully!`)
        if (status === "approved") {
          toast.success("Attendance records have been automatically updated")
        }
        setSelectedLeave(null)
        setReviewComments("")
        fetchLeaves()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to review leave application")
      }
    } catch (error) {
      console.error("Error reviewing leave:", error)
      toast.error("Error reviewing leave application")
    } finally {
      setIsReviewing(false)
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

  const getUrgencyIndicator = (leave: Leave) => {
    const startDate = new Date(leave.startDate)
    const today = new Date()
    const todayStr = today.toISOString().split("T")[0]
    const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
    
    // Same-day leave (highest priority)
    if (leave.startDate === todayStr && leave.status === "pending") {
      return (
        <Badge variant="destructive" className="text-xs animate-pulse">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Same Day - URGENT
        </Badge>
      )
    }
    
    // Urgent leave (starting within 3 days)
    if (leave.status === "pending" && daysUntilStart <= 3 && daysUntilStart > 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Urgent ({daysUntilStart} day{daysUntilStart !== 1 ? 's' : ''})
        </Badge>
      )
    }
    
    // Past due leave (should have been reviewed)
    if (leave.status === "pending" && daysUntilStart < 0) {
      return (
        <Badge variant="destructive" className="text-xs bg-red-600">
          <AlertTriangle className="h-3 w-3 mr-1" />
          OVERDUE
        </Badge>
      )
    }
    
    return null
  }

  if (isLoading) {
    return <div className="flex justify-center items-center p-8">Loading leave applications...</div>
  }

  const pendingCount = leaves.filter(l => l.status === "pending").length
  const approvedCount = leaves.filter(l => l.status === "approved").length
  const rejectedCount = leaves.filter(l => l.status === "rejected").length

  return (
    <div className="space-y-6">
      {/* Header and Stats */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Leave Management</h2>
        <p className="text-gray-600">Review and manage employee leave applications</p>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-blue-600">{leaves.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by employee name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Applications</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Leave Applications */}
      <div className="space-y-4">
        {filteredLeaves.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No leave applications found</p>
            </CardContent>
          </Card>
        ) : (
          filteredLeaves.map((leave) => (
            <Card key={leave.id} className={leave.status === "pending" ? "border-yellow-200" : ""}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{leave.employeeName}</h3>
                      {getLeaveTypeBadge(leave.leaveType)}
                      {getStatusBadge(leave.status)}
                      {getUrgencyIndicator(leave)}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>
                        <Calendar className="h-4 w-4 inline mr-1" />
                        {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                      </span>
                      <span>
                        <Clock className="h-4 w-4 inline mr-1" />
                        {calculateLeaveDays(leave.startDate, leave.endDate)} days
                      </span>
                      <span>Applied: {formatDate(leave.appliedDate)}</span>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium">Reason:</p>
                      <p className="text-sm text-gray-700">{leave.reason}</p>
                    </div>
                    
                    {leave.reviewComments && (
                      <div className="mt-2 p-2 bg-gray-50 rounded">
                        <p className="text-xs font-medium">Review Comments:</p>
                        <p className="text-xs text-gray-700">{leave.reviewComments}</p>
                      </div>
                    )}
                  </div>

                  {leave.status === "pending" && (
                    <div className="flex gap-2 ml-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedLeave(leave)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Review Leave Application</DialogTitle>
                            <DialogDescription>
                              Review {leave.employeeName}'s leave application
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <Label>Employee</Label>
                                <p className="font-medium">{leave.employeeName}</p>
                              </div>
                              <div>
                                <Label>Leave Type</Label>
                                <p>{leave.leaveType}</p>
                              </div>
                              <div>
                                <Label>Start Date</Label>
                                <p>{formatDate(leave.startDate)}</p>
                              </div>
                              <div>
                                <Label>End Date</Label>
                                <p>{formatDate(leave.endDate)}</p>
                              </div>
                              <div className="col-span-2">
                                <Label>Total Days</Label>
                                <p>{calculateLeaveDays(leave.startDate, leave.endDate)} days</p>
                              </div>
                            </div>
                            
                            <div>
                              <Label>Reason</Label>
                              <p className="text-sm p-2 bg-gray-50 rounded">{leave.reason}</p>
                            </div>
                            
                            <div>
                              <Label htmlFor="comments">Review Comments (Optional)</Label>
                              <Textarea
                                id="comments"
                                placeholder="Add any comments about this leave application..."
                                value={reviewComments}
                                onChange={(e) => setReviewComments(e.target.value)}
                                rows={3}
                              />
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleReviewLeave(leave.id, "approved")}
                                disabled={isReviewing}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                onClick={() => handleReviewLeave(leave.id, "rejected")}
                                disabled={isReviewing}
                                variant="destructive"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
