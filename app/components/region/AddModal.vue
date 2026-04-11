<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import ip from "../../utils/config.json";
const { token } = useAuth();

const schema = z.object({
  region: z.string().min(2, "Region name must be at least 2 characters"),
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  region: undefined,
});

const toast = useToast();
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;

  try {
    // Call API to create region
    await $fetch(`http://${ip.ipBackEnd}/api/regions`, {
      method: "POST",
      body: { region: event.data.region },
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Region "${event.data.region}" has been created successfully`,
      color: "success",
    });

    // Reset form and close modal
    state.region = undefined;
    open.value = false;

    // Emit event to refresh parent table
    emit("regionAdded");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to create region. Please try again.";
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
  regionAdded: [];
}>();
</script>

<template>
  <UModal
    v-model:open="open"
    title="Add New Region"
    description="Create a new region in the system"
  >
    <UButton label="Add Region" icon="i-lucide-plus" color="primary" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          label="Region Name"
          placeholder="Enter region name"
          name="region"
          required
        >
          <UInput
            v-model="state.region"
            class="w-full"
            placeholder="e.g., Jakarta Region"
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
            label="Create Region"
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
