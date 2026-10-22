/** Images must be short-lived backend capabilities, never arbitrary URLs. */
export function resolveSignedImage(value: unknown, apiBaseUrl: string): string {
  if (typeof value !== 'string') return ''
  const path = value.trim()
  const base = apiBaseUrl.replace(/\/+$/, '')
  const relative = path.startsWith(`${base}/files/`) ? path.slice(base.length) : path
  if (!/^\/files\/\d+\/[A-Za-z0-9_-]{43}\/.+/.test(relative)
    || /[?#\\\x00-\x20]/.test(relative)) return ''
  try {
    const segments = relative.split('/').slice(4).map(decodeURIComponent)
    if (segments.some(part => !part || part === '.' || part === '..' || /[\/\\?#\x00-\x1f]/.test(part))) return ''
  } catch { return '' }
  return `${base}${relative}`
}
