"use client"

import { useEffect, useState } from "react"
import { Loader2, Palette, Settings2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authFetch, setStoredUser } from "@/lib/client-session"
import type { SessionUser } from "@/lib/session"

const brandColorPresets = [
  { name: "Default", value: "#263c2c" },
  { name: "Blue", value: "#1d4ed8" },
  { name: "Violet", value: "#6d28d9" },
  { name: "Teal", value: "#0f766e" },
  { name: "Rose", value: "#be123c" },
  { name: "Slate", value: "#334155" },
]

interface AdminSettingsProps {
  user: SessionUser
  onUserUpdate?: (user: SessionUser) => void
}

export default function AdminSettings({ user, onUserUpdate }: AdminSettingsProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingBrand, setIsSavingBrand] = useState(false)
  const [dashboardPrimaryColor, setDashboardPrimaryColor] = useState("#263c2c")
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
        const [profileResponse, brandingResponse] = await Promise.all([
          authFetch("/api/auth/profile"),
          authFetch("/api/company/branding"),
        ])
        const [profileData, brandingData] = await Promise.all([profileResponse.json(), brandingResponse.json()])

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
        if (brandingResponse.ok && /^#[0-9a-fA-F]{6}$/.test(brandingData.dashboardPrimaryColor || "")) {
          setDashboardPrimaryColor(brandingData.dashboardPrimaryColor.toLowerCase())
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

  const handleBrandSave = async () => {
    setIsSavingBrand(true)
    try {
      const response = await authFetch("/api/company/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboardPrimaryColor }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error("Unable to update brand color", { description: data.error || "Please try again." })
        return
      }

      setDashboardPrimaryColor(data.dashboardPrimaryColor)
      window.dispatchEvent(new CustomEvent("dashboard-brand-updated", { detail: data.dashboardPrimaryColor }))
      try {
        localStorage.setItem("dashboard-brand-updated", String(Date.now()))
      } catch {
        // The current dashboard already received the color through the custom event.
      }
      toast.success("Brand color updated", { description: "The organization’s dashboards now use this color." })
    } catch {
      toast.error("Unable to update brand color")
    } finally {
      setIsSavingBrand(false)
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
    <div className="space-y-6" data-dashboard-view="admin-settings">
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
          <CardTitle className="flex items-center gap-2 text-xl"><Palette className="size-5 text-[var(--dashboard-green-text)]" />Organization dashboard color</CardTitle>
          <CardDescription>Choose the primary accent used by dashboards for your whole organization.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            {brandColorPresets.map((preset) => (
              <div key={preset.value} className="flex min-w-12 flex-col items-center gap-1.5">
                <button
                  type="button"
                  aria-label={`${preset.name} brand color`}
                  aria-pressed={dashboardPrimaryColor === preset.value}
                  onClick={() => setDashboardPrimaryColor(preset.value)}
                  className={`size-9 rounded-full border-2 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${dashboardPrimaryColor === preset.value ? "border-slate-950 ring-2 ring-slate-300" : "border-white shadow-sm"}`}
                  style={{ backgroundColor: preset.value }}
                />
                <span className="text-[11px] text-[var(--dashboard-muted)]">{preset.name}</span>
              </div>
            ))}
            <div className="flex items-center gap-3 rounded-xl border border-[var(--dashboard-border-soft)] px-3 py-2">
              <label htmlFor="dashboard-primary-color" className="text-sm font-medium text-[var(--dashboard-ink-soft)]">Custom</label>
              <input
                id="dashboard-primary-color"
                type="color"
                value={dashboardPrimaryColor}
                onChange={(event) => setDashboardPrimaryColor(event.target.value.toLowerCase())}
                className="h-9 w-12 cursor-pointer rounded-md border-0 bg-transparent p-0"
              />
              <span className="min-w-16 font-mono text-xs uppercase text-[var(--dashboard-muted)]">{dashboardPrimaryColor}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#f7f8f5] p-4">
            <div className="flex items-center gap-3">
              <span className="size-9 rounded-xl shadow-sm" style={{ backgroundColor: dashboardPrimaryColor }} />
              <div>
                <p className="text-sm font-semibold text-[var(--dashboard-ink)]">Brand color preview</p>
                <p className="text-xs text-[var(--dashboard-muted)]">Used for primary actions, active navigation, and dashboard accents.</p>
              </div>
            </div>
            <Button onClick={handleBrandSave} disabled={isSavingBrand} className="min-h-11 rounded-xl bg-[var(--dashboard-green)] px-5 text-white hover:bg-[var(--dashboard-green-hover)]">
              {isSavingBrand ? <><Loader2 className="mr-2 size-4 animate-spin" />Saving...</> : "Save brand color"}
            </Button>
          </div>
        </CardContent>
      </Card>

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
