"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import BrandMark from "@/components/brand-mark"

export default function AuthShell({ eyebrow, title, description, children, footer, wide = false }) {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#edf1eb] px-4 py-5 text-[#17231b] sm:px-6 sm:py-7">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(83,119,72,0.16),_transparent_38%),radial-gradient(ellipse_at_bottom_right,_rgba(190,215,159,0.3),_transparent_32%)]" />
      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link href="/" className="group inline-flex min-h-11 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#648558] focus-visible:ring-offset-2">
          <BrandMark />
          <span>
            <span className="block text-sm font-semibold tracking-tight text-[#17251c]">EmployeeTracker</span>
            <span className="block text-xs text-[#748078]">Workforce, in sync</span>
          </span>
        </Link>
        <Link href="/" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-[#69766d] transition hover:bg-white/80 hover:text-[#25382b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#648558]">
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Back to home</span>
          <span className="sm:hidden">Home</span>
        </Link>
      </header>

      <div className="relative flex flex-1 items-center justify-center py-8 sm:py-12">
        <section className={`w-full rounded-[28px] border border-[#d9e0d6] bg-white p-6 shadow-[0_20px_58px_rgba(25,43,29,0.12)] sm:p-9 ${wide ? "max-w-[640px]" : "max-w-[460px]"}`}>
          <div className="mb-7">
            {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#648558]">{eyebrow}</p>}
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#142019] sm:text-3xl">{title}</h1>
            {description && <p className="mt-2 text-sm leading-6 text-[#718078]">{description}</p>}
          </div>
          {children}
          {footer && <div className="mt-6 border-t border-[#edf0eb] pt-5 text-center text-sm text-[#718078]">{footer}</div>}
        </section>
      </div>

      <footer className="relative mx-auto flex w-full max-w-6xl flex-col gap-2 pb-1 text-xs text-[#879189] sm:flex-row sm:items-center sm:justify-between">
        <span>EmployeeTracker · Team operations, made clearer</span>
        <span>Organization access</span>
      </footer>
    </main>
  )
}
