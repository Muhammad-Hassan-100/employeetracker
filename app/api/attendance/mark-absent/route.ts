import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function POST(request: NextRequest) {
  try {
    const { date } = await request.json()
    
    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 })
    }
    
    const db = await getDatabase()
    const usersCollection = db.collection("users")
    const attendanceCollection = db.collection("attendance")
    const leavesCollection = db.collection("leaves")
    
    // Get all active employees
    const employees = await usersCollection.find({
      role: "employee",
      status: "active",
      joinDate: { $lte: new Date(date) } // Only employees who have joined by this date
    }).toArray()
    
    let markedAbsent = 0
    
    for (const employee of employees) {
      // Check if employee already has attendance record for this date
      const existingAttendance = await attendanceCollection.findOne({
        userId: employee._id.toString(),
        date: date
      })
      
      if (!existingAttendance) {
        // Check if employee has approved leave for this date
        const hasLeave = await leavesCollection.findOne({
          userId: employee._id.toString(),
          status: "approved",
          startDate: { $lte: date },
          endDate: { $gte: date }
        })
        
        if (hasLeave) {
          // Mark as on leave
          await attendanceCollection.insertOne({
            userId: employee._id.toString(),
            date: date,
            checkInTime: null,
            checkOutTime: null,
            isLate: false,
            isEarly: false,
            hoursWorked: 0,
            status: "on_leave",
            leaveId: hasLeave._id.toString(),
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        } else {
          // Check if it's a weekend (Saturday = 6, Sunday = 0)
          const dayOfWeek = new Date(date).getDay()
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            // Mark as absent (only on weekdays)
            await attendanceCollection.insertOne({
              userId: employee._id.toString(),
              date: date,
              checkInTime: null,
              checkOutTime: null,
              isLate: false,
              isEarly: false,
              hoursWorked: 0,
              status: "absent",
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            markedAbsent++
          }
        }
      }
    }
    
    return NextResponse.json({
      message: `Successfully marked ${markedAbsent} employees as absent for ${date}`,
      markedAbsent
    })
  } catch (error) {
    console.error("Mark absent error:", error)
    return NextResponse.json(
      { error: "Failed to mark absent employees" },
      { status: 500 }
    )
  }
}

// GET endpoint to check who would be marked absent for a given date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    
    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 })
    }
    
    const db = await getDatabase()
    const usersCollection = db.collection("users")
    const attendanceCollection = db.collection("attendance")
    const leavesCollection = db.collection("leaves")
    
    // Get all active employees who joined by this date
    const employees = await usersCollection.find({
      role: "employee",
      status: "active",
      joinDate: { $lte: new Date(date) }
    }).toArray()
    
    const absentEmployees = []
    const onLeaveEmployees = []
    const presentEmployees = []
    
    for (const employee of employees) {
      const existingAttendance = await attendanceCollection.findOne({
        userId: employee._id.toString(),
        date: date
      })
      
      if (existingAttendance) {
        if (existingAttendance.status === "present") {
          presentEmployees.push({
            id: employee._id.toString(),
            name: employee.name,
            department: employee.department
          })
        } else if (existingAttendance.status === "on_leave") {
          onLeaveEmployees.push({
            id: employee._id.toString(),
            name: employee.name,
            department: employee.department
          })
        } else if (existingAttendance.status === "absent") {
          // Check if employee actually has approved leave for this date
          const hasLeave = await leavesCollection.findOne({
            userId: employee._id.toString(),
            status: "approved",
            startDate: { $lte: date },
            endDate: { $gte: date }
          })
          
          if (hasLeave) {
            // Employee should be on leave, not absent
            onLeaveEmployees.push({
              id: employee._id.toString(),
              name: employee.name,
              department: employee.department
            })
          } else {
            absentEmployees.push({
              id: employee._id.toString(),
              name: employee.name,
              department: employee.department
            })
          }
        }
      } else {
        const hasLeave = await leavesCollection.findOne({
          userId: employee._id.toString(),
          status: "approved",
          startDate: { $lte: date },
          endDate: { $gte: date }
        })
        
        console.log(`Checking leave for ${employee.name} on ${date}:`, hasLeave ? 'Found' : 'Not found')
        
        if (hasLeave) {
          onLeaveEmployees.push({
            id: employee._id.toString(),
            name: employee.name,
            department: employee.department
          })
        } else {
          // Check if it's a weekday
          const dayOfWeek = new Date(date).getDay()
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            absentEmployees.push({
              id: employee._id.toString(),
              name: employee.name,
              department: employee.department
            })
          }
        }
      }
    }
    
    return NextResponse.json({
      date,
      totalEmployees: employees.length,
      presentEmployees,
      absentEmployees,
      onLeaveEmployees,
      summary: {
        present: presentEmployees.length,
        absent: absentEmployees.length,
        onLeave: onLeaveEmployees.length
      }
    })
  } catch (error) {
    console.error("Get absent employees error:", error)
    return NextResponse.json(
      { error: "Failed to fetch employee status" },
      { status: 500 }
    )
  }
}
