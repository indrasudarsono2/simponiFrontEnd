<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const schema = z.object({
  name: z.string().min(2, "CWP name must be at least 2 characters"),
  ratingId: z.coerce.number().min(1, "Rating is required"),
  sectorId: z.coerce.number().min(1, "Sector is required"),
});

const open = ref(false);
const loading = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  name: undefined,
  ratingId: undefined,
  sectorId: undefined,
});

// Fixed context for ACC Branch Unit Admin
const ACC_BRANCH_UNIT_ID = 1;
const ACC_BRANCH_UNIT_NAME = "ACC";
const JAKARTA_BRANCH_ID = 1;
const JAKARTA_BRANCH_NAME = "JAKARTA";

// Fetch ratings for dropdown
const { data: ratings } = await useFetch<{ id: number; name: string }[]>(
  "/api/ratings",
  {
    lazy: true,
    default: () => [
      { id: 1, name: "TWR" },
      { id: 2, name: "APP" },
      { id: 3, name: "APS" },
      { id: 4, name: "ACP" },
      { id: 5, name: "ACS" },
      { id: 6, name: "ACO" },
      { id: 7, name: "KARTOGRAFI" },
    ],
  },
);

// Fetch sectors for dropdown (ACC branch unit only)
const { data: sectors } = await useFetch<{ id: number; name: string }[]>(
  "/api/sectors",
  {
    lazy: true,
    default: () => [
      { id: 1, name: "WEST" },
      { id: 2, name: "EAST" },
      { id: 3, name: "NORTH" },
      { id: 4, name: "NORTH WEST" },
      { id: 5, name: "NORTH EAST" },
    ],
  },
);

const toast = useToast();

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;

  try {
    // Call API to create CWP - always for ACC branch unit
    await $fetch("/api/cwps", {
      method: "POST",
      body: {
        name: event.data.name,
        ratingId: event.data.ratingId,
        sectorId: event.data.sectorId,
        branchId: JAKARTA_BRANCH_ID,
        branchUnitId: ACC_BRANCH_UNIT_ID,
      },
    });

    toast.add({
      title: "Success",
      description: `CWP "${event.data.name}" has been created successfully in ${ACC_BRANCH_UNIT_NAME}`,
      color: "success",
    });

    // Reset form and close modal
    state.name = undefined;
    state.ratingId = undefined;
    state.sectorId = undefined;
    open.value = false;

    // Emit event to refresh parent table
    emit("cwpAdded");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to create CWP. Please try again.";
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
  cwpAdded: [];
}>();
</script>

<template>
  <div>
    <UButton
      label="Add CWP"
      icon="i-lucide-plus"
      color="primary"
      @click="open = true"
    />

    <UModal
      v-model:open="open"
      title="Add New CWP"
      description="Create a new CWP configuration in ACC (JAKARTA)"
    >
      <template #body>
        <UForm
          :schema="schema"
          :state="state"
          class="space-y-4"
          @submit="onSubmit"
        >
          <UFormField label="CWP Name" name="name" required>
            <UInput
              v-model="state.name"
              class="w-full"
              placeholder="e.g., UMDN"
            />
          </UFormField>

          <UFormField label="Rating" name="ratingId" required>
            <USelect
              v-model="state.ratingId"
              :items="ratings || []"
              label-key="name"
              value-key="id"
              placeholder="Select a rating"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Sector" name="sectorId" required>
            <USelect
              v-model="state.sectorId"
              :items="sectors || []"
              label-key="name"
              value-key="id"
              placeholder="Select a sector"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Branch">
            <UInput
              :model-value="JAKARTA_BRANCH_NAME"
              disabled
              variant="subtle"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Branch Unit">
            <UInput
              :model-value="ACC_BRANCH_UNIT_NAME"
              disabled
              variant="subtle"
              class="w-full"
            />
          </UFormField>

          <div class="flex justify-end gap-2 pt-4">
            <UButton
              label="Cancel"
              color="neutral"
              variant="subtle"
              @click="open = false"
            />
            <UButton label="Create CWP" type="submit" :loading="loading" />
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>
