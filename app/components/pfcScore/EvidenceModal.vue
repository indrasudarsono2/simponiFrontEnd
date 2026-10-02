<script setup lang="ts">
import type { EvidenceItem } from '~/types/pfcScoreRecap'

const isEvidenceModalOpen = defineModel<boolean>('open', { required: true })
defineProps<{
  evidenceLoadingId: number | null
  evidenceItems: EvidenceItem[]
  resolveEvidenceUrl: (path?: string | null) => string
  formatEvidenceTime: (value?: string | null) => string
}>()
</script>

<template>
  <UModal v-model:open="isEvidenceModalOpen" title="Evidence" :ui="{ content: 'max-w-4xl w-full' }">
    <template #body>
      <div v-if="evidenceLoadingId" class="flex items-center justify-center gap-2 py-10 text-muted">
        <UIcon name="i-lucide-loader-2" class="size-5 animate-spin" />
        Loading evidence...
      </div>
      <div v-else-if="evidenceItems.length" class="grid grid-cols-1 gap-3 md:grid-cols-2 max-h-[65vh] overflow-auto">
        <a
          v-for="item in evidenceItems"
          :key="item.id"
          :href="resolveEvidenceUrl(item.file)"
          target="_blank"
          rel="noopener noreferrer"
          class="block rounded-lg border border-default bg-muted/20 p-2"
        >
          <img :src="resolveEvidenceUrl(item.file)" :alt="`Evidence ${item.id}`" class="h-56 w-full rounded-md object-cover">
          <p class="mt-2 text-xs text-muted">Time: {{ formatEvidenceTime(item.createdAt) }}</p>
        </a>
      </div>
      <p v-else class="text-sm text-muted">
        No evidence data.
      </p>
    </template>
  </UModal>
</template>
