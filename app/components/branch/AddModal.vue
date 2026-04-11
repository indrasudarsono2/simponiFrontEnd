<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import ip from "../../utils/config.json";
const { token } = useAuth();

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

// Define Region interface
interface Region {
  id: number;
  region: string;
  createdAt?: string;
}

// Fetch regions for dropdown
const { data: regions } = await useFetch<Region[]>(
  `http://${ip.ipBackEnd}/api/regions`,
);

const regionOptions = computed(() => {
  return (
    regions.value?.map((region: Region) => ({
      label: region.region,
      value: region.id,
    })) || []
  );
});

const toast = useToast();
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;

  try {
    // Call API to create branch
    await $fetch(`http://${ip.ipBackEnd}/api/branches`, {
      method: "POST",
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
      description: `Branch "${event.data.branch}" has been created successfully`,
      color: "success",
    });

    // Reset form and close modal
    state.branch = undefined;
    state.regionId = undefined;
    open.value = false;

    // Emit event to refresh parent table
    emit("branchAdded");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to create branch. Please try again.";
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
  branchAdded: [];
}>();
</script>

<template>
  <UModal
    v-model:open="open"
    title="Add New Branch"
    description="Create a new branch in the system"
  >
    <UButton label="Add Branch" icon="i-lucide-plus" color="primary" />

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
            label="Create Branch"
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
