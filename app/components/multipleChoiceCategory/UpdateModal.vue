<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
const { token } = useAuth();
interface SubBranchUnitRating {
  id: number;
  rating: {
    id: number;
    rating: string;
    description: string;
  };
}

interface Sector {
  id: number;
  name: string;
  subBranchUnitRatings: SubBranchUnitRating[];
}

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
  sectors: Sector[];
}>();

const emit = defineEmits<{
  questionGroupUpdated: [];
  close: [];
}>();

const schema = z.object({
  sectorId: z.coerce.number().min(1, "Sector is required"),
  ratingId: z.coerce.number().min(1, "Rating is required"),
  group: z.string().min(1, "Group name is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  sectorId: undefined,
  ratingId: undefined,
  group: undefined,
  quantity: undefined,
});

// Available ratings derived from the selected sector's subBranchUnitRatings
const availableRatings = computed(() => {
  if (!state.sectorId) return [];
  const sector = props.sectors.find((s) => s.id === state.sectorId);
  if (!sector) return [];
  return sector.subBranchUnitRatings.map((sub) => ({
    id: sub.rating.id,
    name: sub.rating.rating,
    description: sub.rating.description,
  }));
});

// Reset ratingId when sector changes to a different value
// Use a flag to prevent reset on initial load from questionGroup
const isInitialLoad = ref(true);
watch(
  () => state.sectorId,
  (newSectorId, oldSectorId) => {
    // Only reset if this is a user-initiated change (oldSectorId exists and is different)
    if (oldSectorId !== undefined && newSectorId !== oldSectorId) {
      state.ratingId = undefined;
    }
    isInitialLoad.value = false;
  },
);

// Get selected sector info
const selectedSector = computed(() => {
  if (!state.sectorId) return null;
  return props.sectors.find((s) => s.id === state.sectorId);
});

// Get selected rating info
const selectedRating = computed(() => {
  if (!state.ratingId) return null;
  return availableRatings.value.find((r) => r.id === state.ratingId);
});

// Watch for questionGroup prop changes to populate form
watch(
  () => props.questionGroup,
  (newQuestionGroup) => {
    if (newQuestionGroup) {
      // Extract sectorId and ratingId from nested subBranchUnitRating
      state.sectorId = newQuestionGroup.subBranchUnitRating.sector.id;
      state.ratingId = newQuestionGroup.subBranchUnitRating.rating.id;
      state.group = newQuestionGroup.group;
      state.quantity = newQuestionGroup.quantity;
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
    state.group = undefined;
    state.quantity = undefined;
    emit("close");
  }
});

const toast = useToast();
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.questionGroup) return;

  loading.value = true;

  try {
    // Call API to update question group
    await $fetch(
      `${apiBaseUrl}/api/questionGroupsMultipleChoice/${props.questionGroup.id}`,
      {
        method: "PUT",
        body: {
          sectorId: event.data.sectorId,
          ratingId: event.data.ratingId,
          group: event.data.group,
          quantity: event.data.quantity,
        },
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    toast.add({
      title: "Success",
      description: `Question group has been updated successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("questionGroupUpdated");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to update question group. Please try again.";
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
    title="Update Question Group"
    description="Edit the question group information"
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
            disabled
            placeholder="Select a sector"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Rating" name="ratingId" required>
          <USelect
            v-model="state.ratingId"
            :items="availableRatings"
            label-key="name"
            value-key="id"
            placeholder="Select a rating"
            disabled
            class="w-full"
          />
          <template v-if="!state.sectorId" #hint>
            <span class="text-xs text-muted">Select a sector first</span>
          </template>
        </UFormField>

        <UFormField label="Group Name" name="group" required>
          <UInput
            v-model="state.group"
            class="w-full"
            placeholder="e.g., PENDEK, PANJANG, STRUKTUR RUANG UDARA"
          />
        </UFormField>

        <UFormField label="Quantity" name="quantity" required>
          <UInput
            v-model="state.quantity"
            type="number"
            min="1"
            class="w-full"
            placeholder="Enter quantity"
          />
        </UFormField>

        <!-- Show summary when all fields are filled -->
        <div
          v-if="
            selectedSector && selectedRating && state.group && state.quantity
          "
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
              selectedRating.name
            }}</span>
          </div>
          <div class="text-sm flex items-center gap-2">
            <span class="text-muted">Description:</span>
            <span class="font-medium text-muted">{{
              selectedRating.description
            }}</span>
          </div>
          <div class="text-sm flex items-center gap-2">
            <span class="text-muted">Group:</span>
            <span class="font-medium">{{ state.group }}</span>
          </div>
          <div class="text-sm flex items-center gap-2">
            <span class="text-muted">Quantity:</span>
            <span class="font-medium">{{ state.quantity }}</span>
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
            label="Update Question Group"
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
