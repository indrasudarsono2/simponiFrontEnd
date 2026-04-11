<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import ip from "../../utils/config.json";
const { token } = useAuth();
interface MultipleChoice {
  id: number;
  question: string;
  a: string;
  b: string;
  c: string;
  d: string;
  image: string | null;
  key: string;
}

const props = defineProps<{
  question: MultipleChoice | null;
}>();

const emit = defineEmits<{
  questionUpdated: [];
  close: [];
}>();

const schema = z.object({
  question: z.string().min(5, "Question must be at least 5 characters"),
  a: z.string().min(1, "Option A is required"),
  b: z.string().min(1, "Option B is required"),
  c: z.string().min(1, "Option C is required"),
  d: z.string().min(1, "Option D is required"),
  key: z.enum(["A", "B", "C", "D"]),
  image: z.string().optional(),
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  question: undefined,
  a: undefined,
  b: undefined,
  c: undefined,
  d: undefined,
  key: undefined,
  image: undefined,
});

// Watch for question prop changes to populate form
watch(
  () => props.question,
  (newQuestion) => {
    if (newQuestion) {
      state.question = newQuestion.question;
      state.a = newQuestion.a;
      state.b = newQuestion.b;
      state.c = newQuestion.c;
      state.d = newQuestion.d;
      state.key = newQuestion.key as "A" | "B" | "C" | "D";
      state.image = newQuestion.image || undefined;
      open.value = true;
    }
  },
  { immediate: true },
);

// Reset form when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    Object.assign(state, {
      question: undefined,
      a: undefined,
      b: undefined,
      c: undefined,
      d: undefined,
      key: undefined,
      image: undefined,
    });
    emit("close");
  }
});

const toast = useToast();
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.question) return;

  loading.value = true;

  try {
    await $fetch(
      `http://${ip.ipBackEnd}/api/multipleChoices/${props.question.id}`,
      {
        method: "PUT",
        body: {
          question: event.data.question,
          a: event.data.a,
          b: event.data.b,
          c: event.data.c,
          d: event.data.d,
          image: event.data.image,
          key: event.data.key,
        },
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    toast.add({
      title: "Success",
      description: "Multiple choice question has been updated successfully",
      color: "success",
    });

    open.value = false;
    emit("questionUpdated");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to update question",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

// File upload handling
const selectedFile = ref<File | null>(null);
const imagePreview = ref<string>("");
function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (file) {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.add({
        title: "Error",
        description: "Please select an image file",
        color: "error",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.add({
        title: "Error",
        description: "Image size must be less than 2MB",
        color: "error",
      });
      return;
    }

    selectedFile.value = file;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.value = e.target?.result as string;
      state.image = file.name; // Store filename
    };
    reader.readAsDataURL(file);
  }
}

function removeImage() {
  selectedFile.value = null;
  imagePreview.value = "";
  state.image = undefined;
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Update Multiple Choice Question"
    description="Edit the multiple choice question"
    :ui="{
      content: 'max-w-5xl',
    }"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Question" name="question" required>
          <RichTextEditor
            v-model="state.question"
            placeholder="Enter the question text..."
            :rows="3"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Option A" name="a" required>
          <UTextarea
            v-model="state.a"
            placeholder="Enter option A"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Option B" name="b" required>
          <UTextarea
            v-model="state.b"
            placeholder="Enter option B"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Option C" name="c" required>
          <UTextarea
            v-model="state.c"
            placeholder="Enter option C"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Option D" name="d" required>
          <UTextarea
            v-model="state.d"
            placeholder="Enter option D"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Correct Answer (Key)" name="key" required>
          <USelect
            v-model="state.key"
            :items="[
              { label: 'A', value: 'A' },
              { label: 'B', value: 'B' },
              { label: 'C', value: 'C' },
              { label: 'D', value: 'D' },
            ]"
            label-key="label"
            value-key="value"
            placeholder="Select correct answer"
          />
        </UFormField>

        <UFormField label="Image (Optional)" name="image">
          <div class="space-y-2">
            <input
              type="file"
              accept="image/*"
              class="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
              @change="handleFileChange"
            />
            <p class="text-xs text-muted">
              Maximum file size: 2MB. Supported formats: JPG, PNG, GIF
            </p>

            <!-- Image Preview -->
            <div v-if="imagePreview" class="relative mt-2">
              <img
                :src="imagePreview"
                alt="Preview"
                class="max-w-full h-auto max-h-48 rounded border border-default"
              />
              <UButton
                icon="i-lucide-x"
                color="error"
                variant="solid"
                size="xs"
                class="absolute top-2 right-2"
                @click="removeImage"
              />
            </div>
          </div>
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
            label="Update Question"
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
