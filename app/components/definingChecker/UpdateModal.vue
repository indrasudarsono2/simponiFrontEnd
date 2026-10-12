<script setup lang="ts">
const props = defineProps<{ events: any[]; definingChecker: any }>()
const emit = defineEmits<{ definingCheckerUpdated: []; close: [] }>()
const open = ref(false)
watch(() => props.definingChecker, value => { open.value = Boolean(value) }, { immediate: true })
watch(open, value => { if (!value) emit('close') })
</script>
<template>
  <UModal v-model:open="open" title="Update Group" description="Review rating coverage and responsible checkers" :ui="{ content: 'w-[min(96vw,72rem)] max-w-5xl max-h-[94vh]', body: 'overflow-y-auto' }">
    <template #body><DefiningCheckerGroupForm v-if="open" :events="events" :initial="definingChecker" @saved="open = false; emit('definingCheckerUpdated')" @cancel="open = false" /></template>
  </UModal>
</template>
