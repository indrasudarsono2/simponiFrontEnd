<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
const { apiFetch } = useApiFetch();
const { authUser } = useAuth();
const canSyncEchain = computed(() => authUser.value?.authenticationType !== "LOCAL");
defineOptions({
  name: "MedexUserAddModal",
});

const schema = z.object({
  institution: z.string().min(2, "Institution must be at least 2 characters"),
  released: z.string().min(1, "Released date is required"),
  expired: z.string().min(1, "Expired date is required"),
  examiner: z.string().min(2, "Examiner must be at least 2 characters"),
  file: z.instanceof(File).optional(),
  echainFileName: z.string().nullable().optional(),
  echainFileUrl: z.string().nullable().optional(),
  echainFileUrlExpiresAt: z.string().nullable().optional(),
  echainFileMimeType: z.string().nullable().optional(),
  echainFileSizeBytes: z.number().nullable().optional(),
});

const open = ref(false);
const syncMode = ref(false);
const syncLoading = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  institution: undefined,
  released: undefined,
  expired: undefined,
  examiner: undefined,
  file: undefined,
  echainFileName: null,
  echainFileUrl: null,
  echainFileUrlExpiresAt: null,
  echainFileMimeType: null,
  echainFileSizeBytes: null,
});

const toast = useToast();
const loading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

interface MedexUserSyncResponse {
  success: boolean;
  message?: string;
  data: {
    institution?: string;
    released?: string;
    expired?: string;
    examiner?: string | null;
    fileName?: string | null;
    fileUrl?: string | null;
    fileUrlExpiresAt?: string | null;
    fileMimeType?: string | null;
    fileSizeBytes?: number | null;
  };
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    state.file = target.files[0];
    state.echainFileName = null;
    state.echainFileUrl = null;
    state.echainFileUrlExpiresAt = null;
    state.echainFileMimeType = null;
    state.echainFileSizeBytes = null;
  }
}

function triggerFileInput() {
  fileInput.value?.click();
}

function toggleSyncMode() {
  syncMode.value = !syncMode.value;
  if (!syncMode.value) {
    // Reset form when switching to manual mode
    state.institution = undefined;
    state.released = undefined;
    state.expired = undefined;
    state.examiner = undefined;
    state.file = undefined;
    state.echainFileName = null;
    state.echainFileUrl = null;
    state.echainFileUrlExpiresAt = null;
    state.echainFileMimeType = null;
    state.echainFileSizeBytes = null;
  }
}

