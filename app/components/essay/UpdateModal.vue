<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
const { token } = useAuth();
interface Essay {
  id: number;
  question: string;
  answer: string;
  image?: string | null;
  value: number;
}

const props = defineProps<{
  essay: Essay | null;
}>();

const emit = defineEmits<{
  essayUpdated: [];
  close: [];
}>();

// Strip HTML tags to get plain text for validation
const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();

const schema = z.object({
  question: z.string().refine((val) => stripHtml(val).length >= 10, {
    message: "Question must be at least 10 characters",
  }),
  answer: z.string().refine((val) => stripHtml(val).length >= 5, {
    message: "Answer must be at least 5 characters",
  }),
  image: z.string().optional(),
  value: z.coerce.number().min(0.1, "Score must be at least 0.1"),
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  question: undefined,
  answer: undefined,
  image: undefined,
  value: undefined,
});

// File upload handling
const selectedFile = ref<File | null>(null);
const imagePreview = ref<string>("");

// Watch for essay prop changes to populate form
watch(
  () => props.essay,
  (newEssay) => {
    if (newEssay) {
      state.question = newEssay.question;
      state.answer = newEssay.answer;
      state.image = newEssay.image || "";
      state.value = newEssay.value;

      // If there's an existing image, show it
      if (newEssay.image && newEssay.image.trim() !== "") {
        imagePreview.value = resolveImagePreviewUrl(newEssay.image);
      }

      open.value = true;
    }
  },
  { immediate: true },
);

// Reset form when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    state.question = undefined;
    state.answer = undefined;
    state.image = undefined;
    state.value = undefined;
    selectedFile.value = null;
    imagePreview.value = "";
    emit("close");
  }
});

const toast = useToast();
const loading = ref(false);

function resolveImagePreviewUrl(imagePath?: string | null): string {
  const trimmed = (imagePath || "").trim();
  if (!trimmed) return "";
  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
  if (/^(data|blob):/i.test(trimmed)) return trimmed;
  return `${apiBaseUrl}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

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
  state.image = "";
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.essay) return;

  loading.value = true;

  try {
    const formData = new FormData();
    formData.append("question", event.data.question);
    formData.append("answer", event.data.answer);
    formData.append("value", String(event.data.value));
    if (selectedFile.value) {
      formData.append("image", selectedFile.value);
    } else {
      formData.append("image", state.image || "");
    }

    // Call API to update essay
    await $fetch(`${apiBaseUrl}/api/essays/${props.essay.id}`, {
      method: "PUT",
      body: formData,
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: "Essay question has been updated successfully",
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("essayUpdated");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to update essay question. Please try again.";
    toast.add({
      title: "Error",
      description: errorMessage,
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
    title="Update Essay Question"
    description="Edit the essay question information"
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
            placeholder="Enter the essay question..."
          />
        </UFormField>

        <UFormField label="Answer" name="answer" required>
          <RichTextEditor
            v-model="state.answer"
            placeholder="Enter the correct answer..."
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

        <UFormField label="Score" name="value" required>
          <UInput
            v-model="state.value"
            type="number"
            step="0.1"
            min="0.1"
            class="w-full"
            placeholder="Enter score value (e.g., 4.5)"
          />
        </UFormField>

        <!-- Show summary -->
        <div
          v-if="
            stripHtml(state.question || '').length > 0 &&
            stripHtml(state.answer || '').length > 0 &&
            state.value
          "
          class="p-3 bg-elevated/50 rounded border border-default space-y-2"
        >
          <div class="text-sm font-medium">Summary:</div>
          <div class="text-sm">
            <span class="text-muted">Question:</span>
            <div
              class="font-medium mt-1 rich-preview [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
              v-html="state.question"
            />
          </div>
          <div class="text-sm">
            <span class="text-muted">Answer:</span>
            <div
              class="font-medium mt-1 rich-preview [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
              v-html="state.answer"
            />
          </div>

          <div class="text-sm flex items-center gap-2">
            <span class="text-muted">Image:</span>
            <span class="font-medium">{{ state.image || "No image" }}</span>
          </div>
          <div class="text-sm flex items-center gap-2">
            <span class="text-muted">Score:</span>
            <span class="font-medium text-primary">{{ state.value }}</span>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="open = false"
          />
          <UButton
            label="Update Essay"
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
