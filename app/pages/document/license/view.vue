<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

const route = useRoute();

// Get file path from query parameter
const filePath = computed(() => {
  return (route.query.file as string) || "";
});

// Construct full file URL
const fileUrl = computed(() => {
  if (!filePath.value) return "";
  return `${apiBaseUrl}${filePath.value}`;
});

// Get filename from path
const filename = computed(() => {
  if (!filePath.value) return "";
  return filePath.value.split("/").pop() || filePath.value;
});
</script>

<template>
  <div class="min-h-screen bg-background p-4">
    <!-- Header with back button -->
    <div class="flex items-center gap-4 mb-4">
      <UButton
        icon="i-lucide-arrow-left"
        variant="ghost"
        @click="navigateTo('/document/license')"
      >
        Back to License List
      </UButton>
    </div>

    <!-- File Viewer -->
    <div class="bg-card rounded-lg border border-border overflow-hidden">
      <div class="p-4 border-b border-border">
        <h1 class="text-xl font-semibold">License File Viewer</h1>
        <p class="text-muted mt-1">{{ filename }}</p>
      </div>

      <div class="h-[calc(100vh-200px)]">
        <iframe
          v-if="fileUrl"
          :src="fileUrl"
          class="w-full h-full"
          :title="filename"
        />

        <!-- No file selected state -->
        <div
          v-else
          class="flex flex-col items-center justify-center h-full text-center p-8"
        >
          <UIcon name="i-lucide-file-text" class="text-6xl text-muted mb-4" />
          <p class="text-muted">No file selected</p>
          <UButton class="mt-4" @click="navigateTo('/document/license')">
            Go to License List
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
