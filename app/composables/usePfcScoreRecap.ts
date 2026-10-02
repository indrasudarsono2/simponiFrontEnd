import type { CalendarDate } from '@internationalized/date'
import { DateFormatter, parseDate } from '@internationalized/date'
import type { ScoreRecapRow, RelatedDocuments, EvidenceItem, ScoreRecapResponse, ProfessionOption, ScoreRecapEvent } from '~/types/pfcScoreRecap'
import type { CheckerTheoryReview } from '~/types/checkerScoreRecap'

export async function usePfcScoreRecap() {
  const apiBaseUrl = useApiBaseUrl()
  const { token } = useAuth()
  const toast = useToast()
  const df = new DateFormatter('en-US', { dateStyle: 'medium' })

  function toDateInput(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const today = new Date()
  const ALL_BRANCHES_ID = 0
  const startDate = ref(toDateInput(new Date(today.getFullYear(), today.getMonth(), 1)))
  const endDate = ref(toDateInput(today))
  const selectedBranchId = ref<number | undefined>(ALL_BRANCHES_ID)
  const selectedProfessionId = ref<number | undefined>()
  const selectedEventIds = ref<number[]>([])
  const professions = ref<ProfessionOption[]>([])
  const events = ref<ScoreRecapEvent[]>([])
  const professionsLoading = ref(false)
  const eventsLoading = ref(false)
  const loading = ref(false)
  const evidenceLoadingId = ref<number | null>(null)
  const theoryReviewLoadingId = ref<number | null>(null)
  const evidenceDownloadLoadingId = ref<number | null>(null)
  const isTheoryReviewModalOpen = ref(false)
  const theoryReview = ref<CheckerTheoryReview | null>(null)
  const isEvidenceModalOpen = ref(false)
  const evidenceItems = ref<EvidenceItem[]>([])
  const isRelatedDocumentsModalOpen = ref(false)
  const selectedRelatedDocuments = ref<RelatedDocuments | null>(null)
  const reportError = ref('')
  const selectedStatus = ref<'SUCCESS' | 'FAILED' | null>(null)
  const ALL_FACET_VALUES = '__ALL__'
  const selectedRemarkDoc = ref(ALL_FACET_VALUES)
  const selectedRating = ref(ALL_FACET_VALUES)
  let eventRequestId = 0

  function parseDateString(value: string): CalendarDate | null {
    if (!value) return null
    try {
      return parseDate(value)
    } catch {
      return null
    }
  }

  function formatCalendarDate(value?: CalendarDate): string {
    if (!value) return ''
    return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`
  }

  const dateRange = computed({
    get: () => ({
      start: parseDateString(startDate.value) ?? undefined,
      end: parseDateString(endDate.value) ?? undefined
    }),
    set: (value: { start?: CalendarDate, end?: CalendarDate }) => {
      startDate.value = formatCalendarDate(value.start)
      endDate.value = formatCalendarDate(value.end)
    }
  })

  const { data, error: initialError } = await useFetch<ScoreRecapResponse>(
    `${apiBaseUrl}/api/pfcScore/scoreRecap`,
    {
      credentials: 'include',
      headers: { Authorization: token.value ? `Bearer ${token.value}` : '' }
    }
  )

  const branches = computed(() => data.value?.branches || [])
  const rows = computed(() => data.value?.rows || [])
  const isAllBranches = computed(() => selectedBranchId.value === ALL_BRANCHES_ID)
  const branchOptions = computed(() =>
    [
      { label: 'All Branches', value: ALL_BRANCHES_ID },
      ...branches.value.map(branch => ({
        label: branch.branch || `Branch ${branch.id}`,
        value: branch.id
      }))
    ]
  )
  const eventOptions = computed(() =>
    events.value.map(event => ({
      label: `${event.event || `Event ${event.id}`} (${formatDate(event.createdAt)})`,
      value: event.id
    }))
  )
  const professionOptions = computed(() =>
    professions.value.map(item => ({
      label: item.profession?.profession || `Profession ${item.id}`,
      value: item.id
    }))
  )

  const passedCount = computed(
    () => rows.value.filter(row => row.status?.toUpperCase() === 'SUCCESS').length
  )
  const failedCount = computed(
    () => rows.value.filter(row => row.status?.toUpperCase() === 'FAILED').length
  )
  const remarkDocOptions = computed(() => {
    const availableRows = selectedRating.value === ALL_FACET_VALUES
      ? rows.value
      : rows.value.filter(row => row.rating === selectedRating.value)
    const values = [...new Set(availableRows.map(row => row.remarkDoc).filter((value): value is string => Boolean(value)))].sort()
    return [{ label: 'All Remarks', value: ALL_FACET_VALUES }, ...values.map(value => ({ label: value, value }))]
  })
  const ratingOptions = computed(() => {
    const availableRows = selectedRemarkDoc.value === ALL_FACET_VALUES
      ? rows.value
      : rows.value.filter(row => row.remarkDoc === selectedRemarkDoc.value)
    const values = [...new Set(availableRows.map(row => row.rating).filter((value): value is string => Boolean(value)))].sort()
    return [{ label: 'All Ratings', value: ALL_FACET_VALUES }, ...values.map(value => ({ label: value, value }))]
  })
  const filteredRows = computed(() => rows.value.filter(row =>
    (!selectedStatus.value || row.status?.toUpperCase() === selectedStatus.value)
    && (selectedRemarkDoc.value === ALL_FACET_VALUES || row.remarkDoc === selectedRemarkDoc.value)
    && (selectedRating.value === ALL_FACET_VALUES || row.rating === selectedRating.value)
  ))
  const representedBranches = computed(
    () => new Set(rows.value.map(row => row.branch?.id).filter(Boolean)).size
  )

  function formatScore(value?: number | null): string {
    if (value == null || !Number.isFinite(Number(value))) return '-'
    return Number(value).toFixed(Number.isInteger(Number(value)) ? 0 : 2)
  }

  function formatDate(value?: string | null): string {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(date)
  }

  function statusColor(status?: string | null) {
    const normalized = status?.toUpperCase()
    if (normalized === 'SUCCESS') return 'success'
    if (normalized === 'FAILED') return 'error'
    if (normalized?.includes('RECHECK')) return 'warning'
    return 'neutral'
  }

  function resolveEvidenceUrl(filePath?: string | null): string {
    if (!filePath) return ''
    if (/^https?:\/\//i.test(filePath)) return filePath
    return `${apiBaseUrl}${filePath}`
  }

  function openRelatedDocuments(row: ScoreRecapRow) {
    selectedRelatedDocuments.value = row.relatedDocuments || null
    isRelatedDocumentsModalOpen.value = true
  }

  function formatEvidenceTime(value?: string | null): string {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'medium',
      timeZone: 'UTC'
    }).format(date) + ' UTC'
  }

  async function openEvidence(row: ScoreRecapRow) {
    if (!row.appRatingId || !row.hasEvidence) return
    evidenceLoadingId.value = row.appRatingId
    evidenceItems.value = []
    isEvidenceModalOpen.value = true
    try {
      const response = await $fetch<EvidenceItem[] | EvidenceItem>(
        `${apiBaseUrl}/api/scoreCheckerEvidance`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { Authorization: token.value ? `Bearer ${token.value}` : '' },
          body: { appRatingId: row.appRatingId }
        }
      )
      evidenceItems.value = Array.isArray(response) ? response : [response]
    } catch (error: unknown) {
      const value = error as { data?: { message?: string }, message?: string }
      toast.add({
        title: 'Failed to load evidence',
        description: value?.data?.message || value?.message,
        color: 'error'
      })
      isEvidenceModalOpen.value = false
    } finally {
      evidenceLoadingId.value = null
    }
  }

  async function openTheoryReview(row: ScoreRecapRow) {
    if (!row.appRatingId) return
    const appRatingId = row.appRatingId
    theoryReview.value = null
    isTheoryReviewModalOpen.value = true
    theoryReviewLoadingId.value = appRatingId
    try {
      theoryReview.value = await $fetch<CheckerTheoryReview>(`${apiBaseUrl}/api/scoreChecker/theory-review/${appRatingId}`, {
        credentials: 'include',
        headers: { Authorization: token.value ? `Bearer ${token.value}` : '' },
        query: { finalScoreId: row.id }
      })
    } catch (error: unknown) {
      const value = error as { data?: { message?: string }, message?: string }
      isTheoryReviewModalOpen.value = false
      toast.add({ title: 'Unable to load theory examination', description: value.data?.message || value.message || 'Please try again.', color: 'error' })
    } finally {
      theoryReviewLoadingId.value = null
    }
  }

  async function downloadEvidence(row: ScoreRecapRow) {
    if (!row.appRatingId || evidenceDownloadLoadingId.value !== null) return
    evidenceDownloadLoadingId.value = row.appRatingId
    try {
      const archive = await $fetch<Blob>(`${apiBaseUrl}/api/scoreChecker/evidence-download/${row.appRatingId}`, {
        credentials: 'include',
        headers: { Authorization: token.value ? `Bearer ${token.value}` : '' },
        query: { finalScoreId: row.id },
        responseType: 'blob'
      })
      const url = URL.createObjectURL(archive)
      const link = document.createElement('a')
      const safePart = (value?: string | null) => String(value || '').trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').replace(/\.+$/, '').slice(0, 80) || 'Unknown'
      link.href = url
      link.download = `${safePart(row.user?.name || row.user?.nik)}-${safePart(row.rating)}.zip`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      toast.add({ title: 'All-PDF evidence ZIP downloaded', color: 'success' })
    } catch (error: unknown) {
      const value = error as { data?: unknown, message?: string }
      let message = value.message || 'Please try again.'
      if (value.data instanceof Blob) {
        try { message = (JSON.parse(await value.data.text()) as { message?: string }).message || message } catch { /* keep fallback */ }
      } else if (value.data && typeof value.data === 'object') {
        message = (value.data as { message?: string }).message || message
      }
      toast.add({ title: 'Evidence download failed', description: message, color: 'error' })
    } finally {
      evidenceDownloadLoadingId.value = null
    }
  }

  function toggleStatusFilter(status: 'SUCCESS' | 'FAILED') {
    selectedStatus.value = selectedStatus.value === status ? null : status
  }

  async function loadRecap() {
    if (!startDate.value || !endDate.value || selectedBranchId.value == null || !selectedProfessionId.value) {
      toast.add({ title: 'Date range, branch, and profession are required', color: 'warning' })
      return
    }
    if (startDate.value > endDate.value) {
      toast.add({
        title: 'Invalid date range',
        description: 'Start date cannot be later than end date.',
        color: 'error'
      })
      return
    }
    if (!isAllBranches.value && selectedEventIds.value.length === 0) {
      toast.add({ title: 'Select at least one event', color: 'warning' })
      return
    }

    loading.value = true
    reportError.value = ''
    selectedRemarkDoc.value = ALL_FACET_VALUES
    selectedRating.value = ALL_FACET_VALUES
    selectedStatus.value = null
    try {
      data.value = await $fetch<ScoreRecapResponse>(
        `${apiBaseUrl}/api/pfcScore/scoreRecap`,
        {
          credentials: 'include',
          headers: { Authorization: token.value ? `Bearer ${token.value}` : '' },
          query: isAllBranches.value
            ? {
                mode: 'scores',
                startDate: startDate.value,
                endDate: endDate.value,
                branchId: 'all',
                professionId: selectedProfessionId.value
              }
            : {
                mode: 'scores',
                startDate: startDate.value,
                endDate: endDate.value,
                branchId: selectedBranchId.value,
                professionInBranchId: selectedProfessionId.value,
                eventIds: selectedEventIds.value.join(',')
              }
        }
      )
    } catch (error) {
      const value = error as { data?: { message?: string }, message?: string }
      reportError.value = value.data?.message || value.message || 'Failed to load score recap.'
      toast.add({ title: 'Failed to load score recap', color: 'error' })
    } finally {
      loading.value = false
    }
  }

  async function loadEvents() {
    const requestId = ++eventRequestId
    events.value = []
    selectedEventIds.value = []
    if (isAllBranches.value) return
    if (!startDate.value || !endDate.value || !selectedBranchId.value || !selectedProfessionId.value) return
    if (startDate.value > endDate.value) return

    eventsLoading.value = true
    reportError.value = ''
    try {
      const response = await $fetch<ScoreRecapResponse>(
        `${apiBaseUrl}/api/pfcScore/scoreRecap`,
        {
          credentials: 'include',
          headers: { Authorization: token.value ? `Bearer ${token.value}` : '' },
          query: {
            mode: 'events',
            startDate: startDate.value,
            endDate: endDate.value,
            branchId: selectedBranchId.value,
            professionInBranchId: selectedProfessionId.value
          }
        }
      )
      if (requestId === eventRequestId) events.value = response.events || []
    } catch (error) {
      if (requestId !== eventRequestId) return
      const value = error as { data?: { message?: string }, message?: string }
      reportError.value = value.data?.message || value.message || 'Failed to load events.'
    } finally {
      if (requestId === eventRequestId) eventsLoading.value = false
    }
  }

  async function loadProfessions() {
    professions.value = []
    selectedProfessionId.value = undefined
    selectedEventIds.value = []
    events.value = []
    if (selectedBranchId.value == null) return

    professionsLoading.value = true
    reportError.value = ''
    try {
      const response = await $fetch<ScoreRecapResponse>(
        `${apiBaseUrl}/api/pfcScore/scoreRecap`,
        {
          credentials: 'include',
          headers: { Authorization: token.value ? `Bearer ${token.value}` : '' },
          query: {
            mode: 'professions',
            branchId: isAllBranches.value ? 'all' : selectedBranchId.value
          }
        }
      )
      professions.value = response.professions || []
    } catch (error) {
      const value = error as { data?: { message?: string }, message?: string }
      reportError.value = value.data?.message || value.message || 'Failed to load professions.'
    } finally {
      professionsLoading.value = false
    }
  }

  watch(selectedBranchId, loadProfessions, { immediate: true })
  watch([startDate, endDate, selectedBranchId, selectedProfessionId], loadEvents)

  const errorMessage = computed(() => {
    if (reportError.value) return reportError.value
    const value = initialError.value as { data?: { message?: string }, message?: string } | null
    return value?.data?.message || value?.message || ''
  })
  return {
    df, dateRange, selectedBranchId, branchOptions, selectedProfessionId, professionOptions,
    professionsLoading, selectedEventIds, eventOptions, eventsLoading, isAllBranches,
    loading, loadRecap, rows, representedBranches, selectedStatus, toggleStatusFilter,
    passedCount, failedCount, selectedRemarkDoc, remarkDocOptions, selectedRating,
    ratingOptions, errorMessage, filteredRows, formatDate, formatScore, statusColor,
    evidenceLoadingId, openEvidence, openRelatedDocuments, isEvidenceModalOpen,
    theoryReviewLoadingId, evidenceDownloadLoadingId, isTheoryReviewModalOpen,
    theoryReview, openTheoryReview, downloadEvidence,
    evidenceItems, resolveEvidenceUrl, formatEvidenceTime,
    isRelatedDocumentsModalOpen, selectedRelatedDocuments
  }
}
