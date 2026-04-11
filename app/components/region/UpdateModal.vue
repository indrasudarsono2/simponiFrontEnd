<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import ip from "../../utils/config.json";
const { token } = useAuth();

interface Region {
  id: number;
  region: string;
}

const props = defineProps<{
  region: Region | null;
}>();

const schema = z.object({
  region: z.string().min(2, "Region name must be at least 2 characters"),
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  region: undefined,
});

// Watch for region prop changes to populate form
watch(
  () => props.region,
  (newRegion) => {
    if (newRegion) {
      state.region = newRegion.region;
      open.value = true;
    }
  },
  { immediate: true },
);

// Reset form when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    state.region = undefined;
    emit("close");
  }
});

const toast = useToast();
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.region) return;

  loading.value = true;

  try {
    // Call API to update region
    await $fetch(`http://${ip.ipBackEnd}/api/regions/${props.region.id}`, {
      method: "PUT",
      body: { region: event.data.region },
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Region "${event.data.region}" has been updated successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("regionUpdated");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to update region. Please try again.";
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
  regionUpdated: [];
  close: [];
}>();
</script>

<template>
  <UModal
    v-model:open="open"
    title="Update Region"
    description="Edit the region information"
  >
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
            label="Update Region"
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
