<script setup lang="ts">
import ip from "../../utils/config.json";

interface MandatoryItem {
  id: number;
  mandatory: string;
}

const props = defineProps<{
  mandatoryItem: MandatoryItem | null;
}>();

const emit = defineEmits<{
  mandatoryUpdated: [];
  close: [];
}>();

const { token } = useAuth();
const toast = useToast();

const open = ref(false);
const loading = ref(false);
const mandatory = ref("");

watch(
  () => props.mandatoryItem,
  (newValue) => {
    if (newValue) {
      mandatory.value = newValue.mandatory || "";
      open.value = true;
    }
  },
  { immediate: true },
);

watch(open, (isOpen) => {
  if (!isOpen) {
    emit("close");
  }
});

async function onSubmit() {
  if (!props.mandatoryItem) return;
  const value = mandatory.value.trim();
  if (!value) {
    toast.add({
      title: "Validation Error",
      description: "Mandatory item is required.",
      color: "error",
    });
    return;
  }

  loading.value = true;
  try {
    const response = await $fetch<{ message?: string }>(
      `http://${ip.ipBackEnd}/api/mandatoryItem/${props.mandatoryItem.id}`,
      {
        method: "PUT",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
        body: {
          mandatory: value,
        },
      },
    );

    const message = String(response?.message || "").trim().toLowerCase();
    if (message && message !== "success") {
      toast.add({
        title: "Error",
        description: response?.message || "Failed to update mandatory item.",
        color: "error",
      });
      return;
    }

    toast.add({
      title: "Success",
      description: "Mandatory item updated successfully.",
      color: "success",
    });

    open.value = false;
    emit("mandatoryUpdated");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message || "Failed to update mandatory item.",
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
    title="Update Mandatory Item"
    description="Edit mandatory item"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField label="Mandatory" required>
          <UInput
            v-model="mandatory"
            placeholder="Input mandatory item"
            class="w-full"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          label="Cancel"
          color="neutral"
          variant="soft"
          :disabled="loading"
          @click="open = false"
        />
        <UButton
          label="Update"
          color="primary"
          icon="i-lucide-save"
          :loading="loading"
          @click="onSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
