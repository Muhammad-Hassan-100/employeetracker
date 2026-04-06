"use client"

import { useEffect, useState } from "react"
import { KeyRound, Loader2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authFetch, setStoredUser } from "@/lib/client-session"
import type { SessionUser } from "@/lib/session"

interface EmployeeSettingsProps {
  user: SessionUser
  onUserUpdate?: (user: SessionUser) => void
  onAccessDenied?: () => void
}

export default function EmployeeSettings({ user, onUserUpdate, onAccessDenied }: EmployeeSettingsProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [profile, setProfile] = useState({
    name: user.name,
    email: user.email,
  })
  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  })

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await authFetch("/api/auth/profile")
        const data = await response.json()

        if (!response.ok) {
          toast.error("Settings are not available", {
            description: data.error || "Your admin has not enabled employee password changes.",
          })
          onAccessDenied?.()
          return
        }

        setProfile({
          name: data.profile.name,
          email: data.profile.email,
        })

        if (data.user) {
          setStoredUser(data.user)
          onUserUpdate?.(data.user)
        }
      } catch {
        toast.error("Unable to load settings")
        onAccessDenied?.()
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [onAccessDenied, onUserUpdate])

  const handleSave = async () => {
    const trimmedPassword = form.password.trim()

    if (trimmedPassword.length < 6) {
      toast.error("Use a stronger password", {
        description: "The new password must be at least 6 characters.",
      })
      return
    }

    if (trimmedPassword !== form.confirmPassword.trim()) {
      toast.error("Passwords do not match", {
        description: "Re-enter the same password in both fields.",
      })
      return
    }

    setIsSaving(true)

    try {
      const response = await authFetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: trimmedPassword,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error("Unable to update password", {
          description: data.error || "Please try again.",
        })
        if (response.status === 403) {
          onAccessDenied?.()
        }
        return
      }

      if (data.user) {
        setStoredUser(data.user)
        onUserUpdate?.(data.user)
      }

      setForm({ password: "", confirmPassword: "" })
      toast.success("Password updated", {
        description: "Your new password is now active.",
      })
    } catch {
      toast.error("Unable to update password")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <ShieldCheck className="h-10 w-10 rounded-2xl bg-emerald-100 p-2 text-emerald-700" />
            <div>
              <p className="text-sm text-slate-500">Access</p>
              <p className="text-2xl font-bold">Password changes allowed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <KeyRound className="h-10 w-10 rounded-2xl bg-sky-100 p-2 text-sky-700" />
            <div>
              <p className="text-sm text-slate-500">Account</p>
              <p className="text-2xl font-bold">Employee</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Change Password</CardTitle>
          <CardDescription>
            Your admin created the initial password. You can update only your own password here.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={profile.name} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Work Email</Label>
            <Input value={profile.email} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="employee-new-password">New Password</Label>
            <Input
              id="employee-new-password"
              type="password"
              minLength={6}
              placeholder="Enter a new password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="employee-confirm-password">Confirm Password</Label>
            <Input
              id="employee-confirm-password"
              type="password"
              minLength={6}
              placeholder="Re-enter the new password"
              value={form.confirmPassword}
              onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <Button onClick={handleSave} disabled={isSaving} className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
