export const useApiBaseUrl = (): string => {
  // Fail closed: every existing page that uses this helper sends its requests
  // to a local training-only URL while the tab is in Training Mode.
  if (import.meta.client && useTrainingMode().active.value) {
    return '/__training_api__'
  }
  const config = useRuntimeConfig()
  const apiBaseUrl = String(config.public.apiBaseUrl || '').trim().replace(/\/+$/, '')

  const isSameOriginPath = apiBaseUrl.startsWith('/')
  if (import.meta.env.PROD && !isSameOriginPath && !apiBaseUrl.startsWith('https://')) {
    throw new Error('NUXT_PUBLIC_API_BASE_URL must be same-origin or use HTTPS in production')
  }

  return apiBaseUrl
}
