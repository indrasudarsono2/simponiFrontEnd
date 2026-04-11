<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

interface Cwp {
  id: number;
  name: string;
  ratingId: number;
  ratingName: string;
  sectorId: number;
  sectorName: string;
  branchId: number;
  branchName: string;
  branchUnitId: number;
  branchUnitName: string;
}

const props = defineProps<{
  cwp: Cwp | null;
}>();

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

// Watch for cwp prop changes to populate form
watch(
  () => props.cwp,
  (newCwp) => {
    if (newCwp) {
      state.name = newCwp.name;
      state.ratingId = newCwp.ratingId;
      state.sectorId = newCwp.sectorId;
      open.value = true;
    }
  },
  { immediate: true },
);

// Reset form when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    state.name = undefined;
    state.ratingId = undefined;
    state.sectorId = undefined;
    emit("close");
  }
});

const toast = useToast();

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.cwp) return;

  loading.value = true;

  try {
    // Call API to update CWP - always for ACC branch unit
    await $fetch(`/api/cwps/${props.cwp.id}`, {
      method: "PUT",
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
      description: `CWP "${event.data.name}" has been updated successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("cwpUpdated");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to update CWP. Please try again.";
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
  cwpUpdated: [];
  close: [];
}>();
</script>

<template>
  <UModal
    v-model:open="open"
    title="Update CWP"
    description="Edit the CWP configuration"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          label="CWP Name"
          placeholder="Enter CWP name"
          name="name"
          required
        >
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

        <!-- Branch is fixed to JAKARTA for ACC Branch Unit Admin -->
        <UFormField label="Branch" name="branch">
          <UInput
            :model-value="JAKARTA_BRANCH_NAME"
            class="w-full"
            disabled
            color="neutral"
            variant="subtle"
          />
        </UFormField>

        <!-- Branch Unit is fixed to ACC for Branch Unit Admin -->
        <UFormField label="Branch Unit" name="branchUnit">
          <UInput
            :model-value="ACC_BRANCH_UNIT_NAME"
            class="w-full"
            disabled
            color="neutral"
            variant="subtle"
          />
        </UFormField>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="open = false"
          />
          <UButton
            label="Update CWP"
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
