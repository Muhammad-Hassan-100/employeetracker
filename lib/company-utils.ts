const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "mail.com",
  "gmx.com",
  "zoho.com",
  "proton.me",
  "protonmail.com",
  "yandex.com",
])

export function normalizeCompanyDomain(value: string) {
  const trimmed = value.toLowerCase().trim().replace(/^@/, "")
  return trimmed
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
}

export function isCompanyDomainValid(domain: string) {
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain)
}

export function isPublicEmailDomain(domain: string) {
  return PUBLIC_EMAIL_DOMAINS.has(domain.toLowerCase())
}

export function extractEmailDomain(email: string) {
  const [, domain = ""] = email.toLowerCase().trim().split("@")
  return domain
}

export function buildEmailLocalPart(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s.-]/g, "")
    .replace(/\s+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^-+|-+$/g, "")
    .replace(/^\.+|\.+$/g, "")
}

export function buildPreviewEmail(name: string, domain: string) {
  const localPart = buildEmailLocalPart(name)
  return localPart && domain ? `${localPart}@${domain}` : ""
}

