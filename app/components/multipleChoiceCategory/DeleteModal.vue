<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
const { token } = useAuth();
interface QuestionGroup {
  id: number;
  kindOfQuestionId: number;
  subBranchUnitRatingId: number;
  group: string;
  quantity: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: null | string;
  subBranchUnitRating: {
    id: number;
    rating: {
      id: number;
      professionId: number;
      rating: string;
      description: string;
      createdAt: string;
      updatedAt: string;
      deletedAt: null | string;
    };
    sector: {
      id: number;
      sector: string;
    };
  };
}

const props = defineProps<{
  questionGroup: QuestionGroup | null;
}>();

// Computed properties to extract display values from nested structure
const sectorName = computed(() => {
  return props.questionGroup?.subBranchUnitRating?.sector?.sector || "";
});

const ratingName = computed(() => {
  return props.questionGroup?.subBranchUnitRating?.rating?.rating || "";
});

const ratingDescription = computed(() => {
  return props.questionGroup?.subBranchUnitRating?.rating?.description || "";
});

const emit = defineEmits<{
  questionGroupDeleted: [];
  close: [];
}>();

const open = ref(false);
const loading = ref(false);

// Watch for questionGroup prop changes to open modal
watch(
  () => props.questionGroup,
  (newQuestionGroup) => {
    if (newQuestionGroup) {
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
  if (!props.questionGroup) return;

  loading.value = true;

  try {
    // Call API to delete question group
    await $fetch(
      `${apiBaseUrl}/api/questionGroupsMultipleChoice/${props.questionGroup.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    toast.add({
      title: "Success",
      description: `Question group "${props.questionGroup.group}" has been deleted successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("questionGroupDeleted");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to delete question group. Please try again.";
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
  <UModal v-model:open="open" title="Delete Question Group">
    <template #description>
      <div class="space-y-2">
        <p>Are you sure you want to delete this question group?</p>
        <div
          class="p-3 bg-elevated/50 rounded-lg border border-default text-sm"
        >
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-muted">Sector:</span>
              <span class="font-medium">{{ sectorName }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-muted">Rating:</span>
              <span class="font-medium text-primary">{{ ratingName }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-muted">Description:</span>
              <span class="font-medium text-muted">{{
                ratingDescription
              }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-muted">Group:</span>
              <span class="font-medium">{{ questionGroup?.group }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-muted">Quantity:</span>
              <span class="font-medium">{{ questionGroup?.quantity }}</span>
            </div>
          </div>
        </div>
        <p class="text-sm text-muted">This action cannot be undone.</p>
      </div>
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
