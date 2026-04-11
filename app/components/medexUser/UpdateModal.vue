<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
const { apiFetch } = useApiFetch();
defineOptions({
  name: "MedexUserUpdateModal",
});

interface MedexUser {
  id: string;
  isConfirm: boolean;
  released: string;
  expired: string;
  examiner: string;
  institution: string;
  file?: string;
}

const props = defineProps<{
  medexUser: MedexUser | null;
}>();

const schema = z.object({
  institution: z.string().min(2, "Institution must be at least 2 characters"),
  released: z.string().min(1, "Released date is required"),
  expired: z.string().min(1, "Expired date is required"),
  examiner: z.string().min(2, "Examiner must be at least 2 characters"),
  file: z.instanceof(File).optional(),
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  institution: undefined,
  released: undefined,
  expired: undefined,
  examiner: undefined,
  file: undefined,
});

// Helper function to format date to YYYY-MM-DD
function formatDateForInput(
  dateString: string | undefined,
): string | undefined {
  if (!dateString) return undefined;
  // Handle ISO date strings by taking only the date part
  return dateString.split("T")[0];
}

// Watch for medexUser prop changes to populate form
watch(
  () => props.medexUser,
  async (newMedexUser) => {
    if (newMedexUser) {
      // Reset state first to ensure clean slate
      state.institution = undefined;
      state.released = undefined;
      state.expired = undefined;
      state.examiner = undefined;
      state.file = undefined;

      // Wait for next tick to ensure DOM is ready
      await nextTick();

      // Populate state with new values (format dates for input)
      state.institution = newMedexUser.institution;
      state.released = formatDateForInput(newMedexUser.released);
      state.expired = formatDateForInput(newMedexUser.expired);
      state.examiner = newMedexUser.examiner;

      // Open modal after state is populated
      open.value = true;
    }
  },
  { immediate: true },
);

// Reset form when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    state.institution = undefined;
    state.released = undefined;
    state.expired = undefined;
    state.examiner = undefined;
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

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.medexUser) return;

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
    // Call API to update MedexUser
    await apiFetch(`/api/medexUser/${props.medexUser.id}`, {
      method: "PUT",
      body: formData,
    });

    toast.add({
      title: "Success",
      description: `Medex record has been updated successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("medexUserUpdated");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to update Medex record. Please try again.";
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
  medexUserUpdated: [];
  close: [];
}>();
</script>

<template>
  <UModal
    v-model:open="open"
    title="Update Medex"
    description="Edit the Medex record information"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
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
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Released Date" name="released" required>
            <UInput
              v-model="state.released"
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
            label="Update Medex"
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
