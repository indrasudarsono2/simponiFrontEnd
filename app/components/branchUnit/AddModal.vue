<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
const { token } = useAuth();

const schema = z.object({
  unit: z.string().min(2, "Branch unit name must be at least 2 characters"),
  branchId: z.number().min(1, "Please select a region"),
  branch: z.string().min(2, "Branch name must be at least 2 characters"),
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  unit: undefined,
  branchId: undefined,
  branch: undefined,
});

// Define Branch interface
interface Branch {
  id: number;
  branch: string;
  createdAt?: string;
}

// Fetch branch data (returns single object)
const { data: branchData } = await useFetch<Branch>(
  `${apiBaseUrl}/api/branchUnitsGetBranch`,
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
    if (isOpen && branchData.value) {
      const branch = branchData.value;
      if (branch.branch && branch.id) {
        state.branch = branch.branch;
        state.branchId = branch.id;
      }
    }
  },
  { immediate: true },
);

const toast = useToast();

const loading = ref(false);
async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;

  try {
    // Call API to create branch unit
    await $fetch(`${apiBaseUrl}/api/branchUnits`, {
      method: "POST",
      body: {
        unit: event.data.unit,
        branch: event.data.branch,
        branchId: event.data.branchId,
      },
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Branch unit "${event.data.unit}" has been created successfully`,
      color: "success",
    });

    // Reset form and close modal
    state.unit = undefined;
    // Branch fields will be re-populated by watchEffect when modal reopens
    open.value = false;

    // Emit event to refresh parent table
    emit("branchUnitAdded");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to create branch unit. Please try again.";
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
  branchUnitAdded: [];
}>();
</script>

<template>
  <UModal
    v-model:open="open"
    title="Add New Branch Unit"
    description="Create a new branch unit in the system"
  >
    <UButton label="Add Branch Unit" icon="i-lucide-plus" color="primary" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Branch Unit Name" name="unit" required>
          <UInput
            v-model="state.unit"
            class="w-full"
            placeholder="e.g., ACC, APP, AIS"
          />
        </UFormField>

        <UFormField label="Branch" name="branch" required>
          <UInput
            v-model="state.branch"
            class="w-full"
            placeholder="e.g., JAKARTA"
            disabled
          />
          <UInput
            v-model="state.branchId"
            class="w-full"
            placeholder="e.g., JAKARTA"
            disabled
            hidden
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
            label="Create Branch Unit"
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
