"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight, Check, Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import AuthShell from "@/components/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { extractEmailDomain, isPublicEmailDomain, normalizeCompanyDomain } from "@/lib/company-utils"

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [signupForm, setSignupForm] = useState({
    companyName: "",
    companyDomain: "",
    adminName: "",
    email: "",
    password: "",
  })

  const handleSignup = async (event) => {
    event.preventDefault()
    setIsLoading(true)

    const normalizedDomain = normalizeCompanyDomain(signupForm.companyDomain)
    const emailDomain = extractEmailDomain(signupForm.email)
    if (isPublicEmailDomain(normalizedDomain)) {
      toast.error("Use a company domain", { description: "Public email domains such as gmail.com are not allowed." })
      setIsLoading(false)
      return
    }
    if (emailDomain && normalizedDomain && emailDomain !== normalizedDomain) {
      toast.error("Admin email domain mismatch", { description: "The admin email domain must match the company domain." })
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

      setIsSubmitted(true)
      toast.success("Signup request submitted", { description: "Your workspace is waiting for administrator approval." })
    } catch {
      toast.error("Connection error", { description: "Unable to create the workspace right now." })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <AuthShell
        eyebrow="Request received"
        title="Your workspace is in review"
        description="The platform administrator needs to approve your organization before you can sign in."
        footer={<>Already have access? <Link href="/login" className="font-semibold text-[#315438] underline-offset-4 hover:underline">Go to sign in</Link></>}
      >
        <div className="rounded-2xl border border-[#dce9d5] bg-[#f4f8f1] p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e4efdc] text-[#315438]"><Check className="size-5" /></span>
            <div>
              <p className="text-sm font-semibold text-[#25382b]">You’ve completed the signup request.</p>
              <p className="mt-1 text-sm leading-6 text-[#65736a]">Once it’s approved, you can sign in with the admin work email you provided.</p>
            </div>
          </div>
        </div>
        <Link href="/login" className="mt-5 block">
          <Button className="h-12 w-full rounded-xl bg-[#263c2c] text-sm font-semibold text-white hover:bg-[#1d3022]">Return to sign in<ArrowRight className="ml-2 size-4" /></Button>
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      wide
      eyebrow="New organization"
      title="Create your company workspace"
      description="Enter your organization and administrator details to request a workspace."
      footer={<>Already registered? <Link href="/login" className="font-semibold text-[#315438] underline-offset-4 hover:underline">Sign in</Link></>}
    >
      <form onSubmit={handleSignup} className="space-y-4" aria-busy={isLoading}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="company-name" className="text-sm font-medium text-[#344239]">Company name</Label>
            <Input id="company-name" autoComplete="organization" placeholder="Orbit Logistics" value={signupForm.companyName} onChange={(event) => setSignupForm((prev) => ({ ...prev, companyName: event.target.value }))} required className="h-11 rounded-xl border-[#e1e7df] px-3.5 focus-visible:ring-[#78946d]" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-domain" className="text-sm font-medium text-[#344239]">Company domain</Label>
            <Input id="company-domain" autoComplete="url" placeholder="company.com" value={signupForm.companyDomain} onChange={(event) => setSignupForm((prev) => ({ ...prev, companyDomain: event.target.value }))} required className="h-11 rounded-xl border-[#e1e7df] px-3.5 focus-visible:ring-[#78946d]" />
          </div>
        </div>
        <p className="-mt-1 text-xs leading-5 text-[#7a867e]">Use your organization’s domain. Public email domains are not allowed.</p>
        <div className="space-y-2">
          <Label htmlFor="admin-name" className="text-sm font-medium text-[#344239]">Administrator name</Label>
          <Input id="admin-name" autoComplete="name" placeholder="Your full name" value={signupForm.adminName} onChange={(event) => setSignupForm((prev) => ({ ...prev, adminName: event.target.value }))} required className="h-11 rounded-xl border-[#e1e7df] px-3.5 focus-visible:ring-[#78946d]" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-email" className="text-sm font-medium text-[#344239]">Admin work email</Label>
          <Input id="signup-email" type="email" autoComplete="email" placeholder="you@company.com" value={signupForm.email} onChange={(event) => setSignupForm((prev) => ({ ...prev, email: event.target.value }))} required className="h-11 rounded-xl border-[#e1e7df] px-3.5 focus-visible:ring-[#78946d]" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-password" className="text-sm font-medium text-[#344239]">Password</Label>
          <div className="relative">
            <Input id="signup-password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={6} placeholder="At least 6 characters" value={signupForm.password} onChange={(event) => setSignupForm((prev) => ({ ...prev, password: event.target.value }))} required className="h-11 rounded-xl border-[#e1e7df] px-3.5 pr-12 focus-visible:ring-[#78946d]" />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              aria-controls="signup-password"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute right-0 top-1/2 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-lg text-[#78847b] transition hover:bg-[#f3f5f1] hover:text-[#344239] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#78946d]"
            >
              {showPassword ? <EyeOff className="size-[18px]" aria-hidden="true" /> : <Eye className="size-[18px]" aria-hidden="true" />}
            </button>
          </div>
          <p className="text-xs leading-5 text-[#7a867e]">Use at least 6 characters. Your workspace needs approval before sign-in.</p>
        </div>
        <Button type="submit" disabled={isLoading} className="mt-2 h-12 w-full rounded-xl bg-[#263c2c] text-sm font-semibold text-white shadow-sm transition hover:bg-[#1d3022] focus-visible:ring-2 focus-visible:ring-[#78946d] focus-visible:ring-offset-2 disabled:opacity-60">
          {isLoading ? <><Loader2 className="mr-2 size-4 animate-spin" />Submitting request...</> : <>Request a workspace<ArrowRight className="ml-2 size-4" /></>}
        </Button>
      </form>
    </AuthShell>
  )
}
