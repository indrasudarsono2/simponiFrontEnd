<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
const { apiFetch } = useApiFetch();
defineOptions({
  name: "CompetenceUserAddModal",
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

const props = defineProps<{
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

const schema = z.object({
  competence: z.string().min(1, "Please select a competence"),
  institution: z.string().min(2, "Institution must be at least 2 characters"),
  released: z.string().min(1, "Released date is required"),
  file: z.instanceof(File).optional(),
});

const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  competence: undefined,
  institution: undefined,
  released: undefined,
});

const toast = useToast();
const loading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

// Selected competence ID
const selectedCompetenceId = ref<string>("");

// Get the competence ID based on selected label
function getCompetenceId(label: string): string {
  const found = competenceOptions.value.find((c) => c.label === label);
  return found ? found.id : "";
}

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
  loading.value = true;

  try {
    const ratingId = getCompetenceId(event.data.competence!);
    const formData = new FormData();

    formData.append("ratingId", ratingId);
    formData.append("competence", event.data.competence);
    formData.append("institution", event.data.institution);
    formData.append("released", event.data.released);

    // Append file if selected
    if (state.file) {
      formData.append("file", state.file);
    }

    await apiFetch("/api/competenceUser", {
      method: "POST",
      body: formData,
    });

    toast.add({
      title: "Success",
      description: `Competence record has been created successfully`,
      color: "success",
    });

    // Reset form and close modal
    state.competence = undefined;
    state.institution = undefined;
    state.released = undefined;
    state.file = undefined;
    selectedCompetenceId.value = "";
    open.value = false;

    emit("competenceUserAdded");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to create competence record. Please try again.";
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
  competenceUserAdded: [];
}>();
</script>

<template>
  <div>
    <UButton
      label="Add Competence"
      icon="i-lucide-plus"
      color="primary"
      @click="open = true"
    />

    <UModal
      v-model:open="open"
      title="Add New Competence"
      description="Create a new competence certificate record"
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
          <UFormField label="Competence File (optional)" name="file">
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

          <div class="flex justify-end gap-2 pt-4">
            <UButton
              label="Cancel"
              color="neutral"
              variant="subtle"
              :disabled="loading"
              @click="open = false"
            />
            <UButton
              label="Create Competence"
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
