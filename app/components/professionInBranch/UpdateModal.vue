<script setup lang="ts">
import ip from "../../utils/config.json";

defineOptions({
  name: "ProfessionInBranchUpdateModal",
});

// Profession interface (full profession from API)
interface Profession {
  id: number;
  profession: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// Nested profession in professionInBranch
interface NestedProfession {
  id: number;
  profession: string;
}

// ProfessionInBranch interface - matches actual API
interface ProfessionInBranch {
  id: number;
  profession: NestedProfession;
}

const props = defineProps<{
  professionInBranch: ProfessionInBranch | null;
  professions: Profession[];
}>();

const emit = defineEmits<{
  (e: "profession-updated"): void;
  (e: "close"): void;
}>();

const toast = useToast();
const loading = ref(false);
const { token } = useAuth();

// Selected profession
const selectedProfessionId = ref<number | undefined>(undefined);

// Profession options for dropdown
const professionOptions = computed(() => {
  return props.professions.map((p) => ({
    value: p.id,
    label: `${p.profession} - ${p.description}`,
  }));
});

// Watch for professionInBranch prop changes and populate form
watch(
  () => props.professionInBranch,
  (newProfessionInBranch) => {
    if (newProfessionInBranch) {
      selectedProfessionId.value = newProfessionInBranch.profession.id;
    } else {
      selectedProfessionId.value = undefined;
    }
  },
  { immediate: true },
);

const isOpen = computed({
  get: () => props.professionInBranch !== null,
  set: (value) => {
    if (!value) emit("close");
  },
});

async function onSubmit() {
  if (!props.professionInBranch) return;

  if (!selectedProfessionId.value) {
    toast.add({
      title: "Error",
      description: "Please select a profession",
      color: "error",
    });
    return;
  }

  loading.value = true;

  try {
    await $fetch(
      `http://${ip.ipBackEnd}/api/professionInBranch/${props.professionInBranch.id}`,
      {
        method: "PUT",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
          "Content-Type": "application/json",
        },
        body: {
          professionId: selectedProfessionId.value,
        },
      },
    );

    toast.add({
      title: "Success",
      description: "Profession updated successfully",
      color: "success",
    });

    emit("profession-updated");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message || error?.message || "Failed to update profession",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="isOpen" title="Update Profession in Branch">
    <template #body>
      <form class="space-y-4" @submit.prevent="onSubmit">
        <!-- Current Profession Info -->
        <div
          v-if="professionInBranch"
          class="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-2"
        >
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">Current Profession:</span>
            <span class="text-sm font-medium">{{
              professionInBranch.profession?.profession || "-"
            }}</span>
          </div>
        </div>

        <!-- Profession Selection -->
        <UFormField label="Select New Profession" name="professionId" required>
          <USelect
            v-model="selectedProfessionId"
            :items="professionOptions"
            placeholder="Select a profession"
            class="w-full"
          />
        </UFormField>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="emit('close')"
          />
          <UButton
            label="Update Profession"
            color="primary"
            type="submit"
            :loading="loading"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
