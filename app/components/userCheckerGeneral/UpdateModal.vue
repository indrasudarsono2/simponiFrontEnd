<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

defineOptions({
  name: "UserCheckerGeneralUpdateModal",
});

interface CheckerRatingItem {
  id?: number;
  rating?: {
    id: number;
    rating: string;
  } | null;
  ratingId?: number;
}

interface UserRole {
  id: number;
  checkerRatings?: CheckerRatingItem[];
}

interface SubBranchUnitRating {
  id: number;
  rating: {
    id: number;
    rating: string;
  };
}

interface UserChecker {
  nik: string;
  name: string;
  userRoles: UserRole[];
  sector?: {
    id: number;
    subBranchUnitRatings?: SubBranchUnitRating[];
  } | null;
}

const props = defineProps<{
  user: UserChecker | null;
}>();

const emit = defineEmits<{
  (e: "checker-updated"): void;
  (e: "close"): void;
}>();

const { token } = useAuth();
const toast = useToast();
const loading = ref(false);

const selectedRatings = ref<{ value: number; label: string }[]>([]);

const isOpen = computed({
  get: () => props.user !== null,
  set: (value) => {
    if (!value) emit("close");
  },
});

const availableRatingOptions = computed(() => {
  const options =
    props.user?.sector?.subBranchUnitRatings?.map((item) => ({
      value: item.rating.id,
      label: item.rating.rating,
    })) || [];

  const unique = new Map<number, { value: number; label: string }>();
  options.forEach((item) => unique.set(item.value, item));
  return Array.from(unique.values());
});

const selectedRatingIds = computed(() => selectedRatings.value.map((item) => item.value));
const selectedUserRoleId = computed(() => props.user?.userRoles?.[0]?.id);

const selectedRatingSummary = computed(() => {
  return availableRatingOptions.value.filter((item) =>
    selectedRatingIds.value.includes(item.value),
  );
});

watch(
  () => props.user,
  (newUser) => {
    if (!newUser) {
      selectedRatings.value = [];
      return;
    }

    const existingRatingIds = new Set<number>();
    (newUser.userRoles || []).forEach((role) => {
      (role.checkerRatings || []).forEach((checkerRating) => {
        const idFromRating = checkerRating.rating?.id;
        const idFromField = checkerRating.ratingId;
        const ratingId = idFromRating || idFromField;
        if (ratingId) existingRatingIds.add(ratingId);
      });
    });

    selectedRatings.value = availableRatingOptions.value.filter((option) =>
      existingRatingIds.has(option.value),
    );
  },
  { immediate: true },
);

async function onSubmit() {
  if (!props.user) return;

  if (selectedRatings.value.length === 0) {
    toast.add({
      title: "Validation Error",
      description: "Please select at least one rating",
      color: "error",
    });
    return;
  }

  if (!selectedUserRoleId.value) {
    toast.add({
      title: "Validation Error",
      description: "User role is not available",
      color: "error",
    });
    return;
  }

  try {
    loading.value = true;

    await $fetch(`${apiBaseUrl}/api/checkerRating`, {
      method: "POST",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
        "Content-Type": "application/json",
      },
      body: {
        nik: props.user.nik,
        userRoleId: selectedUserRoleId.value,
        ratingId: selectedRatingIds.value,
      },
    });

    toast.add({
      title: "Success",
      description: "Checker rating updated successfully",
      color: "success",
    });

    emit("checker-updated");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        error?.message ||
        "Failed to update checker rating",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="isOpen" title="Update Checker Rating">
    <template #body>
      <form class="space-y-4" @submit.prevent="onSubmit">
        <div
          v-if="user"
          class="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-2"
        >
          <div class="flex justify-between gap-2">
            <span class="text-sm text-gray-500">Name:</span>
            <span class="text-sm font-medium text-right">{{ user.name }}</span>
          </div>
          <div class="flex justify-between gap-2">
            <span class="text-sm text-gray-500">NIK:</span>
            <span class="text-sm font-medium text-right">{{ user.nik }}</span>
          </div>
        </div>

        <UFormField label="Available Related Rating" required>
          <USelectMenu
            v-model="selectedRatings"
            :items="availableRatingOptions"
            multiple
            placeholder="Select related rating"
            class="w-full"
          />
          <p
            v-if="availableRatingOptions.length === 0"
            class="text-xs text-warning mt-1"
          >
            No related ratings available from sector configuration.
          </p>
        </UFormField>

        <div
          class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg"
        >
          <p class="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
            Summary
          </p>
          <ul
            v-if="selectedRatingSummary.length > 0"
            class="list-disc list-inside text-sm text-blue-700 dark:text-blue-300 m-0 p-0"
          >
            <li v-for="rating in selectedRatingSummary" :key="rating.value">
              {{ rating.label }}
            </li>
          </ul>
          <p v-else class="text-sm text-blue-700 dark:text-blue-300">
            No rating selected
          </p>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="emit('close')"
          />
          <UButton
            label="Update"
            color="primary"
            type="submit"
            :loading="loading"
            :disabled="loading"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
