"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  Calendar,
  Eye,
  Zap
} from "lucide-react"
import { toast } from "sonner"

interface SyncStatus {
  dateRange: { startDate: string; endDate: string }
  inconsistencies: Array<{
    type: string
    employeeName: string
    employeeId: string
    date: string
    currentStatus?: string
    expectedStatus?: string
    leaveType?: string
    issue: string
  }>
  summary: {
    totalIssues: number
    missingAttendance: number
    wrongStatus: number
    absentWithLeave: number
  }
}

interface SyncStatusPanelProps {
  className?: string
}

export default function SyncStatusPanel({ className }: SyncStatusPanelProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  useEffect(() => {
    checkSyncStatus()
    
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(() => {
      if (autoSyncEnabled) {
        checkSyncStatus()
      }
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [autoSyncEnabled])

  const checkSyncStatus = async () => {
    setIsLoading(true)
    try {
      const today = new Date()
      const oneWeekAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)
      const oneWeekAhead = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7)
      
      const startDate = oneWeekAgo.toISOString().split("T")[0]
      const endDate = oneWeekAhead.toISOString().split("T")[0]
      
      const response = await fetch(`/api/attendance/sync-leaves?startDate=${startDate}&endDate=${endDate}`)
      if (response.ok) {
        const data = await response.json()
        setSyncStatus(data)
        setLastSyncTime(new Date())
      } else {
        toast.error("Failed to check sync status")
      }
    } catch (error) {
      console.error("Error checking sync status:", error)
      toast.error("Error checking sync status")
    } finally {
      setIsLoading(false)
    }
  }

  const performSync = async () => {
    if (!syncStatus) return
    
    setIsSyncing(true)
    try {
      const response = await fetch("/api/attendance/sync-leaves", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: syncStatus.dateRange.startDate,
          endDate: syncStatus.dateRange.endDate,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Sync completed! ${result.details.totalChanges} records updated.`)
        // Refresh status after sync
        setTimeout(() => checkSyncStatus(), 1000)
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to sync attendance")
      }
    } catch (error) {
      console.error("Error syncing attendance:", error)
      toast.error("Error syncing attendance")
    } finally {
      setIsSyncing(false)
    }
  }

  const enableAutoSync = async () => {
    if (!autoSyncEnabled && syncStatus?.summary.totalIssues) {
      // Auto-fix issues when enabling
      await performSync()
    }
    setAutoSyncEnabled(!autoSyncEnabled)
  }

  const getSeverityColor = (issueCount: number) => {
    if (issueCount === 0) return "text-green-600"
    if (issueCount <= 5) return "text-yellow-600"
    return "text-red-600"
  }

  const getSeverityBadge = (issueCount: number) => {
    if (issueCount === 0) {
      return <Badge className="bg-green-100 text-green-800">All Synced</Badge>
    }
    if (issueCount <= 5) {
      return <Badge className="bg-yellow-100 text-yellow-800">Minor Issues</Badge>
    }
    return <Badge className="bg-red-100 text-red-800">Critical Issues</Badge>
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <RefreshCw className="h-5 w-5" />
                <span>Attendance & Leave Sync Status</span>
              </CardTitle>
              <CardDescription>
                Real-time synchronization between leave approvals and attendance records
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={checkSyncStatus}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                size="sm"
                variant={autoSyncEnabled ? "default" : "outline"}
                onClick={enableAutoSync}
              >
                <Zap className="h-4 w-4 mr-1" />
                {autoSyncEnabled ? "Auto-Sync On" : "Enable Auto-Sync"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Checking sync status...
            </div>
          ) : syncStatus ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getSeverityColor(syncStatus.summary.totalIssues)}`}>
                    {syncStatus.summary.totalIssues}
                  </div>
                  <div className="text-sm text-gray-600">Total Issues</div>
                  {getSeverityBadge(syncStatus.summary.totalIssues)}
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{syncStatus.summary.missingAttendance}</div>
                  <div className="text-sm text-gray-600">Missing Records</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{syncStatus.summary.wrongStatus}</div>
                  <div className="text-sm text-gray-600">Wrong Status</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{syncStatus.summary.absentWithLeave}</div>
                  <div className="text-sm text-gray-600">Absent w/ Leave</div>
                </div>
              </div>

              {/* Status Alert */}
              {syncStatus.summary.totalIssues > 0 ? (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Found {syncStatus.summary.totalIssues} synchronization issues that need attention.
                    Click "Fix All Issues" to resolve them automatically.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    All attendance records are properly synchronized with leave approvals.
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-2">
                {syncStatus.summary.totalIssues > 0 && (
                  <Button
                    onClick={performSync}
                    disabled={isSyncing}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-1" />
                        Fix All Issues ({syncStatus.summary.totalIssues})
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Last Sync Time */}
              {lastSyncTime && (
                <div className="text-xs text-gray-500">
                  Last checked: {lastSyncTime.toLocaleString()}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center p-8 text-gray-500">
              Click "Refresh" to check sync status
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Issues */}
      {syncStatus && syncStatus.inconsistencies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Detailed Issues</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {syncStatus.inconsistencies.map((issue, index) => (
                <div key={index} className="p-3 border rounded-lg bg-red-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{issue.employeeName}</p>
                      <p className="text-sm text-gray-600">{issue.date}</p>
                      <p className="text-sm text-red-600">{issue.issue}</p>
                      {issue.currentStatus && issue.expectedStatus && (
                        <p className="text-xs text-gray-500">
                          Current: {issue.currentStatus} → Expected: {issue.expectedStatus}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {issue.leaveType || issue.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
