<script setup lang="ts">
import ip from "../../utils/config.json";
const { token } = useAuth();
interface License {
  id: number;
  userNik: string;
  note: string;
  file: string | null;
  expiredDate: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

const props = defineProps<{
  license: License | null;
}>();

const open = ref(false);
const loading = ref(false);

// Watch for license prop changes to open modal
watch(
  () => props.license,
  (newLicense) => {
    if (newLicense) {
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
  if (!props.license) return;

  loading.value = true;

  try {
    // Call API to delete license
    await $fetch(`http://${ip.ipBackEnd}/api/licenseUser/${props.license.id}`, {
      method: "DELETE",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `License "${props.license.note}" has been deleted successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("licenseDeleted");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to delete license. Please try again.";
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
  licenseDeleted: [];
  close: [];
}>();
</script>

<template>
  <UModal v-model:open="open" title="Delete License">
    <template #description>
      <p>
        Are you sure you want to delete <strong>"{{ license?.note }}"</strong>?
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
