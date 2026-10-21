import Link from "next/link"
import { Button } from "@/components/ui/button"
import PublicHeader from "@/components/public-header"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f5f2]">
      <PublicHeader />
      <div className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="max-w-md space-y-4 rounded-3xl bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">404</p>
        <h1 className="text-3xl font-bold text-slate-950">Page not found</h1>
        <p className="text-slate-600">The page you requested does not exist or may have been moved.</p>
        <Link href="/">
          <Button className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800">Go to Home</Button>
        </Link>
      </div>
      </div>
    </div>
  )
}
