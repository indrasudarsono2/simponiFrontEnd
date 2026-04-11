<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
const { apiFetch } = useApiFetch();
defineOptions({
  name: "IELPAddModal",
});

const schema = z.object({
  institution: z.string().min(2, "Institution must be at least 2 characters"),
  level: z.string().min(1, "Level is required"),
  released: z.string().min(1, "Released date is required"),
  expired: z.string().min(1, "Expired date is required"),
  rater: z.string().min(2, "Rater must be at least 2 characters"),
  file: z.instanceof(File).optional(),
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
});

const toast = useToast();
const loading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

// Mock sync data from external IELP system
const mockSyncData = {
  institution: "PPIC CURUG",
  level: "5",
  released: "2024-02-28",
  expired: "2027-02-28",
};

// Calculate expired date based on level and released date
function calculateExpiredDate(
  releasedDate: string,
  level: string,
): string | undefined {
  if (!releasedDate || !level) return undefined;

  const released = new Date(releasedDate);
  if (isNaN(released.getTime())) return undefined;

  let expired: Date;

  switch (level) {
    case "4":
      // Level 4: +3 years
      expired = new Date(released);
      expired.setFullYear(expired.getFullYear() + 3);
      break;
    case "5":
      // Level 5: +6 years
      expired = new Date(released);
      expired.setFullYear(expired.getFullYear() + 6);
      break;
    case "6":
      // Level 6: infinity (use far future date)
      return "9999-12-31";
    default:
      return undefined;
  }

  // Format as YYYY-MM-DD
  const year = expired.getFullYear();
  const month = String(expired.getMonth() + 1).padStart(2, "0");
  const day = String(expired.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Watch for changes in released date or level to auto-calculate expired date
watch(
  () => [state.released, state.level],
  ([newReleased, newLevel]) => {
    // Only auto-calculate in manual mode (not sync mode)
    if (!syncMode.value && newReleased && newLevel) {
      const calculatedExpired = calculateExpiredDate(newReleased, newLevel);
      if (calculatedExpired) {
        state.expired = calculatedExpired;
      }
    }
  },
);

// Also watch for level changes to recalculate even if released hasn't changed
watch(
  () => state.level,
  (newLevel) => {
    if (!syncMode.value && state.released && newLevel) {
      const calculatedExpired = calculateExpiredDate(state.released, newLevel);
      if (calculatedExpired) {
        state.expired = calculatedExpired;
      }
    }
  },
);

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    state.file = target.files[0];
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
  }
}

function syncFromSystem() {
  syncLoading.value = true;

  // Simulate API call to external IELP system
  setTimeout(() => {
    state.institution = mockSyncData.institution;
    state.level = mockSyncData.level;
    state.released = mockSyncData.released;
    state.expired = mockSyncData.expired;

    toast.add({
      title: "Sync Success",
      description:
        "IELP data synced from external system. Please fill in the Rater field.",
      color: "success",
    });
    syncLoading.value = false;
  }, 1500);
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;

  try {
    const formData = new FormData();

    formData.append("institution", event.data.institution);
    formData.append("level", event.data.level);
    formData.append("released", event.data.released);
    formData.append("expired", event.data.expired);
    formData.append("rater", event.data.rater);

    if (event.data.file instanceof File) {
      formData.append("file", event.data.file);
    }
    // Call API to create IELP
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
    syncMode.value = false;
    open.value = false;

    // Emit event to refresh parent table
    emit("ielpAdded");
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
  ielpAdded: [];
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
              :label="'Sync from System'"
              :color="syncMode ? 'primary' : 'neutral'"
              :variant="syncMode ? 'solid' : 'ghost'"
              class="flex-1"
              @click="toggleSyncMode"
            />
          </div>

          <!-- Sync Mode: Sync Button -->
          <div v-if="syncMode" class="p-4 bg-elevated/50 rounded-lg space-y-4">
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
            <UInput
              v-model="state.level"
              class="w-full"
              placeholder="e.g., 4, 5, or 6"
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

            <UFormField label="Expired Date" name="expired" required>
              <UInput
                v-model="state.expired"
                type="date"
                class="w-full"
                icon="i-lucide-calendar"
                :disabled="true"
              />
              <p
                v-if="state.level === '6' && state.expired === '9999-12-31'"
                class="text-xs text-muted mt-1"
              >
                ∞ Infinity (Level 6)
              </p>
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
