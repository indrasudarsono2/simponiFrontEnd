<script setup lang="ts">
import type { CheckerHistoryAppRatingItem, CheckerHistoryResultItem } from '~/types/checkerHistory'
import { formatDateOnly, formatExamTime, formatPracticalType, formatScore, getRatingRemark } from '~/utils/checkerHistory'

const props = defineProps<{ resultData: CheckerHistoryResultItem[] | null, title: string, disabled: boolean }>()
const resultData = computed(() => props.resultData)
const printTitle = computed(() => props.title)
const toast = useToast()

interface PrintRow {
  id: string
  no: number
  showNo: boolean
  noRowSpan: number
  name: string
  showName: boolean
  nameRowSpan: number
  licenseNumber: string
  showLicenseNumber: boolean
  licenseNumberRowSpan: number
  validIelp: string
  showValidIelp: boolean
  validIelpRowSpan: number
  validMedex: string
  showValidMedex: boolean
  validMedexRowSpan: number
  rating: string
  showRating: boolean
  ratingRowSpan: number
  showTheory: boolean
  essayStartedAt: string
  essaySubmittedAt: string
  multipleChoiceStartedAt: string
  multipleChoiceSubmittedAt: string
  theoryScore: string
  practicalTest: string
  checkerName: string
  practicalTestScore: string
  remark: string
  showRemark: boolean
  remarkRowSpan: number
}

function getPrintRowCount(rating: CheckerHistoryAppRatingItem): number {
  return Math.max(1, rating.practicalTests?.length || 0)
}

function theoryScoreForPrint(rating: CheckerHistoryAppRatingItem, fallbackMinimum?: number | null): string {
  const scores = rating.finalScores || []
  const latest = scores[scores.length - 1]
  if (latest?.finalScore == null) return '-'
  const minimum = latest.event?.passingGrade ?? fallbackMinimum
  const threshold = Number(minimum)
  const latestPassed = latest.status?.status?.toUpperCase() !== 'FAILED'
    && minimum != null && Number.isFinite(threshold) && latest.finalScore >= threshold
  const previousFailed = scores.slice(0, -1).some((attempt) => {
    const attemptMinimum = attempt.event?.passingGrade ?? fallbackMinimum
    return attempt.status?.status?.toUpperCase() === 'FAILED'
      || (attempt.finalScore != null && attemptMinimum != null && attempt.finalScore < Number(attemptMinimum))
  })
  return latestPassed && previousFailed ? `${formatScore(threshold)}*` : formatScore(latest.finalScore)
}

