<script setup lang="ts">
import ip from "../../utils/config.json";
const { token } = useAuth();

interface Sector {
  id: number;
  sector: string;
  branchUnitId: number;
  branchUnit: {
    id: number;
    unit: string;
    branchId: string;
    branch: {
      id: number;
      branch: string;
    };
  };
  createdAt?: string;
}

const props = defineProps<{
  sector: Sector | null;
}>();

const open = ref(false);
const loading = ref(false);

// Watch for sector prop changes to open modal
watch(
  () => props.sector,
  (newSector) => {
    if (newSector) {
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
  if (!props.sector) return;

  loading.value = true;

  try {
    // Call API to delete sector
    await $fetch(`http://${ip.ipBackEnd}/api/sectors/${props.sector.id}`, {
      method: "DELETE",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Sector "${props.sector.sector}" has been deleted successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("sectorDeleted");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to delete sector. Please try again.";
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
  sectorDeleted: [];
  close: [];
}>();
</script>

<template>
  <UModal v-model:open="open" title="Delete Sector">
    <template #description>
      <p>
        Are you sure you want to delete <strong>"{{ sector?.sector }}"</strong>?
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
