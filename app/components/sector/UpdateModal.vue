<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
const { token } = useAuth();

interface Sector {
  id: number;
  sector: string;
  branchUnitId: number;
  branchUnit: {
    id: number;
    unit: string;
    branchId: string;
    branch: {
      id: number;
      branch: string;
    };
  };
  createdAt?: string;
}

const props = defineProps<{
  sector: Sector | null;
}>();

const schema = z.object({
  sector: z.string().min(2, "Sector name must be at least 2 characters"),
});

const open = ref(false);
const loading = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  sector: undefined,
});

// Watch for sector prop changes to populate form
watch(
  () => props.sector,
  (newSector) => {
    if (newSector) {
      state.sector = newSector.sector;
      open.value = true;
    }
  },
  { immediate: true },
);

// Reset form when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    state.sector = undefined;
    emit("close");
  }
});

const toast = useToast();

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.sector) return;

  loading.value = true;

  try {
    await $fetch(`${apiBaseUrl}/api/sectors/${props.sector.id}`, {
      method: "PUT",
      body: {
        sector: event.data.sector,
      },
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Sector "${event.data.sector}" has been updated successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("sectorUpdated");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to update sector. Please try again.";
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
  sectorUpdated: [];
  close: [];
}>();
</script>

<template>
  <UModal
    v-model:open="open"
    title="Update Sector"
    description="Edit the sector information"
  >
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
          name="name"
          required
        >
          <UInput
            v-model="state.sector"
            class="w-full"
            placeholder="e.g., WEST"
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
            label="Update Sector"
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
