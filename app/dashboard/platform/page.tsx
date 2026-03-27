"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getStoredUser } from "@/lib/client-session"

export default function PlatformPage() {
  const router = useRouter()

  useEffect(() => {
    const storedUser = getStoredUser()
    if (!storedUser) {
      router.push("/login")
      return
    }

    if (storedUser.role !== "super_admin") {
      router.push("/dashboard")
      return
    }
    router.replace("/dashboard/platform/requests")
  }, [router])

  return <div>Redirecting...</div>
}
