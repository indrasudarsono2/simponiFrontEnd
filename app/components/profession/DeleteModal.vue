<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
const { token } = useAuth();

interface Profession {
  id: number;
  profession: string;
}

const props = defineProps<{
  profession: Profession | null;
}>();

const open = ref(false);
const loading = ref(false);

// Watch for profession prop changes to open modal
watch(
  () => props.profession,
  (newProfession) => {
    if (newProfession) {
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
  if (!props.profession) return;

  loading.value = true;

  try {
    // Call API to delete profession
    await $fetch(
      `${apiBaseUrl}/api/professions/${props.profession.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    toast.add({
      title: "Success",
      description: `Profession "${props.profession.profession}" has been deleted successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("professionDeleted");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to delete profession. Please try again.";
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
  professionDeleted: [];
  close: [];
}>();
</script>

<template>
  <UModal v-model:open="open" title="Delete Profession">
    <template #description>
      <p>
        Are you sure you want to delete
        <strong>"{{ profession?.profession }}"</strong>? This action cannot be
        undone.
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
