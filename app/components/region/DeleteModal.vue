<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
const { token } = useAuth();

interface Region {
  id: number;
  region: string;
}

const props = defineProps<{
  region: Region | null;
}>();

const open = ref(false);
const loading = ref(false);

// Watch for region prop changes to open modal
watch(
  () => props.region,
  (newRegion) => {
    if (newRegion) {
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
  if (!props.region) return;

  loading.value = true;

  try {
    // Call API to delete region
    await $fetch(`${apiBaseUrl}/api/regions/${props.region.id}`, {
      method: "DELETE",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Region "${props.region.region}" has been deleted successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("regionDeleted");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to delete region. Please try again.";
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
  regionDeleted: [];
  close: [];
}>();
</script>

<template>
  <UModal v-model:open="open" title="Delete Region">
    <template #description>
      <p>
        Are you sure you want to delete <strong>"{{ region?.region }}"</strong>?
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
