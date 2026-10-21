import LegalDocument from "@/components/legal-document"

export const metadata = {
  title: "Terms of Service | EmployeeTracker",
  description:
    "Review the Pakistan-oriented draft terms for EmployeeTracker workspaces, employee accounts, attendance records, and organization responsibilities.",
}

export default function TermsPage() {
  return <LegalDocument type="terms" />
}
