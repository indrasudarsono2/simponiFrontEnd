<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl();
const { apiFetch } = useApiFetch();
defineOptions({
  name: "IELPUserDeleteModal",
});

interface IELPUser {
  id: string;
  isConfirm: boolean;
  released: string;
  expired: string;
  rater: string;
  institution: string;
  level: string;
}

const props = defineProps<{
  ielpUser: IELPUser | null;
}>();

const emit = defineEmits<{
  ielpUserDeleted: [];
  close: [];
}>();

const open = ref(false);
const loading = ref(false);

// Watch for ielpUser prop changes to open modal
watch(
  () => props.ielpUser,
  (newIELPUser) => {
    if (newIELPUser) {
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
  if (!props.ielpUser) return;

  loading.value = true;

  try {
    // Call API to delete IELPUser
    await apiFetch(`${apiBaseUrl}/api/ielpUser/${props.ielpUser.id}`, {
      method: "DELETE",
    });

    toast.add({
      title: "Success",
      description: `IELP record has been deleted successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("ielpUserDeleted");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to delete IELP record. Please try again.";
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
  <UModal v-model:open="open" title="Delete IELP">
    <template #description>
      <p>
        Are you sure you want to delete IELP record from
        <strong>"{{ ielpUser?.institution }}"</strong> (Level
        {{ ielpUser?.level }})? This action cannot be undone.
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
