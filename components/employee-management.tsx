"use client"

import type React from "react"
import { toast } from "sonner"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, User, Clock, Loader2 } from "lucide-react"

interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
}

export default function EmployeeManagement() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingShifts, setIsLoadingShifts] = useState(true)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    shift: "",
    department: "",
    position: "",
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
    } finally {
      setIsLoadingShifts(false)
    }
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
      const response = await fetch("/api/employees/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success("Employee registered successfully!", {
          description: `${data.employee.name} has been added to the system`,
        })
        setFormData({
          name: "",
          email: "",
          password: "",
          shift: "",
          department: "",
          position: "",
        })
      } else {
        const error = await response.json()
        toast.error("Registration failed", {
          description: error.error || "Please check the details and try again",
        })
      }
    } catch (error) {
      toast.error("Connection error", {
        description: "Unable to register employee. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingShifts) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading employee management...</p>
        </div>
      </div>
    )
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

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserPlus className="h-6 w-6 text-blue-600" />
          <span>Register New Employee</span>
        </CardTitle>
        <CardDescription>Add a new employee to the system and assign them a shift</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <User className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Personal Information</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter employee name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Set password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Work Information */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Clock className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold">Work Information</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={formData.department} onValueChange={(value) => handleInputChange("department", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HR">Human Resources</SelectItem>
                    <SelectItem value="IT">Information Technology</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Admin">Administration</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Support">Support</SelectItem>
                    <SelectItem value="Legal">Legal</SelectItem>
                    <SelectItem value="Procurement">Procurement</SelectItem>
                    <SelectItem value="Logistics">Logistics</SelectItem>
                    <SelectItem value="R&D">Research & Development</SelectItem>
                    <SelectItem value="QA">Quality Assurance</SelectItem>
                    <SelectItem value="CustomerService">Customer Service</SelectItem>
                    <SelectItem value="Security">Security</SelectItem>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Product">Product Management</SelectItem>
                    <SelectItem value="BusinessDevelopment">Business Development</SelectItem>
                    <SelectItem value="PublicRelations">Public Relations</SelectItem>
                    <SelectItem value="Compliance">Compliance</SelectItem>
                    <SelectItem value="Medical">Medical</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Training">Training</SelectItem>
                    <SelectItem value="Facilities">Facilities</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Transport">Transport</SelectItem>
                    <SelectItem value="Purchasing">Purchasing</SelectItem>
                    <SelectItem value="Planning">Planning</SelectItem>
                    <SelectItem value="Strategy">Strategy</SelectItem>
                    <SelectItem value="Analytics">Analytics</SelectItem>
                    <SelectItem value="DataScience">Data Science</SelectItem>
                    <SelectItem value="Content">Content</SelectItem>
                    <SelectItem value="Media">Media</SelectItem>
                    <SelectItem value="Event">Event Management</SelectItem>
                    <SelectItem value="Executive">Executive</SelectItem>
                    <SelectItem value="Board">Board of Directors</SelectItem>
                    <SelectItem value="Interns">Interns</SelectItem>
                    <SelectItem value="Volunteers">Volunteers</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  placeholder="Enter job position"
                  value={formData.position}
                  onChange={(e) => handleInputChange("position", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shift">Assign Shift</Label>
                <Select value={formData.shift} onValueChange={(value) => handleInputChange("shift", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select shift" />
                  </SelectTrigger>
                  <SelectContent>
                    {shifts.map((shift) => (
                      <SelectItem key={shift.id} value={shift.name.toLowerCase().replace(" ", "")}>
                        {shift.name} ({formatTime12Hour(shift.startTime)} - {formatTime12Hour(shift.endTime)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Registering Employee...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <UserPlus className="h-4 w-4" />
                <span>Register Employee</span>
              </div>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
