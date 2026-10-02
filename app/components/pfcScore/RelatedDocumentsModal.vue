<script setup lang="ts">
import ApplicationDocModal from '~/components/verification/ApplicationDocModal.vue'
import type { RelatedDocuments } from '~/types/pfcScoreRecap'

const props = defineProps<{ open: boolean, documents: RelatedDocuments | null }>()
const emit = defineEmits<{ close: [] }>()
const isRelatedDocumentsModalOpen = computed(() => props.open)
const selectedRelatedDocuments = computed(() => props.documents)
</script>

<template>
  <div
    v-if="isRelatedDocumentsModalOpen && selectedRelatedDocuments"
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
  >
    <div
      class="absolute inset-0 bg-black/50 backdrop-blur-sm"
      @click="emit('close')"
    />
    <div class="relative w-full max-w-[95vw] h-full max-h-[90vh]">
      <ApplicationDocModal
        :is-open="true"
        :application-doc="selectedRelatedDocuments.applicationDocument"
        :user-data="selectedRelatedDocuments.userData"
        @close="emit('close')"
      />
    </div>
  </div>
</template>
