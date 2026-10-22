import { createError, getCookie, getHeader, getMethod, getRequestURL, getProxyRequestHeaders, sendProxy, setHeader } from 'h3'
import type { H3Event } from 'h3'
import { mutationSecurityError } from './requestSecurity'
import { readBoundedRequest } from './boundedRequest'

export async function secureBackendProxy(event: H3Event, path: string) {
  const config = useRuntimeConfig(event)
  const apiOrigin = String(config.apiOrigin || '').replace(/\/+$/, '')
  if (!/^https?:\/\//.test(apiOrigin)) throw createError({ statusCode: 500, statusMessage: 'Backend API origin is not configured.' })
  const canonicalPath = path.startsWith('/') ? path : `/${path}`
  if (/[\\\x00-\x20]/.test(canonicalPath) || canonicalPath.split('/').some(part => {
    try { return ['.', '..'].includes(decodeURIComponent(part)) || /[\/\\]/.test(decodeURIComponent(part)) } catch { return true }
  })) throw createError({ statusCode: 400, statusMessage: 'Invalid API path.' })
  const allowedOrigins = String(config.securityOrigins || '').split(',').map(value => value.trim()).filter(Boolean)
  const error = mutationSecurityError({
    method: getMethod(event), path: canonicalPath,
    cookieToken: getCookie(event, 'csrf_token'), headerToken: getHeader(event, 'x-csrf-token'),
    origin: getHeader(event, 'origin'), referer: getHeader(event, 'referer'), allowedOrigins,
  })
  if (error) throw createError({ statusCode: 403, statusMessage: error })
  // Forward the browser's original CSRF header. Never manufacture it from a cookie.
  const token = getCookie(event, 'auth_token')
  if (token) event.node.req.headers.authorization = `Bearer ${token}`
  let buffered: Awaited<ReturnType<typeof readBoundedRequest>> | undefined
  try {
    const method = getMethod(event)
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) buffered = await readBoundedRequest(event.node.req)
    return await sendProxy(event, `${apiOrigin}${canonicalPath}${getRequestURL(event).search}`, {
      fetchOptions: { method, headers: getProxyRequestHeaders(event), body: buffered ? Uint8Array.from(buffered.body) : undefined,
        redirect: 'manual', signal: AbortSignal.timeout(120_000) },
    })
  } catch (error) {
    // Oversized/incomplete bodies must not leave an unread keep-alive request.
    if (!buffered) setHeader(event, 'Connection', 'close')
    throw error
  } finally { buffered?.release() }
}
