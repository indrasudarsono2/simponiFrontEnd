<script setup lang="ts">
interface Props {
  isOpen: boolean;
  data: any;
  loading: boolean;
  error: string | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "close"): void;
}>();

function formatDate(dateString: string): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function close() {
  emit("close");
}
</script>

<template>
  <div
    v-if="isOpen"
    class="bg-white rounded-lg shadow-xl w-full max-h-[90vh] flex flex-col overflow-hidden"
  >
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200">
      <h3 class="text-lg font-semibold">Verification Item Data</h3>
      <UButton
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="close"
      />
    </div>

    <!-- Body -->
    <div class="flex-1 overflow-y-auto p-4">
      <!-- Loading State -->
      <div
        v-if="loading"
        class="flex flex-col items-center justify-center py-8"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="text-4xl text-muted mb-4 animate-spin"
        />
        <p class="text-muted">Loading verification item data...</p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="flex flex-col items-center justify-center py-8"
      >
        <UIcon name="i-lucide-alert-circle" class="text-4xl text-error mb-4" />
        <p class="text-error">{{ error }}</p>
      </div>

      <!-- Data Display -->
      <div v-else-if="data" class="space-y-4">
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-semibold mb-2">API Response Data:</h4>
          <pre class="text-xs bg-gray-100 p-3 rounded overflow-x-auto">{{
            JSON.stringify(data, null, 2)
          }}</pre>
        </div>

        <!-- Display specific fields if they exist -->
        <div v-if="data.id || data.remark" class="space-y-2">
          <div v-if="data.id" class="flex justify-between border-b pb-2">
            <span class="font-medium">ID:</span>
            <span>{{ data.id }}</span>
          </div>
          <div v-if="data.remark" class="flex justify-between border-b pb-2">
            <span class="font-medium">Remark:</span>
            <span>{{ data.remark }}</span>
          </div>
          <div v-if="data.createdAt" class="flex justify-between border-b pb-2">
            <span class="font-medium">Created At:</span>
            <span>{{ formatDate(data.createdAt) }}</span>
          </div>
          <div v-if="data.updatedAt" class="flex justify-between border-b pb-2">
            <span class="font-medium">Updated At:</span>
            <span>{{ formatDate(data.updatedAt) }}</span>
          </div>
        </div>

        <!-- Raw data fallback -->
        <div v-else class="text-muted text-sm">
          <p>Data received but structure is unexpected.</p>
        </div>
      </div>

      <!-- No Data State -->
      <div v-else class="flex flex-col items-center justify-center py-8">
        <UIcon name="i-lucide-inbox" class="text-4xl text-muted mb-4" />
        <p class="text-muted">No verification item data available</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex justify-end gap-2 p-4 border-t border-gray-200">
      <UButton label="Tutup" color="neutral" variant="outline" @click="close" />
    </div>
  </div>
</template>
