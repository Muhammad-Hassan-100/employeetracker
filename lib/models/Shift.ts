import type { ObjectId } from "mongodb"

export interface Shift {
  _id?: ObjectId
  id?: string
  name: string
  startTime: string
  endTime: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateShiftData {
  name: string
  startTime: string
  endTime: string
  description?: string
}
