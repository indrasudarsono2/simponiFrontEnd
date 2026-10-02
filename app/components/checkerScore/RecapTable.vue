<script setup lang="ts">
import type { ScoreCheckerRow } from '~/types/checkerScoreRecap'

defineProps<{
  rows: ScoreCheckerRow[]
  canInvalidateAttempt: boolean
  evidenceLoadingId: number | null
  theoryReviewLoadingId: number | null
  evidenceDownloadLoadingId: number | null
  reExaminationHistoryLoadingId: number | null
}>()
const emit = defineEmits<{
  'open-evidence': [appRatingId: number | null]
  'open-theory-review': [appRatingId: number | null]
  'download-evidence': [appRatingId: number | null, name: string, rating: string]
  'open-history': [appRatingId: number | null]
}>()
function handleOpenEvidence(appRatingId: number | null) {
  emit('open-evidence', appRatingId)
}
function handleOpenReExaminationHistory(appRatingId: number | null) {
  emit('open-history', appRatingId)
}
const modeLabel = (value: string | null) => value === 'MODE_1' ? 'Mode 1' : value === 'MODE_2' ? 'Mode 2' : value || '-'
const difficultyLabel = (value: string | null) => value === 'EASY' ? 'Easy' : value === 'HARD' ? 'Hard' : value || '-'
</script>

<template>
  <div class="overflow-x-auto rounded-lg border">
    <table
      class="min-w-full text-sm border-collapse border border-default"
    >
      <thead class="bg-muted/40">
        <tr>
          <th
            class="px-3 py-2 text-center font-medium border border-default"
          >
            No
          </th>
          <th
            class="px-3 py-2 text-center font-medium border border-default"
          >
            Name
          </th>
          <th class="px-3 py-2 text-center font-medium border border-default">
            Event
          </th>
          <th
            class="px-3 py-2 text-center font-medium border border-default"
          >
            ApplicationDoc
          </th>
          <th
            class="px-3 py-2 text-center font-medium border border-default"
          >
            Rating
          </th>
          <th
            class="px-3 py-2 text-center font-medium border border-default"
          >
            FinalScore
          </th>
          <th
            class="px-3 py-2 text-center font-medium border border-default"
          >
            Status
          </th>
          <th
            class="px-3 py-2 text-center font-medium border border-default"
          >
            Evidance
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id" class="align-top">
          <td
            v-if="row.showNo"
            class="px-3 py-2 border border-default align-middle text-center"
            :rowspan="row.noRowSpan"
          >
            {{ row.no }}
          </td>
          <td
            v-if="row.showName"
            class="px-3 py-2 border border-default align-middle"
            :rowspan="row.nameRowSpan"
          >
            {{ row.name }}
          </td>
          <td v-if="row.showNo" class="px-3 py-2 border border-default align-middle" :rowspan="row.noRowSpan">
            <div>{{ row.eventName }}</div>
            <div class="mt-1 flex flex-wrap gap-1">
              <UBadge :label="modeLabel(row.theoryMode)" color="primary" variant="soft" size="lg" class="text-sm font-semibold" />
              <UBadge :label="difficultyLabel(row.difficulty)" color="neutral" variant="soft" size="lg" class="text-sm font-semibold" />
            </div>
          </td>
          <td
            v-if="row.showApplicationDoc"
            class="px-3 py-2 border border-default align-middle text-center"
            :rowspan="row.applicationDocRowSpan"
          >
            {{ row.applicationDoc }}
          </td>
          <td
            v-if="row.showRating"
            class="px-3 py-2 border border-default align-middle text-center"
            :rowspan="row.ratingRowSpan"
          >
            {{ row.rating }}
          </td>
          <td class="px-3 py-2 border border-default text-center">
            {{ row.finalScore }}
          </td>
          <td class="px-3 py-2 border border-default text-center">
            <UBadge
              :color="
                row.status?.toUpperCase() === 'SUCCESS'
                  ? 'success'
                  : row.status?.toUpperCase() === 'FAILED'
                    ? 'error'
                    : row.status?.toUpperCase() === 'RECHECK'
                      ? 'warning'
                      : row.status?.toUpperCase()
                        === 'RE-EXAMINATION REQUIRED'
                        ? 'warning'
                        : row.status?.toUpperCase()
                          === 'WAITING PRACTICAL'
                          ? 'warning'
                          : 'neutral'
              "
              variant="soft"
            >
              {{ row.status }}
            </UBadge>
          </td>
          <td
            v-if="row.showEvidence"
            class="px-3 py-2 border border-default align-middle text-center"
            :rowspan="row.evidenceRowSpan"
          >
            <div class="flex flex-wrap justify-center gap-2">
              <UButton
                v-if="row.appRatingId && row.hasTheoryResult"
                label="Theory Review"
                icon="i-lucide-book-open-check"
                color="primary"
                variant="soft"
                size="xs"
                :loading="theoryReviewLoadingId === row.appRatingId"
                @click="emit('open-theory-review', row.appRatingId)"
              />
              <UButton
                v-if="canInvalidateAttempt && row.appRatingId && row.hasTheoryResult"
                label="Download ZIP"
                icon="i-lucide-download"
                color="neutral"
                variant="soft"
                size="xs"
                :loading="evidenceDownloadLoadingId === row.appRatingId"
                @click="emit('download-evidence', row.appRatingId, row.name, row.rating)"
              />
              <UButton
                v-if="row.hasEvidence"
                label="Evidence"
                icon="i-lucide-eye"
                color="primary"
                variant="soft"
                size="xs"
                :loading="
                  evidenceLoadingId !== null
                    && evidenceLoadingId === row.appRatingId
                "
                @click="handleOpenEvidence(row.appRatingId)"
              />
              <UButton
                v-if="canInvalidateAttempt && row.appRatingId"
                label="History"
                icon="i-lucide-history"
                color="neutral"
                variant="soft"
                size="xs"
                :loading="
                  reExaminationHistoryLoadingId !== null
                    && reExaminationHistoryLoadingId === row.appRatingId
                "
                @click="handleOpenReExaminationHistory(row.appRatingId)"
              />
              <span
                v-if="!row.hasEvidence && !(canInvalidateAttempt && row.appRatingId) && !row.hasTheoryResult"
              >-</span>
            </div>
          </td>
        </tr>

        <tr v-if="rows.length === 0">
          <td
            class="px-3 py-3 text-muted border border-default text-center"
            colspan="8"
          >
            No score recap data available.
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
