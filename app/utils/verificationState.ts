type VerificationRecord = {
  isValid?: boolean
  deletedAt?: string | null
  applicationDoc?: { statusId?: number; deletedAt?: string | null } | null
}

// A retained review record is history, not proof of current approval.
export function verificationState(value: VerificationRecord | VerificationRecord[] | null | undefined): 'verified' | 'review-required' | 'none' {
  const records = Array.isArray(value) ? value : value ? [value] : []
  if (!records.length) return 'none'
  return records.every(record => record.isValid === true && !record.deletedAt && record.applicationDoc?.statusId === 2 && !record.applicationDoc.deletedAt)
    ? 'verified'
    : 'review-required'
}
