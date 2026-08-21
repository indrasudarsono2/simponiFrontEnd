export const useApiBaseUrl = (): string => {
  const config = useRuntimeConfig()
  const apiBaseUrl = String(config.public.apiBaseUrl || '').trim().replace(/\/+$/, '')

  if (import.meta.env.PROD && !apiBaseUrl.startsWith('https://')) {
    throw new Error('NUXT_PUBLIC_API_BASE_URL must use HTTPS in production')
  }

  return apiBaseUrl
}
