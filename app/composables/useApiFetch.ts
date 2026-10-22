// app/composables/useApiFetch.ts
import { validateUploadSize } from '../utils/uploadSize';
import { readCsrfToken } from '../utils/csrfToken';
export const useApiFetch = () => {
  const { token } = useAuth()
  const csrfToken = useCookie<string | null>('csrf_token')
  const apiBaseUrl = useApiBaseUrl()

  const apiFetch = async <T = unknown>(url: string, options: Parameters<typeof $fetch>[1] = {}): Promise<T> => {
    validateUploadSize(url, options.body);
    const method = String(options.method || 'GET').toUpperCase()
    const headers = new Headers(options.headers)
    if (token.value) headers.set('Authorization', `Bearer ${token.value}`)
    const currentCsrfToken = import.meta.client ? readCsrfToken(document.cookie) : csrfToken.value
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && currentCsrfToken) {
      headers.set('X-CSRF-Token', currentCsrfToken)
    }

    const requestUrl = /^https?:\/\//i.test(url)
      ? url
      : `${apiBaseUrl}${url.startsWith('/') ? url : `/${url}`}`

    return $fetch<T>(requestUrl, {
      ...options,
      credentials: 'include',
      headers
    })
  }

  return { apiFetch }
}
