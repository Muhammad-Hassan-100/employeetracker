"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { authFetch } from "@/lib/client-session"

interface CompanyRecord {
  companyId: string
  name: string
  domain: string
  approvalStatus: "pending" | "approved" | "rejected"
  createdAt: string
  employeeCount: number
  admin: {
    id: string
    name: string
    email: string
    status: "active" | "inactive"
    approvalStatus: "pending" | "approved" | "rejected"
  } | null
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export default function SuperAdminRequests() {
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const fetchCompanies = async (withLoader = false) => {
    if (withLoader) {
      setIsLoading(true)
    }

    try {
      const response = await authFetch("/api/super-admin/companies")
      const data = await response.json()

      if (!response.ok) {
        toast.error("Unable to load company requests", {
          description: data.error || "Please try again.",
        })
        return
      }

      setCompanies(data)
    } catch {
      toast.error("Unable to load company requests")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCompanies(true)
  }, [])

  const pendingCompanies = useMemo(
    () => companies.filter((company) => (company.approvalStatus || "approved") === "pending"),
    [companies],
  )

  const updateApproval = async (company: CompanyRecord, approvalStatus: "approved" | "rejected") => {
    setBusyKey(`${company.companyId}-${approvalStatus}`)
    try {
      const response = await authFetch(`/api/super-admin/companies/${company.companyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: company.name,
          adminName: company.admin?.name || "",
          adminEmail: company.admin?.email || "",
          adminStatus: approvalStatus === "approved" ? "active" : "inactive",
          approvalStatus,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error("Unable to update request", {
          description: data.error || "Please try again.",
        })
        return
      }

      toast.success(approvalStatus === "approved" ? "Company approved" : "Company rejected")
      await fetchCompanies(false)
    } catch {
      toast.error("Unable to update request")
    } finally {
      setBusyKey(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <ShieldCheck className="h-10 w-10 rounded-2xl bg-amber-100 p-2 text-amber-700" />
            <div>
              <p className="text-sm text-slate-500">Pending Requests</p>
              <p className="text-2xl font-bold">{pendingCompanies.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <CheckCircle2 className="h-10 w-10 rounded-2xl bg-emerald-100 p-2 text-emerald-700" />
            <div>
              <p className="text-sm text-slate-500">Approved Companies</p>
              <p className="text-2xl font-bold">{companies.filter((company) => company.approvalStatus === "approved").length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <XCircle className="h-10 w-10 rounded-2xl bg-rose-100 p-2 text-rose-700" />
            <div>
              <p className="text-sm text-slate-500">Rejected Companies</p>
              <p className="text-2xl font-bold">{companies.filter((company) => company.approvalStatus === "rejected").length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl shadow-sm">
        <CardHeader>
          <CardTitle>Admin Signup Requests</CardTitle>
          <CardDescription>Approve or reject signup requests before any company admin can sign in.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingCompanies.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              No pending requests right now.
            </div>
          ) : (
            pendingCompanies.map((company) => (
              <div key={company.companyId} className="rounded-3xl border border-slate-200 p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-950">{company.name}</h3>
                      <Badge className="bg-amber-100 text-amber-900">Pending</Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      @{company.domain} • Created {formatDate(company.createdAt)}
                    </p>
                    <p className="text-sm text-slate-700">
                      Admin: {company.admin?.name || "Not found"} ({company.admin?.email || "No email"})
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      className="rounded-2xl bg-emerald-600 hover:bg-emerald-700"
                      disabled={busyKey === `${company.companyId}-approved`}
                      onClick={() => updateApproval(company, "approved")}
                    >
                      {busyKey === `${company.companyId}-approved` ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
                    </Button>
                    <Button
                      variant="destructive"
                      className="rounded-2xl"
                      disabled={busyKey === `${company.companyId}-rejected`}
                      onClick={() => updateApproval(company, "rejected")}
                    >
                      {busyKey === `${company.companyId}-rejected` ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
