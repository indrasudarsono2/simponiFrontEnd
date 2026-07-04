<script setup lang="ts">
import ip from "../../utils/config.json";

interface Rating {
  id: number;
  rating: string | null;
}

interface CwpFrequency {
  id: number;
  cwpId: number | null;
  frequency: string | null;
  isPrimary: boolean | null;
}

interface Cwp {
  id: number;
  cwp: string | null;
  rating: Rating | null;
  cwpFrequencies: CwpFrequency[];
}

interface FrequencyForm {
  frequency: string;
  isPrimary: boolean;
}

const props = defineProps<{
  cwp: Cwp | null;
}>();

const emit = defineEmits<{
  updated: [];
  close: [];
}>();

const { token } = useAuth();
const toast = useToast();
const open = ref(false);
const loading = ref(false);
const frequencies = ref<FrequencyForm[]>([]);

watch(
  () => props.cwp,
  (nextCwp) => {
    if (!nextCwp) return;

    frequencies.value = (nextCwp.cwpFrequencies || []).map((item) => ({
      frequency: item.frequency || "",
      isPrimary: Boolean(item.isPrimary),
    }));

    if (frequencies.value.length === 0) addFrequency();

    open.value = true;
  },
);

watch(open, (isOpen) => {
  if (isOpen) return;

  frequencies.value = [];
  emit("close");
});

function addFrequency() {
  frequencies.value.push({
    frequency: "",
    isPrimary: false,
  });
}

function removeFrequency(index: number) {
  frequencies.value.splice(index, 1);

  if (frequencies.value.length === 0) addFrequency();
}

function getValidationError() {
  const filledFrequencies = frequencies.value
    .map((item) => item.frequency.trim().toUpperCase())
    .filter(Boolean);

  const duplicate = filledFrequencies.find(
    (frequency, index) => filledFrequencies.indexOf(frequency) !== index,
  );

  if (duplicate) return `Frequency ${duplicate} is duplicated.`;

  return "";
}

async function onSubmit() {
  if (!props.cwp) return;

  const validationError = getValidationError();

  if (validationError) {
    toast.add({
      title: "Invalid Frequency",
      description: validationError,
      color: "error",
    });
    return;
  }

  loading.value = true;

  try {
    await $fetch(`http://${ip.ipBackEnd}/api/cwpFrequencies/${props.cwp.id}`, {
      method: "PUT",
      body: {
        frequencies: frequencies.value
          .map((item) => ({
            frequency: item.frequency.trim().toUpperCase(),
            isPrimary: item.isPrimary,
          }))
          .filter((item) => item.frequency),
      },
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Frequencies for ${props.cwp.cwp || "CWP"} have been updated`,
      color: "success",
    });

    open.value = false;
    emit("updated");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to update CWP frequencies",
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
    title="Manage CWP Frequency"
    :description="`Add or remove frequencies for ${cwp?.cwp || 'selected CWP'}`"
    :ui="{ content: 'max-w-3xl' }"
  >
    <template #body>
      <form class="space-y-4" @submit.prevent="onSubmit">
        <UAlert
          color="info"
          variant="soft"
          icon="i-lucide-info"
          title="Frequency Status"
          description="Checked isPrimary means Primary. Unchecked means Secondary."
        />

        <div class="space-y-3">
          <div
            v-for="(item, index) in frequencies"
            :key="index"
            class="grid grid-cols-1 gap-3 rounded-lg border border-default p-3 md:grid-cols-[minmax(0,1fr)_9rem_auto]"
          >
            <UFormField label="Frequency">
              <UInput
                v-model="item.frequency"
                class="w-full"
                placeholder="e.g., 118.7"
              />
            </UFormField>

            <UFormField label="isPrimary">
              <UCheckbox v-model="item.isPrimary" label="Primary" />
            </UFormField>

            <div class="flex items-end">
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="soft"
                @click="removeFrequency(index)"
              />
            </div>
          </div>
        </div>

        <UButton
          label="Add Frequency"
          icon="i-lucide-plus"
          color="neutral"
          variant="outline"
          type="button"
          @click="addFrequency"
        />

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="open = false"
          />
          <UButton
            label="Save Frequencies"
            color="primary"
            type="submit"
            :loading="loading"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
