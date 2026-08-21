<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

// Ensure this page uses the default layout with proper sidebar
definePageMeta({
  layout: "default",
});

const route = useRoute();
const router = useRouter();

// Custom back function that ensures data refresh
async function goBack() {
  // Navigate back - the previous page's onActivated will handle refresh
  await router.back();
}

const fileUrl = computed(() => {
  const url = route.query.url as string;
  if (!url) return null;

  // If URL is relative, prepend backend IP
  if (url.startsWith("/")) {
    return `${apiBaseUrl}${url}`;
  }
  return url;
});

const fileName = computed(() => {
  if (!fileUrl.value) return "Unknown File";
  const url = new URL(fileUrl.value);
  const pathname = url.pathname;
  return pathname.split("/").pop() || "File";
});

const fileType = computed(() => {
  if (!fileUrl.value) return "unknown";
  const name = fileName.value.toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".doc") || name.endsWith(".docx")) return "doc";
  if (name.endsWith(".ppt") || name.endsWith(".pptx")) return "ppt";
  if (name.endsWith(".xls") || name.endsWith(".xlsx")) return "xls";
  if (
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".gif")
  )
    return "image";
  return "unknown";
});

const isPdf = computed(() => fileType.value === "pdf");
const isImage = computed(() => fileType.value === "image");
const isOffice = computed(() => ["doc", "ppt", "xls"].includes(fileType.value));

function downloadFile() {
  if (!fileUrl.value) return;
  const link = document.createElement("a");
  link.href = fileUrl.value;
  link.download = fileName.value;
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
</script>

<template>
  <UDashboardPanel id="file-viewer">
    <template #header>
      <UDashboardNavbar :title="`View: ${fileName}`">
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            @click="goBack"
          />
        </template>
        <template #right>
          <UButton
            icon="i-lucide-download"
            label="Download"
            color="primary"
            @click="downloadFile"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div
        v-if="!fileUrl"
        class="flex flex-col items-center justify-center h-96"
      >
        <UIcon name="i-lucide-file-x" class="text-6xl text-muted mb-4" />
        <p class="text-muted">No file URL provided</p>
      </div>

      <div v-else class="h-full flex flex-col">
        <!-- PDF Viewer -->
        <div v-if="isPdf" class="flex-1 min-h-[600px]">
          <iframe
            :src="fileUrl"
            class="w-full h-full min-h-[600px] border rounded-lg"
            type="application/pdf"
          />
        </div>

        <!-- Image Viewer -->
        <div
          v-else-if="isImage"
          class="flex-1 flex items-center justify-center p-4"
        >
          <img
            :src="fileUrl"
            :alt="fileName"
            class="max-w-full max-h-[600px] object-contain rounded-lg shadow-lg"
          />
        </div>

        <!-- Office Documents & Others -->
        <div v-else class="flex flex-col items-center justify-center h-96">
          <UIcon
            :name="isOffice ? 'i-lucide-file-text' : 'i-lucide-file'"
            class="text-6xl text-muted mb-4"
          />
          <p class="text-lg font-medium mb-2">{{ fileName }}</p>
          <p class="text-muted mb-4">
            This file type cannot be previewed directly
          </p>
          <UButton
            icon="i-lucide-external-link"
            label="Open in New Tab"
            color="primary"
            variant="outline"
            :to="fileUrl"
            target="_blank"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
