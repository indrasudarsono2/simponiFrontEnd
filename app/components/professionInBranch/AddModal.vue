<script setup lang="ts">
import ip from "../../utils/config.json";

defineOptions({
  name: "ProfessionInBranchAddModal",
});

// Profession interface
interface Profession {
  id: number;
  profession: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

const props = defineProps<{
  professions: Profession[];
}>();

const emit = defineEmits<{
  (e: "profession-added"): void;
}>();

const open = ref(false);
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

async function onSubmit() {
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
    await $fetch(`http://${ip.ipBackEnd}/api/professionInBranch`, {
      method: "POST",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
        "Content-Type": "application/json",
      },
      body: {
        professionId: selectedProfessionId.value,
      },
    });

    toast.add({
      title: "Success",
      description: "Profession added to branch successfully",
      color: "success",
    });

    // Reset form
    selectedProfessionId.value = undefined;
    open.value = false;
    emit("profession-added");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        error?.message ||
        "Failed to add profession to branch",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Add Profession to Branch">
    <UButton
      label="Add Profession"
      color="primary"
      variant="solid"
      icon="i-lucide-plus"
    />

    <template #body>
      <form class="space-y-4" @submit.prevent="onSubmit">
        <!-- Profession Selection -->
        <UFormField label="Select Profession" name="professionId" required>
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
            @click="open = false"
          />
          <UButton
            label="Add Profession"
            color="primary"
            type="submit"
            :loading="loading"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
