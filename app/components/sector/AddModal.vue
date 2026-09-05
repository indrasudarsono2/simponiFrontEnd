<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
const { token } = useAuth();

const schema = z.object({
  sector: z.string().min(2, "Sector name must be at least 2 characters"),
});

const open = ref(false);
const loading = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  sector: undefined,
});

const toast = useToast();

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;

  try {
    await $fetch(`${apiBaseUrl}/api/sectors`, {
      method: "POST",
      body: {
        sector: event.data.sector,
      },
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Sector "${event.data.sector}" has been created successfully`,
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
    description="Create a new sector for your branch unit"
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
