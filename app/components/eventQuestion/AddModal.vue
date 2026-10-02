<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
const { token } = useAuth();
interface Event {
  id: number;
  name: string;
  sectorId?: number;
  theoryMode?: 'MODE_1' | 'MODE_2';
}

interface KindOfQuestion {
  id: number;
  question: string;
}

interface EventQuestionAssignment {
  eventId: number;
  kindOfQuestionId: number;
  persentage: number;
}
const schema = z.object({
  eventId: z.number().min(1, "Event is required"),
  kindOfQuestionId: z.number().min(1, "Kind of Question is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  persentage: z
    .number()
    .min(0, "Percentage must be at least 0")
    .max(1, "Percentage must be at most 1"),
  minutes: z.number().optional(),
}).superRefine((data, ctx) => {
  const mode = props.events.find(e => e.id === data.eventId)?.theoryMode;
  if (mode !== 'MODE_2' && (!data.minutes || data.minutes < 1)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['minutes'], message: 'Minutes must be at least 1 for Mode 1' });
  }
});

const props = defineProps<{
  events: Event[];
  kindOfQuestions: KindOfQuestion[];
  eventQuestions: EventQuestionAssignment[];
}>();

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  eventId: undefined,
  kindOfQuestionId: undefined,
  quantity: undefined,
  persentage: undefined,
  minutes: undefined,
});

const availableKindOfQuestions = computed(() => {
  if (!state.eventId) return [];

  const assignedKindIds = new Set(
    props.eventQuestions
      .filter((item) => item.eventId === state.eventId)
      .map((item) => item.kindOfQuestionId),
  );

  return props.kindOfQuestions.filter((kind) => !assignedKindIds.has(kind.id));
});
const isMode2 = computed(() => props.events.find(e => e.id === state.eventId)?.theoryMode === 'MODE_2');
const existingWeight = computed(() => props.eventQuestions.find(item => item.eventId === state.eventId)?.persentage);
const requiredRemaining = computed(() => existingWeight.value == null ? null : Number((1 - existingWeight.value).toFixed(6)));

watch(
  () => state.eventId,
  () => {
    state.kindOfQuestionId = undefined;
    state.persentage = requiredRemaining.value ?? undefined;
  },
);

const toast = useToast();
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;

  try {
    if (requiredRemaining.value != null && Math.abs(Number(event.data.persentage) - requiredRemaining.value) > 0.000001) {
      toast.add({ title: 'Percentage must total 100%', description: `The remaining percentage is ${(requiredRemaining.value * 100).toFixed(0)}%.`, color: 'error' });
      return;
    }
    const selectedEvent = props.events?.find(
      (e) => e.id === event.data.eventId,
    );

    // Call API to create event question
    await $fetch(`${apiBaseUrl}/api/eventQuestions`, {
      method: "POST",
      body: {
        eventId: event.data.eventId,
        sectorId: selectedEvent?.sectorId,
        kindOfQuestionId: event.data.kindOfQuestionId,
        quantity: event.data.quantity,
        persentage: event.data.persentage,
        minutes: isMode2.value ? null : event.data.minutes,
      },
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: "Event question has been created successfully",
      color: "success",
    });

    // Reset form and close modal
    state.eventId = undefined;
    state.kindOfQuestionId = undefined;
    state.quantity = undefined;
    state.persentage = undefined;
    state.minutes = undefined;
    open.value = false;

    // Emit event to refresh parent table
    emit("eventQuestionAdded");
  } catch (error: any) {
    const errorMessage =
      error?.data?.message ||
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to create event question. Please try again.";
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
  eventQuestionAdded: [];
}>();
</script>

<template>
  <UModal
    v-model:open="open"
    title="Add Event Question"
    description="Create a new event question configuration"
  >
    <UButton label="Add Event Question" icon="i-lucide-plus" color="primary" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Event" name="eventId" required>
          <USelect
            v-model="state.eventId"
            :items="
              props.events?.map((e) => ({ label: e.name, value: e.id })) || []
            "
            placeholder="Select an event"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Kind of Question" name="kindOfQuestionId" required>
          <USelect
            v-model="state.kindOfQuestionId"
            :items="
              availableKindOfQuestions?.map((k) => ({
                label: k.question,
                value: k.id,
              })) || []
            "
            placeholder="Select kind of question"
            class="w-full"
            :disabled="!state.eventId || availableKindOfQuestions.length === 0"
          />
          <p v-if="!state.eventId" class="text-xs text-muted mt-1">
            Please select an event first
          </p>
          <p
            v-else-if="availableKindOfQuestions.length === 0"
            class="text-xs text-warning mt-1"
          >
            All kinds of question are already set for this event.
          </p>
        </UFormField>

        <UFormField label="Quantity" name="quantity" required>
          <UInput
            v-model="state.quantity"
            type="number"
            class="w-full"
            placeholder="Enter quantity"
          />
        </UFormField>

        <UFormField label="Percentage (0-1)" name="persentage" required>
          <UInput
            v-model="state.persentage"
            type="number"
            step="0.01"
            min="0"
            max="1"
            class="w-full"
            placeholder="Enter percentage (e.g., 0.3 for 30%)"
          />
        </UFormField>

        <p v-if="requiredRemaining != null" class="text-xs text-muted">The other question type uses {{ ((existingWeight || 0) * 100).toFixed(0) }}%. Enter {{ (requiredRemaining * 100).toFixed(0) }}% so the combined total is exactly 100%.</p>
        <p v-else class="text-xs text-muted">If this event has only one theory question type, set it to 1 (100%). If you will add the second type, complete both before starting the examination.</p>

        <UFormField v-if="!isMode2" label="Minutes" name="minutes" required>
          <UInput
            v-model="state.minutes"
            type="number"
            class="w-full"
            placeholder="Enter minutes"
          />
        </UFormField>
        <p v-else class="text-xs text-muted">Time is controlled by the Mode 2 examination session.</p>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="open = false"
          />
          <UButton
            label="Create Event Question"
            color="primary"
            variant="solid"
            type="submit"
            :loading="loading"
            :disabled="!state.eventId || availableKindOfQuestions.length === 0"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
