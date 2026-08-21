<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
const { token } = useAuth();

interface Region {
  id: number;
  region: string;
  createdAt?: string;
}

interface Branch {
  id: number;
  branch: string;
  regionId: number;
  region?: {
    id: number;
    region: string;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
  };
}

const props = defineProps<{
  branch: Branch | null;
}>();

const emit = defineEmits<{
  branchUpdated: [];
  close: [];
}>();

const schema = z.object({
  branch: z.string().min(2, "Branch name must be at least 2 characters"),
  regionId: z.number().min(1, "Please select a region"),
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  branch: undefined,
  regionId: undefined,
});

// Fetch regions for dropdown
const { data: regions } = await useFetch<Region[]>(
  `${apiBaseUrl}/api/regions`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

const regionOptions = computed(() => {
  return (
    regions.value?.map((region: Region) => ({
      label: region.region,
      value: region.id,
    })) || []
  );
});

// Watch for branch prop changes to populate form
watch(
  () => props.branch,
  (newBranch) => {
    if (newBranch) {
      state.branch = newBranch.branch;
      state.regionId = newBranch.regionId;
      open.value = true;
    }
  },
  { immediate: true },
);

// Reset form when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    state.branch = undefined;
    state.regionId = undefined;
    emit("close");
  }
});

const toast = useToast();
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.branch) return;

  loading.value = true;

  try {
    // Call API to update branch
    await $fetch(`${apiBaseUrl}/api/branches/${props.branch.id}`, {
      method: "PUT",
      body: {
        branch: event.data.branch,
        regionId: event.data.regionId,
      },
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Branch "${event.data.branch}" has been updated successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("branchUpdated");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to update branch. Please try again.";
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
    title="Update Branch"
    description="Edit the branch information"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          label="Branch Name"
          placeholder="Enter branch name"
          name="branch"
          required
        >
          <UInput
            v-model="state.branch"
            class="w-full"
            placeholder="e.g., JAKARTA"
          />
        </UFormField>

        <UFormField label="Region" name="regionId" required>
          <USelect
            v-model="state.regionId"
            :items="regionOptions"
            placeholder="Select a region"
            class="w-full"
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
            label="Update Branch"
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
