<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
const { token } = useAuth();

const schema = z.object({
  rating: z.string().min(2, "Rating name must be at least 2 characters"),
  description: z.string().min(5, "Description must be cleared"),
  professionId: z.number().min(1, "Please select a profession"),
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  rating: undefined,
  description: undefined,
  professionId: undefined,
});

// Define Region interface
interface Profession {
  id: number;
  profession: string;
  description: string;
  createdAt?: string;
}

// Fetch regions for dropdown
const { data: regions } = await useFetch<Profession[]>(
  `${apiBaseUrl}/api/professions`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

const professionOptions = computed(() => {
  return (
    regions.value?.map((profession: Profession) => ({
      label: `${profession.description} (${profession.profession})`,
      value: profession.id,
    })) || []
  );
});

const toast = useToast();
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;

  try {
    // Call API to create rating
    await $fetch(`${apiBaseUrl}/api/ratings`, {
      method: "POST",
      body: {
        rating: event.data.rating,
        description: event.data.description,
        professionId: event.data.professionId,
      },
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Rating "${event.data.rating}" has been created successfully`,
      color: "success",
    });

    // Reset form and close modal
    state.rating = undefined;
    open.value = false;

    // Emit event to refresh parent table
    emit("ratingAdded");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to create rating. Please try again.";
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
  ratingAdded: [];
}>();

const handleUndefined = () => {
  open.value = false;
  state.rating = undefined;
  state.description = undefined;
};
</script>

<template>
  <UModal
    v-model:open="open"
    title="Add New Rating"
    description="Create a new rating in the system"
  >
    <UButton label="Add Rating" icon="i-lucide-plus" color="primary" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          label="Rating Name"
          placeholder="Enter rating name"
          name="name"
          required
        >
          <UInput
            v-model="state.rating"
            class="w-full"
            placeholder="e.g., TWR"
          />
        </UFormField>

        <UFormField
          label="Description"
          placeholder="Enter rating description"
          name="description"
          required
        >
          <UInput
            v-model="state.description"
            class="w-full"
            placeholder="e.g., Tower Control Rating"
          />
        </UFormField>

        <UFormField label="Profession" name="professionId" required>
          <USelect
            v-model="state.professionId"
            :items="professionOptions"
            placeholder="Select a profession"
            class="w-full"
          />
        </UFormField>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="handleUndefined()"
          />
          <UButton
            label="Create Rating"
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
