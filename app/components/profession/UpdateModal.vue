<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
const { token } = useAuth();

interface Profession {
  id: number;
  profession: string;
  description: string;
}

const props = defineProps<{
  profession: Profession | null;
}>();

const schema = z.object({
  profession: z
    .string()
    .min(2, "Profession name must be at least 2 characters"),
  description: z.string().min(5, "Profession description must be cleared"),
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  profession: undefined,
  description: undefined,
});

// Watch for profession prop changes to populate form
watch(
  () => props.profession,
  (newProfession) => {
    if (newProfession) {
      state.profession = newProfession.profession;
      state.description = newProfession.description;
      open.value = true;
    }
  },
  { immediate: true },
);

// Reset form when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    state.profession = undefined;
    state.description = undefined;
    emit("close");
  }
});

const toast = useToast();
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.profession) return;

  loading.value = true;

  try {
    // Call API to update profession
    await $fetch(
      `${apiBaseUrl}/api/professions/${props.profession.id}`,
      {
        method: "PUT",
        body: {
          profession: event.data.profession,
          description: event.data.description,
        },
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    toast.add({
      title: "Success",
      description: `Profession "${event.data.profession}" has been updated successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("professionUpdated");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to update profession. Please try again.";
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
  professionUpdated: [];
  close: [];
}>();
</script>

<template>
  <UModal
    v-model:open="open"
    title="Update Profession"
    description="Edit the profession information"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          label="Profession Name"
          placeholder="Enter profession name"
          name="profession"
          required
        >
          <UInput
            v-model="state.profession"
            class="w-full"
            placeholder="e.g., TWR"
          />
        </UFormField>

        <UFormField
          label="Profession Description"
          placeholder="Enter profession description"
          name="description"
          required
        >
          <UInput
            v-model="state.description"
            class="w-full"
            placeholder="e.g., Tower Control Profession"
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
            label="Update Profession"
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
