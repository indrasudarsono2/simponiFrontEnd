<script setup lang="ts">
import ip from "../../utils/config.json";
const { token } = useAuth();
defineOptions({
  name: "MedexUserDeleteModal",
});

interface MedexUser {
  id: string;
  isConfirm: boolean;
  released: string;
  expired: string;
  examiner: string;
  institution: string;
}

const props = defineProps<{
  medexUser: MedexUser | null;
}>();

const emit = defineEmits<{
  medexUserDeleted: [];
  close: [];
}>();

const open = ref(false);
const loading = ref(false);

// Watch for medexUser prop changes to open modal
watch(
  () => props.medexUser,
  (newMedexUser) => {
    if (newMedexUser) {
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
  if (!props.medexUser) return;

  loading.value = true;

  try {
    // Call API to delete MedexUser
    await $fetch(`http://${ip.ipBackEnd}/api/medexUser/${props.medexUser.id}`, {
      method: "DELETE",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Medex record has been deleted successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("medexUserDeleted");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to delete Medex record. Please try again.";
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
  <UModal v-model:open="open" title="Delete Medex">
    <template #description>
      <p>
        Are you sure you want to delete Medex record from
        <strong>"{{ medexUser?.institution }}"</strong> (Examiner:
        {{ medexUser?.examiner }})? This action cannot be undone.
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
