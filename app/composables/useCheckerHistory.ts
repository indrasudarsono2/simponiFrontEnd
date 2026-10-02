import type { CheckerHistoryAppRatingItem, CheckerHistoryAuthority, CheckerHistoryRemarkItem, CheckerHistoryResultItem, CheckerHistoryRow, CheckerHistorySearchResponse } from '~/types/checkerHistory'
import { formatScore, formatPracticalType, getAuthorityCwps, getFinalScoreAt, getRatingRemark, getRatingRowCount, getApplicationDocRowCount, getItemRowCount } from '~/utils/checkerHistory'

export async function useCheckerHistory() {
  const apiBaseUrl = useApiBaseUrl()
  const { token } = useAuth()
  const toast = useToast()

  const selectedRemarkId = ref<number | undefined>(undefined)
  const selectedSessionId = ref<number | undefined>(undefined)
  const selectedEventIds = ref<number[]>([])
  const resultLoading = ref(false)
  const resultData = ref<CheckerHistoryResultItem[] | null>(null)
  const selectedEventMeta = ref<CheckerHistorySearchResponse['event'] | null>(null)

  const isAuthorityModalOpen = ref(false)
  const selectedAuthority = ref<CheckerHistoryAuthority | null>(null)

  const isFileModalOpen = ref(false)
  const selectedFilePath = ref<string | null>(null)
  const selectedFileTitle = ref<string>('File Preview')

  const { data, status, error, refresh } = await useFetch<
    CheckerHistoryRemarkItem[]
  >(`${apiBaseUrl}/api/checkerHistory`, {
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
    const events = (selectedRemarkItem.value?.events || []).filter(
      item => item.session?.id === selectedSessionId.value
    )

    return events.map(item => ({
      label: item.event || '-',
      value: item.id
    }))
  })

  const sessionOptions = computed(() => {
    const events = selectedRemarkItem.value?.events || []
    const sessionMap = new Map<number, string>()

    events.forEach((item) => {
      if (!item.session?.id) return
      sessionMap.set(item.session.id, item.session.session || '-')
    })

    return Array.from(sessionMap.entries()).map(([id, session]) => ({
      label: session,
      value: id
    }))
  })

  watch(selectedRemarkId, () => {
    selectedSessionId.value = undefined
    selectedEventIds.value = []
  })

  watch(selectedSessionId, () => {
    selectedEventIds.value = []
  })

  function openAuthorityModal(row: CheckerHistoryRow) {
    selectedAuthority.value = {
      user: row.name,
      applicationDoc: row.applicationDocNumber,
      rating: row.rating,
      cwps: row.authorityCwps
    }
    isAuthorityModalOpen.value = true
  }

  function closeAuthorityModal() {
    isAuthorityModalOpen.value = false
    selectedAuthority.value = null
  }

  const rows = computed<CheckerHistoryRow[]>(() => {
    const payload = resultData.value || []
    const result: CheckerHistoryRow[] = []

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
                license: { file: null },
                medex: { file: null },
                ielp: { file: null },
                logbook: { file: null },
                appRatings: [] as CheckerHistoryAppRatingItem[]
              }
            ]

      const itemRowSpan = getItemRowCount(item)
      let isFirstItemRow = true

      safeDocs.forEach((doc, docIndex) => {
        const ratings = doc.appRatings || []
        const safeRatings
          = ratings.length > 0
            ? ratings
            : [
                {
                  id: undefined,
                  rating: { rating: '-' },
                  finalScores: [],
                  practicalTests: []
                }
              ]

        const docRowSpan = getApplicationDocRowCount(doc)
        let isFirstDocRow = true

        safeRatings.forEach((appRating, ratingIndex) => {
          const ratingRowSpan = getRatingRowCount(appRating)
          const tests = appRating.practicalTests || []

          Array.from({ length: ratingRowSpan }).forEach((_, rowIndex) => {
            const test = tests[rowIndex]
            result.push({
              id: `${item.id || itemIndex}-${doc.id || docIndex}-${appRating.id || ratingIndex}-${test?.id || rowIndex}`,
              no: itemIndex + 1,
              showNo: isFirstItemRow,
              noRowSpan: itemRowSpan,
              name: userName,
              showName: isFirstItemRow,
              nameRowSpan: itemRowSpan,
              applicationDocNumber: doc.number || '-',
              showApplicationDocNumber: isFirstDocRow,
              applicationDocNumberRowSpan: docRowSpan,
              showFile: isFirstDocRow,
              fileRowSpan: docRowSpan,
              licenseFile: doc.license?.file || null,
              medexFile: doc.medex?.file || null,
              ielpFile: doc.ielp?.file || null,
              logbookFile: doc.logbook?.file || null,
              rating: appRating.rating?.rating || '-',
              authorityCwps: getAuthorityCwps(appRating),
              showRating: rowIndex === 0,
              ratingRowSpan,
              remark: getRatingRemark(appRating),
              showRemark: rowIndex === 0,
              remarkRowSpan: ratingRowSpan,
              score: getFinalScoreAt(appRating, rowIndex),
              practicalTestFile: test?.file || null,
              practicalTestLabel: test?.file ? 'Open' : '-',
              kind: formatPracticalType(test?.kindOfPractical?.kind),
              practicalScore: formatScore(test?.score)
            })

            isFirstItemRow = false
            isFirstDocRow = false
          })
        })
      })
    })

    return result
  })

  async function handleSearch() {
    if (selectedEventIds.value.length === 0) {
      toast.add({
        title: 'Validation',
        description: 'Please select at least one event.',
        color: 'warning'
      })
      return
    }

    try {
      resultLoading.value = true
      const response = await $fetch<
      CheckerHistorySearchResponse | CheckerHistorySearchResponse[]
      >(`${apiBaseUrl}/api/checkerHistory`, {
        method: 'POST',
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : ''
        },
        body: {
          eventId: selectedEventIds.value
        }
      })

      const responseList = Array.isArray(response) ? response : [response]
      const users = responseList.flatMap(item => item.sortEventUser || [])
      resultData.value = users
      selectedEventMeta.value = responseList[0]?.event || null

      toast.add({
        title: 'Success',
        description: 'Checker history loaded successfully.',
        color: 'success'
      })
    } catch (fetchError: unknown) {
      const errorInfo = fetchError as { data?: { message?: string }, message?: string }
      const message
        = errorInfo?.data?.message
          || errorInfo?.message
          || 'Failed to load checker history.'
      toast.add({
        title: 'Error',
        description: message,
        color: 'error'
      })
    } finally {
      resultLoading.value = false
    }
  }

  function openFileModal(filePath: string | null, title: string) {
    if (!filePath) return
    selectedFilePath.value = filePath
    selectedFileTitle.value = title
    isFileModalOpen.value = true
  }

  function closeFileModal() {
    isFileModalOpen.value = false
    selectedFilePath.value = null
    selectedFileTitle.value = 'File Preview'
  }

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

  const printTitle = computed(() => {
    const remark = selectedEventMeta.value?.remarkDoc?.remark || '-'
    const session = selectedEventMeta.value?.session?.session || '-'
    return `${remark} ${session}`
  })

  return {
    selectedRemarkId, selectedSessionId, selectedEventIds,
    resultLoading, resultData, selectedEventMeta,
    isAuthorityModalOpen, selectedAuthority, openAuthorityModal, closeAuthorityModal,
    isFileModalOpen, selectedFilePath, selectedFileTitle, openFileModal, closeFileModal,
    data, status, error, refresh, remarkOptions, sessionOptions, eventOptions,
    rows, handleSearch, initialErrorMessage, printTitle
  }
}
