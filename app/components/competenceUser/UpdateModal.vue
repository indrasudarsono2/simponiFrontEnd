<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
const { apiFetch } = useApiFetch();
defineOptions({
  name: "CompetenceUserUpdateModal",
});

// Rating interface based on API response
interface Rating {
  id: number;
  professionId: number;
  rating: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface CompetenceUser {
  id: number;
  userId: string;
  ratingId: number;
  institution: string;
  released: string;
  file: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  rating: {
    id: number;
    professionId: number;
    rating: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  };
}

const props = defineProps<{
  competenceUser: CompetenceUser | null;
  rating: Rating[];
}>();

// Generate competence options from rating prop
const competenceOptions = computed(() => {
  return props.rating.map((r) => ({
    id: String(r.id),
    label: r.rating,
    description: r.description,
  }));
});

const emit = defineEmits<{
  competenceUserUpdated: [];
  close: [];
}>();

const schema = z.object({
  competence: z.string().min(1, "Please select a competence"),
  institution: z.string().min(2, "Institution must be at least 2 characters"),
  released: z.string().min(1, "Released date is required"),
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  competence: undefined,
  institution: undefined,
  released: undefined,
});

// Watch for competenceUser prop changes to populate form
watch(
  () => props.competenceUser,
  (newCompetenceUser) => {
    if (newCompetenceUser) {
      state.competence = newCompetenceUser.rating?.rating || "";
      state.institution = newCompetenceUser.institution;
      // Format date to YYYY-MM-DD for date input
      state.released = newCompetenceUser.released
        ? newCompetenceUser.released.split("T")[0]
        : "";
      open.value = true;
    }
  },
  { immediate: true },
);

// Reset form when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    state.competence = undefined;
    state.institution = undefined;
    state.released = undefined;
    emit("close");
  }
});

// Get the competence ID based on selected label
function getCompetenceId(label: string): string {
  const found = competenceOptions.value.find((c) => c.label === label);
  return found ? found.id : "1";
}

const toast = useToast();
const loading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    // Handle file if needed
  }
}

function triggerFileInput() {
  fileInput.value?.click();
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.competenceUser) return;

  loading.value = true;

  try {
    const ratingId = getCompetenceId(event.data.competence!);

    const formData = new FormData();

    formData.append("ratingId", ratingId);
    formData.append("competence", event.data.competence);
    formData.append("institution", event.data.institution);
    formData.append("released", event.data.released);

    await apiFetch(`/api/competenceUser/${props.competenceUser.id}`, {
      method: "PUT",
      body: formData,
    });

    toast.add({
      title: "Success",
      description: `Competence record has been updated successfully`,
      color: "success",
    });

    open.value = false;

    emit("competenceUserUpdated");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to update competence record. Please try again.";
    toast.add({
      title: "Error",
      description: errorMessage,
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Update Competence"
    description="Edit the competence certificate record"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <!-- Competence Select -->
        <UFormField label="Competence" name="competence" required>
          <USelect
            v-model="state.competence"
            :items="competenceOptions"
            value-key="label"
            label-key="label"
            placeholder="Select competence"
            class="w-full"
          />
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
            placeholder="e.g., STPI CURUG"
          />
        </UFormField>

        <!-- Released Date -->
        <UFormField label="Released Date" name="released" required>
          <UInput
            v-model="state.released"
            type="date"
            class="w-full"
            icon="i-lucide-calendar"
          />
        </UFormField>

        <!-- File Upload (Optional) -->
        <UFormField label="File (Optional)" name="file">
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
            <span class="text-sm text-muted">Keep existing file</span>
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
            label="Update Competence"
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
