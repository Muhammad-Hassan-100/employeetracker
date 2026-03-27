"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Loader2, Pencil, Save, Trash2, X } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { authFetch } from "@/lib/client-session"

interface CompanyDetail {
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
  }
}

interface CompanyFormState {
  companyName: string
  adminName: string
  adminEmail: string
  adminStatus: "active" | "inactive"
  approvalStatus: "pending" | "approved" | "rejected"
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export default function SuperAdminCompanyDetail({ companyId }: { companyId: string }) {
  const [company, setCompany] = useState<CompanyDetail | null>(null)
  const [form, setForm] = useState<CompanyFormState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchCompany = async (withLoader = false) => {
    if (withLoader) {
      setIsLoading(true)
    }

    try {
      const response = await authFetch(`/api/super-admin/companies/${companyId}`)
      const data = await response.json()

      if (!response.ok) {
        toast.error("Unable to load company", {
          description: data.error || "Please try again.",
        })
        return
      }

      setCompany(data)
      setForm({
        companyName: data.name,
        adminName: data.admin.name,
        adminEmail: data.admin.email,
        adminStatus: data.admin.status,
        approvalStatus: data.approvalStatus,
      })
    } catch {
      toast.error("Unable to load company")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCompany(true)
  }, [companyId])

  const handleSave = async () => {
    if (!form) {
      return
    }

    setIsSaving(true)
    try {
      const response = await authFetch(`/api/super-admin/companies/${companyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error("Unable to update company", {
          description: data.error || "Please try again.",
        })
        return
      }

      toast.success("Company updated")
      setIsEditing(false)
      await fetchCompany(false)
    } catch {
      toast.error("Unable to update company")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm("Delete this company and all of its users, shifts, leaves, and attendance data?")) {
      return
    }

    setIsDeleting(true)
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
      window.location.href = "/dashboard/platform/companies"
    } catch {
      toast.error("Unable to delete company")
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading || !company || !form) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold text-slate-950">{company.name}</h1>
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
          <p className="mt-2 text-slate-600">
            {company.employeeCount} employees • Created {formatDate(company.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="rounded-2xl">
            <Link href="/dashboard/platform/companies">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Companies
            </Link>
          </Button>
          {!isEditing ? (
            <Button className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800" onClick={() => setIsEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Update Company
            </Button>
          ) : (
            <>
              <Button variant="outline" className="rounded-2xl" onClick={() => setIsEditing(false)}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800" disabled={isSaving} onClick={handleSave}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="rounded-3xl shadow-sm">
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
          <CardDescription>Fields stay read-only until you click Update Company.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input value={form.companyName} readOnly={!isEditing} onChange={(event) => setForm((prev) => prev ? { ...prev, companyName: event.target.value } : prev)} />
          </div>
          <div className="space-y-2">
            <Label>Company Domain</Label>
            <Input value={company.domain} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Admin Name</Label>
            <Input value={form.adminName} readOnly={!isEditing} onChange={(event) => setForm((prev) => prev ? { ...prev, adminName: event.target.value } : prev)} />
          </div>
          <div className="space-y-2">
            <Label>Admin Email</Label>
            <Input value={form.adminEmail} readOnly={!isEditing} onChange={(event) => setForm((prev) => prev ? { ...prev, adminEmail: event.target.value } : prev)} />
          </div>
          <div className="space-y-2">
            <Label>Admin Status</Label>
            {isEditing ? (
              <Select value={form.adminStatus} onValueChange={(value) => setForm((prev) => prev ? { ...prev, adminStatus: value as CompanyFormState["adminStatus"] } : prev)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input value={form.adminStatus} readOnly />
            )}
          </div>
          <div className="space-y-2 md:col-span-2 xl:col-span-2">
            <Label>Approval Status</Label>
            {isEditing ? (
              <Select value={form.approvalStatus} onValueChange={(value) => setForm((prev) => prev ? { ...prev, approvalStatus: value as CompanyFormState["approvalStatus"] } : prev)}>
                <SelectTrigger className="w-full md:w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input value={form.approvalStatus} readOnly className="w-full md:w-72" />
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl shadow-sm">
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>Deleting a company removes all related users, shifts, leave requests, and attendance records.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="rounded-2xl text-rose-700" disabled={isDeleting} onClick={handleDelete}>
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Delete Company
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
