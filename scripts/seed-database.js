require('dotenv').config();
const { MongoClient } = require("mongodb")

const MONGODB_URI = process.env.MONGODB_URI

async function seedDatabase() {
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log("Connected to MongoDB")

    const db = client.db("employee_tracker")

    // Clear existing data
    await db.collection("users").deleteMany({})
    await db.collection("shifts").deleteMany({})
    await db.collection("attendance").deleteMany({})

    console.log("Cleared existing data")

    // Create shifts
    const shifts = [
      {
        name: "Morning Shift",
        startTime: "09:00",
        endTime: "17:00",
        description: "Standard morning shift",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Evening Shift",
        startTime: "14:00",
        endTime: "22:00",
        description: "Afternoon to evening shift",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Night Shift",
        startTime: "22:00",
        endTime: "06:00",
        description: "Night shift",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Flexible Hours",
        startTime: "00:00",
        endTime: "23:59",
        description: "Flexible working hours",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    const shiftResult = await db.collection("shifts").insertMany(shifts)
    console.log(`Created ${shiftResult.insertedCount} shifts`)

    // Create admin user (plain text password)
    const admin = {
      name: "Admin User",
      email: "admin@gmail.com",
      password: "admin123", // plain text
      role: "admin",
      department: "Management",
      position: "System Administrator",
      joinDate: new Date(),
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await db.collection("users").insertOne(admin)
    console.log("Created admin user")

    // Create sample employees (plain text password)
    const employees = [
      {
        name: "John Employee",
        email: "employee@company.com",
        password: "emp123",
        role: "employee",
        department: "IT",
        position: "Software Developer",
        shiftId: "morning",
        joinDate: new Date(),
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Jane Smith",
        email: "jane@company.com",
        password: "emp123",
        role: "employee",
        department: "HR",
        position: "HR Manager",
        shiftId: "morning",
        joinDate: new Date(),
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Mike Johnson",
        email: "mike@company.com",
        password: "emp123",
        role: "employee",
        department: "Finance",
        position: "Accountant",
        shiftId: "morning",
        joinDate: new Date(),
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Sarah Wilson",
        email: "sarah@company.com",
        password: "emp123",
        role: "employee",
        department: "Marketing",
        position: "Marketing Specialist",
        shiftId: "evening",
        joinDate: new Date(),
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    const employeeResult = await db.collection("users").insertMany(employees)
    console.log(`Created ${employeeResult.insertedCount} employees`)

    // Create sample attendance records
    const employeeIds = Object.values(employeeResult.insertedIds).map((id) => id.toString())
    const attendanceRecords = []

    // Generate attendance for last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateString = date.toISOString().split("T")[0]

      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue

      employeeIds.forEach((employeeId, index) => {
        // 90% attendance rate
        if (Math.random() > 0.1) {
          const checkInTime = new Date(date)
          checkInTime.setHours(9, Math.floor(Math.random() * 30), 0) // 9:00-9:30 AM

          const checkOutTime = new Date(date)
          checkOutTime.setHours(17, Math.floor(Math.random() * 30), 0) // 5:00-5:30 PM

          const isLate = checkInTime.getHours() > 9 || (checkInTime.getHours() === 9 && checkInTime.getMinutes() > 15)
          const isEarly = checkOutTime.getHours() < 17

          const hoursWorked = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)

          attendanceRecords.push({
            userId: employeeId,
            date: dateString,
            checkInTime,
            checkOutTime,
            isLate,
            isEarly,
            lateReason: isLate ? "Traffic jam" : null,
            earlyReason: isEarly ? "Personal work" : null,
            hoursWorked: Math.round(hoursWorked * 100) / 100,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        }
      })
    }

    if (attendanceRecords.length > 0) {
      const attendanceResult = await db.collection("attendance").insertMany(attendanceRecords)
      console.log(`Created ${attendanceResult.insertedCount} attendance records`)
    }

    console.log("Database seeded successfully!")
    console.log("\nLogin Credentials:")
    console.log("Admin: admin@gmail.com / admin123")
    console.log("Employee: employee@company.com / emp123")
    console.log("Employee: jane@company.com / emp123")
    console.log("Employee: mike@company.com / emp123")
    console.log("Employee: sarah@company.com / emp123")
  } catch (error) {
    console.error("Error seeding database:", error)
  } finally {
    await client.close()
  }
}

seedDatabase()
