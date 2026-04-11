<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import ip from "../../utils/config.json";
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
  ratingId: number; // Note: API uses "ratingId" with double 't'
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  rating: RatingInfo;
  sector: SectorInfo;
}

interface Rating {
  id: number;
  professionId: number;
  rating: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

const props = defineProps<{
  ratingChecker: SubBranchUnitRating | null;
  sectors: { id: number; name: string }[];
}>();

const emit = defineEmits<{
  ratingCheckerUpdated: [];
  close: [];
}>();

const schema = z.object({
  sectorId: z.coerce.number().min(1, "Sector is required"),
  ratingId: z.coerce.number().min(1, "Rating is required"),
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  sectorId: undefined,
  ratingId: undefined,
});

// Fetch ratings from API
const { data: ratings } = await useFetch<Rating[]>(
  `http://${ip.ipBackEnd}/api/allRatings`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

// Get selected sector info
const selectedSector = computed(() => {
  if (!state.sectorId) return null;
  return props.sectors.find((s) => s.id === state.sectorId);
});

// Get selected rating info
const selectedRating = computed(() => {
  if (!state.ratingId || !ratings.value) return null;
  return ratings.value.find((r) => r.id === state.ratingId);
});

// Watch for ratingChecker prop changes to populate form
watch(
  () => props.ratingChecker,
  (newRatingChecker) => {
    if (newRatingChecker) {
      state.sectorId = newRatingChecker.sectorId;
      state.ratingId = newRatingChecker.ratingId; // Use ratingId from API
      open.value = true;
    }
  },
  { immediate: true },
);

// Reset form when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    state.sectorId = undefined;
    state.ratingId = undefined;
    emit("close");
  }
});

const toast = useToast();
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.ratingChecker) return;

  loading.value = true;

  try {
    // Call API to update rating checker
    await $fetch(
      `http://${ip.ipBackEnd}/api/ratingCheckerAdmins/${props.ratingChecker.id}`,
      {
        method: "PUT",
        body: {
          sectorId: event.data.sectorId,
          ratingId: event.data.ratingId,
        },
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    toast.add({
      title: "Success",
      description: `Rating has been updated successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("ratingCheckerUpdated");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to update rating. Please try again.";
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
  <UModal
    v-model:open="open"
    title="Update Rating"
    description="Edit the sector and rating assignment"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Sector" name="sectorId" required>
          <USelect
            v-model="state.sectorId"
            :items="sectors"
            label-key="name"
            value-key="id"
            placeholder="Select a sector"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Rating" name="ratingId" required>
          <USelect
            v-model="state.ratingId"
            :items="ratings ?? []"
            label-key="rating"
            value-key="id"
            placeholder="Select a rating"
            class="w-full"
          />
        </UFormField>

        <!-- Show summary when both are selected -->
        <div
          v-if="selectedSector && selectedRating"
          class="p-3 bg-elevated/50 rounded border border-default space-y-2"
        >
          <div class="text-sm font-medium">Summary:</div>
          <div class="text-sm flex items-center gap-2">
            <span class="text-muted">Sector:</span>
            <span class="font-medium">{{ selectedSector.name }}</span>
          </div>
          <div class="text-sm flex items-center gap-2">
            <span class="text-muted">Rating:</span>
            <span class="font-medium text-primary">{{
              selectedRating.rating
            }}</span>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="open = false"
          />
          <UButton
            label="Update Rating"
            color="primary"
            variant="solid"
            type="submit"
            :loading="loading"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
