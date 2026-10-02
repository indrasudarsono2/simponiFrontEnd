<script setup lang="ts">
import type { ScoreCheckerEvidenceItem } from '~/types/checkerScoreRecap'

const isEvidenceModalOpen = defineModel<boolean>('open', { required: true })
defineProps<{
  isEvidenceFetching: boolean
  evidenceImageItems: ScoreCheckerEvidenceItem[]
  canInvalidateAttempt: boolean
  resolveEvidenceUrl: (path?: string | null) => string
  formatEvidenceTime: (value?: string | null) => string
}>()
const emit = defineEmits<{ 'require-reexamination': [] }>()
</script>

<template>
  <UModal
    v-model:open="isEvidenceModalOpen"
    title="Evidance"
    :ui="{ content: 'max-w-4xl w-full' }"
  >
    <template #body>
      <div class="space-y-3">
        <div
          v-if="isEvidenceFetching"
          class="flex items-center justify-center gap-2 py-10 text-muted"
        >
          <UIcon name="i-lucide-loader-2" class="size-5 animate-spin" />
          Loading evidence...
        </div>
        <div
          v-else-if="evidenceImageItems.length > 0"
          class="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[65vh] overflow-auto pr-1"
        >
          <a
            v-for="item in evidenceImageItems"
            :key="item.id"
            :href="resolveEvidenceUrl(item.file)"
            target="_blank"
            rel="noopener noreferrer"
            class="block rounded-lg border border-default bg-muted/20 p-2"
          >
            <img
              :src="resolveEvidenceUrl(item.file)"
              :alt="`Evidence ${item.id || ''}`"
              class="w-full h-56 object-cover rounded-md"
            >
            <p class="mt-2 text-xs text-muted">
              Time: {{ formatEvidenceTime(item.createdAt) }}
            </p>
          </a>
        </div>
        <p v-else class="text-sm text-muted">
          No evidence data.
        </p>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end">
        <UButton
          v-if="canInvalidateAttempt && evidenceImageItems.length > 0"
          label="Require Re-examination"
          icon="i-lucide-shield-alert"
          color="error"
          variant="soft"
          @click="emit('require-reexamination')"
        />
      </div>
    </template>
  </UModal>
</template>
