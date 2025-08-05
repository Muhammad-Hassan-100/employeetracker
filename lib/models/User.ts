import type { ObjectId } from "mongodb"

export interface User {
  _id?: ObjectId
  id?: string
  name: string
  email: string
  password: string
  role: "admin" | "employee"
  department?: string
  position?: string
  shiftId?: string
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
  department?: string
  position?: string
  shiftId?: string
}
