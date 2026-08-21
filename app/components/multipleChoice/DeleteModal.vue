<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
const { token } = useAuth();
interface MultipleChoice {
  id: number;
  question: string;
  a: string;
  b: string;
  c: string;
  d: string;
  image: string;
  key: string;
}

const props = defineProps<{
  question: MultipleChoice | null;
}>();

const emit = defineEmits<{
  questionDeleted: [];
  close: [];
}>();

const open = ref(false);
const loading = ref(false);

// Watch for question prop changes to open modal
watch(
  () => props.question,
  (newQuestion) => {
    if (newQuestion) {
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
  if (!props.question) return;

  loading.value = true;

  try {
    await $fetch(
      `${apiBaseUrl}/api/multipleChoices/${props.question.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    toast.add({
      title: "Success",
      description: "Multiple choice question has been deleted successfully",
      color: "success",
    });

    open.value = false;
    emit("questionDeleted");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to delete question",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

function truncateHtml(html: string, maxLength: number = 150) {
  if (html.length <= maxLength) return html;
  return html.substring(0, maxLength) + "...";
}
</script>

<template>
  <UModal v-model:open="open" title="Delete Multiple Choice Question">
    <template #description>
      <p>
        Are you sure you want to delete this question?
        <strong>This action cannot be undone.</strong>
      </p>
      <div class="mt-3 p-3 bg-elevated/50 rounded border border-default">
        <p class="text-sm font-medium mb-2">Question:</p>
        <p
          class="text-sm text-muted"
          v-html="truncateHtml(question?.question || '')"
        ></p>
        <div>A: {{ question?.a }}</div>
        <div>B: {{ question?.b }}</div>
        <div>C: {{ question?.c }}</div>
        <div>D: {{ question?.d }}</div>
        <div class="mt-2 text-sm">
          <span class="text-muted">Correct Answer:</span>
          <span class="font-bold text-success ml-1">{{ question?.key }}</span>
        </div>
      </div>
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
