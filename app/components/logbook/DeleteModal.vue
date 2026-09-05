<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
const { token } = useAuth();
const { apiFetch } = useApiFetch();

interface Logbook {
  id: number;
  userNik: string;
  note: string;
  file: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

const props = defineProps<{
  logbook: Logbook | null;
}>();

const open = ref(false);
const loading = ref(false);

// Watch for logbook prop changes to open modal
watch(
  () => props.logbook,
  (newLogbook) => {
    if (newLogbook) {
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

async function onSubmit() {
  if (!props.logbook) return;

  loading.value = true;

  try {
    // Call API to delete logbook
    await apiFetch(`${apiBaseUrl}/api/logbookUser/${props.logbook.id}`, {
      method: "DELETE",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Logbook "${props.logbook.note}" has been deleted successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("logbookDeleted");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to delete logbook. Please try again.";
    toast.add({
      title: "Error",
      description: errorMessage,
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

const emit = defineEmits<{
  logbookDeleted: [];
  close: [];
}>();
</script>

<template>
  <UModal v-model:open="open" title="Delete Logbook">
    <template #description>
      <p>
        Are you sure you want to delete <strong>"{{ logbook?.note }}"</strong>?
        This action cannot be undone.
      </p>
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
