export const useApiBaseUrl = (): string => {
  const config = useRuntimeConfig()
  const apiBaseUrl = String(config.public.apiBaseUrl || '').trim().replace(/\/+$/, '')

  const isSameOriginPath = apiBaseUrl.startsWith('/')
  if (import.meta.env.PROD && !isSameOriginPath && !apiBaseUrl.startsWith('https://')) {
    throw new Error('NUXT_PUBLIC_API_BASE_URL must be same-origin or use HTTPS in production')
  }

  return apiBaseUrl
}
