import LegalDocument from "@/components/legal-document"

export const metadata = {
  title: "Cookie Notice | EmployeeTracker",
  description:
    "Learn how EmployeeTracker uses browser local storage and a sidebar preference cookie in the current application.",
}

export default function CookiesPage() {
  return <LegalDocument type="cookies" />
}
