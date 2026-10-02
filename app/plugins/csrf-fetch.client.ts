const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function requestUrl(request: RequestInfo | URL): string {
  if (typeof request === 'string') return request
  if (request instanceof URL) return request.toString()
  return request.url
}

function isPerformaApiRequest(url: string, apiBaseUrl: string): boolean {
  const normalizedBase = apiBaseUrl.replace(/\/+$/, '')
  if (!normalizedBase) return false

  if (normalizedBase.startsWith('/')) {
    return url === normalizedBase || url.startsWith(`${normalizedBase}/`)
  }

  try {
    const requestAbsoluteUrl = new URL(url, window.location.origin)
    const apiAbsoluteUrl = new URL(normalizedBase)
    return (
      requestAbsoluteUrl.origin === apiAbsoluteUrl.origin
      && (requestAbsoluteUrl.pathname === apiAbsoluteUrl.pathname
        || requestAbsoluteUrl.pathname.startsWith(`${apiAbsoluteUrl.pathname}/`))
    )
  } catch {
    return false
  }
}

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const apiBaseUrl = String(config.public.apiBaseUrl || '')
  const csrfToken = useCookie<string | null>('csrf_token')
  const baseFetch = globalThis.$fetch

  globalThis.$fetch = baseFetch.create({
    onRequest({ request, options }) {
      const method = String(options.method || 'GET').toUpperCase()
      if (SAFE_METHODS.has(method) || !csrfToken.value) return
      if (!isPerformaApiRequest(requestUrl(request), apiBaseUrl)) return

      const headers = new Headers(options.headers)
      if (!headers.has('X-CSRF-Token')) {
        headers.set('X-CSRF-Token', csrfToken.value)
      }
      options.headers = headers
      options.credentials = 'include'
    }
  })
})
