<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import ip from "../../utils/config.json";
const { token } = useAuth();

interface BranchUnit {
  id: number;
  branchId: string;
  unit: string;
  branch: {
    id: number;
    branch: string;
  };
  createdAt?: string;
}

const props = defineProps<{
  branchUnit: BranchUnit | null;
}>();

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

// Watch for branchUnit prop changes to populate form
watch(
  () => props.branchUnit,
  (newBranchUnit) => {
    if (newBranchUnit) {
      state.unit = newBranchUnit.unit;
      state.branch = newBranchUnit.branch.branch;
      state.branchId = newBranchUnit.branch.id;
      open.value = true;
    }
  },
  { immediate: true },
);

// Reset form when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    state.unit = undefined;
    state.branchId = undefined;
    state.branch = undefined;
    emit("close");
  }
});

const toast = useToast();
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.branchUnit) return;

  loading.value = true;

  try {
    // Call API to update branch unit
    await $fetch(
      `http://${ip.ipBackEnd}/api/branchUnits/${props.branchUnit.id}`,
      {
        method: "PUT",
        body: {
          unit: event.data.unit,
          branch: event.data.branch,
          branchId: event.data.branchId,
        },
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    toast.add({
      title: "Success",
      description: `Branch unit "${event.data.unit}" has been updated successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("branchUnitUpdated");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to update branch unit. Please try again.";
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
  branchUnitUpdated: [];
  close: [];
}>();
</script>

<template>
  <UModal
    v-model:open="open"
    title="Update Branch Unit"
    description="Edit the branch unit information"
  >
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
            label="Update Branch Unit"
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
