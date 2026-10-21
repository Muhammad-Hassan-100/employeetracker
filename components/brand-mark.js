/** @param {{ size?: number, className?: string, dashboardBranding?: boolean }} props */
export default function BrandMark({ size = 40, className, dashboardBranding = false }) {
  const markColor = dashboardBranding ? "var(--dashboard-green, #0b1020)" : "#0b1020"

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect width="64" height="64" rx="16" fill={markColor} />
      <rect x="18" y="23" width="28" height="20" rx="5" stroke="#f8fafc" strokeWidth="3" />
      <path
        d="M26 23V20C26 18.343 27.343 17 29 17H35C36.657 17 38 18.343 38 20V23"
        stroke="#f8fafc"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M18 31H46" stroke="#f8fafc" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="31" r="2.25" fill="#f8fafc" />
    </svg>
  )
}
