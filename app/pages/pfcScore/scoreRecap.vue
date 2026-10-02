<script setup lang="ts">
import { getLocalTimeZone } from '@internationalized/date'

const {
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
} = await usePfcScoreRecap()
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Performance Check Score Recap">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <UCard>
          <template #header>
            <div>
              <h2 class="font-semibold">
                Report Filter
              </h2>
              <p class="text-sm text-muted">
                Choose a date range, branch, and profession. For a specific branch, select one or more matching events.
              </p>
            </div>
          </template>

          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5 xl:items-end">
            <UFormField label="Date Range" required>
              <UPopover :content="{ align: 'start' }" :modal="true">
                <UButton
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-calendar"
                  class="w-full justify-between"
                >
                  <span class="truncate">
                    <template v-if="dateRange.start">
                      <template v-if="dateRange.end">
                        {{ df.format(dateRange.start.toDate(getLocalTimeZone())) }}
                        -
                        {{ df.format(dateRange.end.toDate(getLocalTimeZone())) }}
                      </template>
                      <template v-else>
                        {{ df.format(dateRange.start.toDate(getLocalTimeZone())) }}
                      </template>
                    </template>
                    <template v-else>Pick a date range</template>
                  </span>
                  <template #trailing>
                    <UIcon
                      name="i-lucide-chevron-down"
                      class="size-5 shrink-0 text-dimmed"
                    />
                  </template>
                </UButton>

                <template #content>
                  <UCalendar
                    v-model="dateRange"
                    class="p-2"
                    :number-of-months="2"
                    range
                  />
                </template>
              </UPopover>
            </UFormField>
            <UFormField label="Branch">
              <USelect
                v-model="selectedBranchId"
                :items="branchOptions"
                value-key="value"
                placeholder="Select branch"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Profession">
              <USelect
                v-model="selectedProfessionId"
                :items="professionOptions"
                value-key="value"
                placeholder="Select profession"
                :loading="professionsLoading"
                :disabled="selectedBranchId == null || professionsLoading"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Events">
              <USelect
                v-model="selectedEventIds"
                :items="eventOptions"
                value-key="value"
                placeholder="Select events"
                :loading="eventsLoading"
                :disabled="isAllBranches || !selectedProfessionId || eventsLoading"
                multiple
                class="w-full"
              />
              <p v-if="isAllBranches" class="mt-1 text-xs text-muted">
                All matching events will be included.
              </p>
            </UFormField>
            <UButton
              label="Show Recap"
              icon="i-lucide-search"
              :loading="loading"
              block
              @click="loadRecap"
            />
          </div>
        </UCard>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <UCard>
            <p class="text-sm text-muted">
              Total Results
            </p><p class="text-2xl font-semibold">
              {{ rows.length }}
            </p>
          </UCard>
          <UCard>
            <p class="text-sm text-muted">
              Branches
            </p><p class="text-2xl font-semibold">
              {{ representedBranches }}
            </p>
          </UCard>
          <UCard
            class="cursor-pointer transition hover:ring-2 hover:ring-success/40"
            :class="selectedStatus === 'SUCCESS' ? 'ring-2 ring-success' : ''"
            role="button"
            tabindex="0"
            :aria-pressed="selectedStatus === 'SUCCESS'"
            @click="toggleStatusFilter('SUCCESS')"
            @keydown.enter.prevent="toggleStatusFilter('SUCCESS')"
            @keydown.space.prevent="toggleStatusFilter('SUCCESS')"
          >
            <p class="text-sm text-muted">
              Passed
            </p><p class="text-2xl font-semibold text-success">
              {{ passedCount }}
            </p>
          </UCard>
          <UCard
            class="cursor-pointer transition hover:ring-2 hover:ring-error/40"
            :class="selectedStatus === 'FAILED' ? 'ring-2 ring-error' : ''"
            role="button"
            tabindex="0"
            :aria-pressed="selectedStatus === 'FAILED'"
            @click="toggleStatusFilter('FAILED')"
            @keydown.enter.prevent="toggleStatusFilter('FAILED')"
            @keydown.space.prevent="toggleStatusFilter('FAILED')"
          >
            <p class="text-sm text-muted">
              Failed
            </p><p class="text-2xl font-semibold text-error">
              {{ failedCount }}
            </p>
          </UCard>
        </div>

        <UCard v-if="rows.length">
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Remark Document">
              <USelect
                v-model="selectedRemarkDoc"
                :items="remarkDocOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Rating">
              <USelect
                v-model="selectedRating"
                :items="ratingOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
          </div>
        </UCard>

        <div v-if="errorMessage" class="rounded-lg border border-error/30 bg-error/5 p-4 text-error">
          {{ errorMessage }}
        </div>

        <UCard v-else>
          <template #header>
            <h2 class="font-semibold">
              Score Recap
            </h2>
          </template>
          <PfcScoreRecapTable
            :filtered-rows="filteredRows"
            :selected-status="selectedStatus"
            :evidence-loading-id="evidenceLoadingId"
            :theory-review-loading-id="theoryReviewLoadingId"
            :evidence-download-loading-id="evidenceDownloadLoadingId"
            :format-date="formatDate"
            :format-score="formatScore"
            :status-color="statusColor"
            @open-evidence="openEvidence"
            @open-related="openRelatedDocuments"
            @open-theory-review="openTheoryReview"
            @download-evidence="downloadEvidence"
          />
        </UCard>

        <PfcScoreEvidenceModal
          v-model:open="isEvidenceModalOpen"
          :evidence-loading-id="evidenceLoadingId"
          :evidence-items="evidenceItems"
          :resolve-evidence-url="resolveEvidenceUrl"
          :format-evidence-time="formatEvidenceTime"
        />
        <CheckerScoreTheoryReviewModal
          v-model:open="isTheoryReviewModalOpen"
          :review="theoryReview"
          :loading="theoryReviewLoadingId !== null"
        />
        <PfcScoreRelatedDocumentsModal
          :open="isRelatedDocumentsModalOpen"
          :documents="selectedRelatedDocuments"
          @close="isRelatedDocumentsModalOpen = false"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
