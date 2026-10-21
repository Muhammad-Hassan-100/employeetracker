import LegalDocument from "@/components/legal-document"

export const metadata = {
  title: "Privacy Policy | EmployeeTracker",
  description:
    "Read the Pakistan-oriented draft privacy policy for EmployeeTracker and understand how workspace and attendance information is handled.",
}

export default function PrivacyPage() {
  return <LegalDocument type="privacy" />
}
