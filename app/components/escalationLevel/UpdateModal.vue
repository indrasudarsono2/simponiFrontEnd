<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import ip from "../../utils/config.json";

interface EscalationLevel {
  id: number;
  level: string;
  time: number | null;
}

const props = defineProps<{
  escalationLevel: EscalationLevel | null;
}>();

const emit = defineEmits<{
  escalationLevelUpdated: [];
  close: [];
}>();

const { token } = useAuth();
const toast = useToast();

const schema = z.object({
  level: z.coerce
    .number()
    .int("Level must be a whole number")
    .positive("Level must be greater than 0"),
  time: z.coerce
    .number()
    .int("Time must be a whole number")
    .min(15, "Time must be at least 15 minutes")
    .refine((value) => value % 15 === 0, {
      message: "Time must be a multiple of 15 minutes",
    }),
});

type Schema = z.output<typeof schema>;

const open = ref(false);
const loading = ref(false);
const state = reactive<Partial<Schema>>({
  level: undefined,
  time: undefined,
});

watch(
  () => props.escalationLevel,
  (escalationLevel) => {
    if (!escalationLevel) return;

    state.level = Number(escalationLevel.level);
    state.time = escalationLevel.time || undefined;
    open.value = true;
  },
);

watch(open, (isOpen) => {
  if (isOpen) return;

  state.level = undefined;
  state.time = undefined;
  emit("close");
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.escalationLevel) return;

  loading.value = true;

  try {
    await $fetch(
      `http://${ip.ipBackEnd}/api/escalationLevels/${props.escalationLevel.id}`,
      {
        method: "PUT",
        body: {
          level: event.data.level,
          time: event.data.time,
        },
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    toast.add({
      title: "Success",
      description: `Escalation level ${event.data.level} has been updated`,
      color: "success",
    });

    open.value = false;
    emit("escalationLevelUpdated");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to update escalation level",
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
    title="Update Escalation Level"
    description="Edit this escalation level"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UAlert
          color="info"
          variant="soft"
          icon="i-lucide-info"
          title="Level order"
          description="Lower numbers mean lower escalation levels. Higher numbers mean higher escalation levels."
        />

        <UAlert
          color="warning"
          variant="soft"
          icon="i-lucide-clock"
          title="15-minute notification schedule"
          description="Time is cumulative from when the ongoing issue starts. Emails are processed every 15 minutes and may be sent up to 15 minutes after the threshold is reached."
        />

        <UFormField label="Level" name="level" required>
          <UInput
            v-model="state.level"
            class="w-full"
            type="number"
            min="1"
            placeholder="e.g., 1"
          />
        </UFormField>

        <UFormField label="Time" name="time" required>
          <UInput
            v-model="state.time"
            class="w-full"
            type="number"
            min="15"
            step="15"
            placeholder="e.g., 15, 30, or 45"
          >
            <template #trailing>
              <span class="text-xs text-muted">minutes</span>
            </template>
          </UInput>
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
            label="Update Level"
            color="primary"
            type="submit"
            :loading="loading"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
