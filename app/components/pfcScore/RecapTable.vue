<script setup lang="ts">
import type { ScoreRecapRow } from '~/types/pfcScoreRecap'

defineProps<{
  filteredRows: ScoreRecapRow[]
  selectedStatus: 'SUCCESS' | 'FAILED' | null
  evidenceLoadingId: number | null
  theoryReviewLoadingId: number | null
  evidenceDownloadLoadingId: number | null
  formatDate: (value?: string | null) => string
  formatScore: (value?: number | null) => string
  statusColor: (value?: string | null) => 'success' | 'error' | 'warning' | 'neutral'
}>()
const emit = defineEmits<{ 'open-evidence': [row: ScoreRecapRow], 'open-related': [row: ScoreRecapRow], 'open-theory-review': [row: ScoreRecapRow], 'download-evidence': [row: ScoreRecapRow] }>()
function openEvidence(row: ScoreRecapRow) {
  emit('open-evidence', row)
}
function openRelatedDocuments(row: ScoreRecapRow) {
  emit('open-related', row)
}
const modeLabel = (value?: string | null) => value === 'MODE_1' ? 'Mode 1' : value === 'MODE_2' ? 'Mode 2' : value || '-'
const difficultyLabel = (value?: string | null) => value === 'EASY' ? 'Easy' : value === 'HARD' ? 'Hard' : value || '-'
</script>

<template>
  <div class="overflow-x-auto rounded-lg border border-default">
    <table class="min-w-[1280px] w-full border-collapse text-sm">
      <thead class="bg-muted/40">
        <tr>
          <th class="border border-default px-3 py-2 text-center">
            No
          </th>
          <th class="border border-default px-3 py-2 text-center">
            Score Date
          </th>
          <th class="border border-default px-3 py-2 text-center">
            Branch
          </th>
          <th class="border border-default px-3 py-2 text-center">
            NIK
          </th>
          <th class="border border-default px-3 py-2 text-center">
            Name
          </th>
          <th class="border border-default px-3 py-2 text-center">
            Event
          </th>
          <th class="border border-default px-3 py-2 text-center">
            Application Document
          </th>
          <th class="border border-default px-3 py-2 text-center">
            Rating
          </th>
          <th class="border border-default px-3 py-2 text-center">
            MC
          </th>
          <th class="border border-default px-3 py-2 text-center">
            Essay
          </th>
          <th class="border border-default px-3 py-2 text-center">
            Theory
          </th>
          <th class="border border-default px-3 py-2 text-center">
            Practical Scores and Checkers
          </th>
          <th class="border border-default px-3 py-2 text-center">
            Status
          </th>
          <th class="border border-default px-3 py-2 text-center">
            Evidence
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in filteredRows" :key="row.id">
          <td class="border border-default px-3 py-2 text-center">
            {{ index + 1 }}
          </td>
          <td class="border border-default px-3 py-2 text-center">
            {{ formatDate(row.scoreDate) }}
          </td>
          <td class="border border-default px-3 py-2">
            {{ row.branch?.branch || '-' }}
          </td>
          <td class="border border-default px-3 py-2 text-center">
            {{ row.user?.nik || '-' }}
          </td>
          <td class="border border-default px-3 py-2">
            {{ row.user?.name || '-' }}
          </td>
          <td class="border border-default px-3 py-2">
            <div>{{ row.event?.event || '-' }}</div>
            <div class="mt-1 flex flex-wrap gap-1">
              <UBadge :label="modeLabel(row.event?.theoryMode)" color="primary" variant="soft" size="lg" class="text-sm font-semibold" />
              <UBadge :label="difficultyLabel(row.event?.difficulty)" color="neutral" variant="soft" size="lg" class="text-sm font-semibold" />
            </div>
          </td>
          <td class="border border-default px-3 py-2 text-center">
            {{ row.applicationDocument || '-' }}
          </td>
          <td class="border border-default px-3 py-2 text-center">
            {{ row.rating || '-' }}
          </td>
          <td class="border border-default px-3 py-2 text-center">
            {{ formatScore(row.multipleChoiceScore) }}
          </td>
          <td class="border border-default px-3 py-2 text-center">
            {{ formatScore(row.essayScore) }}
          </td>
          <td class="border border-default px-3 py-2 text-center">
            {{ formatScore(row.theoryScore) }}
          </td>
          <td class="border border-default px-3 py-2">
            <div
              v-if="row.practicalScores?.length"
              class="min-w-64 space-y-2"
            >
              <div
                v-for="(practical, practicalIndex) in row.practicalScores"
                :key="`${row.id}-${practical.attempt}-${practicalIndex}`"
                class="rounded-md border border-default bg-muted/20 p-2"
              >
                <div class="flex items-center justify-between gap-3">
                  <span class="font-medium">{{ practical.kind || 'Practical' }}</span>
                  <UBadge
                    :color="practical.attempt === 2 ? 'warning' : 'neutral'"
                    variant="soft"
                    size="xs"
                  >
                    Attempt {{ practical.attempt }}
                  </UBadge>
                </div>
                <div class="mt-1 text-sm">
                  <span class="font-medium">Score:</span>
                  {{ formatScore(practical.score) }}
                </div>
                <div class="text-xs text-muted">
                  Checker: {{ practical.checker?.name || '-' }}
                  <span v-if="practical.checker?.nik">
                    ({{ practical.checker.nik }})
                  </span>
                </div>
              </div>
            </div>
            <span v-else class="block text-center">-</span>
          </td>
          <td class="border border-default px-3 py-2 text-center">
            <UBadge :color="statusColor(row.status)" variant="soft">
              {{ row.status || '-' }}
            </UBadge>
          </td>
          <td class="border border-default px-3 py-2 text-center">
            <div class="flex flex-wrap items-center justify-center gap-2">
              <UButton
                v-if="row.appRatingId"
                label="Theory Review"
                icon="i-lucide-book-open-check"
                color="primary"
                variant="soft"
                size="xs"
                :loading="theoryReviewLoadingId === row.appRatingId"
                @click="emit('open-theory-review', row)"
              />
              <UButton
                v-if="row.appRatingId"
                label="Download ZIP"
                icon="i-lucide-download"
                color="neutral"
                variant="soft"
                size="xs"
                :loading="evidenceDownloadLoadingId === row.appRatingId"
                @click="emit('download-evidence', row)"
              />
              <UButton
                v-if="row.hasEvidence"
                icon="i-lucide-eye"
                color="primary"
                variant="soft"
                size="xs"
                :loading="evidenceLoadingId === row.appRatingId"
                aria-label="View evidence"
                @click="openEvidence(row)"
              />
              <UButton
                v-if="row.relatedDocuments"
                icon="i-lucide-folder-search"
                color="neutral"
                variant="soft"
                size="xs"
                aria-label="View related documents"
                @click="openRelatedDocuments(row)"
              />
              <span v-if="!row.appRatingId && !row.hasEvidence && !row.relatedDocuments">-</span>
            </div>
          </td>
        </tr>
        <tr v-if="filteredRows.length === 0">
          <td colspan="14" class="border border-default px-3 py-8 text-center text-muted">
            {{ selectedStatus
              ? `No ${selectedStatus === 'SUCCESS' ? 'passed' : 'failed'} scores were found.`
              : 'No scores were found for the selected period and branch.' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
