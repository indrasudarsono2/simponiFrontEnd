<script setup lang="ts">
const training = useTrainingMode()

async function exitTraining() {
  training.stop()
  await navigateTo('/operationalGuide')
}
</script>

<template>
  <div v-if="training.active.value" class="fixed right-4 top-4 z-[100] flex items-center gap-3 rounded-xl border border-amber-500 bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-950 shadow-lg dark:bg-amber-900 dark:text-amber-50" role="status">
    <span>TRAINING MODE · Practice data only</span>
    <UButton
      label="Exit Training"
      color="warning"
      variant="solid"
      size="xs"
      @click="exitTraining"
    />
  </div>
</template>
