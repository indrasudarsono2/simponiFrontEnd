<script setup lang="ts">
const {
  selectedRemarkId, selectedEventId, resultLoading, resultData,
  status, error, refresh, remarkOptions, eventOptions, rows,
  handleSearch, initialErrorMessage,
  canInvalidateAttempt, evidenceLoadingId, reExaminationHistoryLoadingId,
  theoryReviewLoadingId, isTheoryReviewModalOpen, theoryReview, handleOpenTheoryReview,
  evidenceDownloadLoadingId, handleDownloadEvidence,
  handleOpenEvidence, handleOpenReExaminationHistory,
  isEvidenceModalOpen, isEvidenceFetching, evidenceImageItems,
  resolveEvidenceUrl, formatEvidenceTime, openInvalidationModal,
  isReExaminationHistoryModalOpen, reExaminationHistory, reExaminationHistoryError,
  attemptStatusColor, formatScore,
  isInvalidationModalOpen, fraudCategory, fraudCategoryOptions,
  invalidationReason, invalidationConfirmed, invalidationLoading,
  handleInvalidateAttempt
} = await useCheckerScoreRecap()
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Score Recap">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">
              Filter Score
            </h2>
          </template>

          <div
            v-if="status === 'pending'"
            class="flex items-center gap-2 text-muted py-2"
          >
            <UIcon name="i-lucide-loader-2" class="size-5 animate-spin" />
            Loading options...
          </div>

          <div
            v-else-if="error"
            class="rounded-lg border border-error/30 bg-error/5 p-4 space-y-2"
          >
            <p class="font-medium text-error">
              {{ initialErrorMessage }}
            </p>
            <UButton
              label="Retry"
              color="error"
              variant="outline"
              icon="i-lucide-refresh-cw"
              @click="refresh()"
            />
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <UFormField label="Remark">
              <USelect
                v-model="selectedRemarkId"
                :items="remarkOptions"
                placeholder="Select remark"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Event">
              <USelect
                v-model="selectedEventId"
                :items="eventOptions"
                :disabled="!selectedRemarkId"
                placeholder="Select event"
                class="w-full"
              />
            </UFormField>

            <div class="flex items-end">
              <UButton
                label="Search"
                color="primary"
                icon="i-lucide-search"
                :loading="resultLoading"
                :disabled="!selectedEventId || resultLoading"
                class="w-full md:w-auto"
                @click="handleSearch"
              />
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">
              Result
            </h2>
          </template>

          <div
            v-if="resultLoading"
            class="flex items-center gap-2 text-muted py-2"
          >
            <UIcon name="i-lucide-loader-2" class="size-5 animate-spin" />
            Loading score recap result...
          </div>

          <div v-else-if="resultData == null" class="text-sm text-muted">
            No result yet. Please select and search.
          </div>

          <CheckerScoreRecapTable
            v-else
            :rows="rows"
            :can-invalidate-attempt="canInvalidateAttempt"
            :evidence-loading-id="evidenceLoadingId"
            :theory-review-loading-id="theoryReviewLoadingId"
            :evidence-download-loading-id="evidenceDownloadLoadingId"
            :re-examination-history-loading-id="reExaminationHistoryLoadingId"
            @open-evidence="handleOpenEvidence"
            @open-theory-review="handleOpenTheoryReview"
            @download-evidence="handleDownloadEvidence"
            @open-history="handleOpenReExaminationHistory"
          />
        </UCard>

        <CheckerScoreEvidenceModal
          v-model:open="isEvidenceModalOpen"
          :is-evidence-fetching="isEvidenceFetching"
          :evidence-image-items="evidenceImageItems"
          :can-invalidate-attempt="canInvalidateAttempt"
          :resolve-evidence-url="resolveEvidenceUrl"
          :format-evidence-time="formatEvidenceTime"
          @require-reexamination="openInvalidationModal"
        />
        <CheckerScoreTheoryReviewModal
          v-model:open="isTheoryReviewModalOpen"
          :review="theoryReview"
          :loading="theoryReviewLoadingId !== null"
        />
        <CheckerScoreReExaminationHistoryModal
          v-model:open="isReExaminationHistoryModalOpen"
          :re-examination-history-loading-id="reExaminationHistoryLoadingId"
          :re-examination-history-error="reExaminationHistoryError"
          :re-examination-history="reExaminationHistory"
          :attempt-status-color="attemptStatusColor"
          :format-evidence-time="formatEvidenceTime"
          :format-score="formatScore"
        />
        <CheckerScoreInvalidationModal
          v-model:open="isInvalidationModalOpen"
          v-model:reason="invalidationReason"
          v-model:fraud-category="fraudCategory"
          v-model:confirmed="invalidationConfirmed"
          :fraud-category-options="fraudCategoryOptions"
          :invalidation-loading="invalidationLoading"
          @submit="handleInvalidateAttempt"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
