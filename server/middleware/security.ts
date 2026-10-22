import { createError, getMethod, getRequestURL, setHeader } from 'h3'
import { secureBackendProxy } from '../utils/backendProxy'
import { legacyBackendPath } from '../utils/requestSecurity'

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (process.env.NODE_ENV === 'production') {
    setHeader(event, 'Strict-Transport-Security', 'max-age=31536000')
    setHeader(event, 'X-Frame-Options', 'SAMEORIGIN')
    setHeader(event, 'X-Content-Type-Options', 'nosniff')
    setHeader(event, 'Referrer-Policy', 'no-referrer')
    setHeader(event, 'Cross-Origin-Opener-Policy', 'same-origin')
    setHeader(event, 'Permissions-Policy', 'camera=(self), microphone=(), geolocation=()')
    setHeader(event, 'Content-Security-Policy', "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; object-src 'none'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-src 'self' blob:")
  }
  if (path === '/api' || path.startsWith('/api/')) {
    setHeader(event, 'Cache-Control', 'private, no-store')
    if (path === '/api/essay/image') throw createError({ statusCode: 410, statusMessage: 'Legacy image proxy is unavailable.' })
    // Nuxt Icon serves bundled collections here; never proxy this route to Express.
    if (['GET', 'HEAD'].includes(getMethod(event)) && /^\/api\/_nuxt_icon\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\.json)?$/.test(path)) return
    const backendPath = legacyBackendPath(path, getMethod(event))
    if (!backendPath) throw createError({ statusCode: 404, statusMessage: 'Not found.' })
    return secureBackendProxy(event, backendPath)
  }
  if (path === '/backend/api' || path.startsWith('/backend/api/')) setHeader(event, 'Cache-Control', 'private, no-store')
})
