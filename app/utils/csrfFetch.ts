import { readCsrfToken } from './csrfToken'

/** Only attach the browser's CSRF secret to PERFORMA API routes on this origin. */
export function isSameOriginApi(url: string, origin: string): boolean {
  try {
    const parsed = new URL(url, origin)
    return parsed.origin === origin && /^\/(?:backend\/)?api(?:\/|$)/.test(parsed.pathname)
  } catch { return false }
}

export function csrfRequestOptions(
  url: string,
  options: Parameters<typeof $fetch>[1],
  cookie: string,
  origin: string,
): Parameters<typeof $fetch>[1] {
  if (!isSameOriginApi(url, origin)) return options
  const headers = new Headers(options?.headers)
  const method = String(options?.method || 'GET').toUpperCase()
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = readCsrfToken(cookie)
    // Replace cached headers too: the cookie may have rotated after login.
    if (token) headers.set('X-CSRF-Token', token)
    else headers.delete('X-CSRF-Token')
  }
  return { ...options, headers, credentials: 'include' }
}

/** Explicitly wrap mutations; do not rely on patching Nuxt's global $fetch. */
export async function csrfFetch<T = unknown>(url: string, options: Parameters<typeof $fetch>[1] = {}): Promise<T> {
  const secured = import.meta.client
    ? csrfRequestOptions(url, options, document.cookie, window.location.origin)
    : options
  return $fetch<T>(url, secured)
}
