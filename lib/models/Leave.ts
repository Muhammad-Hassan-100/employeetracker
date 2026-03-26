import type { ObjectId } from "mongodb"

export interface Leave {
  _id?: ObjectId
  id?: string
  userId: string
  companyId: string
  companyName?: string
  employeeName: string
  leaveType: "sick" | "personal" | "vacation" | "emergency" | "other"
  startDate: string
  endDate: string
  reason: string
  status: "pending" | "approved" | "rejected"
  appliedDate: Date
  reviewedBy?: string
  reviewedDate?: Date
  reviewComments?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateLeaveData {
  userId: string
  companyId?: string
  employeeName: string
  leaveType: "sick" | "personal" | "vacation" | "emergency" | "other"
  startDate: string
  endDate: string
  reason: string
}

export interface UpdateLeaveData {
  status: "approved" | "rejected"
  reviewedBy: string
  reviewComments?: string
}
