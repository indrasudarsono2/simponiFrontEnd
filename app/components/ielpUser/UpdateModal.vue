<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const { apiFetch } = useApiFetch();

defineOptions({
  name: "IELPUserUpdateModal",
});

interface IELPUser {
  id: string;
  isConfirm: boolean;
  released: string;
  expired: string | null;
  rater: string;
  institution: string;
  level: string;
  requestedChecker?: { nik: string; name?: string | null } | null;
  verifiedBy?: { nik: string; name?: string | null } | null;
}

const props = defineProps<{
  ielpUser: IELPUser | null;
}>();

const schema = z.object({
  institution: z.string().min(2, "Institution must be at least 2 characters"),
  level: z.string().min(1, "Level is required"),
  released: z.string().min(1, "Released date is required"),
  expired: z.string().optional(),
  rater: z.string().min(2, "Rater must be at least 2 characters"),
  file: z.instanceof(File).optional(),
  requestedCheckerNik: z.string().min(1, "Verification checker is required"),
});

const open = ref(false);

function toDateInputValue(value?: string | null) {
  if (!value) return undefined;

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }

  const dateOnly = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  return dateOnly;
}

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  institution: undefined,
  level: undefined,
  released: undefined,
  expired: undefined,
  rater: undefined,
  file: undefined,
  requestedCheckerNik: undefined,
});
const checkerOptions = ref<Array<{ label: string; value: string }>>([]);

async function loadCheckers() {
  if (checkerOptions.value.length) return;
  const checkers = await apiFetch("/api/credentialVerification/checkers") as Array<{ nik: string; name?: string; ratings?: string[] }>;
  checkerOptions.value = checkers.map((checker) => ({
    value: checker.nik,
    label: `${checker.name || checker.nik}${checker.ratings?.length ? ` [${checker.ratings.join(", ")}]` : ""}`,
  }));
}

// Watch for ielpUser prop changes to populate form
watch(
  () => props.ielpUser,
  (newIELPUser) => {
    if (newIELPUser) {
      state.institution = newIELPUser.institution;
      state.level = newIELPUser.level;
      state.released = toDateInputValue(newIELPUser.released);
      state.expired =
        newIELPUser.level === "6"
          ? undefined
          : toDateInputValue(newIELPUser.expired);
      state.rater = newIELPUser.rater;
      state.requestedCheckerNik = newIELPUser.requestedChecker?.nik || newIELPUser.verifiedBy?.nik || undefined;
      loadCheckers().catch(() => undefined);
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
    state.requestedCheckerNik = undefined;
    emit("close");
  }
});

const toast = useToast();
const loading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const levelOptions = ["4", "5", "6"];

function calculateIelpExpiry(level?: string, released?: string) {
  if (!level || !released || level === "6") return undefined;
  const date = new Date(`${released}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  date.setUTCFullYear(date.getUTCFullYear() + (level === "4" ? 3 : 6));
  return date.toISOString().slice(0, 10);
}

watch([() => state.level, () => state.released], ([level, released]) => {
  state.expired = calculateIelpExpiry(level, released);
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
    const body = new FormData();
    body.append("institution", event.data.institution);
    body.append("level", event.data.level);
    body.append("released", event.data.released);
    body.append("rater", event.data.rater);
    if (event.data.expired) body.append("expired", event.data.expired);
    if (event.data.file) body.append("file", event.data.file);
    body.append("requestedCheckerNik", event.data.requestedCheckerNik);

    // Call API to update IELPUser
    await apiFetch(`/api/ielpUser/${props.ielpUser.id}`, {
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
          <USelect
            v-model="state.level"
            class="w-full"
            :items="levelOptions"
            placeholder="Select level"
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

        <UFormField label="Verification Checker" name="requestedCheckerNik" required>
          <USelect
            v-model="state.requestedCheckerNik"
            :items="checkerOptions"
            value-key="value"
            label-key="label"
            class="w-full"
            placeholder="Select checker for this revision"
          />
          <p class="mt-1 text-xs text-muted">The approved version remains active until this revision is approved.</p>
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
            label="Submit Revision"
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
