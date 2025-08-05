"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Dashboard() {
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      const user = JSON.parse(userData)
      if (user.role === "admin") {
        router.replace("/dashboard/employees")
      } else {
        router.replace("/dashboard/attendance")
      }
    }
  }, [router])

  return <div>Redirecting...</div>
}
