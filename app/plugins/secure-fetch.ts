export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const apiBaseUrl = String(config.public.apiBaseUrl).replace(/\/+$/, '')
  const csrfToken = useCookie<string | null>('csrf_token')
  const originalFetch = globalThis.$fetch

  globalThis.$fetch = originalFetch.create({
    credentials: 'include',
    onRequest({ request, options }) {
      const requestUrl = new URL(
        typeof request === 'string' ? request : request.url,
        apiBaseUrl
      )
      const apiOrigin = new URL(apiBaseUrl).origin

      if (requestUrl.origin !== apiOrigin) return

      options.credentials = 'include'
      const method = String(options.method || 'GET').toUpperCase()
      if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken.value) {
        const headers = new Headers(options.headers)
        headers.set('X-CSRF-Token', csrfToken.value)
        options.headers = headers
      }
    }
  })
})
