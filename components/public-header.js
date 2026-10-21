import Link from "next/link"
import { ArrowRight } from "lucide-react"
import BrandMark from "@/components/brand-mark"

/** @param {{ activePage?: "guide" | "signin" | "signup" }} props */
export default function PublicHeader({ activePage }) {
  const navLinkClass =
    "inline-flex min-h-11 items-center rounded-full px-2 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#496b4f] focus-visible:ring-offset-2 sm:px-4"

  return (
    <header className="w-full border-b border-[#dce2da] bg-[#f8f9f6]">
      <div className="mx-auto flex min-h-[76px] max-w-[1110px] items-center justify-between px-3 sm:px-8 max-[380px]:flex-wrap max-[380px]:gap-y-1 max-[380px]:py-2">
        <Link
          href="/"
          aria-label="EmployeeTracker home"
          className="inline-flex min-h-11 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#496b4f] focus-visible:ring-offset-4"
        >
          <BrandMark size={36} />
          <span className="text-xs font-semibold tracking-[-0.035em] text-[#17251b] sm:text-[14px]">
            EmployeeTracker
          </span>
        </Link>
        <nav
          aria-label="Main navigation"
          className="flex items-center gap-0 sm:gap-3 max-[380px]:w-full max-[380px]:justify-end"
        >
          <Link
            href="/guide"
            aria-current={activePage === "guide" ? "page" : undefined}
            className={`${navLinkClass} bg-[#e4ebe1] text-[#294b32] hover:bg-[#dce6d8]`}
          >
            Guide
          </Link>
          <Link
            href="/login"
            aria-current={activePage === "signin" ? "page" : undefined}
            className={`${navLinkClass} ${activePage === "signin" ? "bg-[#e4ebe1] text-[#294b32]" : "text-[#455349] hover:bg-[#edf0eb]"}`}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            aria-current={activePage === "signup" ? "page" : undefined}
            className="ml-0 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#1b3022] px-2 text-[12px] font-semibold text-white transition hover:bg-[#12251a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#496b4f] focus-visible:ring-offset-2 sm:ml-2 sm:gap-2 sm:px-5"
          >
            <span className="hidden sm:inline">Create a workspace</span>
            <span className="sm:hidden">Start</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </nav>
      </div>
    </header>
  )
}
