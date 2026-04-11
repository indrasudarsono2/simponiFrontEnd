<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import ip from "../../utils/config.json";
const { apiFetch } = useApiFetch();
const { token } = useAuth();
const schema = z.object({
  note: z.string().min(2, "Note must be at least 2 characters"),
  licenseExpiredDate: z.string().min(1, "License expired date is required"),
  file: z.instanceof(File).optional(),
  syncData: z.boolean().default(false),
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  note: undefined,
  licenseExpiredDate: undefined,
  file: undefined,
  syncData: false,
});

const toast = useToast();
const loading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

// Mock sync data from another system
const mockSyncData = {
  note: "License 2025 SMT 1 - Synced from System",
  fileName: "indra2025smt1_synced.pdf",
};

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    state.file = target.files[0];
  }
}

function triggerFileInput() {
  fileInput.value?.click();
}

function syncFromSystem() {
  // Simulate syncing data from another system
  loading.value = true;

  setTimeout(() => {
    state.note = mockSyncData.note;
    toast.add({
      title: "Sync Success",
      description: `Data synced from external system: ${mockSyncData.fileName}`,
      color: "success",
    });
    loading.value = false;
  }, 1000);
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;

  try {
    // Create FormData for file upload
    const formData = new FormData();

    formData.append("note", event.data.note);
    formData.append("licenseExpiredDate", event.data.licenseExpiredDate);

    // Append file ONLY if it exists and is a File
    if (event.data.file instanceof File) {
      formData.append("file", event.data.file);
    }

    // Call local Nuxt API route (which will forward to backend)
    await apiFetch("/api/licenseUser/", {
      method: "POST",
      body: formData,
    });

    toast.add({
      title: "Success",
      description: `License "${event.data.note}" has been created successfully`,
      color: "success",
    });

    // Reset form and close modal
    state.note = undefined;
    state.licenseExpiredDate = undefined;
    state.file = undefined;
    state.syncData = false;
    open.value = false;

    // Emit event to refresh parent table
    emit("licenseAdded");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to create license. Please try again.";
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
  licenseAdded: [];
}>();
</script>

<template>
  <UModal
    v-model:open="open"
    title="Add New License"
    description="Create a new license document"
  >
    <UButton label="Add License" icon="i-lucide-plus" color="primary" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <!-- Sync Button -->
        <div class="flex items-center gap-2 p-3 bg-elevated/50 rounded-lg">
          <UIcon name="i-lucide-refresh-cw" class="text-primary" />
          <div class="flex-1">
            <p class="text-sm font-medium">Sync from External System</p>
            <p class="text-xs text-muted">
              Import license data from another system
            </p>
          </div>
          <UButton
            label="Sync"
            color="primary"
            variant="soft"
            size="sm"
            :loading="loading && !state.note"
            @click="syncFromSystem"
          />
        </div>

        <UFormField
          label="Note"
          placeholder="Enter license note"
          name="note"
          required
        >
          <UInput
            v-model="state.note"
            class="w-full"
            placeholder="e.g., License 2025 SMT 1"
          />
        </UFormField>

        <UFormField
          label="License Expiration Date"
          name="licenseExpiredDate"
          required
        >
          <UInput
            v-model="state.licenseExpiredDate"
            type="date"
            class="w-full"
          />
        </UFormField>

        <UFormField label="License File" name="file">
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

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="open = false"
          />
          <UButton
            label="Create License"
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
