import type { CheckerHistoryAppRatingItem, CheckerHistoryApplicationDocItem, CheckerHistoryResultItem } from '~/types/checkerHistory'

export function formatScore(value: unknown): string {
  const score = Number(value)
  if (!Number.isFinite(score)) return '-'
  return Number.isInteger(score) ? String(score) : score.toFixed(2)
}

export function formatDateOnly(value?: string | null): string {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  const year = parsed.getUTCFullYear()
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0')
  const day = String(parsed.getUTCDate()).padStart(2, '0')
  return `${day}-${month}-${year}`
}

export function formatExamTime(value?: string | null): string {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleString('id-ID', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'UTC'
  }) + ' UTC'
}

export function formatPracticalType(value?: string | null): string {
  const kind = value?.trim().toUpperCase()
  if (kind === 'PRACTICAL' || kind === 'LIVE') return 'Live'
  if (kind === 'SIMULATOR') return 'Simulator'
  return value?.trim() || '-'
}

export function getFinalScoreAt(
  appRating: CheckerHistoryAppRatingItem | null | undefined,
  index: number
): string {
  const score = appRating?.finalScores?.[index]?.finalScore
  return formatScore(score)
}

export function getAuthorityCwps(appRating?: CheckerHistoryAppRatingItem | null) {
  const ratingId = appRating?.rating?.id
  if (!ratingId) return []

  const authorities = new Map<
    number,
    {
      id: number
      name: string
      sector: string
      frequencies: Array<{ id: number, frequency: string, isPrimary: boolean }>
    }
  >()

  const snapshots = (appRating?.finalScores || []).flatMap(
    finalScore => finalScore.cwpSnapshots || []
  )
  if (snapshots.length > 0) {
    for (const snapshot of snapshots) {
      if (!snapshot.cwpId) continue
      authorities.set(snapshot.cwpId, {
        id: snapshot.cwpId,
        name: snapshot.cwpName || `CWP ${snapshot.cwpId}`,
        sector: snapshot.sectorName || '-',
        frequencies: (snapshot.frequencies || []).map(item => ({
          id: item.id,
          frequency: item.frequency || '-',
          isPrimary: Boolean(item.isPrimary)
        }))
      })
    }

    return Array.from(authorities.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  }

  // Transitional fallback for a legacy score that could not be backfilled.
  for (const finalScore of appRating?.finalScores || []) {
    const sector = finalScore.event?.sector
    for (const sectorCwp of sector?.sectorCwps || []) {
      const cwp = sectorCwp.cwp
      if (!cwp?.id || cwp.ratingId !== ratingId) continue
      authorities.set(cwp.id, {
        id: cwp.id,
        name: cwp.cwp || `CWP ${cwp.id}`,
        sector: sector?.sector || '-',
        frequencies: (cwp.cwpFrequencies || []).map(item => ({
          id: item.id,
          frequency: item.frequency || '-',
          isPrimary: Boolean(item.isPrimary)
        }))
      })
    }
  }

  return Array.from(authorities.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  )
}

export function getRatingRowCount(
  appRating?: CheckerHistoryAppRatingItem | null
): number {
  const practicalCount = appRating?.practicalTests?.length || 0
  const finalScoreCount = appRating?.finalScores?.length || 0
  const total = Math.max(practicalCount, finalScoreCount)
  return Math.max(1, total)
}

export function getApplicationDocRowCount(
  doc?: CheckerHistoryApplicationDocItem | null
): number {
  const ratings = doc?.appRatings || []
  if (ratings.length === 0) return 1
  return ratings.reduce((sum, rating) => sum + getRatingRowCount(rating), 0)
}

export function getItemRowCount(item?: CheckerHistoryResultItem | null): number {
  const docs = item?.applicationDocs || []
  if (docs.length === 0) return 1
  return docs.reduce((sum, doc) => sum + getApplicationDocRowCount(doc), 0)
}

export function getRatingRemark(appRating?: CheckerHistoryAppRatingItem | null): string {
  const finalScores = appRating?.finalScores || []
  const latestFinalScore = finalScores[finalScores.length - 1]
  return (
    latestFinalScore?.status?.status
    || appRating?.status?.status
    || '-'
  )
}
