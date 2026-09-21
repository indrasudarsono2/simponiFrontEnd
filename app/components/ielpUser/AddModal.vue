<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
const { authUser } = useAuth();
const canSyncEchain = computed(() => authUser.value?.authenticationType !== "LOCAL");

defineOptions({
  name: "IELPUserAddModal",
});

const schema = z.object({
  institution: z.string().min(2, "Institution must be at least 2 characters"),
  level: z.string().min(1, "Level is required"),
  released: z.string().min(1, "Released date is required"),
  expired: z.string().optional(),
  rater: z.string().min(2, "Rater must be at least 2 characters"),
  file: z.instanceof(File).optional(),
  echainFileName: z.string().nullable().optional(),
  echainFileUrl: z.string().nullable().optional(),
  echainFileUrlExpiresAt: z.string().nullable().optional(),
  echainFileMimeType: z.string().nullable().optional(),
  echainFileSizeBytes: z.number().nullable().optional(),
  requestedCheckerNik: z.string().optional(),
  syncReceipt: z.string().nullable().optional(),
});

const open = ref(false);
const syncMode = ref(false);
const syncLoading = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  institution: undefined,
  level: undefined,
  released: undefined,
  expired: undefined,
  rater: undefined,
  file: undefined,
  echainFileName: null,
  echainFileUrl: null,
  echainFileUrlExpiresAt: null,
  echainFileMimeType: null,
  echainFileSizeBytes: null,
  requestedCheckerNik: undefined,
  syncReceipt: null,
});

const toast = useToast();
const loading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const { apiFetch } = useApiFetch();
const checkerOptions = ref<Array<{ label: string; value: string }>>([]);
const levelOptions = ["4", "5", "6"];

