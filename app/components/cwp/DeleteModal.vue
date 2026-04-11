<script setup lang="ts">
interface Cwp {
  id: number;
  name: string;
  ratingId: number;
  ratingName: string;
  sectorId: number;
  sectorName: string;
  branchId: number;
  branchName: string;
  branchUnitId: number;
  branchUnitName: string;
}

const props = defineProps<{
  cwp: Cwp | null;
}>();

const open = ref(false);
const loading = ref(false);

// Watch for cwp prop changes to open modal
watch(
  () => props.cwp,
  (newCwp) => {
    if (newCwp) {
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
  if (!props.cwp) return;

  loading.value = true;

  try {
    // Call API to delete CWP
    await $fetch(`/api/cwps/${props.cwp.id}`, {
      method: "DELETE",
    });

    toast.add({
      title: "Success",
      description: `CWP "${props.cwp.name}" has been deleted successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("cwpDeleted");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to delete CWP. Please try again.";
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
  cwpDeleted: [];
  close: [];
}>();
</script>

<template>
  <UModal v-model:open="open" title="Delete CWP">
    <template #description>
      <p>
        Are you sure you want to delete <strong>"{{ cwp?.name }}"</strong> ({{
          cwp?.ratingName
        }}) in sector <strong>"{{ cwp?.sectorName }}"</strong>? This action
        cannot be undone.
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
