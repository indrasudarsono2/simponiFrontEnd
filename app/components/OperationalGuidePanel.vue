<script setup lang="ts">
const guide = useOperationalGuide();
</script>

<template>
  <div v-if="guide.active.value" class="fixed bottom-4 right-4 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-primary/30 bg-background p-4 shadow-xl">
    <div class="flex items-start justify-between gap-2"><div><p class="text-xs font-semibold uppercase text-primary">Examination Guide</p><p class="mt-1 font-semibold">{{ guide.nextStep.value.label }}</p></div><UButton icon="i-lucide-x" aria-label="Close guide" color="neutral" variant="ghost" size="xs" @click="guide.stop" /></div>
    <p class="mt-2 text-sm text-muted">{{ guide.nextStep.value.description }}</p>
    <p v-if="guide.error.value" class="mt-2 text-xs text-error">{{ guide.error.value }}</p>
    <div class="mt-3 flex flex-wrap gap-2"><UButton label="Go to step" :to="guide.nextStep.value.to" size="sm" /><UButton label="Check progress" icon="i-lucide-refresh-cw" size="sm" color="neutral" variant="outline" :loading="guide.loading.value" @click="guide.refresh" /><UButton label="All steps" to="/operationalGuide" size="sm" color="neutral" variant="ghost" /></div>
  </div>
</template>
