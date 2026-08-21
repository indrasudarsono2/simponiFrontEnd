<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

interface Rating {
  id: number;
  rating: string | null;
}

interface Cwp {
  id: number;
  cwp: string | null;
  ratingId: number | null;
  rating: Rating | null;
}

const props = defineProps<{
  cwp: Cwp | null;
}>();

const emit = defineEmits<{
  cwpUpdated: [];
  close: [];
}>();

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

watch(
  () => props.cwp,
  async (nextCwp) => {
    if (!nextCwp) return;

    await refreshRatings();
    state.cwp = nextCwp.cwp || undefined;
    state.ratingId = nextCwp.ratingId || undefined;
    open.value = true;

    if (ratingOptions.value.length === 0) {
      toast.add({
        title: "No Related Rating",
        description: "No related rating found for your branch unit.",
        color: "warning",
      });
    }
  },
);

watch(open, (isOpen) => {
  if (isOpen) return;

  state.cwp = undefined;
  state.ratingId = undefined;
  emit("close");
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.cwp) return;

  loading.value = true;

  try {
    await $fetch(`${apiBaseUrl}/api/cwps/${props.cwp.id}`, {
      method: "PUT",
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
      description: `CWP "${event.data.cwp.toUpperCase()}" has been updated`,
      color: "success",
    });

    open.value = false;
    emit("cwpUpdated");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to update CWP",
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
    title="Update CWP"
    description="Edit this CWP configuration"
  >
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
          description="Please add a related rating to this branch unit before updating CWP."
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
            label="Update CWP"
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
