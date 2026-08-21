<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
const { token } = useAuth();

interface RatingInfo {
  id: number;
  professionId: number;
  rating: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

interface SectorInfo {
  id: number;
  branchUnitId: number;
  sector: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

interface SubBranchUnitRating {
  id: number;
  sectorId: number;
  ratingId: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  rating: RatingInfo;
  sector: SectorInfo;
}

const props = defineProps<{
  ratingChecker: SubBranchUnitRating | null;
}>();

const emit = defineEmits<{
  ratingCheckerDeleted: [];
  close: [];
}>();

const open = ref(false);
const loading = ref(false);

// Watch for ratingChecker prop changes to open modal
watch(
  () => props.ratingChecker,
  (newRatingChecker) => {
    if (newRatingChecker) {
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
  if (!props.ratingChecker) return;

  loading.value = true;

  try {
    // Call API to delete rating checker
    await $fetch(
      `${apiBaseUrl}/api/ratingCheckerAdmins/${props.ratingChecker.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    toast.add({
      title: "Success",
      description: `Rating "${props.ratingChecker.rating?.rating}" for sector "${props.ratingChecker.sector?.sector}" has been deleted successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("ratingCheckerDeleted");
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
</script>

<template>
  <UModal v-model:open="open" title="Delete Rating">
    <template #description>
      <div class="space-y-2">
        <p>Are you sure you want to delete this rating assignment?</p>
        <div
          class="p-3 bg-elevated/50 rounded-lg border border-default text-sm"
        >
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-muted">Sector:</span>
              <span class="font-medium">{{
                ratingChecker?.sector?.sector
              }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-muted">Rating:</span>
              <span class="font-medium text-primary">{{
                ratingChecker?.rating?.rating
              }}</span>
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
