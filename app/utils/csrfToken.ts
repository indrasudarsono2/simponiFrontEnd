/** Read the current readable double-submit cookie, never a cached login value. */
export function readCsrfToken(cookieHeader: string): string | null {
  const entries = cookieHeader.split(';').map(part => part.trim()).filter(part => part.startsWith('csrf_token='))
  // Ambiguous path-scoped cookies must not silently pick a different token than the server.
  if (entries.length !== 1) return null
  try {
    const token = decodeURIComponent(entries[0]!.slice('csrf_token='.length))
    return token && token.length <= 256 ? token : null
  } catch { return null }
}
