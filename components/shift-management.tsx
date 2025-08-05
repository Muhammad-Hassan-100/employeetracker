"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Plus, Edit, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
  description: string
}

export default function ShiftManagement() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    startTime: "",
    endTime: "",
    description: "",
  })

  useEffect(() => {
    fetchShifts()
  }, [])

  const fetchShifts = async () => {
    try {
      const response = await fetch("/api/shifts")
      if (response.ok) {
        const data = await response.json()
        setShifts(data)
      }
    } catch (error) {
      console.error("Error fetching shifts:", error)
    }
  }

  const formatTime12Hour = (timeString: string) => {
    const [hours, minutes] = timeString.split(":").map(Number)
    const date = new Date()
    date.setHours(hours, minutes, 0, 0)
    return date.toLocaleTimeString("en-US", {
      hour12: true,
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const url = editingShift ? `/api/shifts/${editingShift.id}` : "/api/shifts/create"
      const method = editingShift ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchShifts()
        resetForm()
        toast.success(editingShift ? "Shift updated successfully!" : "Shift created successfully!")
      } else {
        const error = await response.json()
        toast.error(error.error || "Operation failed")
      }
    } catch (error) {
      toast.error("Operation failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift)
    setFormData({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      description: shift.description,
    })
    setIsCreating(true)
  }

  const handleDelete = async (shiftId: string) => {
    if (confirm("Are you sure you want to delete this shift?")) {
      try {
        const response = await fetch(`/api/shifts/${shiftId}`, {
          method: "DELETE",
        })

        if (response.ok) {
          await fetchShifts()
          toast.success("Shift deleted successfully!")
        } else {
          const error = await response.json()
          toast.error(error.error || "Delete failed")
        }
      } catch (error) {
        toast.error("Delete failed")
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      startTime: "",
      endTime: "",
      description: "",
    })
    setIsCreating(false)
    setEditingShift(null)
  }

  return (
    <div className="space-y-6">
      {/* Create/Edit Shift Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="h-6 w-6" />
              <span>{editingShift ? "Edit Shift" : "Create New Shift"}</span>
            </CardTitle>
            <CardDescription>
              {editingShift ? "Update shift details" : "Define a new work shift for employees"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shift-name">Shift Name</Label>
                  <Input
                    id="shift-name"
                    placeholder="e.g., Morning Shift"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Brief description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleInputChange("startTime", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleInputChange("endTime", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                  {isLoading ? "Processing..." : editingShift ? "Update Shift" : "Create Shift"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Shifts List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-6 w-6" />
                <span>Manage Shifts</span>
              </CardTitle>
              <CardDescription>View and manage all work shifts</CardDescription>
            </div>
            {!isCreating && (
              <Button onClick={() => setIsCreating(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Shift
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {shifts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No shifts created yet. Create your first shift to get started.
              </div>
            ) : (
              shifts.map((shift) => (
                <div key={shift.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-semibold">{shift.name}</h3>
                      <Badge variant="outline" className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatTime12Hour(shift.startTime)} - {formatTime12Hour(shift.endTime)}
                        </span>
                      </Badge>
                    </div>
                    {shift.description && <p className="text-sm text-gray-600 mt-1">{shift.description}</p>}
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(shift)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(shift.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
