<script setup lang="ts">
defineOptions({
  name: "UserBranchDeleteModal",
});

// Define interfaces based on API response
interface Profession {
  id: number;
  profession: string;
}

interface ProfessionInBranch {
  id: number;
  profession: Profession;
}

interface User {
  nik: string;
  licenseUserId: string;
  name: string;
  professionInBranch: ProfessionInBranch | null;
}

const props = defineProps<{
  user: User | null;
}>();

const emit = defineEmits<{
  (e: "user-deleted"): void;
  (e: "close"): void;
}>();

const loading = ref(false);
const toast = useToast();

const isOpen = computed({
  get: () => props.user !== null,
  set: (value: boolean) => {
    if (!value) {
      emit("close");
    }
  },
});

async function handleDelete() {
  if (!props.user) return;

  loading.value = true;

  try {
    // Submit to API - remove user's professionInBranch assignment
    await $fetch(`/api/userBranch/${props.user.nik}`, {
      method: "delete",
    });

    toast.add({
      title: "Success",
      description: `Removed profession assignment for ${props.user.name}`,
      color: "success",
    });

    // Close modal
    emit("user-deleted");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description: error?.data?.message || "Failed to remove user profession",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

function handleClose() {
  emit("close");
}
</script>

<template>
  <UModal v-model:open="isOpen" @close="handleClose">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-trash-2" class="text-lg text-error" />
        <h3 class="text-lg font-semibold">Remove User Profession</h3>
      </div>
    </template>

    <template #body>
      <div v-if="user" class="space-y-4">
        <p class="text-muted">
          Are you sure you want to remove the profession assignment for this
          user?
        </p>

        <div class="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
          <p class="text-sm">
            <span class="font-medium">Name:</span> {{ user.name }}
          </p>
          <p class="text-sm">
            <span class="font-medium">NIK:</span> {{ user.nik }}
          </p>
          <p class="text-sm">
            <span class="font-medium">Current Profession:</span>
            {{ user.professionInBranch?.profession?.profession || "-" }}
          </p>
        </div>

        <p class="text-sm text-error">
          <UIcon name="i-lucide-alert-triangle" class="inline mr-1" />
          This action cannot be undone.
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="subtle"
          :disabled="loading"
          @click="handleClose"
        />
        <UButton
          label="Remove"
          color="error"
          variant="solid"
          :loading="loading"
          :disabled="loading"
          @click="handleDelete"
        />
      </div>
    </template>
  </UModal>
</template>
