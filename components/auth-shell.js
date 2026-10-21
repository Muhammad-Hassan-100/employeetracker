"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import BrandMark from "@/components/brand-mark"

export default function AuthShell({ eyebrow, title, description, children, footer, wide = false }) {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#f5f7f3] px-4 py-5 text-[#19231c] sm:px-6 sm:py-7">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(123,160,104,0.12),_transparent_38%),radial-gradient(ellipse_at_bottom_right,_rgba(216,237,189,0.25),_transparent_32%)]" />
      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link href="/" className="group inline-flex min-h-11 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#648558] focus-visible:ring-offset-2">
          <BrandMark />
          <span>
            <span className="block text-sm font-semibold tracking-tight text-[#1f2a22]">EmployeeTracker</span>
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
        <section className={`w-full rounded-[28px] border border-[#e5e9e2] bg-white p-6 shadow-[0_18px_55px_rgba(31,48,35,0.07)] sm:p-9 ${wide ? "max-w-[640px]" : "max-w-[460px]"}`}>
          <div className="mb-7">
            {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#648558]">{eyebrow}</p>}
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#19231c] sm:text-3xl">{title}</h1>
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
