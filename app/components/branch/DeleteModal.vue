<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
const { token } = useAuth();

interface Branch {
  id: number;
  branch: string;
  regionId: number;
  region?: {
    id: number;
    region: string;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
  };
}

const props = defineProps<{
  branch: Branch | null;
}>();

const emit = defineEmits<{
  branchDeleted: [];
  close: [];
}>();

const open = ref(false);
const loading = ref(false);

// Watch for branch prop changes to open modal
watch(
  () => props.branch,
  (newBranch) => {
    if (newBranch) {
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
  if (!props.branch) return;

  loading.value = true;

  try {
    // Call API to delete branch
    await $fetch(`${apiBaseUrl}/api/branches/${props.branch.id}`, {
      method: "DELETE",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Branch "${props.branch.branch}" has been deleted successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("branchDeleted");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to delete branch. Please try again.";
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
  <UModal v-model:open="open" title="Delete Branch">
    <template #description>
      <p>
        Are you sure you want to delete <strong>"{{ branch?.branch }}"</strong>?
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