async function syncFromSystem() {
  syncLoading.value = true;

  try {
    const response = (await apiFetch("/api/medexUser/sync-echain", {
      method: "POST",
    })) as MedexUserSyncResponse;

    state.institution = response.data.institution;
    state.released = response.data.released;
    state.expired = response.data.expired;
    state.examiner = response.data.examiner ?? undefined;
    state.file = undefined;
    state.echainFileName = response.data.fileName ?? null;
    state.echainFileUrl = response.data.fileUrl ?? null;
    state.echainFileUrlExpiresAt = response.data.fileUrlExpiresAt ?? null;
    state.echainFileMimeType = response.data.fileMimeType ?? null;
    state.echainFileSizeBytes = response.data.fileSizeBytes ?? null;

    toast.add({
      title: "Sync Success",
      description: response.data.fileName
        ? `Medex data synced from e-chain: ${response.data.fileName}`
        : "Medex data synced from e-chain. Please review before saving.",
      color: "success",
    });
  } catch (error: any) {
    const errorMessage =
      error?.data?.message ||
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to sync Medex data. Please try again.";
    toast.add({
      title: "Sync Failed",
      description: errorMessage,
      color: "error",
    });
  } finally {
    syncLoading.value = false;
  }
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;

  try {
    const formData = new FormData();

    formData.append("institution", event.data.institution);
    formData.append("released", event.data.released);
    formData.append("expired", event.data.expired);
    formData.append("examiner", event.data.examiner);

    if (event.data.file instanceof File) {
      formData.append("file", event.data.file);
    }

    if (!event.data.file && event.data.echainFileUrl) {
      formData.append("echainFileUrl", event.data.echainFileUrl);
      if (event.data.echainFileName) {
        formData.append("echainFileName", event.data.echainFileName);
      }
      if (event.data.echainFileMimeType) {
        formData.append("echainFileMimeType", event.data.echainFileMimeType);
      }
      if (event.data.echainFileUrlExpiresAt) {
        formData.append(
          "echainFileUrlExpiresAt",
          event.data.echainFileUrlExpiresAt,
        );
      }
      if (event.data.echainFileSizeBytes != null) {
        formData.append(
          "echainFileSizeBytes",
          String(event.data.echainFileSizeBytes),
        );
      }
    }

    // Call API to create MedexUser
    await apiFetch("/api/medexUser", {
      method: "POST",
      body: formData,
    });

    toast.add({
      title: "Success",
      description: `Medex record has been created successfully`,
      color: "success",
    });

    // Reset form and close modal
    state.institution = undefined;
    state.released = undefined;
    state.expired = undefined;
    state.examiner = undefined;
    state.file = undefined;
    state.echainFileName = null;
    state.echainFileUrl = null;
    state.echainFileUrlExpiresAt = null;
    state.echainFileMimeType = null;
    state.echainFileSizeBytes = null;
    syncMode.value = false;
    open.value = false;

    // Emit event to refresh parent table
    emit("medexUserAdded");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to create Medex record. Please try again.";
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
  medexUserAdded: [];
}>();
</script>

<template>
  <div>
    <UButton
      label="Add Medex"
      icon="i-lucide-plus"
      color="primary"
      @click="open = true"
    />

    <UModal
      v-model:open="open"
      title="Add New Medex"
      description="Create a new Medex record by syncing from system or manual input"
    >
      <template #body>
        <UForm
          :schema="schema"
          :state="state"
          class="space-y-4"
          @submit="onSubmit"
        >
          <!-- Mode Selection -->
          <div class="flex gap-2 p-1 bg-elevated/50 rounded-lg">
            <UButton
              :label="'Manual Input'"
              :color="!syncMode ? 'primary' : 'neutral'"
              :variant="!syncMode ? 'solid' : 'ghost'"
              class="flex-1"
              @click="toggleSyncMode"
            />
            <UButton
              v-if="canSyncEchain"
              :label="'Sync from System'"
              :color="syncMode ? 'primary' : 'neutral'"
              :variant="syncMode ? 'solid' : 'ghost'"
              class="flex-1"
              @click="toggleSyncMode"
            />
          </div>

          <!-- Sync Mode: Sync Button -->
          <div v-if="syncMode && canSyncEchain" class="p-4 bg-elevated/50 rounded-lg space-y-4">
            <div class="flex items-center gap-2 mb-2">
              <UIcon name="i-lucide-refresh-cw" class="text-primary" />
              <span class="font-medium">Sync from External Medex System</span>
            </div>

            <p class="text-sm text-muted">
              Click the button below to fetch Medex data from the external
              system. Institution, Released, and Expired dates will be filled
              automatically.
            </p>

            <UButton
              label="Sync Medex Data"
              color="primary"
              variant="soft"
              icon="i-lucide-download-cloud"
              block
              :loading="syncLoading"
              @click="syncFromSystem"
            />

            <div v-if="state.institution" class="p-3 bg-success/10 rounded-lg">
              <p class="text-sm text-success font-medium">
                ✓ Data synced successfully!
              </p>
              <p class="text-xs text-muted mt-1">
                Institution: {{ state.institution }}
              </p>
              <p
                v-if="state.echainFileName"
                class="text-xs text-muted mt-1"
              >
                File: {{ state.echainFileName }}
              </p>
            </div>
          </div>

          <!-- Manual Mode: File Upload -->
          <div v-else class="space-y-4">
            <UFormField label="Medex File" name="file">
              <div class="flex items-center gap-2">
                <input
                  ref="fileInput"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
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
                <span
                  v-else-if="state.echainFileName"
                  class="text-sm text-muted"
                >
                  {{ state.echainFileName }}
                </span>
                <span v-else class="text-sm text-muted">No file selected</span>
              </div>
            </UFormField>
          </div>

          <!-- Form Fields -->
          <UFormField
            label="Institution"
            placeholder="Enter institution name"
            name="institution"
            required
          >
            <UInput
              v-model="state.institution"
              class="w-full"
              placeholder="e.g., RS Aviation"
              :disabled="syncMode && !!state.institution"
            />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Released Date" name="released" required>
              <UInput
                v-model="state.released"
                type="date"
                class="w-full"
                icon="i-lucide-calendar"
                :disabled="syncMode && !!state.released"
              />
            </UFormField>

            <UFormField label="Expired Date" name="expired" required>
              <UInput
                v-model="state.expired"
                type="date"
                class="w-full"
                icon="i-lucide-calendar"
                :disabled="syncMode && !!state.expired"
              />
            </UFormField>
          </div>

          <UFormField
            label="Examiner"
            placeholder="Enter examiner name"
            name="examiner"
            required
          >
            <UInput
              v-model="state.examiner"
              class="w-full"
              placeholder="e.g., DR. DINAR"
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
              label="Create Medex"
              color="primary"
              variant="solid"
              type="submit"
              :loading="loading"
            />
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>
