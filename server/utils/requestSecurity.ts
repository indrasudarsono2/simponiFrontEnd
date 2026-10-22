import { timingSafeEqual } from 'node:crypto'

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS'])
const PUBLIC_POSTS = new Set(['/api/auth/login', '/api/auth/forgot-password', '/api/auth/reset-password'])
const WEBHOOKS = new Set(['/api/integrations/e-chain/ielp-user/verified', '/api/integrations/e-chain/medex-user/verified'])

export function mutationSecurityError(input: {
  method: string, path: string, cookieToken?: string, headerToken?: string,
  origin?: string, referer?: string, allowedOrigins: string[],
}): string | null {
  if (SAFE.has(input.method.toUpperCase())) return null
  // These server callbacks have their own integration authentication, not browser CSRF.
  if (WEBHOOKS.has(input.path)) return null
  const source = input.origin || input.referer
  let origin = ''
  try { origin = source ? new URL(source).origin : '' } catch { return 'Untrusted request origin.' }
  if (source && !input.allowedOrigins.includes(origin)) return 'Untrusted request origin.'
  if (PUBLIC_POSTS.has(input.path)) return null
  if (!source) return 'Request origin is required.'
  const cookie = input.cookieToken || ''
  const header = input.headerToken || ''
  const cookieBytes = Buffer.from(cookie)
  const headerBytes = Buffer.from(header)
  if (!cookie || cookie.length > 256 || cookieBytes.length !== headerBytes.length
    || !timingSafeEqual(cookieBytes, headerBytes)) return 'Invalid CSRF token.'
  return null
}

// Only real legacy backend adapters are retained. Fixture/demo APIs fail closed.
export function legacyBackendPath(path: string, method: string): string | null {
  const verb = method.toUpperCase()
  if (/^\/api\/(?:competenceUser|ielpUser|licenseUser|logbookUser|medexUser)$/.test(path))
    return verb === 'POST' ? path : null
  if (/^\/api\/(?:competenceUser|ielpUser|licenseUser|logbookUser|medexUser)\/\d+$/.test(path))
    return ['PUT', 'DELETE'].includes(verb) ? path : null
  if (/^\/api\/(?:ielpUser|licenseUser|medexUser)\/sync-echain$/.test(path))
    return verb === 'POST' ? path : null
  if (path === '/api/events') return verb === 'POST' ? path : null
  if (/^\/api\/events\/\d+$/.test(path)) return verb === 'PUT' ? path : null
  if (path === '/api/userBranch') return ['GET', 'POST'].includes(verb) ? path : null
  if (path === '/api/userBranch/assign-unit') return verb === 'POST' ? path : null
  if (/^\/api\/userBranch\/[A-Za-z0-9]{8}$/.test(path)) return verb === 'PUT' ? path : null
  return null
}
