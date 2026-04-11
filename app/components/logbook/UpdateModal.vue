<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
const { token } = useAuth();
const { apiFetch } = useApiFetch();
interface Logbook {
  id: number;
  userNik: string;
  note: string;
  file: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

const props = defineProps<{
  logbook: Logbook | null;
}>();

const schema = z.object({
  note: z.string().min(2, "Note must be at least 2 characters"),
  file: z.instanceof(File).optional(),
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  note: undefined,
  file: undefined,
});

// Watch for logbook prop changes to populate form
watch(
  () => props.logbook,
  (newLogbook) => {
    if (newLogbook) {
      state.note = newLogbook.note;
      open.value = true;
    }
  },
  { immediate: true },
);

// Reset form when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    state.note = undefined;
    state.file = undefined;
    emit("close");
  }
});

const toast = useToast();
const loading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    state.file = target.files[0];
  }
}

function triggerFileInput() {
  fileInput.value?.click();
}

// Get filename from path
function getFilename(path: string): string {
  return path.split("/").pop() || path;
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.logbook) return;

  loading.value = true;

  try {
    // Use JSON body
    const formData = new FormData();

    formData.append("note", event.data.note);

    if (event.data.file instanceof File) {
      formData.append("file", event.data.file);
    }

    // Call API to update logbook
    await apiFetch(`/api/logbookUser/${props.logbook.id}`, {
      method: "PUT",
      body: formData,
    });

    toast.add({
      title: "Success",
      description: `Logbook "${event.data.note}" has been updated successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("logbookUpdated");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to update logbook. Please try again.";
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
  logbookUpdated: [];
  close: [];
}>();
</script>

<template>
  <UModal
    v-model:open="open"
    title="Update Logbook"
    description="Edit the logbook information"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          label="Note"
          placeholder="Enter logbook note"
          name="note"
          required
        >
          <UInput
            v-model="state.note"
            class="w-full"
            placeholder="e.g., Logbook 2025 SMT 1"
          />
        </UFormField>

        <UFormField label="Logbook File" name="file">
          <div class="space-y-2">
            <div class="flex items-center gap-2 p-2 bg-elevated/50 rounded">
              <UIcon name="i-lucide-file-text" class="text-primary" />
              <span class="text-sm">{{
                logbook ? getFilename(logbook.file) : ""
              }}</span>
            </div>
            <div class="flex items-center gap-2">
              <input
                ref="fileInput"
                type="file"
                accept=".pdf,.doc,.docx"
                class="hidden"
                @change="handleFileChange"
              />
              <UButton
                label="Replace File"
                color="neutral"
                variant="outline"
                icon="i-lucide-upload"
                @click="triggerFileInput"
              />
              <span v-if="state.file" class="text-sm text-muted">
                New: {{ state.file.name }}
              </span>
              <span v-else class="text-sm text-muted">Keep existing file</span>
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
            label="Update Logbook"
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
