import { readFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'

const allowed = new Set([
  'LICENSE.pdf', 'LOGBOOK.pdf', 'IELP.pdf', 'MEDEX.pdf',
  'EVENT BRIEFING.pdf', 'EVALUATION SHEET.pdf', 'ROOM.pdf',
  'COMPETENCE/ACP.pdf', 'COMPETENCE/ACS.pdf', 'COMPETENCE/APP.pdf',
  'COMPETENCE/APS.pdf', 'COMPETENCE/TWR.pdf'
])

export default defineEventHandler(async (event) => {
  const relative = decodeURIComponent(getRouterParam(event, 'file') || '').replaceAll('\\', '/')
  if (!allowed.has(relative)) throw createError({ statusCode: 404, statusMessage: 'Sample not found' })

  const root = resolve(process.env.TRAINING_SAMPLE_DIR || resolve(process.cwd(), '..', 'SIMULASI', 'FILES'))
  const target = resolve(root, relative)
  if (!target.startsWith(`${root}${sep}`)) throw createError({ statusCode: 404, statusMessage: 'Sample not found' })

  try {
    const pdf = await readFile(target)
    setHeader(event, 'Content-Type', 'application/pdf')
    setHeader(event, 'Content-Disposition', 'inline')
    setHeader(event, 'Cache-Control', 'private, max-age=300')
    return pdf
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Sample unavailable' })
  }
})
