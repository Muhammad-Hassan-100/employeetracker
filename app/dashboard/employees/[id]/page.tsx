"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  User,
  Mail,
  Calendar,
  Clock,
  Eye,
  EyeOff,
  Edit,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  shift: string; // shift id
  joinDate: string;
  status: "active" | "inactive";
  password?: string;
}

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  description?: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime: string;
  checkOutTime: string | null;
  isLate: boolean;
  isEarly: boolean;
  lateReason: string | null;
  earlyReason: string | null;
  hoursWorked: number;
  status: "present" | "absent" | "on_leave";
}

export default function EmployeeDetailPage() {
  const [user, setUser] = useState<any>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      if (parsedUser.role !== "admin") {
        router.push("/dashboard/attendance");
        return;
      }
      fetchEmployeeDetails();
      fetchEmployeeAttendance();
      fetchShifts();
    } else {
      router.push("/login");
    }
    // eslint-disable-next-line
    // We want to fetch shifts only once, not on every id change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, router]);

  const fetchShifts = async () => {
    try {
      const response = await fetch("/api/shifts");
      if (response.ok) {
        const data = await response.json();
        setShifts(data);
      }
    } catch (error) {
      // ignore
    }
  };

  const fetchEmployeeDetails = async () => {
    try {
      const response = await fetch(`/api/employees/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setEmployee(data);
        setEditForm(data);
      } else {
        toast.error("Failed to fetch employee details");
        router.push("/dashboard/employee-list");
      }
    } catch (error) {
      toast.error("Error loading employee details");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployeeAttendance = async () => {
    try {
      const response = await fetch(
        `/api/attendance/history?userId=${params.id}`
      );
      if (response.ok) {
        const data = await response.json();
        setAttendance(data.slice(0, 10)); // Show last 10 records
      }
    } catch (error) {
      console.error("Failed to fetch attendance");
    }
  };

  const handleSave = async () => {
    try {
      // Map shift to shiftId for backend compatibility
      const payload = { ...editForm, shiftId: editForm.shift };
      delete payload.shift;
      const response = await fetch(`/api/employees/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setEmployee(editForm);
        setIsEditing(false);
        toast.success("Employee updated successfully!");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update employee");
      }
    } catch (error) {
      toast.error("Update failed");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString("en-US", {
      hour12: true,
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Employee not found
      </div>
    );
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white">
        <SidebarTrigger className="-ml-1 cursor-pointer" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink
                href="/dashboard"
                className="cursor-pointer hover:text-blue-600"
              >
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink
                href="/dashboard/employee-list"
                className="cursor-pointer hover:text-blue-600"
              >
                All Employees
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{employee.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-6 bg-gray-50">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Employee Details
            </h1>
            <p className="text-gray-600">
              Comprehensive view of {employee.name}'s profile and activity
            </p>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 hover:bg-blue-700 cursor-pointer"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Employee
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  className="bg-green-600 hover:bg-green-700 cursor-pointer"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="cursor-pointer"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Employee Profile */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <span>Personal Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      {isEditing ? (
                        <Input
                          id="name"
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm({ ...editForm, name: e.target.value })
                          }
                        />
                      ) : (
                        <p className="text-lg font-semibold">{employee.name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      {isEditing ? (
                        <Input
                          id="email"
                          type="email"
                          value={editForm.email}
                          onChange={(e) =>
                            setEditForm({ ...editForm, email: e.target.value })
                          }
                        />
                      ) : (
                        <p className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span>{employee.email}</span>
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Password</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={
                            isEditing
                              ? editForm.password ?? ""
                              : employee.password || "••••••••"
                          }
                          readOnly={!isEditing}
                          onChange={
                            isEditing
                              ? (e) =>
                                  setEditForm({
                                    ...editForm,
                                    password: e.target.value,
                                  })
                              : undefined
                          }
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPassword(!showPassword)}
                          className="cursor-pointer"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Department</Label>
                      {isEditing ? (
                        <Select
                          value={editForm.department}
                          onValueChange={(value) =>
                            setEditForm({ ...editForm, department: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="HR">Human Resources</SelectItem>
                            <SelectItem value="IT">
                              Information Technology
                            </SelectItem>
                            <SelectItem value="Finance">Finance</SelectItem>
                            <SelectItem value="Marketing">Marketing</SelectItem>
                            <SelectItem value="Operations">
                              Operations
                            </SelectItem>
                            <SelectItem value="Admin">
                              Administration
                            </SelectItem>
                            <SelectItem value="Sales">Sales</SelectItem>
                            <SelectItem value="Support">Support</SelectItem>
                            <SelectItem value="Legal">Legal</SelectItem>
                            <SelectItem value="Procurement">
                              Procurement
                            </SelectItem>
                            <SelectItem value="Logistics">Logistics</SelectItem>
                            <SelectItem value="R&D">
                              Research & Development
                            </SelectItem>
                            <SelectItem value="QA">
                              Quality Assurance
                            </SelectItem>
                            <SelectItem value="CustomerService">
                              Customer Service
                            </SelectItem>
                            <SelectItem value="Security">Security</SelectItem>
                            <SelectItem value="Engineering">
                              Engineering
                            </SelectItem>
                            <SelectItem value="Design">Design</SelectItem>
                            <SelectItem value="Product">
                              Product Management
                            </SelectItem>
                            <SelectItem value="BusinessDevelopment">
                              Business Development
                            </SelectItem>
                            <SelectItem value="PublicRelations">
                              Public Relations
                            </SelectItem>
                            <SelectItem value="Compliance">
                              Compliance
                            </SelectItem>
                            <SelectItem value="Medical">Medical</SelectItem>
                            <SelectItem value="Education">Education</SelectItem>
                            <SelectItem value="Training">Training</SelectItem>
                            <SelectItem value="Facilities">
                              Facilities
                            </SelectItem>
                            <SelectItem value="Maintenance">
                              Maintenance
                            </SelectItem>
                            <SelectItem value="Transport">Transport</SelectItem>
                            <SelectItem value="Purchasing">
                              Purchasing
                            </SelectItem>
                            <SelectItem value="Planning">Planning</SelectItem>
                            <SelectItem value="Strategy">Strategy</SelectItem>
                            <SelectItem value="Analytics">Analytics</SelectItem>
                            <SelectItem value="DataScience">
                              Data Science
                            </SelectItem>
                            <SelectItem value="Content">Content</SelectItem>
                            <SelectItem value="Media">Media</SelectItem>
                            <SelectItem value="Event">
                              Event Management
                            </SelectItem>
                            <SelectItem value="Executive">Executive</SelectItem>
                            <SelectItem value="Board">
                              Board of Directors
                            </SelectItem>
                            <SelectItem value="Interns">Interns</SelectItem>
                            <SelectItem value="Volunteers">
                              Volunteers
                            </SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-lg">{employee.department}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Shift</Label>
                      {isEditing ? (
                        <Select
                          value={editForm.shift}
                          onValueChange={(value) =>
                            setEditForm({ ...editForm, shift: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select shift" />
                          </SelectTrigger>
                          <SelectContent>
                            {shifts.map((shift) => (
                              <SelectItem key={shift.id} value={shift.id}>
                                {shift.name} ({shift.startTime} -{" "}
                                {shift.endTime})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-lg">
                          {shifts.length > 0
                            ? shifts.find((s) => s.id === employee.shift)
                                ?.name || employee.shift
                            : employee.shift}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Position</Label>
                      {isEditing ? (
                        <Input
                          value={editForm.position}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              position: e.target.value,
                            })
                          }
                        />
                      ) : (
                        <p className="text-lg">{employee.position}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Status</Label>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={
                            employee.status === "active"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {employee.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Attendance */}
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-green-600" />
                  <span>Recent Attendance (Last 10 Records)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {attendance.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No attendance records found
                    </p>
                  ) : (
                    attendance.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                      >
                        <div>
                          <p className="font-semibold">
                            {formatDate(record.date)}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            {record.status === "on_leave" ? (
                              <span>Status: On Leave</span>
                            ) : (
                              <>
                                <span>
                                  In: {record.checkInTime ? formatTime(record.checkInTime) : "N/A"}
                                </span>
                                {record.checkOutTime && (
                                  <span>
                                    Out: {formatTime(record.checkOutTime)}
                                  </span>
                                )}
                                <span>Hours: {record.hoursWorked.toFixed(1)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          {record.status === "on_leave" ? (
                            <Badge variant="secondary" className="text-xs">
                              On Leave
                            </Badge>
                          ) : record.isLate ? (
                            <Badge variant="destructive" className="text-xs">
                              Late
                            </Badge>
                          ) : record.isEarly ? (
                            <Badge variant="secondary" className="text-xs">
                              Early Leave
                            </Badge>
                          ) : (
                            <Badge variant="default" className="text-xs">
                              On Time
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <span>Quick Stats</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {attendance.length}
                    </div>
                    <div className="text-sm text-gray-600">Recent Records</div>
                  </div>

                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {attendance.filter((r) => r.status !== "on_leave" && !r.isLate && !r.isEarly).length}
                    </div>
                    <div className="text-sm text-gray-600">On Time</div>
                  </div>

                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {attendance.filter((r) => r.isLate).length}
                    </div>
                    <div className="text-sm text-gray-600">Late Arrivals</div>
                  </div>

                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {attendance.length > 0
                        ? (
                            attendance.reduce(
                              (sum, r) => sum + r.hoursWorked,
                              0
                            ) / attendance.length
                          ).toFixed(1)
                        : "0"}
                    </div>
                    <div className="text-sm text-gray-600">Avg Hours/Day</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-700">
                  Employee Since
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-lg font-semibold">
                  {formatDate(employee.joinDate)}
                </p>
                <p className="text-sm text-gray-500">
                  {Math.floor(
                    (new Date().getTime() -
                      new Date(employee.joinDate).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )}{" "}
                  days ago
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
