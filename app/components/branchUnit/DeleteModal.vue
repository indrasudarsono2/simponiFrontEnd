<script setup lang="ts">
import ip from "../../utils/config.json";
const { token } = useAuth();

interface BranchUnit {
  id: number;
  branchId: string;
  unit: string;
  branch: {
    id: number;
    branch: string;
  };
  createdAt?: string;
}

const props = defineProps<{
  branchUnit: BranchUnit | null;
}>();

const open = ref(false);
const loading = ref(false);

// Watch for branchUnit prop changes to open modal
watch(
  () => props.branchUnit,
  (newBranchUnit) => {
    if (newBranchUnit) {
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
  if (!props.branchUnit) return;

  loading.value = true;

  try {
    // Call API to delete branch unit
    await $fetch(
      `http://${ip.ipBackEnd}/api/branchUnits/${props.branchUnit.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    toast.add({
      title: "Success",
      description: `Branch unit "${props.branchUnit.unit}" has been deleted successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("branchUnitDeleted");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to delete branch unit. Please try again.";
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
  branchUnitDeleted: [];
  close: [];
}>();
</script>

<template>
  <UModal v-model:open="open" title="Delete Branch Unit">
    <template #description>
      <p>
        Are you sure you want to delete
        <strong>"{{ branchUnit?.unit }}"</strong>? This action cannot be undone.
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
