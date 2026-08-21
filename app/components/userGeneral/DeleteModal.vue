<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

defineOptions({
  name: "UserGeneralDeleteModal",
});

const props = defineProps<{
  user: {
    nik: string;
    name: string;
  } | null;
}>();

const emit = defineEmits<{
  (e: "user-deleted"): void;
  (e: "close"): void;
}>();

const toast = useToast();
const loading = ref(false);
const { token } = useAuth();

const isOpen = computed({
  get: () => props.user !== null,
  set: (value) => {
    if (!value) emit("close");
  },
});

async function onDelete() {
  if (!props.user) return;

  loading.value = true;

  try {
    await $fetch(`${apiBaseUrl}/api/userGeneral/${props.user.nik}`, {
      method: "DELETE",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: "User deleted successfully",
      color: "success",
    });

    emit("user-deleted");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message || error?.message || "Failed to delete user",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="isOpen" title="Delete User">
    <template #body>
      <div class="space-y-4">
        <p class="text-gray-700 dark:text-gray-300">
          Are you sure you want to delete this user?
        </p>

        <div v-if="user" class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <p class="font-medium">{{ user.name }}</p>
          <p class="text-sm text-gray-500">NIK: {{ user.nik }}</p>
        </div>

        <p class="text-sm text-red-500">This action cannot be undone.</p>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="emit('close')"
          />
          <UButton
            label="Delete"
            color="error"
            :loading="loading"
            @click="onDelete"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
