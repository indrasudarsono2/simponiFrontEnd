<script setup lang="ts">
import type { ReExaminationAttemptItem, ReExaminationHistoryResponse } from '~/types/checkerScoreRecap'

const isReExaminationHistoryModalOpen = defineModel<boolean>('open', { required: true })
defineProps<{
  reExaminationHistoryLoadingId: number | null
  reExaminationHistoryError: string
  reExaminationHistory: ReExaminationHistoryResponse | null
  attemptStatusColor: (attempt: ReExaminationAttemptItem) => 'error' | 'success' | 'neutral'
  formatEvidenceTime: (value?: string | null) => string
  formatScore: (value: unknown) => string
}>()
</script>

<template>
  <UModal
    v-model:open="isReExaminationHistoryModalOpen"
    title="Re-examination Audit Trail"
    description="Complete attempt and invalidation history for this rating."
    :ui="{ content: 'max-w-4xl w-full' }"
  >
    <template #body>
      <div
        v-if="reExaminationHistoryLoadingId !== null"
        class="flex items-center justify-center gap-2 py-12 text-muted"
      >
        <UIcon name="i-lucide-loader-2" class="size-5 animate-spin" />
        Loading audit trail...
      </div>

      <div
        v-else-if="reExaminationHistoryError"
        class="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error"
      >
        {{ reExaminationHistoryError }}
      </div>

      <div v-else-if="reExaminationHistory" class="space-y-5">
        <div class="grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-2">
          <div>
            <p class="text-xs text-muted">
              User
            </p>
            <p class="font-medium text-highlighted">
              {{ reExaminationHistory.user?.name || "-" }}
            </p>
            <p class="text-xs text-muted">
              {{ reExaminationHistory.user?.nik || "-" }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted">
              Event / Rating
            </p>
            <p class="font-medium text-highlighted">
              {{ reExaminationHistory.event?.event || "-" }} /
              {{ reExaminationHistory.rating || "-" }}
            </p>
            <p class="text-xs text-muted">
              Application: {{ reExaminationHistory.applicationDocument || "-" }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted">
              Current status
            </p>
            <UBadge color="neutral" variant="soft">
              {{ reExaminationHistory.currentStatus || "-" }}
            </UBadge>
          </div>
          <div v-if="reExaminationHistory.pendingReExamination">
            <p class="text-xs text-muted">
              Next action
            </p>
            <UBadge color="warning" variant="soft">
              RE-EXAMINATION PENDING
            </UBadge>
          </div>
        </div>

        <div
          v-if="reExaminationHistory.attempts.length === 0"
          class="rounded-lg border p-4 text-sm text-muted"
        >
          No examination attempt has been recorded.
        </div>

        <ol v-else class="relative ml-3 border-l border-default space-y-5">
          <li
            v-for="attempt in reExaminationHistory.attempts"
            :key="attempt.finalScoreId"
            class="relative pl-6"
          >
            <span
              class="absolute -left-2 top-1.5 size-4 rounded-full border-2 border-default bg-primary"
            />
            <div class="rounded-lg border p-4 space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h3 class="font-semibold text-highlighted">
                  Attempt {{ attempt.attemptNumber }}
                </h3>
                <UBadge :color="attemptStatusColor(attempt)" variant="soft">
                  {{ attempt.isInvalidated ? "INVALIDATED" : attempt.status || "RECORDED" }}
                </UBadge>
              </div>

              <div class="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                <div>
                  <p class="text-xs text-muted">
                    Final score
                  </p>
                  <p class="font-medium">
                    {{ formatScore(attempt.finalScore) }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-muted">
                    Essay
                  </p>
                  <p class="font-medium">
                    {{ formatScore(attempt.essayScore) }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-muted">
                    Multiple Choice
                  </p>
                  <p class="font-medium">
                    {{ formatScore(attempt.multipleChoiceScore) }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-muted">
                    Recorded
                  </p>
                  <p class="font-medium">
                    {{ formatEvidenceTime(attempt.completedAt || attempt.startedAt) }}
                  </p>
                </div>
              </div>

              <p class="text-sm text-muted">
                Checker:
                <span class="text-highlighted">
                  {{
                    attempt.checkers?.map((checker) => checker.name).join(", ")
                      || "Automated / not recorded"
                  }}
                </span>
              </p>

              <div
                v-if="attempt.invalidation"
                class="rounded-lg border border-error/30 bg-error/5 p-3 space-y-2"
              >
                <div class="flex items-center gap-2 font-medium text-error">
                  <UIcon name="i-lucide-shield-alert" class="size-4" />
                  Re-examination required
                </div>
                <dl class="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                  <div>
                    <dt class="text-xs text-muted">
                      Required by
                    </dt>
                    <dd>{{ attempt.invalidation.invalidatedByName || "-" }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs text-muted">
                      Date
                    </dt>
                    <dd>{{ formatEvidenceTime(attempt.invalidation.invalidatedAt) }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs text-muted">
                      Category
                    </dt>
                    <dd>{{ attempt.invalidation.fraudCategory || "Not specified" }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs text-muted">
                      Previous score
                    </dt>
                    <dd>{{ formatScore(attempt.invalidation.previousScore) }}</dd>
                  </div>
                </dl>
                <div>
                  <p class="text-xs text-muted">
                    Reason
                  </p>
                  <p class="whitespace-pre-wrap text-sm">
                    {{ attempt.invalidation.reason || "-" }}
                  </p>
                </div>
              </div>
            </div>
          </li>
        </ol>

        <div v-if="reExaminationHistory.checkerResets?.length" class="rounded-lg border p-4 space-y-3">
          <h3 class="font-semibold text-highlighted">Checker resets</h3>
          <div v-for="reset in reExaminationHistory.checkerResets" :key="reset.id" class="border-t pt-3 text-sm">
            <p class="font-medium">Attempt {{ reset.attemptNumber }} reset by {{ reset.checkerName || reset.checkerNik }}</p>
            <p class="text-xs text-muted">{{ formatEvidenceTime(reset.createdAt) }}</p>
            <p class="mt-1 whitespace-pre-wrap">{{ reset.reason }}</p>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
