// Retired SSRF-prone legacy proxy. Images use API-issued signed file URLs.
export default defineEventHandler(() => {
  throw createError({ statusCode: 410, statusMessage: 'Use the signed image URL returned by the authenticated API.' })
})
