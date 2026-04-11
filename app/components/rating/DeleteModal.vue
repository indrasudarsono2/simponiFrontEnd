<script setup lang="ts">
import ip from "../../utils/config.json";
const { token } = useAuth();

interface Rating {
  id: number;
  rating: string;
  description: string;
  professionId: number;
  profession?: {
    id: number;
    profession: string;
    description: string;
    createdAt: string;
    updatedAt: string;
  };
}

const props = defineProps<{
  rating: Rating | null;
}>();

const open = ref(false);
const loading = ref(false);

// Watch for rating prop changes to open modal
watch(
  () => props.rating,
  (newRating) => {
    if (newRating) {
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
  if (!props.rating) return;

  loading.value = true;

  try {
    // Call API to delete rating
    await $fetch(`http://${ip.ipBackEnd}/api/ratings/${props.rating.id}`, {
      method: "DELETE",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Rating "${props.rating.rating}" has been deleted successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("ratingDeleted");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to delete rating. Please try again.";
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
  ratingDeleted: [];
  close: [];
}>();
</script>

<template>
  <UModal v-model:open="open" title="Delete Rating">
    <template #description>
      <p>
        Are you sure you want to delete <strong>"{{ rating?.rating }}"</strong>?
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
