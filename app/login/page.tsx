"use client"

import type React from "react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import AuthShell from "@/components/auth-shell"
import { setStoredUser } from "@/lib/client-session"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loginForm, setLoginForm] = useState({ email: "", password: "" })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("mode") === "signup") {
      router.replace("/signup")
    }
  }, [router])

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

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to your workspace"
      description="Use your work email and password to access your team."
      footer={<>New to EmployeeTracker? <Link href="/signup" className="font-semibold text-[#315438] underline-offset-4 hover:underline">Create a workspace</Link></>}
    >
      <form onSubmit={handleLogin} className="space-y-5" aria-busy={isLoading}>
        <div className="space-y-2">
          <Label htmlFor="login-email" className="text-sm font-medium text-[#344239]">Work email</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="username"
            placeholder="you@company.com"
            value={loginForm.email}
            onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
            required
            className="h-12 rounded-xl border-[#e1e7df] bg-white px-4 placeholder:text-[#a1aaa3] focus-visible:ring-[#78946d]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="login-password" className="text-sm font-medium text-[#344239]">Password</Label>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={loginForm.password}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
              required
              className="h-12 rounded-xl border-[#e1e7df] bg-white px-4 pr-12 placeholder:text-[#a1aaa3] focus-visible:ring-[#78946d]"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              aria-controls="login-password"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute right-1 top-1/2 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-lg text-[#78847b] transition hover:bg-[#f3f5f1] hover:text-[#344239] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#78946d]"
            >
              {showPassword ? <EyeOff className="size-[18px]" aria-hidden="true" /> : <Eye className="size-[18px]" aria-hidden="true" />}
            </button>
          </div>
        </div>
        <Button type="submit" disabled={isLoading} className="h-12 w-full rounded-xl bg-[#263c2c] text-sm font-semibold text-white shadow-sm transition hover:bg-[#1d3022] focus-visible:ring-2 focus-visible:ring-[#78946d] focus-visible:ring-offset-2 disabled:opacity-60">
          {isLoading ? <><Loader2 className="mr-2 size-4 animate-spin" />Signing in...</> : <>Enter your workspace<ArrowRight className="ml-2 size-4" /></>}
        </Button>
        <p className="pt-1 text-center text-xs leading-5 text-[#7a867e]">If you can’t access your account, contact your organization administrator.</p>
      </form>
    </AuthShell>
  )
}
