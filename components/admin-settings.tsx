"use client"

import { useEffect, useState } from "react"
import { Loader2, Settings2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authFetch, setStoredUser } from "@/lib/client-session"
import type { SessionUser } from "@/lib/session"

interface AdminSettingsProps {
  user: SessionUser
  onUserUpdate?: (user: SessionUser) => void
}

export default function AdminSettings({ user, onUserUpdate }: AdminSettingsProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    password: "",
    companyName: user.companyName,
    companyDomain: user.companyDomain,
  })

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileResponse = await authFetch("/api/auth/profile")
        const profileData = await profileResponse.json()

        if (!profileResponse.ok) {
          toast.error("Unable to load settings", {
            description: profileData.error || "Please try again.",
          })
          return
        }

        setForm({
          name: profileData.profile.name,
          email: profileData.profile.email,
          password: "",
          companyName: profileData.profile.companyName,
          companyDomain: profileData.profile.companyDomain,
        })
      } catch {
        toast.error("Unable to load settings")
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [])

  const handleProfileSave = async () => {
    setIsSavingProfile(true)

    try {
      const response = await authFetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password || undefined,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error("Unable to update settings", {
          description: data.error || "Please review the form and try again.",
        })
        return
      }

      setStoredUser(data.user)
      onUserUpdate?.(data.user)
      setForm((prev) => ({ ...prev, password: "" }))
      toast.success("Settings updated", {
        description: "Admin profile saved successfully.",
      })
    } catch {
      toast.error("Unable to update settings")
    } finally {
      setIsSavingProfile(false)
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
            <Settings2 className="h-10 w-10 rounded-2xl bg-sky-100 p-2 text-sky-700" />
            <div>
              <p className="text-sm text-slate-500">Role</p>
              <p className="text-2xl font-bold">Administrator</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <ShieldCheck className="h-10 w-10 rounded-2xl bg-emerald-100 p-2 text-emerald-700" />
            <div>
              <p className="text-sm text-slate-500">Domain Lock</p>
              <p className="text-2xl font-bold">@{form.companyDomain}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Admin Settings</CardTitle>
          <CardDescription>Update your profile. Your company domain is read-only.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Work Email</Label>
            <Input value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input
              type="password"
              placeholder="Leave empty to keep current password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input value={form.companyName} readOnly />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Company Domain</Label>
            <Input value={form.companyDomain} readOnly />
            <p className="text-xs text-slate-500">The company domain cannot be changed for security reasons.</p>
          </div>
          <div className="md:col-span-2">
            <Button
              onClick={handleProfileSave}
              disabled={isSavingProfile}
              className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
            >
              {isSavingProfile ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
