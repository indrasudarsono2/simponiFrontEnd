<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
const { token } = useAuth();
interface EventQuestion {
  id: number;
  eventId: number;
  eventName: string;
  sectorId: number | null;
  sector: string;
  kindOfQuestionId: number;
  kindOfQuestion: string;
  quantity: number;
  persentage: number;
  minutes: number;
  theoryMode?: 'MODE_1' | 'MODE_2';
}

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

interface EventQuestionAssignment { eventId: number; kindOfQuestionId: number; persentage: number }

const props = defineProps<{
  eventQuestion: EventQuestion | null;
  events: Event[];
  kindOfQuestions: KindOfQuestion[];
  eventQuestions: EventQuestionAssignment[];
}>();

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

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  eventId: undefined,
  kindOfQuestionId: undefined,
  quantity: undefined,
  persentage: undefined,
  minutes: undefined,
});
const isMode2 = computed(() => props.events.find(e => e.id === state.eventId)?.theoryMode === 'MODE_2');
const hasOtherPart = computed(() => props.eventQuestions.some(item => item.eventId === state.eventId && item.kindOfQuestionId !== state.kindOfQuestionId));

// Watch for eventQuestion prop changes to populate form
watch(
  () => props.eventQuestion,
  (newEventQuestion) => {
    if (newEventQuestion) {
      state.eventId = newEventQuestion.eventId;
      state.kindOfQuestionId = newEventQuestion.kindOfQuestionId;
      state.quantity = newEventQuestion.quantity;
      state.persentage = newEventQuestion.persentage;
      state.minutes = newEventQuestion.minutes;
      open.value = true;
    }
  },
  { immediate: true },
);

// Reset form when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    state.eventId = undefined;
    state.kindOfQuestionId = undefined;
    state.quantity = undefined;
    state.persentage = undefined;
    state.minutes = undefined;
    emit("close");
  }
});

const toast = useToast();
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.eventQuestion) return;

  loading.value = true;

  try {
    const selectedEvent = props.events?.find(
      (e) => e.id === event.data.eventId,
    );
    const selectedKind = props.kindOfQuestions?.find(
      (k) => k.id === event.data.kindOfQuestionId,
    );

    // Call API to update event question using POST as requested
    await $fetch(
      `${apiBaseUrl}/api/eventQuestions/${props.eventQuestion.id}`,
      {
        method: "PUT",
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
      },
    );

    toast.add({
      title: "Success",
      description: "Event question has been updated successfully",
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("eventQuestionUpdated");
  } catch (error: any) {
    const errorMessage =
      error?.data?.message ||
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to update event question. Please try again.";
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
  eventQuestionUpdated: [];
  close: [];
}>();
</script>

<template>
  <UModal
    v-model:open="open"
    title="Update Event Question"
    description="Edit the event question configuration"
  >
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
            disabled
          />
        </UFormField>

        <UFormField label="Kind of Question" name="kindOfQuestionId" required>
          <USelect
            v-model="state.kindOfQuestionId"
            :items="
              props.kindOfQuestions?.map((k) => ({
                label: k.question,
                value: k.id,
              })) || []
            "
            placeholder="Select kind of question"
            class="w-full"
            disabled
          />
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

        <p v-if="hasOtherPart" class="text-xs text-muted">The other theory percentage will automatically become {{ ((1 - Number(state.persentage || 0)) * 100).toFixed(0) }}%, keeping the combined total at 100%.</p>

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
            label="Update Event Question"
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
