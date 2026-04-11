<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import ip from "../../utils/config.json";
const { token } = useAuth();

interface Profession {
  id: number;
  profession: string;
  createdAt?: string;
}

interface Rating {
  id: number;
  rating: string;
  description: string;
  professionId: number;
  profession?: {
    id: number;
    profession: string;
    description: string;
    createdAt: string;
    updatedAt: string;
  };
}

const props = defineProps<{
  rating: Rating | null;
}>();

const schema = z.object({
  rating: z.string().min(2, "Rating name must be at least 2 characters"),
  description: z.string().min(5, "Rating description must be cleared"),
  professionId: z.number().min(1, "Please select a profession"),
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  rating: undefined,
  description: undefined,
  professionId: undefined,
});

// Fetch regions for dropdown
const { data: professions } = await useFetch<Profession[]>(
  `http://${ip.ipBackEnd}/api/professions`,
  {
    headers: {
      Authorization: token.value ? `Bearer ${token.value}` : "",
    },
  },
);

const professionOptions = computed(() => {
  return (
    professions.value?.map((profession: Profession) => ({
      label: `${profession.profession}`,
      value: profession.id,
    })) || []
  );
});

// Watch for rating prop changes to populate form
watch(
  () => props.rating,
  (newRating) => {
    if (newRating) {
      state.rating = newRating.rating;
      state.description = newRating.description;
      state.professionId = newRating.professionId;
      open.value = true;
    }
  },
  { immediate: true },
);

// Reset form when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    state.rating = undefined;
    state.description = undefined;
    emit("close");
  }
});

const toast = useToast();
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.rating) return;

  loading.value = true;

  try {
    // Call API to update rating
    await $fetch(`http://${ip.ipBackEnd}/api/ratings/${props.rating.id}`, {
      method: "PUT",
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
      description: `Rating "${event.data.rating}" has been updated successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("ratingUpdated");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to update rating. Please try again.";
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
  ratingUpdated: [];
  close: [];
}>();
</script>

<template>
  <UModal
    v-model:open="open"
    title="Update Rating"
    description="Edit the rating information"
  >
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
          label="Rating Description"
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
            label="Update Rating"
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
