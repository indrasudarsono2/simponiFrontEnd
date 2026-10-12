<script setup lang="ts">
defineProps<{ events: any[] }>()
const emit = defineEmits<{ definingCheckerAdded: [] }>()
const open = ref(false)
</script>
<template>
  <UModal v-model:open="open" title="Add New Group" description="Assign PIC and qualified checkers by rating" :ui="{ content: 'w-[min(96vw,72rem)] max-w-5xl max-h-[94vh]', body: 'overflow-y-auto' }">
    <UButton label="Add Group" icon="i-lucide-plus" />
    <template #body><DefiningCheckerGroupForm v-if="open" :events="events" @saved="open = false; emit('definingCheckerAdded')" @cancel="open = false" /></template>
  </UModal>
</template>
