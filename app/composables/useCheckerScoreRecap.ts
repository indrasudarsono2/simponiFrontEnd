import type { ScoreCheckerRemarkItem, ScoreCheckerAppRatingItem, ScoreCheckerApplicationDocItem, ScoreCheckerResultItem, ScoreCheckerEvidenceItem, ReExaminationAttemptItem, ReExaminationHistoryResponse, ScoreCheckerRow, CheckerTheoryReview } from '~/types/checkerScoreRecap'

export async function useCheckerScoreRecap() {
  function getFetchErrorMessage(error: unknown, fallback: string): string {
    const value = error as { data?: { message?: string }, message?: string }
    return value?.data?.message || value?.message || fallback
  }
  const apiBaseUrl = useApiBaseUrl()
  const { token, getRoleNames } = useAuth()
  const toast = useToast()

  const selectedRemarkId = ref<number | undefined>(undefined)
  const selectedEventId = ref<number | undefined>(undefined)
  const resultLoading = ref(false)
  const resultData = ref<ScoreCheckerResultItem[] | null>(null)
  const evidenceLoadingId = ref<number | null>(null)
  const theoryReviewLoadingId = ref<number | null>(null)
  const evidenceDownloadLoadingId = ref<number | null>(null)
  const isTheoryReviewModalOpen = ref(false)
  const theoryReview = ref<CheckerTheoryReview | null>(null)
  const isEvidenceModalOpen = ref(false)
  const selectedEvidenceAppRatingId = ref<number | null>(null)
  const evidenceItems = ref<ScoreCheckerEvidenceItem[]>([])
  const isEvidenceFetching = ref(false)
  const isInvalidationModalOpen = ref(false)
  const invalidationLoading = ref(false)
  const invalidationReason = ref('')
  const fraudCategory = ref<string | undefined>(undefined)
  const invalidationConfirmed = ref(false)
  const isReExaminationHistoryModalOpen = ref(false)
  const reExaminationHistoryLoadingId = ref<number | null>(null)
  const reExaminationHistory = ref<ReExaminationHistoryResponse | null>(null)
  const reExaminationHistoryError = ref('')

  const fraudCategoryOptions = [
    { label: 'Unauthorized assistance', value: 'UNAUTHORIZED_ASSISTANCE' },
    { label: 'Impersonation', value: 'IMPERSONATION' },
    { label: 'Prohibited material or device', value: 'PROHIBITED_MATERIAL' },
    { label: 'Evidence manipulation', value: 'EVIDENCE_MANIPULATION' },
    { label: 'Other', value: 'OTHER' }
  ]

  const canInvalidateAttempt = computed(() => {
    const roles = getRoleNames().map(role => role.trim().toUpperCase())
    return roles.includes('CHECKER ADMIN') || roles.includes('GENERAL CHECKER')
  })

  const { data, status, error, refresh } = await useFetch<
    ScoreCheckerRemarkItem[]
  >(`${apiBaseUrl}/api/scoreChecker`, {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : ''
    }
  })

  const remarkOptions = computed(() => {
    return (data.value || []).map(item => ({
      label: item.remark || '-',
      value: item.id
    }))
  })

  const selectedRemarkItem = computed(() => {
    if (!selectedRemarkId.value) return null
    return (
      (data.value || []).find(item => item.id === selectedRemarkId.value)
      || null
    )
  })

  const eventOptions = computed(() => {
    return (selectedRemarkItem.value?.events || []).map(item => ({
      label: item.event || '-',
      value: item.id
    }))
  })


  watch(selectedRemarkId, () => {
    selectedEventId.value = undefined
  })

  function formatScore(value: unknown): string {
    const score = Number(value)
    if (!Number.isFinite(score)) return '-'
    return Number.isInteger(score) ? String(score) : score.toFixed(2)
  }

  function getRatingRowCount(
    appRating?: ScoreCheckerAppRatingItem | null
  ): number {
    const total = appRating?.finalScores?.length || 0
    return Math.max(1, total)
  }

  function getApplicationDocRowCount(
    doc?: ScoreCheckerApplicationDocItem | null
  ): number {
    const ratings = doc?.appRatings || []
    if (ratings.length === 0) return 1
    return ratings.reduce((sum, rating) => sum + getRatingRowCount(rating), 0)
  }

  function getUserRowCount(item?: ScoreCheckerResultItem | null): number {
    const docs = item?.applicationDocs || []
    if (docs.length === 0) return 1
    return docs.reduce((sum, doc) => sum + getApplicationDocRowCount(doc), 0)
  }

  const rows = computed<ScoreCheckerRow[]>(() => {
    const payload = resultData.value || []
    const result: ScoreCheckerRow[] = []

    payload.forEach((item, itemIndex) => {
      const userName = item.user?.name || '-'
      const docs = item.applicationDocs || []
      const safeDocs
        = docs.length > 0
          ? docs
          : [
              {
                id: undefined,
                number: '-',
                appRatings: [] as ScoreCheckerAppRatingItem[]
              }
            ]
      const userRowSpan = getUserRowCount(item)
      let isFirstUserRow = true

      safeDocs.forEach((doc, docIndex) => {
        const documentNumber = doc.number || '-'
        const ratings = doc.appRatings || []
        const safeRatings
          = ratings.length > 0
            ? ratings
            : [
                {
                  id: undefined,
                  rating: { rating: '-' },
                  finalScores: []
                }
              ]
        const applicationDocRowSpan = getApplicationDocRowCount(doc)
        let isFirstDocumentRow = true

        safeRatings.forEach((appRating, ratingIndex) => {
          const ratingName = appRating.rating?.rating || '-'
          const finalScores = appRating.finalScores || []
          const requiresReExamination
            = finalScores.length === 0
              && (appRating.examinationInvalidations?.length || 0) > 0
          const safeFinalScores
            = finalScores.length > 0
              ? finalScores
              : [{
                  id: undefined,
                  finalScore: null,
                  status: requiresReExamination
                    ? { status: 'RE-EXAMINATION REQUIRED' }
                    : null
                }]
          const ratingRowSpan = getRatingRowCount(appRating)
          const hasEvidence = (appRating.previews?.length || 0) > 0

          safeFinalScores.forEach((score, scoreIndex) => {
            result.push({
              id: `${item.id || itemIndex}-${doc.id || docIndex}-${appRating.id || ratingIndex}-${score.id || scoreIndex}`,
              eventName: item.event?.event || '-',
              theoryMode: item.event?.theoryMode || null,
              difficulty: item.event?.difficulty || null,
              no: itemIndex + 1,
              showNo: isFirstUserRow,
              noRowSpan: userRowSpan,
              name: userName,
              showName: isFirstUserRow,
              nameRowSpan: userRowSpan,
              applicationDoc: documentNumber,
              showApplicationDoc: isFirstDocumentRow,
              applicationDocRowSpan,
              rating: ratingName,
              showRating: scoreIndex === 0,
              ratingRowSpan,
              finalScore: formatScore(score.finalScore),
              status: score.status?.status || '-',
              showEvidence: scoreIndex === 0,
              evidenceRowSpan: ratingRowSpan,
              appRatingId: appRating.id ?? null,
              hasEvidence,
              hasTheoryResult: finalScores.length > 0
            })

            isFirstUserRow = false
            isFirstDocumentRow = false
          })
        })
      })
    })

    return result
  })

  async function handleSearch() {
    if (!selectedEventId.value) {
      toast.add({
        title: 'Validation',
        description: 'Please select an event first.',
        color: 'warning'
      })
      return
    }

    try {
      resultLoading.value = true
      const response = await $fetch<
      ScoreCheckerResultItem[] | ScoreCheckerResultItem
      >(`${apiBaseUrl}/api/scoreChecker`, {
        method: 'POST',
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : ''
        },
        body: {
          eventId: selectedEventId.value
        }
      })
      resultData.value = Array.isArray(response) ? response : [response]

      toast.add({
        title: 'Success',
        description: 'Score recap data loaded successfully.',
        color: 'success'
      })
    } catch (fetchError: unknown) {
      const message = getFetchErrorMessage(fetchError, 'Failed to load score recap data.')
      toast.add({
        title: 'Error',
        description: message,
        color: 'error'
      })
    } finally {
      resultLoading.value = false
    }
  }

  async function handleOpenEvidence(appRatingId: number | null) {
    if (!appRatingId) {
      toast.add({
        title: 'Info',
        description: 'No appRatingId available for this row.',
        color: 'warning'
      })
      return
    }

    try {
      evidenceLoadingId.value = appRatingId
      isEvidenceModalOpen.value = true
      isEvidenceFetching.value = true
      evidenceItems.value = []
      selectedEvidenceAppRatingId.value = appRatingId

      const response = await $fetch<
      ScoreCheckerEvidenceItem[] | ScoreCheckerEvidenceItem
      >(`${apiBaseUrl}/api/scoreCheckerEvidance`, {
        method: 'POST',
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : ''
        },
        body: {
          appRatingId
        }
      })

      evidenceItems.value = Array.isArray(response) ? response : [response]
    } catch (fetchError: unknown) {
      const message = getFetchErrorMessage(fetchError, 'Failed to load evidence.')
      toast.add({
        title: 'Error',
        description: message,
        color: 'error'
      })
    } finally {
      isEvidenceFetching.value = false
      evidenceLoadingId.value = null
    }
  }

  async function handleOpenTheoryReview(appRatingId: number | null) {
    if (!appRatingId) return
    theoryReview.value = null
    isTheoryReviewModalOpen.value = true
    theoryReviewLoadingId.value = appRatingId
    try {
      theoryReview.value = await $fetch<CheckerTheoryReview>(`${apiBaseUrl}/api/scoreChecker/theory-review/${appRatingId}`, {
        headers: { Authorization: token.value ? `Bearer ${token.value}` : '' }
      })
    } catch (fetchError: unknown) {
      isTheoryReviewModalOpen.value = false
      toast.add({ title: 'Unable to load theory examination', description: getFetchErrorMessage(fetchError, 'Please try again.'), color: 'error' })
    } finally {
      theoryReviewLoadingId.value = null
    }
  }

  async function handleDownloadEvidence(appRatingId: number | null, name: string, rating: string) {
    if (!appRatingId || evidenceDownloadLoadingId.value !== null) return
    evidenceDownloadLoadingId.value = appRatingId
    try {
      const archive = await $fetch<Blob>(`${apiBaseUrl}/api/scoreChecker/evidence-download/${appRatingId}`, {
        headers: { Authorization: token.value ? `Bearer ${token.value}` : '' },
        responseType: 'blob'
      })
      const url = URL.createObjectURL(archive)
      const link = document.createElement('a')
      link.href = url
      const safePart = (value: string) => value.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').replace(/\.+$/, '').slice(0, 80) || 'Unknown'
      link.download = `${safePart(name)}-${safePart(rating)}.zip`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      toast.add({ title: 'All-PDF evidence ZIP downloaded', color: 'success' })
    } catch (fetchError: unknown) {
      let message = getFetchErrorMessage(fetchError, 'Please try again.')
      const data = (fetchError as { data?: unknown })?.data
      if (data instanceof Blob) {
        try { message = (JSON.parse(await data.text()) as { message?: string }).message || message } catch { /* keep fallback */ }
      }
      toast.add({ title: 'Evidence download failed', description: message, color: 'error' })
    } finally {
      evidenceDownloadLoadingId.value = null
    }
  }

  async function handleOpenReExaminationHistory(appRatingId: number | null) {
    if (!appRatingId) {
      toast.add({
        title: 'Information',
        description: 'No examination rating is available for this row.',
        color: 'warning'
      })
      return
    }

    try {
      reExaminationHistoryLoadingId.value = appRatingId
      reExaminationHistory.value = null
      reExaminationHistoryError.value = ''
      isReExaminationHistoryModalOpen.value = true

      reExaminationHistory.value
        = await $fetch<ReExaminationHistoryResponse>(
          `${apiBaseUrl}/api/scoreChecker/reexamination-history/${appRatingId}`,
          {
            credentials: 'include',
            headers: {
              Authorization: token.value ? `Bearer ${token.value}` : ''
            }
          }
        )
    } catch (fetchError: unknown) {
      reExaminationHistoryError.value = getFetchErrorMessage(fetchError, 'Failed to load re-examination history.')
    } finally {
      reExaminationHistoryLoadingId.value = null
    }
  }

  function attemptStatusColor(attempt: ReExaminationAttemptItem) {
    if (attempt.isInvalidated) return 'error' as const
    if (attempt.status?.toUpperCase() === 'SUCCESS') return 'success' as const
    if (attempt.status?.toUpperCase() === 'FAILED') return 'error' as const
    return 'neutral' as const
  }

  function openInvalidationModal() {
    invalidationReason.value = ''
    fraudCategory.value = undefined
    invalidationConfirmed.value = false
    isEvidenceModalOpen.value = false
    isInvalidationModalOpen.value = true
  }

  async function handleInvalidateAttempt() {
    if (!selectedEvidenceAppRatingId.value) return
    if (invalidationReason.value.trim().length < 10) {
      toast.add({
        title: 'Validation',
        description: 'Please provide a reason of at least 10 characters.',
        color: 'warning'
      })
      return
    }
    if (!invalidationConfirmed.value) {
      toast.add({
        title: 'Confirmation required',
        description: 'Please confirm that the evidence has been reviewed.',
        color: 'warning'
      })
      return
    }

    try {
      invalidationLoading.value = true
      const response = await $fetch<{ message?: string }>(
        `${apiBaseUrl}/api/scoreChecker/invalidate-attempt`,
        {
          method: 'POST',
          headers: {
            Authorization: token.value ? `Bearer ${token.value}` : ''
          },
          body: {
            appRatingId: selectedEvidenceAppRatingId.value,
            reason: invalidationReason.value.trim(),
            fraudCategory: fraudCategory.value
          }
        }
      )

      isInvalidationModalOpen.value = false
      await handleSearch()
      toast.add({
        title: 'Re-examination required',
        description:
        response.message || 'The examination attempt has been invalidated.',
        color: 'success'
      })
    } catch (fetchError: unknown) {
      toast.add({
        title: 'Unable to invalidate attempt',
        description: getFetchErrorMessage(fetchError, 'The request could not be completed.'),
        color: 'error'
      })
    } finally {
      invalidationLoading.value = false
    }
  }

  function resolveEvidenceUrl(filePath?: string | null): string {
    if (!filePath) return ''
    if (/^https?:\/\//i.test(filePath)) return filePath
    return `${apiBaseUrl}${filePath}`
  }

  function formatEvidenceTime(value?: string | null): string {
    if (!value) return '-'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return '-'
    const year = parsed.getUTCFullYear()
    const month = String(parsed.getUTCMonth() + 1).padStart(2, '0')
    const day = String(parsed.getUTCDate()).padStart(2, '0')
    const hour = String(parsed.getUTCHours()).padStart(2, '0')
    const minute = String(parsed.getUTCMinutes()).padStart(2, '0')
    const second = String(parsed.getUTCSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}:${second} UTC`
  }

  const evidenceImageItems = computed(() =>
    evidenceItems.value.filter(item => Boolean(item.file))
  )

  const initialErrorMessage = computed(() => {
    if (!error.value) return ''
    const err = error.value as {
      data?: { message?: string }
      message?: string
    }
    return (
      err.data?.message
      || err.message
      || 'Failed to load remark and event options.'
    )
  })
  return {
    selectedRemarkId, selectedEventId, resultLoading, resultData,
    evidenceLoadingId, isEvidenceModalOpen, selectedEvidenceAppRatingId,
    theoryReviewLoadingId, isTheoryReviewModalOpen, theoryReview,
    evidenceDownloadLoadingId, handleDownloadEvidence,
    evidenceItems, isEvidenceFetching, evidenceImageItems,
    isInvalidationModalOpen, invalidationLoading, invalidationReason,
    fraudCategory, invalidationConfirmed, fraudCategoryOptions, canInvalidateAttempt,
    isReExaminationHistoryModalOpen, reExaminationHistoryLoadingId,
    reExaminationHistory, reExaminationHistoryError,
    data, status, error, refresh, remarkOptions, eventOptions, rows,
    handleSearch, handleOpenEvidence, handleOpenTheoryReview, handleOpenReExaminationHistory,
    attemptStatusColor, openInvalidationModal, handleInvalidateAttempt,
    resolveEvidenceUrl, formatEvidenceTime, formatScore, initialErrorMessage
  }
}
