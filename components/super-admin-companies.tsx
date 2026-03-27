"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Building2, ExternalLink, Loader2, Trash2 } from "lucide-react"
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

export default function SuperAdminCompanies() {
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [busyCompanyId, setBusyCompanyId] = useState<string | null>(null)

  const fetchCompanies = async (withLoader = false) => {
    if (withLoader) {
      setIsLoading(true)
    }

    try {
      const response = await authFetch("/api/super-admin/companies")
      const data = await response.json()

      if (!response.ok) {
        toast.error("Unable to load companies", {
          description: data.error || "Please try again.",
        })
        return
      }

      setCompanies(data)
    } catch {
      toast.error("Unable to load companies")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCompanies(true)
  }, [])

  const deleteCompany = async (companyId: string) => {
    if (!window.confirm("Delete this company and all of its users, shifts, leaves, and attendance data?")) {
      return
    }

    setBusyCompanyId(companyId)
    try {
      const response = await authFetch(`/api/super-admin/companies/${companyId}`, {
        method: "DELETE",
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error("Unable to delete company", {
          description: data.error || "Please try again.",
        })
        return
      }

      toast.success("Company deleted")
      await fetchCompanies(false)
    } catch {
      toast.error("Unable to delete company")
    } finally {
      setBusyCompanyId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    )
  }

  return (
    <Card className="rounded-3xl shadow-sm">
      <CardHeader>
        <CardTitle>Company Workspaces</CardTitle>
        <CardDescription>Select a company to view its details. Edit fields only open on the detail page.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {companies.map((company) => (
          <div key={company.companyId} className="rounded-3xl border border-slate-200 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-500" />
                  <h3 className="text-lg font-semibold text-slate-950">{company.name}</h3>
                  <Badge variant="outline">{company.domain}</Badge>
                  <Badge
                    className={
                      company.approvalStatus === "approved"
                        ? "bg-emerald-100 text-emerald-900"
                        : company.approvalStatus === "rejected"
                          ? "bg-rose-100 text-rose-900"
                          : "bg-amber-100 text-amber-900"
                    }
                  >
                    {company.approvalStatus}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600">
                  Admin: {company.admin?.name || "Not found"} • {company.admin?.email || "No email"}
                </p>
                <p className="text-sm text-slate-600">
                  {company.employeeCount} employees • Created {formatDate(company.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline" className="rounded-2xl">
                  <Link href={`/dashboard/platform/companies/${company.companyId}`}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Details
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="rounded-2xl text-rose-700"
                  disabled={busyCompanyId === company.companyId}
                  onClick={() => deleteCompany(company.companyId)}
                >
                  {busyCompanyId === company.companyId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