const printRows = computed<PrintRow[]>(() => {
  const payload = resultData.value || []
  const result: PrintRow[] = []

  payload.forEach((item, itemIndex) => {
    const userName = item.user?.name || '-'
    const licenseNo = item.user?.licenseUserId || '-'
    const docs = item.applicationDocs || []
    const safeDocs
      = docs.length > 0
        ? docs
        : [
            {
              id: undefined,
              medex: { expired: null },
              ielp: { expired: null },
              appRatings: [] as CheckerHistoryAppRatingItem[]
            }
          ]

    const userRowSpan = Math.max(
      1,
      safeDocs.reduce((docSum, doc) => {
        const ratings = doc.appRatings || []
        if (ratings.length === 0) return docSum + 1
        const ratingRows = ratings.reduce((ratingSum, rating) => {
          return ratingSum + getPrintRowCount(rating)
        }, 0)
        return docSum + Math.max(1, ratingRows)
      }, 0)
    )

    let isFirstUserRow = true

    safeDocs.forEach((doc, docIndex) => {
      const validIelp = formatDateOnly(doc.ielp?.expired)
      const validMedex = formatDateOnly(doc.medex?.expired)
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

      safeRatings.forEach((rating, ratingIndex) => {
        const tests = rating.practicalTests || []
        const ratingRowSpan = getPrintRowCount(rating)
        const finalScore = rating.finalScores?.[rating.finalScores.length - 1]

        Array.from({ length: ratingRowSpan }).forEach((_, rowIndex) => {
          const test = tests[rowIndex]
          result.push({
            id: `${item.id || itemIndex}-${doc.id || docIndex}-${rating.id || ratingIndex}-${test?.id || rowIndex}`,
            no: itemIndex + 1,
            showNo: isFirstUserRow,
            noRowSpan: userRowSpan,
            name: userName,
            showName: isFirstUserRow,
            nameRowSpan: userRowSpan,
            licenseNumber: licenseNo,
            showLicenseNumber: isFirstUserRow,
            licenseNumberRowSpan: userRowSpan,
            validIelp,
            showValidIelp: isFirstUserRow,
            validIelpRowSpan: userRowSpan,
            validMedex,
            showValidMedex: isFirstUserRow,
            validMedexRowSpan: userRowSpan,
            rating: rating.rating?.rating || '-',
            showRating: rowIndex === 0,
            ratingRowSpan,
            showTheory: rowIndex === 0,
            essayStartedAt: formatExamTime(finalScore?.essayStartedAt),
            essaySubmittedAt: formatExamTime(finalScore?.essaySubmittedAt),
            multipleChoiceStartedAt: formatExamTime(finalScore?.multipleChoiceStartedAt),
            multipleChoiceSubmittedAt: formatExamTime(finalScore?.multipleChoiceSubmittedAt),
            theoryScore: theoryScoreForPrint(rating, item.event?.passingGrade),
            practicalTest: formatPracticalType(test?.kindOfPractical?.kind),
            checkerName: test?.checkerGroup?.userChecker?.name || '-',
            practicalTestScore: formatScore(test?.score),
            remark: getRatingRemark(rating),
            showRemark: rowIndex === 0,
            remarkRowSpan: ratingRowSpan
          })

          isFirstUserRow = false
        })
      })
    })
  })

  return result
})

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function handlePrintPdf() {
  if (printRows.value.length === 0) {
    toast.add({
      title: 'Validation',
      description: 'No data available to print.',
      color: 'warning'
    })
    return
  }

  const rowsHtml = printRows.value
    .map((row) => {
      return `<tr>
${row.showNo ? `<td rowspan="${row.noRowSpan}" class="center">${row.no}</td>` : ''}
${row.showName ? `<td rowspan="${row.nameRowSpan}">${escapeHtml(row.name)}</td>` : ''}
${row.showLicenseNumber ? `<td rowspan="${row.licenseNumberRowSpan}" class="center">${escapeHtml(row.licenseNumber)}</td>` : ''}
${row.showValidIelp ? `<td rowspan="${row.validIelpRowSpan}" class="center">${escapeHtml(row.validIelp)}</td>` : ''}
${row.showValidMedex ? `<td rowspan="${row.validMedexRowSpan}" class="center">${escapeHtml(row.validMedex)}</td>` : ''}
${row.showRating ? `<td rowspan="${row.ratingRowSpan}" class="center">${escapeHtml(row.rating)}</td>` : ''}
${row.showTheory ? `<td rowspan="${row.ratingRowSpan}" class="center">${escapeHtml(row.essayStartedAt)}</td>
<td rowspan="${row.ratingRowSpan}" class="center">${escapeHtml(row.essaySubmittedAt)}</td>
<td rowspan="${row.ratingRowSpan}" class="center">${escapeHtml(row.multipleChoiceStartedAt)}</td>
<td rowspan="${row.ratingRowSpan}" class="center">${escapeHtml(row.multipleChoiceSubmittedAt)}</td>
<td rowspan="${row.ratingRowSpan}" class="center">${escapeHtml(row.theoryScore)}</td>` : ''}
<td class="center">${escapeHtml(row.practicalTest)}</td>
<td>${escapeHtml(row.checkerName)}</td>
<td class="center">${escapeHtml(row.practicalTestScore)}</td>
${row.showRemark ? `<td rowspan="${row.remarkRowSpan}" class="center">${escapeHtml(row.remark)}</td>` : ''}
</tr>`
    })
    .join('')
  const scoreNote = printRows.value.some((row) => row.theoryScore.endsWith('*'))
    ? "<p>* Passed on a later theory attempt after an earlier failed attempt; the event's minimum passing grade is shown.</p>"
    : ''

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Checker History Print</title>
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    body { font-family: Arial, sans-serif; margin: 0; color: #111; font-size: 9px; }
    h1 { margin: 0 0 10px; font-size: 14px; text-align: center; }
    table { width: 100%; border-collapse: collapse; font-size: 8.5px; }
    th, td { border: 1px solid #333; padding: 3px; vertical-align: middle; }
    th { background: #f3f4f6; text-align: center; }
    .center { text-align: center; }
  </style>
</head>
<body>
  <h1>${escapeHtml(printTitle.value)}</h1>
  <table>
    <thead>
      <tr>
        <th>No</th>
        <th>Name</th>
        <th>License Number</th>
        <th>Valid IELP</th>
        <th>Valid MEDEX</th>
        <th>Rating</th>
        <th>Essay Start</th>
        <th>Essay Submission</th>
        <th>Multiple Choice Start</th>
        <th>Multiple Choice Submission</th>
        <th>Theory Score</th>
        <th>Practical Type</th>
        <th>Checker Name</th>
        <th>Practical Score</th>
        <th>Remark</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  ${scoreNote}
</body>
</html>`

  const printWindow = window.open('', '_blank', 'width=1200,height=800')
  if (!printWindow) {
    toast.add({
      title: 'Error',
      description: 'Unable to open print window.',
      color: 'error'
    })
    return
  }
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}
</script>

<template>
  <UButton
    label="Print PDF"
    color="success"
    icon="i-lucide-printer"
    variant="outline"
    :disabled="disabled"
    @click="handlePrintPdf"
  />
</template>
