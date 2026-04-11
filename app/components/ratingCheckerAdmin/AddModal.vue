<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import ip from "../../utils/config.json";
const { token } = useAuth();

interface Sector {
  id: number;
  name: string;
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
  sectors: Sector[];
}>();

const emit = defineEmits<{
  ratingCheckerAdded: [];
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

const toast = useToast();
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;

  try {
    // Call API to create rating checker
    await $fetch(`http://${ip.ipBackEnd}/api/ratingCheckerAdmins`, {
      method: "POST",
      body: {
        sectorId: event.data.sectorId,
        ratingId: event.data.ratingId,
      },
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Rating "${selectedRating.value?.rating}" for sector "${selectedSector.value?.name}" has been created successfully`,
      color: "success",
    });

    // Reset form and close modal
    state.sectorId = undefined;
    state.ratingId = undefined;
    open.value = false;

    // Emit event to refresh parent table
    emit("ratingCheckerAdded");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to create rating. Please try again.";
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
    title="Add New Rating"
    description="Assign a rating to a sector"
  >
    <UButton label="Add Rating" icon="i-lucide-plus" color="primary" />

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
            label="Create Rating"
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
