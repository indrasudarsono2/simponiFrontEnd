<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

interface Rating {
  id: number;
  rating: string | null;
}

const { token } = useAuth();
const toast = useToast();

const schema = z.object({
  cwp: z.string().min(1, "CWP is required"),
  ratingId: z.coerce.number().int().positive("Rating is required"),
});

type Schema = z.output<typeof schema>;

const open = ref(false);
const loading = ref(false);
const state = reactive<Partial<Schema>>({
  cwp: undefined,
  ratingId: undefined,
});

const emit = defineEmits<{
  cwpAdded: [];
}>();

const {
  data: ratings,
  status: ratingsStatus,
  refresh: refreshRatings,
} = await useFetch<Rating[]>(`${apiBaseUrl}/api/cwps/ratings`, {
  headers: {
    Authorization: token.value ? `Bearer ${token.value}` : "",
  },
});

const ratingOptions = computed(() =>
  (ratings.value || []).map((rating) => ({
    label: rating.rating || `Rating ${rating.id}`,
    value: rating.id,
  })),
);

watch(open, async (isOpen) => {
  if (!isOpen) return;

  await refreshRatings();
  if (ratingOptions.value.length === 0) {
    toast.add({
      title: "No Related Rating",
      description: "No related rating found for your branch unit.",
      color: "warning",
    });
  }
});

function resetForm() {
  state.cwp = undefined;
  state.ratingId = undefined;
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;

  try {
    await $fetch(`${apiBaseUrl}/api/cwps`, {
      method: "POST",
      body: {
        cwp: event.data.cwp,
        ratingId: event.data.ratingId,
      },
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `CWP "${event.data.cwp.toUpperCase()}" has been created`,
      color: "success",
    });

    resetForm();
    open.value = false;
    emit("cwpAdded");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to create CWP",
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
    title="Add CWP"
    description="Create a CWP for a related rating"
  >
    <UButton label="Add CWP" icon="i-lucide-plus" color="primary" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UAlert
          v-if="ratingOptions.length === 0 && ratingsStatus !== 'pending'"
          color="warning"
          variant="soft"
          icon="i-lucide-triangle-alert"
          title="No related rating"
          description="Please add a related rating to this branch unit before creating CWP."
        />

        <UFormField label="CWP" name="cwp" required>
          <UInput
            v-model="state.cwp"
            class="w-full"
            placeholder="e.g., UMDN"
          />
        </UFormField>

        <UFormField label="Rating" name="ratingId" required>
          <USelectMenu
            v-model="state.ratingId"
            class="w-full"
            :items="ratingOptions"
            value-key="value"
            label-key="label"
            searchable
            placeholder="Select rating"
            :loading="ratingsStatus === 'pending'"
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
            label="Create CWP"
            color="primary"
            type="submit"
            :loading="loading"
            :disabled="ratingOptions.length === 0"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
