/** Present actionable login errors without exposing transport URLs or server internals. */
export function loginErrorMessage(error: unknown): string {
  const fallback = 'Unable to sign in. Please try again. If the problem continues, contact your administrator.'
  if (!error || typeof error !== 'object') return fallback
  const e = error as {
    status?: number
    statusCode?: number
    data?: { message?: string; statusCode?: number }
    response?: { status?: number; headers?: { get(name: string): string | null } }
  }
  const status = Number(e.response?.status || e.statusCode || e.status || e.data?.statusCode || 0)
  if (status === 429) {
    const retry = e.response?.headers?.get('retry-after')
    const seconds = retry && /^\d+$/.test(retry) ? Number(retry) : 0
    const wait = seconds > 0 && seconds <= 86400
      ? `Please wait ${Math.ceil(seconds / 60)} minute(s) before trying again.`
      : 'Please wait a few minutes before trying again.'
    return `Too many sign-in attempts in a short time. ${wait}`
  }
  if (status === 401) return 'Sign-in failed. Check your e-NIK and password, and make sure you are using the correct sign-in method.'
  if (status === 403) return 'Sign-in is not available for this account. Contact your administrator for assistance.'
  if (status >= 500) return 'The sign-in service is temporarily unavailable. Please try again later.'
  if (!status) return 'Cannot connect to the sign-in service. Check your internet connection and try again. If it continues, contact your administrator.'
  return fallback
}