function calculateIelpExpiry(level?: string, released?: string) {
  if (!level || !released || level === "6") return undefined;
  const date = new Date(`${released}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  date.setUTCFullYear(date.getUTCFullYear() + (level === "4" ? 3 : 6));
  return date.toISOString().slice(0, 10);
}

watch([() => state.level, () => state.released, syncMode], ([level, released, synced]) => {
  if (!synced) state.expired = calculateIelpExpiry(level, released);
});

watch(open, async (isOpen) => {
  if (!isOpen || checkerOptions.value.length) return;
  try {
    const checkers = await apiFetch("/api/credentialVerification/checkers") as Array<{ nik: string; name?: string; ratings?: string[] }>;
    checkerOptions.value = checkers.map((checker) => ({
      value: checker.nik,
      label: `${checker.name || checker.nik}${checker.ratings?.length ? ` [${checker.ratings.join(", ")}]` : ""}`,
    }));
  } catch (error: any) {
    toast.add({ title: "Unable to load checkers", description: error?.data?.message || error?.message, color: "error" });
  }
});

interface IelpUserSyncResponse {
  success: boolean;
  message?: string;
  data: {
    institution?: string;
    level?: string;
    released?: string;
    expired?: string;
    rater?: string | null;
    fileName?: string | null;
    fileUrl?: string | null;
    fileUrlExpiresAt?: string | null;
    fileMimeType?: string | null;
    fileSizeBytes?: number | null;
  };
  syncReceipt: string;
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
    state.syncReceipt = null;
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
    state.level = undefined;
    state.released = undefined;
    state.expired = undefined;
    state.rater = undefined;
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
    const response = (await apiFetch("/api/ielpUser/sync-echain", {
      method: "POST",
    })) as IelpUserSyncResponse;

    state.institution = response.data.institution;
    state.level = response.data.level;
    state.released = response.data.released;
    state.expired = response.data.expired;
    state.rater = response.data.rater ?? undefined;
    state.file = undefined;
    state.echainFileName = response.data.fileName ?? null;
    state.echainFileUrl = response.data.fileUrl ?? null;
    state.echainFileUrlExpiresAt = response.data.fileUrlExpiresAt ?? null;
    state.echainFileMimeType = response.data.fileMimeType ?? null;
    state.echainFileSizeBytes = response.data.fileSizeBytes ?? null;
    state.syncReceipt = response.syncReceipt;

    toast.add({
      title: "Sync Success",
      description: response.data.fileName
        ? `IELP data synced from e-chain: ${response.data.fileName}`
        : "IELP data synced from e-chain. Please review before saving.",
      color: "success",
    });
  } catch (error: any) {
    const errorMessage =
      error?.data?.message ||
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to sync IELP data. Please try again.";
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
  if (!syncMode.value && !event.data.requestedCheckerNik) {
    toast.add({ title: "Checker required", description: "Please select who will verify this manual IELP.", color: "error" });
    return;
  }
  loading.value = true;

  try {
    const formData = new FormData();

    formData.append("institution", event.data.institution);
    formData.append("level", event.data.level);
    formData.append("released", event.data.released);
    if (event.data.expired) formData.append("expired", event.data.expired);
    formData.append("rater", event.data.rater);
    formData.append("source", syncMode.value ? "ECHAIN" : "MANUAL");
    if (syncMode.value && event.data.syncReceipt) formData.append("syncReceipt", event.data.syncReceipt);
    if (!syncMode.value && event.data.requestedCheckerNik) formData.append("requestedCheckerNik", event.data.requestedCheckerNik);

    if (event.data.file instanceof File) {
      formData.append("file", event.data.file);
    }

    if (!event.data.file && syncMode.value) {
      if (event.data.echainFileUrl) formData.append("echainFileUrl", event.data.echainFileUrl);
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

    // Call API to create IELPUser
    await apiFetch("/api/ielpUser", {
      method: "POST",
      body: formData,
    });

    toast.add({
      title: "Success",
      description: `IELP record has been created successfully`,
      color: "success",
    });

    // Reset form and close modal
    state.institution = undefined;
    state.level = undefined;
    state.released = undefined;
    state.expired = undefined;
    state.rater = undefined;
    state.file = undefined;
    state.echainFileName = null;
    state.echainFileUrl = null;
    state.echainFileUrlExpiresAt = null;
    state.echainFileMimeType = null;
    state.echainFileSizeBytes = null;
    state.requestedCheckerNik = undefined;
    state.syncReceipt = null;
    syncMode.value = false;
    open.value = false;

    // Emit event to refresh parent table
    emit("ielpUserAdded");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to create IELP record. Please try again.";
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
  ielpUserAdded: [];
}>();
</script>

<template>
  <div>
    <UButton
      label="Add IELP"
      icon="i-lucide-plus"
      color="primary"
      @click="open = true"
    />

    <UModal
      v-model:open="open"
      title="Add New IELP"
      description="Create a new IELP record by syncing from system or manual input"
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
              <span class="font-medium">Sync from External IELP System</span>
            </div>

            <p class="text-sm text-muted">
              Click the button below to fetch IELP data from the external
              system. Institution, Level, Released, and Expired dates will be
              filled automatically.
            </p>

            <UButton
              label="Sync IELP Data"
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
                Institution: {{ state.institution }} | Level: {{ state.level }}
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
            <UFormField label="IELP File" name="file">
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
            <UFormField label="Verification Checker" name="requestedCheckerNik" required>
              <USelect
                v-model="state.requestedCheckerNik"
                :items="checkerOptions"
                value-key="value"
                placeholder="Select checker"
                class="w-full"
              />
              <p class="mt-1 text-xs text-muted">The manual record remains pending until this checker approves it.</p>
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
              placeholder="e.g., PPIC CURUG"
              :disabled="syncMode && !!state.institution"
            />
          </UFormField>

          <UFormField
            label="Level"
            placeholder="Enter IELP level"
            name="level"
            required
          >
            <USelect
              v-model="state.level"
              class="w-full"
              :items="levelOptions"
              placeholder="Select level"
              :disabled="syncMode && !!state.level"
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

            <UFormField :label="state.level === '6' ? 'Validity' : 'Expired Date'" name="expired" :required="state.level !== '6'">
              <UInput
                v-if="state.level !== '6'"
                v-model="state.expired"
                type="date"
                class="w-full"
                icon="i-lucide-calendar"
                disabled
              />
              <UInput v-else model-value="Lifetime" class="w-full" disabled icon="i-lucide-infinity" />
              <p class="mt-1 text-xs text-muted">Level 4: 3 years · Level 5: 6 years · Level 6: lifetime</p>
            </UFormField>
          </div>

          <UFormField
            label="Rater"
            placeholder="Enter rater name"
            name="rater"
            required
          >
            <UInput
              v-model="state.rater"
              class="w-full"
              placeholder="e.g., SUSI"
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
              label="Create IELP"
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
