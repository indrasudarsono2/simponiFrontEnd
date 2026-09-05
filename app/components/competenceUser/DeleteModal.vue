<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
const { token } = useAuth();
const { apiFetch } = useApiFetch();
defineOptions({
  name: "CompetenceUserDeleteModal",
});

interface CompetenceUser {
  id: number;
  userId: string;
  ratingId: number;
  institution: string;
  released: string;
  file: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  rating: {
    id: number;
    professionId: number;
    rating: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  };
}

const props = defineProps<{
  competenceUser: CompetenceUser | null;
}>();

const open = ref(false);
const loading = ref(false);

// Watch for competenceUser prop changes to open modal
watch(
  () => props.competenceUser,
  (newCompetenceUser) => {
    if (newCompetenceUser) {
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

const emit = defineEmits<{
  competenceUserDeleted: [];
  close: [];
}>();

const toast = useToast();

async function onSubmit() {
  if (!props.competenceUser) return;

  loading.value = true;

  try {
    await apiFetch(
      `${apiBaseUrl}/api/competenceUser/${props.competenceUser.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    toast.add({
      title: "Success",
      description: `Competence record has been deleted successfully`,
      color: "success",
    });

    open.value = false;

    emit("competenceUserDeleted");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to delete competence record. Please try again.";
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
  <UModal v-model:open="open" title="Delete Competence">
    <template #description>
      <p>
        Are you sure you want to delete the competence record for
        <strong>"{{ competenceUser?.rating?.rating }}"</strong>? This action
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
