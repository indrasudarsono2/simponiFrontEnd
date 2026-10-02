<script setup lang="ts">
import type { CheckerTheoryReview } from '~/types/checkerScoreRecap'

const isOpen = defineModel<boolean>('open', { required: true })
defineProps<{
  review: CheckerTheoryReview | null
  loading: boolean
}>()
const showScore = (value: number | null) => value == null ? 'Not scored' : Number(value).toFixed(2)
</script>

<template>
  <UModal v-model:open="isOpen" title="Theory Examination Review" :ui="{ content: 'max-w-5xl w-full' }">
    <template #body>
      <div v-if="loading" class="flex items-center gap-2 py-8 text-muted">
        <UIcon name="i-lucide-loader-2" class="size-5 animate-spin" /> Loading examination review...
      </div>
      <div v-else-if="review" class="max-h-[75vh] space-y-6 overflow-y-auto pr-1">
        <div class="rounded-lg border border-default bg-muted/10 p-3 text-sm">
          <p class="font-semibold">{{ review.name }} · {{ review.rating }}</p>
          <p class="text-muted">{{ review.applicationNumber }} · {{ review.event }} · Theory result #{{ review.finalScoreId }}</p>
          <p class="mt-1 text-xs text-muted">Answer keys and model answers are not included in this review.</p>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-lg border border-default p-3"><p class="text-xs text-muted">Final theory score</p><p class="text-xl font-semibold">{{ showScore(review.finalScore) }}</p></div>
          <div class="rounded-lg border border-default p-3"><p class="text-xs text-muted">Multiple Choice score</p><p class="text-xl font-semibold">{{ showScore(review.multipleChoiceScore) }}</p></div>
          <div class="rounded-lg border border-default p-3"><p class="text-xs text-muted">Essay score</p><p class="text-xl font-semibold">{{ showScore(review.essayScore) }}</p></div>
        </div>

        <section class="space-y-3">
          <h3 class="font-semibold">Multiple Choice · {{ review.multipleChoice.length }} questions</h3>
          <p v-if="!review.multipleChoice.length" class="text-sm text-muted">No Multiple Choice questions were recorded.</p>
          <div v-for="(item, index) in review.multipleChoice" :key="`mc-${item.id}-${index}`" class="space-y-3 rounded-lg border border-default p-4">
            <div class="flex gap-2 font-medium"><span>{{ index + 1 }}.</span><div class="rich-review" v-html="item.question" /></div>
            <img v-if="item.image" :src="item.image" alt="Question illustration" class="max-h-64 object-contain">
            <div class="grid gap-2 sm:grid-cols-2">
              <div v-for="option in item.options" :key="option.label" class="flex gap-2 rounded border p-2 text-sm" :class="option.selected ? 'border-gray-400 bg-gray-100 text-gray-900 font-semibold dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100' : 'border-default'">
                <span>{{ option.label }}.</span><div class="rich-review" v-html="option.text" />
                <span v-if="option.selected" class="ml-auto text-xs text-gray-600 dark:text-gray-300">User answer</span>
              </div>
            </div>
            <p v-if="!item.answered" class="text-xs text-warning">Not answered</p>
            <p v-if="!item.optionOrderRecorded" class="text-xs text-muted">Original on-screen option order was not recorded for this attempt; options are shown in stored order.</p>
          </div>
        </section>

        <section class="space-y-3">
          <h3 class="font-semibold">Essay · {{ review.essay.length }} questions</h3>
          <p v-if="!review.essay.length" class="text-sm text-muted">No Essay questions were recorded.</p>
          <div v-for="(item, index) in review.essay" :key="`essay-${item.id}-${index}`" class="space-y-3 rounded-lg border border-default p-4">
            <div class="flex items-start justify-between gap-3"><div class="flex gap-2 font-medium"><span>{{ index + 1 }}.</span><div class="rich-review" v-html="item.question" /></div><UBadge :label="item.score == null ? 'Not scored' : `Score: ${item.score}`" color="neutral" variant="soft" /></div>
            <p class="text-xs text-muted">Scored by: {{ item.checkerName || 'Not scored yet' }}</p>
            <img v-if="item.image" :src="item.image" alt="Question illustration" class="max-h-64 object-contain">
            <div class="rounded-lg bg-muted/20 p-3 text-sm"><p class="mb-1 font-medium">User answer</p><div v-if="item.answer" class="rich-review" v-html="item.answer" /><p v-else class="text-muted">Not answered</p></div>
          </div>
        </section>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.rich-review :deep(p) { margin: 0 0 .4rem; }
.rich-review :deep(p:last-child) { margin-bottom: 0; }
.rich-review :deep(ul) { list-style: disc; padding-left: 1.25rem; }
.rich-review :deep(ol) { list-style: decimal; padding-left: 1.25rem; }
</style>
