<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
const { token } = useAuth();
const emit = defineEmits<{
  questionAdded: [];
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

const toast = useToast();
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;

  try {
    const formData = new FormData();
    formData.append("question", event.data.question);
    formData.append("a", event.data.a);
    formData.append("b", event.data.b);
    formData.append("c", event.data.c);
    formData.append("d", event.data.d);
    formData.append("key", event.data.key);
    if (selectedFile.value) {
      formData.append("image", selectedFile.value);
    }

    await $fetch(`${apiBaseUrl}/api/multipleChoices`, {
      method: "POST",
      body: formData,
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: "Multiple choice question has been created successfully",
      color: "success",
    });

    // Reset form and close modal
    Object.assign(state, {
      question: undefined,
      a: undefined,
      b: undefined,
      c: undefined,
      d: undefined,
      key: undefined,
      image: undefined,
    });
    selectedFile.value = null;
    imagePreview.value = "";
    if (fileInput.value) {
      fileInput.value.value = "";
    }
    open.value = false;

    emit("questionAdded");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to create question",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

// File upload handling
const selectedFile = ref<File | null>(null);
const imagePreview = ref<string>("");
const fileInput = ref<HTMLInputElement | null>(null);
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
  if (fileInput.value) {
    fileInput.value.value = "";
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Add New Multiple Choice Question"
    description="Create a new multiple choice question with options and correct answer"
    :ui="{
      content: 'max-w-5xl',
    }"
  >
    <UButton label="Add Question" icon="i-lucide-plus" color="primary" />

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
              ref="fileInput"
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
                type="button"
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
            label="Create Question"
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
