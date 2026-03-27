"use client"

import type React from "react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, BriefcaseBusiness, Loader2, ShieldCheck, UserRound } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { extractEmailDomain, isPublicEmailDomain, normalizeCompanyDomain } from "@/lib/company-utils"
import { setStoredUser } from "@/lib/client-session"

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [isLoading, setIsLoading] = useState(false)
  const [loginForm, setLoginForm] = useState({ email: "", password: "" })
  const [signupForm, setSignupForm] = useState({
    companyName: "",
    companyDomain: "",
    adminName: "",
    email: "",
    password: "",
  })

  useEffect(() => {
    const queryMode = new URLSearchParams(window.location.search).get("mode")
    if (queryMode === "signup") {
      setMode("signup")
    }
  }, [])

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error("Sign in failed", { description: data.error || "Check your credentials and try again." })
        return
      }

      setStoredUser(data.user)
      toast.success(`Welcome back, ${data.user.name}`, {
        description: `${data.user.companyName} workspace loaded successfully.`,
      })
      router.push("/dashboard")
    } catch {
      toast.error("Connection error", { description: "Unable to reach the server right now." })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)

    const normalizedDomain = normalizeCompanyDomain(signupForm.companyDomain)
    const emailDomain = extractEmailDomain(signupForm.email)

    if (isPublicEmailDomain(normalizedDomain)) {
      toast.error("Use a company domain", {
        description: "Public email domains such as gmail.com are not allowed.",
      })
      setIsLoading(false)
      return
    }

    if (emailDomain && normalizedDomain && emailDomain !== normalizedDomain) {
      toast.error("Admin email domain mismatch", {
        description: "The admin email domain must match the company domain.",
      })
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupForm),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error("Workspace creation failed", { description: data.error || "Please review the form and try again." })
        return
      }

      toast.success("Signup request submitted", {
        description: "Wait for super admin approval before signing in.",
      })
      setSignupForm({
        companyName: "",
        companyDomain: "",
        adminName: "",
        email: "",
        password: "",
      })
      setMode("login")
    } catch {
      toast.error("Connection error", { description: "Unable to create the workspace right now." })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f8f4]">
      <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_30%),linear-gradient(180deg,_#eefbf6_0%,_#f5f8f4_72%)]" />
      <div className="container flex min-h-screen flex-col justify-center px-4 py-8 sm:px-6 sm:py-10">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[32px] bg-slate-950 p-6 text-white shadow-[0_30px_70px_rgba(15,23,42,0.18)] sm:p-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm">
              <BriefcaseBusiness className="h-4 w-4 text-emerald-300" />
              EmployeeTracker Pro
            </div>
            <h1 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Manage one company or many, from one clean system.
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Create a company workspace, add employees, assign shifts, track attendance, approve leave requests,
              and monitor reports from one place.
            </p>

            <div className="mt-10 space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-300" />
                  <p className="font-semibold">Admin control</p>
                </div>
                <p className="mt-2 text-sm text-slate-300">Employee CRUD, shift management, leave approvals, attendance reports.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-3">
                  <UserRound className="h-5 w-5 text-sky-300" />
                  <p className="font-semibold">Employee workflow</p>
                </div>
                <p className="mt-2 text-sm text-slate-300">Shift-based check-in, check-out, future leave requests and personal history.</p>
              </div>
            </div>
          </div>

          <Card className="rounded-[32px] border-slate-200 bg-white/90 shadow-xl backdrop-blur">
            <CardHeader className="space-y-3 pb-0">
              <CardTitle className="text-2xl font-bold text-slate-950 sm:text-3xl">Access your workspace</CardTitle>
              <CardDescription className="text-base text-slate-600">
                Sign in as an admin or employee, or create a new company workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs value={mode} onValueChange={(value) => setMode(value as "login" | "signup")}>
                <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-3xl bg-slate-100 p-2 sm:grid-cols-2 sm:gap-0 sm:rounded-full sm:p-1">
                  <TabsTrigger value="login" className="rounded-full">
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-full">
                    Create Company
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-6">
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="admin@company.com"
                        value={loginForm.email}
                        onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Enter your password"
                        value={loginForm.password}
                        onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                        required
                      />
                    </div>
                    <Button type="submit" disabled={isLoading} className="h-11 w-full rounded-full bg-slate-950 text-white hover:bg-slate-800">
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        "Enter Workspace"
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-6">
                  <form onSubmit={handleSignup} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Company name</Label>
                      <Input
                        id="company-name"
                        placeholder="Orbit Logistics"
                        value={signupForm.companyName}
                        onChange={(event) => setSignupForm((prev) => ({ ...prev, companyName: event.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-domain">Company domain</Label>
                      <Input
                        id="company-domain"
                        placeholder="company.com"
                        value={signupForm.companyDomain}
                        onChange={(event) => setSignupForm((prev) => ({ ...prev, companyDomain: event.target.value }))}
                        required
                      />
                      <p className="text-xs text-slate-500">Public domains like gmail.com or outlook.com are not allowed.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-name">Admin full name</Label>
                      <Input
                        id="admin-name"
                        placeholder="Muhammad Hassan"
                        value={signupForm.adminName}
                        onChange={(event) => setSignupForm((prev) => ({ ...prev, adminName: event.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Work email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="admin@orbitlogistics.com"
                        value={signupForm.email}
                        onChange={(event) => setSignupForm((prev) => ({ ...prev, email: event.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        minLength={6}
                        placeholder="At least 6 characters"
                        value={signupForm.password}
                        onChange={(event) => setSignupForm((prev) => ({ ...prev, password: event.target.value }))}
                        required
                      />
                    </div>
                    <Button type="submit" disabled={isLoading} className="h-11 w-full rounded-full bg-emerald-600 text-white hover:bg-emerald-700">
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating workspace...
                        </>
                      ) : (
                        "Create Admin Workspace"
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
