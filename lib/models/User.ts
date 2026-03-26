import type { ObjectId } from "mongodb"

export interface User {
  _id?: ObjectId
  id?: string
  name: string
  email: string
  password: string
  role: "admin" | "employee"
  companyId: string
  companyName?: string
  department?: string
  position?: string
  shiftId?: string
  checkInBeforeMinutes?: number
  lateGraceMinutes?: number
  joinDate: Date
  status: "active" | "inactive"
  createdAt: Date
  updatedAt: Date
}

export interface CreateUserData {
  name: string
  email: string
  password: string
  role: "admin" | "employee"
  companyId: string
  companyName?: string
  department?: string
  position?: string
  shiftId?: string
  checkInBeforeMinutes?: number
  lateGraceMinutes?: number
}
