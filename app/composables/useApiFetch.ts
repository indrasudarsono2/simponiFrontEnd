// app/composables/useApiFetch.ts
export const useApiFetch = () => {
  const { token } = useAuth()
  const csrfToken = useCookie<string | null>('csrf_token')
  const apiBaseUrl = useApiBaseUrl()

  const apiFetch = async (url: string, options: Parameters<typeof $fetch>[1] = {}) => {
    const method = String(options.method || 'GET').toUpperCase()
    const headers = new Headers(options.headers)
    if (token.value) headers.set('Authorization', `Bearer ${token.value}`)
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken.value) {
      headers.set('X-CSRF-Token', csrfToken.value)
    }

    const requestUrl = /^https?:\/\//i.test(url)
      ? url
      : `${apiBaseUrl}${url.startsWith('/') ? url : `/${url}`}`

    return $fetch(requestUrl, {
      ...options,
      credentials: 'include',
      headers
    })
  }

  return { apiFetch }
}
