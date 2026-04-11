<script setup lang="ts">
import ip from "../../utils/config.json";
const { token } = useAuth();
interface Essay {
  id: number;
  question: string;
  answer: string;
  image: string;
  value: number;
}

const props = defineProps<{
  essay: Essay | null;
}>();

const emit = defineEmits<{
  essayDeleted: [];
  close: [];
}>();

const open = ref(false);
const loading = ref(false);

// Watch for essay prop changes to open modal
watch(
  () => props.essay,
  (newEssay) => {
    if (newEssay) {
      open.value = true;
    }
  },
  { immediate: true },
);

// Reset when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    emit("close");
  }
});

const toast = useToast();

// Truncate long HTML for display (preserves HTML tags)
function truncateHtml(html: string, maxLength: number = 150) {
  if (html.length <= maxLength) return html;
  return html.substring(0, maxLength) + "...";
}

async function onSubmit() {
  if (!props.essay) return;

  loading.value = true;

  try {
    // Call API to delete essay
    await $fetch(`http://${ip.ipBackEnd}/api/essays/${props.essay.id}`, {
      method: "DELETE",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: "Essay question has been deleted successfully",
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("essayDeleted");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to delete essay question. Please try again.";
    toast.add({
      title: "Error",
      description: errorMessage,
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Delete Essay Question">
    <template #description>
      <div class="space-y-2">
        <p>Are you sure you want to delete this essay question?</p>
        <div
          class="p-3 bg-elevated/50 rounded-lg border border-default text-sm space-y-2"
        >
          <div>
            <span class="text-muted">Question:</span>
            <div
              class="font-medium mt-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
              v-html="truncateHtml(essay?.question || '')"
            />
          </div>
          <div>
            <span class="text-muted">Answer:</span>
            <div
              class="font-medium mt-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
              v-html="truncateHtml(essay?.answer || '', 100)"
            />
          </div>

          <div class="flex items-center gap-2">
            <span class="text-muted">Image:</span>
            <span class="font-medium">{{ essay?.image || "No image" }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-muted">Score:</span>
            <span class="font-medium text-primary">{{ essay?.value }}</span>
          </div>
        </div>
        <p class="text-sm text-muted">This action cannot be undone.</p>
      </div>
    </template>
    <template #body>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="subtle"
          :disabled="loading"
          @click="open = false"
        />
        <UButton
          label="Delete"
          color="error"
          variant="solid"
          :loading="loading"
          @click="onSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
