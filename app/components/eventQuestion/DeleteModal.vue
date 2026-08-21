<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
const { token } = useAuth();
interface EventQuestion {
  id: number;
  eventName: string;
  kindOfQuestion: string;
}

const props = defineProps<{
  eventQuestion: EventQuestion | null;
}>();

const open = ref(false);
const loading = ref(false);

// Watch for eventQuestion prop changes to open modal
watch(
  () => props.eventQuestion,
  (newEventQuestion) => {
    if (newEventQuestion) {
      open.value = true;
    }
  },
  { immediate: true },
);

// Reset when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    emit("close");
  }
});

const toast = useToast();

async function onSubmit() {
  if (!props.eventQuestion) return;

  loading.value = true;

  try {
    // Call API to delete event question
    await $fetch(
      `${apiBaseUrl}/api/eventQuestions/${props.eventQuestion.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    toast.add({
      title: "Success",
      description: `Event question has been deleted successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("eventQuestionDeleted");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to delete event question. Please try again.";
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
  eventQuestionDeleted: [];
  close: [];
}>();
</script>

<template>
  <UModal v-model:open="open" title="Delete Event Question">
    <template #description>
      <p>
        Are you sure you want to delete the event question for
        <strong>"{{ eventQuestion?.eventName }}"</strong> with kind
        <strong>"{{ eventQuestion?.kindOfQuestion }}"</strong>? This action
        cannot be undone.
      </p>
    </template>
    <template #body>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="subtle"
          :disabled="loading"
          @click="open = false"
        />
        <UButton
          label="Delete"
          color="error"
          variant="solid"
          :loading="loading"
          @click="onSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
