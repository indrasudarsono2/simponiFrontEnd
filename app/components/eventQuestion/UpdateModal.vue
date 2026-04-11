<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import ip from "../../utils/config.json";
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
}

interface Event {
  id: number;
  name: string;
  sectorId?: number;
}

interface KindOfQuestion {
  id: number;
  question: string;
}

const props = defineProps<{
  eventQuestion: EventQuestion | null;
  events: Event[];
  kindOfQuestions: KindOfQuestion[];
}>();

const schema = z.object({
  eventId: z.number().min(1, "Event is required"),
  kindOfQuestionId: z.number().min(1, "Kind of Question is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  persentage: z
    .number()
    .min(0, "Percentage must be at least 0")
    .max(1, "Percentage must be at most 1"),
  minutes: z.number().min(1, "Minutes must be at least 1"),
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
      `http://${ip.ipBackEnd}/api/eventQuestions/${props.eventQuestion.id}`,
      {
        method: "PUT",
        body: {
          eventId: event.data.eventId,
          sectorId: selectedEvent?.sectorId,
          kindOfQuestionId: event.data.kindOfQuestionId,
          quantity: event.data.quantity,
          persentage: event.data.persentage,
          minutes: event.data.minutes,
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

        <UFormField label="Minutes" name="minutes" required>
          <UInput
            v-model="state.minutes"
            type="number"
            class="w-full"
            placeholder="Enter minutes"
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
