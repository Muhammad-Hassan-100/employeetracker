import type { ObjectId } from "mongodb"

export interface Attendance {
  _id?: ObjectId
  id?: string
  userId: string
  date: string
  checkInTime: Date
  checkOutTime?: Date
  isLate: boolean
  isEarly: boolean
  lateReason?: string
  earlyReason?: string
  hoursWorked: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateAttendanceData {
  userId: string
  checkInTime: Date
  isLate: boolean
  lateReason?: string
}
