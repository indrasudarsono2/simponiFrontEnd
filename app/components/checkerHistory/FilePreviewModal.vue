<script setup lang="ts">
const props = defineProps<{ open: boolean, path: string | null, title: string }>()
const emit = defineEmits<{ close: [] }>()
const apiBaseUrl = useApiBaseUrl()
const isFileModalOpen = computed(() => props.open)
const selectedFilePath = computed(() => props.path)
const selectedFileTitle = computed(() => props.title)
function resolveFileUrl(filePath?: string | null): string | null {
  if (!filePath) return null
  if (/^https?:\/\//i.test(filePath)) return filePath
  return `${apiBaseUrl}${filePath}`
}

function getFileExtension(filePath?: string | null): string {
  if (!filePath) return ''
  const cleanPath = filePath.split('?')[0] ?? ''
  const ext = cleanPath.split('.').pop()
  return (ext || '').toLowerCase()
}

function isImageFile(filePath?: string | null): boolean {
  const ext = getFileExtension(filePath)
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)
}

function isPdfFile(filePath?: string | null): boolean {
  return getFileExtension(filePath) === 'pdf'
}

function closeFileModal() {
  emit('close')
}
</script>

<template>
  <UModal
    :open="isFileModalOpen"
    :title="selectedFileTitle"
    :ui="{ content: 'max-w-4xl w-full h-full' }"
    @update:open="(value) => (!value ? closeFileModal() : null)"
  >
    <template #body>
      <div style="height: 70vh">
        <div
          v-if="isImageFile(selectedFilePath)"
          class="flex h-full items-center justify-center rounded-lg border border-default bg-muted/20 p-2"
        >
          <img
            :src="resolveFileUrl(selectedFilePath) || ''"
            :alt="selectedFileTitle"
            class="h-full w-full rounded object-contain"
          >
        </div>

        <div
          v-else-if="isPdfFile(selectedFilePath)"
          class="h-full rounded-lg border border-default overflow-hidden"
        >
          <iframe
            :src="resolveFileUrl(selectedFilePath) || ''"
            style="height: 100%; width: 100%"
            :title="selectedFileTitle"
          />
        </div>

        <div
          v-else
          class="rounded-lg border border-default bg-muted/20 p-4 text-sm text-muted"
        >
          Preview is not available for this file type.
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <a
          :href="resolveFileUrl(selectedFilePath) || '#'"
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm text-primary hover:underline"
        >
          Open file in new tab
        </a>
        <UButton
          label="Close"
          color="neutral"
          variant="soft"
          @click="closeFileModal"
        />
      </div>
    </template>
  </UModal>
</template>
