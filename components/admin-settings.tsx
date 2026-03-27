"use client"

import { useEffect, useState } from "react"
import { Loader2, Settings2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authFetch, setStoredUser } from "@/lib/client-session"
import { WEEKDAY_OPTIONS } from "@/lib/company-settings"
import type { SessionUser } from "@/lib/session"

interface AdminSettingsProps {
  user: SessionUser
  onUserUpdate?: (user: SessionUser) => void
}

export default function AdminSettings({ user, onUserUpdate }: AdminSettingsProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingCompany, setIsSavingCompany] = useState(false)
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    password: "",
    companyName: user.companyName,
    companyDomain: user.companyDomain,
  })
  const [companySettings, setCompanySettings] = useState({
    workingDays: [1, 2, 3, 4, 5],
    departmentsInput: "",
  })

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const [profileResponse, companyResponse] = await Promise.all([
          authFetch("/api/auth/profile"),
          authFetch("/api/company/settings"),
        ])
        const [profileData, companyData] = await Promise.all([profileResponse.json(), companyResponse.json()])

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

        if (companyResponse.ok) {
          setCompanySettings({
            workingDays: companyData.settings.workingDays,
            departmentsInput: companyData.settings.departments.join(", "),
          })
        }
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

  const toggleWorkingDay = (day: number) => {
    setCompanySettings((prev) => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter((entry) => entry !== day)
        : [...prev.workingDays, day].sort((left, right) => left - right),
    }))
  }

  const handleCompanySave = async () => {
    setIsSavingCompany(true)

    try {
      const departments = companySettings.departmentsInput
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)

      const response = await authFetch("/api/company/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workingDays: companySettings.workingDays,
          departments,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error("Unable to update company settings", {
          description: data.error || "Please review the company settings and try again.",
        })
        return
      }

      setCompanySettings({
        workingDays: data.settings.workingDays,
        departmentsInput: data.settings.departments.join(", "),
      })
      toast.success("Company settings updated", {
        description: "Working days and departments were saved successfully.",
      })
    } catch {
      toast.error("Unable to update company settings")
    } finally {
      setIsSavingCompany(false)
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

      <Card className="rounded-3xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Company Rules</CardTitle>
          <CardDescription>Choose the weekly working days and define the departments available in your company.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Working Days</Label>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {WEEKDAY_OPTIONS.map((day) => {
                const selected = companySettings.workingDays.includes(day.value)
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleWorkingDay(day.value)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      selected
                        ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <div className="font-medium">{day.label}</div>
                    <div className="text-xs">{selected ? "Working day" : "Off day"}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Departments</Label>
            <Input
              value={companySettings.departmentsInput}
              onChange={(event) => setCompanySettings((prev) => ({ ...prev, departmentsInput: event.target.value }))}
              placeholder="HR, Finance, Sales, Engineering"
            />
            <p className="text-xs text-slate-500">Enter department names separated by commas. These options will appear in employee forms.</p>
          </div>

          <Button
            onClick={handleCompanySave}
            disabled={isSavingCompany}
            className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {isSavingCompany ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving company rules...
              </>
            ) : (
              "Save Company Rules"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
