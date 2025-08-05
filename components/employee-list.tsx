"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Users, Search, Edit, Trash2, Eye } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface Employee {
  id: string
  name: string
  email: string
  department: string
  position: string
  shift: string
  joinDate: string
  status: "active" | "inactive"
}

export default function EmployeeList() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchEmployees()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      const filtered = employees.filter(
        (employee) =>
          employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.department.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredEmployees(filtered)
    } else {
      setFilteredEmployees(employees)
    }
  }, [searchTerm, employees])

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees")
      if (response.ok) {
        const data = await response.json()
        setEmployees(data)
        setFilteredEmployees(data)
      }
    } catch (error) {
      console.error("Error fetching employees:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchEmployees()
        toast.success("Employee deleted successfully!")
      } else {
        const error = await response.json()
        toast.error(error.error || "Delete failed")
      }
    } catch (error) {
      toast.error("Delete failed")
    } finally {
      setDeleteDialogOpen(false)
      setEmployeeToDelete(null)
    }
  }

  const handleToggleStatus = async (employeeId: string, currentStatus: string) => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: currentStatus === "active" ? "inactive" : "active",
        }),
      })

      if (response.ok) {
        fetchEmployees()
        toast.success(`Employee ${currentStatus === "active" ? "deactivated" : "activated"} successfully!`)
      } else {
        const error = await response.json()
        toast.error(error.error || "Status update failed")
      }
    } catch (error) {
      toast.error("Status update failed")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour12: true,
    })
  }

  const getShiftBadge = (shift: string) => {
    const shiftColors = {
      morning: "bg-green-100 text-green-800",
      evening: "bg-blue-100 text-blue-800",
      night: "bg-purple-100 text-purple-800",
      flexible: "bg-gray-100 text-gray-800",
    }

    return (
      <Badge className={shiftColors[shift as keyof typeof shiftColors] || "bg-gray-100 text-gray-800"}>
        {shift.charAt(0).toUpperCase() + shift.slice(1)}
      </Badge>
    )
  }

  if (isLoading) {
    return <div>Loading employees...</div>
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold">{employees.filter((e) => e.status === "active").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Inactive</p>
                <p className="text-2xl font-bold">{employees.filter((e) => e.status === "inactive").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Departments</p>
                <p className="text-2xl font-bold">{new Set(employees.map((e) => e.department)).size}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-6 w-6" />
                <span>All Employees</span>
              </CardTitle>
              <CardDescription>Manage and view all employees in the system</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No employees found.</div>
            ) : (
              filteredEmployees.map((employee) => (
                <div key={employee.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-lg">{employee.name}</h3>
                        <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                          {employee.status}
                        </Badge>
                        {getShiftBadge(employee.shift)}
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <p>
                            <strong>Email:</strong> {employee.email}
                          </p>
                          <p>
                            <strong>Department:</strong> {employee.department}
                          </p>
                        </div>
                        <div>
                          <p>
                            <strong>Position:</strong> {employee.position}
                          </p>
                          <p>
                            <strong>Join Date:</strong> {formatDate(employee.joinDate)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/employees/${employee.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {/* <Button variant="outline" size="sm" onClick={() => toast.info("Edit feature coming soon")}>
                        <Edit className="h-4 w-4" />
                      </Button> */}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(employee.id, employee.status)}
                      >
                        {employee.status === "active" ? "Deactivate" : "Activate"}
                      </Button>

                      <AlertDialog open={deleteDialogOpen && employeeToDelete?.id === employee.id} onOpenChange={setDeleteDialogOpen}>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEmployeeToDelete(employee)
                              setDeleteDialogOpen(true)
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete <b>{employee.name}</b>? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                if (employeeToDelete) handleDeleteEmployee(employeeToDelete.id)
                              }}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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
