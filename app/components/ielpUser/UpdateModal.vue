<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const apiBaseUrl = useApiBaseUrl();
const { apiFetch } = useApiFetch();

defineOptions({
  name: "IELPUserUpdateModal",
});

interface IELPUser {
  id: string;
  isConfirm: boolean;
  released: string;
  expired: string;
  rater: string;
  institution: string;
  level: string;
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

// Watch for ielpUser prop changes to populate form
watch(
  () => props.ielpUser,
  (newIELPUser) => {
    if (newIELPUser) {
      state.institution = newIELPUser.institution;
      state.level = newIELPUser.level;
      state.released = newIELPUser.released;
      state.expired = newIELPUser.expired;
      state.rater = newIELPUser.rater;
      open.value = true;
    }
  },
  { immediate: true },
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
    // Use JSON body
    const body = {
      institution: event.data.institution,
      level: event.data.level,
      released: event.data.released,
      expired: event.data.expired,
      rater: event.data.rater,
      file: event.data.file ? { name: event.data.file.name } : null,
    };

    // Call API to update IELPUser
    await apiFetch(`${apiBaseUrl}/api/ielpUser/${props.ielpUser.id}`, {
      method: "PUT",
      body,
    });

    toast.add({
      title: "Success",
      description: `IELP record has been updated successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("ielpUserUpdated");
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
  ielpUserUpdated: [];
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

        <UFormField
          label="Level"
          placeholder="Enter IELP level"
          name="level"
          required
        >
          <UInput
            v-model="state.level"
            class="w-full"
            placeholder="e.g., 4 or 5"
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
