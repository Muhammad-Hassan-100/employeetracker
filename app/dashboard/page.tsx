"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getStoredUser } from "@/lib/client-session"

export default function Dashboard() {
  const router = useRouter()

  useEffect(() => {
    const user = getStoredUser()
    if (user) {
      if (user.role === "admin") {
        router.replace("/dashboard/employees")
      } else {
        router.replace("/dashboard/attendance")
      }
    }
  }, [router])

  return <div>Redirecting...</div>
}
