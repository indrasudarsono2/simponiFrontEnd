<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

const { token } = useAuth();
const toast = useToast();

const open = ref(false);
const loading = ref(false);
const mandatory = ref("");

const emit = defineEmits<{
  mandatoryAdded: [];
}>();

async function onSubmit() {
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
      `${apiBaseUrl}/api/mandatoryItem`,
      {
      method: "POST",
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
        description: response?.message || "Failed to add mandatory item.",
        color: "error",
      });
      return;
    }

    toast.add({
      title: "Success",
      description: "Mandatory item added successfully.",
      color: "success",
    });

    mandatory.value = "";
    open.value = false;
    emit("mandatoryAdded");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message || "Failed to add mandatory item.",
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
    title="Add Mandatory Item"
    description="Create a new mandatory item"
  >
    <UButton
      label="Add Mandatory Item"
      icon="i-lucide-plus"
      color="primary"
    />

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
          label="Save"
          color="primary"
          icon="i-lucide-save"
          :loading="loading"
          @click="onSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
