<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
const { token } = useAuth();

const schema = z.object({
  sector: z.string().min(2, "Sector name must be at least 2 characters"),
  unit: z.string().min(2, "Branch unit name must be at least 2 characters"),
  branchUnitId: z.number().min(1, "Please select a region"),
  branch: z.string().min(2, "Branch unit name must be at least 2 characters"),
});

const open = ref(false);
const loading = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  sector: undefined,
  unit: undefined,
  branchUnitId: undefined,
  branch: undefined,
});

// Define Branch interface
interface BranchUnit {
  id: number;
  unit: string;
  branch: {
    id: number;
    branch: string;
  };
  createdAt?: string;
}

// Fetch branch data (returns single object)
const { data: branchUnitData } = await useFetch<BranchUnit>(
  `${apiBaseUrl}/api/sectorGetBranchUnit`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

// Auto-populate branch field when modal opens
watch(
  () => open.value,
  (isOpen) => {
    if (isOpen && branchUnitData.value) {
      const branchUnit = branchUnitData.value;
      if (branchUnit.branch && branchUnit.id) {
        state.unit = branchUnit.unit;
        state.branchUnitId = branchUnit.id;
        state.branch = branchUnit.branch.branch;
      }
    }
  },
  { immediate: true },
);

const toast = useToast();

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;

  try {
    // Call API to create sector - always for ACC branch unit
    await $fetch(`${apiBaseUrl}/api/sectors`, {
      method: "POST",
      body: {
        sector: event.data.sector,
        unit: event.data.unit,
        branchUnitId: state.branchUnitId,
      },
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Sector "${event.data.sector}" has been created successfully in ${state.unit}`,
      color: "success",
    });

    // Reset form and close modal
    state.sector = undefined;
    open.value = false;

    // Emit event to refresh parent table
    emit("sectorAdded");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to create sector. Please try again.";
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
  sectorAdded: [];
}>();
</script>

<template>
  <UModal
    v-model:open="open"
    title="Add New Sector"
    description="Create a new sector in ACC (JAKARTA)"
  >
    <UButton label="Add Sector" icon="i-lucide-plus" color="primary" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          label="Sector Name"
          placeholder="Enter sector name"
          name="sector"
          required
        >
          <UInput
            v-model="state.sector"
            class="w-full"
            placeholder="e.g., WEST"
          />
        </UFormField>

        <!-- Branch is fixed to JAKARTA for ACC Branch Unit Admin -->
        <UFormField label="Branch" name="branch">
          <UInput
            :model-value="state.branch"
            class="w-full"
            disabled
            color="neutral"
            variant="subtle"
          />
        </UFormField>

        <!-- Branch Unit is fixed to ACC for Branch Unit Admin -->
        <UFormField label="Branch Unit" name="branchUnit">
          <UInput
            :model-value="state.unit"
            class="w-full"
            disabled
            color="neutral"
            variant="subtle"
          />
          <UInput
            :model-value="state.branchUnitId"
            class="w-full"
            disabled
            hidden
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
            label="Create Sector"
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
