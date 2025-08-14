"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Clock, AlertTriangle, X } from "lucide-react"
import { toast } from "sonner"

interface PendingLeave {
  id: string
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  appliedDate: string
  isUrgent: boolean
  isSameDay: boolean
}

interface AdminNotificationsProps {
  adminUser: any
  onLeaveClick?: (leaveId: string) => void
}

export default function AdminNotifications({ adminUser, onLeaveClick }: AdminNotificationsProps) {
  const [pendingLeaves, setPendingLeaves] = useState<PendingLeave[]>([])
  const [isVisible, setIsVisible] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date>(new Date())

  useEffect(() => {
    checkPendingLeaves()
    // Check every 5 minutes for new leaves
    const interval = setInterval(checkPendingLeaves, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const checkPendingLeaves = async () => {
    try {
      const response = await fetch("/api/leaves")
      if (response.ok) {
        const leaves = await response.json()
        const today = new Date().toISOString().split("T")[0]
        
        const pending = leaves
          .filter((leave: any) => leave.status === "pending")
          .map((leave: any) => {
            const startDate = new Date(leave.startDate)
            const now = new Date()
            const daysUntilStart = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 3600 * 24))
            const isSameDay = leave.startDate === today
            const isUrgent = daysUntilStart <= 3 || isSameDay
            
            return {
              id: leave.id,
              employeeName: leave.employeeName,
              leaveType: leave.leaveType,
              startDate: leave.startDate,
              endDate: leave.endDate,
              appliedDate: leave.appliedDate,
              isUrgent,
              isSameDay
            }
          })
          .sort((a: PendingLeave, b: PendingLeave) => {
            // Same-day leaves first
            if (a.isSameDay && !b.isSameDay) return -1
            if (!a.isSameDay && b.isSameDay) return 1
            // Then urgent leaves
            if (a.isUrgent && !b.isUrgent) return -1
            if (!a.isUrgent && b.isUrgent) return 1
            // Finally by application date
            return new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime()
          })

        // Check for new urgent leaves since last check
        const newUrgentLeaves = pending.filter((leave: PendingLeave) => 
          leave.isUrgent && new Date(leave.appliedDate) > lastChecked
        )

        if (newUrgentLeaves.length > 0) {
          setIsVisible(true)
          if (newUrgentLeaves.some((l: PendingLeave) => l.isSameDay)) {
            toast.warning(`${newUrgentLeaves.length} new urgent leave application(s) including same-day requests!`)
          } else {
            toast.info(`${newUrgentLeaves.length} new urgent leave application(s) require attention`)
          }
        }

        setPendingLeaves(pending)
        setLastChecked(new Date())
      }
    } catch (error) {
      console.error("Error checking pending leaves:", error)
    }
  }

  const urgentCount = pendingLeaves.filter(leave => leave.isUrgent).length
  const sameDayCount = pendingLeaves.filter(leave => leave.isSameDay).length

  if (pendingLeaves.length === 0) {
    return null
  }

  return (
    <>
      {/* Notification Bell */}
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(!isVisible)}
          className={`relative ${urgentCount > 0 ? 'border-red-500 text-red-600' : ''}`}
        >
          <Bell className="h-4 w-4" />
          {urgentCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {urgentCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Notification Panel */}
      {isVisible && (
        <div className="absolute top-16 right-0 z-50 w-96 max-h-96 overflow-y-auto bg-white border rounded-lg shadow-lg">
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Pending Leave Applications</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {sameDayCount > 0 && (
              <p className="text-sm text-red-600 mt-1">
                {sameDayCount} same-day request{sameDayCount !== 1 ? 's' : ''} need immediate attention!
              </p>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {pendingLeaves.map((leave) => (
              <div
                key={leave.id}
                className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${
                  leave.isSameDay ? 'bg-red-50 border-l-4 border-l-red-500' : 
                  leave.isUrgent ? 'bg-yellow-50 border-l-4 border-l-yellow-500' : ''
                }`}
                onClick={() => {
                  onLeaveClick?.(leave.id)
                  setIsVisible(false)
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{leave.employeeName}</p>
                    <p className="text-xs text-gray-600">
                      {leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)} Leave
                    </p>
                    <p className="text-xs text-gray-600">
                      {leave.startDate === leave.endDate 
                        ? new Date(leave.startDate).toLocaleDateString()
                        : `${new Date(leave.startDate).toLocaleDateString()} - ${new Date(leave.endDate).toLocaleDateString()}`
                      }
                    </p>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    {leave.isSameDay && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Same Day
                      </Badge>
                    )}
                    {leave.isUrgent && !leave.isSameDay && (
                      <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                        <Clock className="h-3 w-3 mr-1" />
                        Urgent
                      </Badge>
                    )}
                    <p className="text-xs text-gray-500">
                      {new Date(leave.appliedDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pendingLeaves.length > 5 && (
            <div className="p-3 bg-gray-50 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onLeaveClick?.('all')
                  setIsVisible(false)
                }}
              >
                View All ({pendingLeaves.length}) Applications
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
