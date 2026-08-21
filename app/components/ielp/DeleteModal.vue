<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
const { token } = useAuth();
defineOptions({
  name: "IELPDeleteModal",
});

interface IELPUser {
  id: string;
  isConfirm: boolean;
  released: string;
  expired: string;
  rater: string;
  institution: string;
  level: string;
  file?: string;
}

const props = defineProps<{
  ielpUser: IELPUser | null;
}>();

const emit = defineEmits<{
  ielpDeleted: [];
  close: [];
}>();

const open = ref(false);
const loading = ref(false);

// Watch for ielpUser prop changes to open modal
watch(
  () => props.ielpUser,
  (newIELP) => {
    if (newIELP) {
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
    // Call API to delete IELP
    await $fetch(`${apiBaseUrl}/api/ielpUser/${props.ielpUser.id}`, {
      method: "DELETE",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `IELP record has been deleted successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("ielpDeleted");
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
