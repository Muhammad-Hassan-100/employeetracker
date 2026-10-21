"use client"

import Link from "next/link"
import PublicHeader from "@/components/public-header"

export default function AuthShell({ eyebrow, title, description, children, footer, wide = false }) {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#edf1eb] text-[#17231b]">
      <PublicHeader activePage={wide ? "signup" : "signin"} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 top-[76px] bg-[radial-gradient(ellipse_at_top_left,_rgba(83,119,72,0.16),_transparent_38%),radial-gradient(ellipse_at_bottom_right,_rgba(190,215,159,0.3),_transparent_32%)]" />

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
