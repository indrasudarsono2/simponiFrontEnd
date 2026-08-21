<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

interface MandatoryItem {
  id: number;
  mandatory: string;
}

const props = defineProps<{
  mandatoryItem: MandatoryItem | null;
}>();

const emit = defineEmits<{
  mandatoryDeleted: [];
  close: [];
}>();

const { token } = useAuth();
const toast = useToast();

const open = ref(false);
const loading = ref(false);

watch(
  () => props.mandatoryItem,
  (newValue) => {
    if (newValue) {
      open.value = true;
    }
  },
  { immediate: true },
);

watch(open, (isOpen) => {
  if (!isOpen) {
    emit("close");
  }
});

async function onSubmit() {
  if (!props.mandatoryItem) return;

  loading.value = true;
  try {
    const response = await $fetch<{ message?: string }>(
      `${apiBaseUrl}/api/mandatoryItem/${props.mandatoryItem.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    const message = String(response?.message || "").trim().toLowerCase();
    if (message && message !== "success") {
      toast.add({
        title: "Error",
        description: response?.message || "Failed to delete mandatory item.",
        color: "error",
      });
      return;
    }

    toast.add({
      title: "Success",
      description: "Mandatory item deleted successfully.",
      color: "success",
    });

    open.value = false;
    emit("mandatoryDeleted");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message || "Failed to delete mandatory item.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Delete Mandatory Item">
    <template #description>
      <p>
        Are you sure you want to delete
        <strong>"{{ mandatoryItem?.mandatory || "-" }}"</strong>?
        This action cannot be undone.
      </p>
    </template>

    <template #body>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="soft"
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
