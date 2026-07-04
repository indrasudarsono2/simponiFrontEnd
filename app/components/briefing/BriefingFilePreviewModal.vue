<script setup lang="ts">
import ip from "../../utils/config.json";

const props = defineProps<{
  fileName: string;
  fileUrl: string;
  open: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const openState = computed({
  get: () => props.open,
  set: (value: boolean) => emit("update:open", value),
});

const selectedFileType = computed(() => {
  const fileName = props.fileName.toLowerCase();
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(fileName)) return "image";
  if (/\.pdf$/.test(fileName)) return "pdf";
  return "other";
});

const selectedFileFullUrl = computed(() =>
  props.fileUrl ? `http://${ip.ipBackEnd}${props.fileUrl}` : "",
);
</script>

<template>
  <UModal
    v-model:open="openState"
    :title="fileName || 'File Preview'"
    description="Preview the uploaded briefing file."
    :ui="{ content: 'max-w-5xl' }"
  >
    <template #body>
      <div class="space-y-4">
        <div
          v-if="selectedFileType === 'image'"
          class="flex justify-center rounded-lg border border-default bg-elevated/30 p-4"
        >
          <img
            :src="selectedFileFullUrl"
            :alt="fileName"
            class="max-h-[70vh] w-auto rounded object-contain"
          />
        </div>

        <div
          v-else-if="selectedFileType === 'pdf'"
          class="overflow-hidden rounded-lg border border-default"
        >
          <iframe
            :src="selectedFileFullUrl"
            class="h-[70vh] w-full"
            title="Briefing file preview"
          />
        </div>

        <div
          v-else
          class="rounded-lg border border-default bg-elevated/30 p-6 text-sm text-muted"
        >
          This file type cannot be previewed inline.
        </div>

        <div class="flex justify-end">
          <UButton
            label="Open File"
            icon="i-lucide-external-link"
            color="primary"
            variant="soft"
            :to="selectedFileFullUrl"
            target="_blank"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
