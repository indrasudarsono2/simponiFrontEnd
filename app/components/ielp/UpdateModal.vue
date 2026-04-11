<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
const { apiFetch } = useApiFetch();
defineOptions({
  name: "IELPUpdateModal",
});

interface IELPUser {
  id: string;
  isConfirm: boolean;
  released: string;
  expired: string;
  rater: string;
  institution: string;
  level: string;
  file?: string;
}

const props = defineProps<{
  ielpUser: IELPUser | null;
}>();

const schema = z.object({
  institution: z.string().min(2, "Institution must be at least 2 characters"),
  level: z.string().min(1, "Level is required"),
  released: z.string().min(1, "Released date is required"),
  expired: z.string().min(1, "Expired date is required"),
  rater: z.string().min(2, "Rater must be at least 2 characters"),
  file: z.instanceof(File).optional(),
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  institution: undefined,
  level: undefined,
  released: undefined,
  expired: undefined,
  rater: undefined,
  file: undefined,
});

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
// Watch for ielpUser prop changes to populate form
watch(
  () => props.ielpUser,
  (newIELP) => {
    if (newIELP) {
      state.institution = newIELP.institution;
      state.level = newIELP.level;
      state.released = newIELP.released;
      state.expired = newIELP.expired;
      state.rater = newIELP.rater;
      open.value = true;
    }
  },
  { immediate: true },
);

// Watch for changes in released date or level to auto-calculate expired date
watch(
  () => [state.released, state.level],
  ([newReleased, newLevel]) => {
    if (newReleased && newLevel) {
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
    if (state.released && newLevel) {
      const calculatedExpired = calculateExpiredDate(state.released, newLevel);
      if (calculatedExpired) {
        state.expired = calculatedExpired;
      }
    }
  },
);

// Reset form when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    state.institution = undefined;
    state.level = undefined;
    state.released = undefined;
    state.expired = undefined;
    state.rater = undefined;
    state.file = undefined;
    emit("close");
  }
});

const toast = useToast();
const loading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const released = computed(() => {
  if (!state.released) return "";

  return state.released.split("T")[0];
});

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    state.file = target.files[0];
  }
}

function triggerFileInput() {
  fileInput.value?.click();
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.ielpUser) return;

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

    // Call API to update IELP
    await apiFetch(`/api/ielpUser/${props.ielpUser.id}`, {
      method: "PUT",
      body: formData,
    });

    toast.add({
      title: "Success",
      description: `IELP record has been updated successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("ielpUpdated");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to update IELP record. Please try again.";
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
  ielpUpdated: [];
  close: [];
}>();
</script>

<template>
  <UModal
    v-model:open="open"
    title="Update IELP"
    description="Edit the IELP record information"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <!-- File Upload -->
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
        </UFormField>

        <!-- Institution -->
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
          />
        </UFormField>

        <!-- Level -->
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
          />
        </UFormField>

        <!-- Released and Expired Dates -->
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Released Date" name="released" required>
            <UInput
              v-model="released"
              type="date"
              class="w-full"
              icon="i-lucide-calendar"
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

        <!-- Rater -->
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

        <!-- Action Buttons -->
        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="open = false"
          />
          <UButton
            label="Update IELP"
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
