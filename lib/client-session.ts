import type { SessionUser } from "@/lib/session"

export function getStoredUser() {
  if (typeof window === "undefined") {
    return null
  }

  const raw = window.localStorage.getItem("user")
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as SessionUser
  } catch {
    window.localStorage.removeItem("user")
    return null
  }
}

export function setStoredUser(user: SessionUser) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem("user", JSON.stringify(user))
}

export function clearStoredUser() {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem("user")
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const user = getStoredUser()
  const headers = new Headers(init.headers || {})

  if (user) {
    headers.set("x-user-id", user.id)
    headers.set("x-company-id", user.companyId)
    headers.set("x-company-name", user.companyName)
    headers.set("x-company-domain", user.companyDomain)
    headers.set("x-user-role", user.role)
    headers.set("x-user-name", user.name)
    headers.set("x-user-email", user.email)
  }

  return fetch(input, {
    ...init,
    headers,
  })
}
