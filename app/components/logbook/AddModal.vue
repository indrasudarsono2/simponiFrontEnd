<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
const { apiFetch } = useApiFetch();
const { token } = useAuth();
const schema = z.object({
  note: z.string().min(2, "Note must be at least 2 characters"),
  dateRange: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  }),
  file: z.instanceof(File).optional(),
});

const open = ref(false);
const createMethod = ref<"upload" | "generate">("upload");

type Schema = z.output<typeof schema>;

const state = reactive<Schema>({
  note: "",
  dateRange: {
    start: "",
    end: "",
  },
  file: undefined,
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

// Generate logbook based on date range
function generateLogbook() {
  if (!state.dateRange?.start || !state.dateRange?.end) {
    toast.add({
      title: "Error",
      description: "Please select a date range",
      color: "error",
    });
    return;
  }

  const startStr = state.dateRange.start;
  const endStr = state.dateRange.end;

  if (new Date(endStr) < new Date(startStr)) {
    toast.add({
      title: "Error",
      description: "End date must be after start date",
      color: "error",
    });
    return;
  }

  // Format dates for display
  const startDate = new Date(startStr);
  const endDate = new Date(endStr);
  const formattedStart = startDate.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const formattedEnd = endDate.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  state.note = `Logbook ${formattedStart} - ${formattedEnd}`;

  toast.add({
    title: "Generated",
    description: `Logbook generated for period: ${formattedStart} to ${formattedEnd}`,
    color: "success",
  });
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;

  try {
    // Use JSON body
    const formData = new FormData();

    formData.append("note", event.data.note);

    if (event.data.file instanceof File) {
      formData.append("file", event.data.file);
    }
    // Call API to create logbook
    await apiFetch("/api/logbookUser", {
      method: "POST",
      body: formData,
    });

    toast.add({
      title: "Success",
      description: `Logbook "${event.data.note}" has been created successfully`,
      color: "success",
    });

    // Reset form and close modal
    state.note = "";
    state.dateRange.start = "";
    state.dateRange.end = "";
    state.file = undefined;
    createMethod.value = "upload";

    open.value = false;

    // Emit event to refresh parent table
    emit("logbookAdded");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to create logbook. Please try again.";
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
  logbookAdded: [];
}>();
</script>

<template>
  <UModal
    v-model:open="open"
    title="Add New Logbook"
    description="Create a new logbook by uploading file or generating from date range"
  >
    <UButton label="Add Logbook" icon="i-lucide-plus" color="primary" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <!-- Method Selection -->
        <div class="flex gap-2 p-1 bg-elevated/50 rounded-lg">
          <UButton
            :label="'Upload File'"
            :color="createMethod === 'upload' ? 'primary' : 'neutral'"
            :variant="createMethod === 'upload' ? 'solid' : 'ghost'"
            class="flex-1"
            @click="createMethod = 'upload'"
          />
          <UButton
            :label="'Generate'"
            :color="createMethod === 'generate' ? 'primary' : 'neutral'"
            :variant="createMethod === 'generate' ? 'solid' : 'ghost'"
            class="flex-1"
            @click="createMethod = 'generate'"
          />
        </div>

        <!-- Upload File Option -->
        <div v-if="createMethod === 'upload'" class="space-y-4">
          <UFormField label="Logbook File" name="file">
            <div class="flex items-center gap-2">
              <input
                ref="fileInput"
                type="file"
                accept=".pdf,.doc,.docx"
                class="hidden"
                @change="handleFileChange"
              />
              <UButton
                label="Choose File"
                color="neutral"
                variant="outline"
                icon="i-lucide-upload"
                @click="triggerFileInput"
              />
              <span v-if="state.file" class="text-sm text-muted">
                {{ state.file.name }}
              </span>
              <span v-else class="text-sm text-muted">No file selected</span>
            </div>
          </UFormField>
        </div>

        <!-- Generate by Date Range Option -->
        <div v-else class="p-4 bg-elevated/50 rounded-lg space-y-4">
          <div class="flex items-center gap-2 mb-2">
            <UIcon name="i-lucide-calendar-range" class="text-primary" />
            <span class="font-medium">Generate Logbook by Date Range</span>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Start Date" name="dateRange.start">
              <UInput
                v-model="state.dateRange.start"
                type="date"
                class="w-full"
                icon="i-lucide-calendar"
              />
            </UFormField>

            <UFormField label="End Date" name="dateRange.end">
              <UInput
                v-model="state.dateRange.end"
                type="date"
                class="w-full"
                icon="i-lucide-calendar"
              />
            </UFormField>
          </div>

          <UButton
            label="Generate Logbook"
            color="primary"
            variant="soft"
            icon="i-lucide-sparkles"
            block
            :loading="loading && !state.note"
            @click="generateLogbook"
          />
        </div>

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

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="open = false"
          />
          <UButton
            label="Create Logbook"
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
