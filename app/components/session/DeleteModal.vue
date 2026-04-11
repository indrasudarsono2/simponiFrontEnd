<script setup lang="ts">
import ip from "../../utils/config.json";
const { token } = useAuth();
interface Session {
  id: number;
  session: string;
  createdAt?: string;
}

const props = defineProps<{
  session: Session | null;
  branchName: string;
  branchUnitName: string;
}>();

const emit = defineEmits<{
  sessionDeleted: [];
  close: [];
}>();

const open = ref(false);
const loading = ref(false);

// Watch for session prop changes to open modal
watch(
  () => props.session,
  (newSession) => {
    if (newSession) {
      open.value = true;
    }
  },
  { immediate: true },
);

// Reset when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    emit("close");
  }
});

const toast = useToast();

async function onSubmit() {
  if (!props.session) return;

  loading.value = true;

  try {
    // Call API to delete session
    await $fetch(`http://${ip.ipBackEnd}/api/sessions/${props.session.id}`, {
      method: "DELETE",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `Session "${props.session.session}" has been deleted successfully`,
      color: "success",
    });

    open.value = false;

    // Emit event to refresh parent table
    emit("sessionDeleted");
  } catch (error: any) {
    const errorMessage =
      error?.data?.statusMessage ||
      error?.message ||
      "Failed to delete session. Please try again.";
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
  <UModal v-model:open="open" title="Delete Session">
    <template #description>
      <div class="space-y-2">
        <p>
          Are you sure you want to delete
          <strong>"{{ session?.session }}"</strong>?
        </p>
        <div
          class="p-3 bg-elevated/50 rounded-lg border border-default text-sm"
        >
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-muted">Branch:</span>
              <span class="font-medium">{{ branchName }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-muted">Branch Unit:</span>
              <span class="font-medium">{{ branchUnitName }}</span>
            </div>
          </div>
        </div>

        <p class="text-sm text-muted">This action cannot be undone.</p>
      </div>
    </template>
    <template #body>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="subtle"
          :disabled="loading"
          @click="open = false"
        />
        <UButton
          label="Delete"
          color="error"
          variant="solid"
          :loading="loading"
          @click="onSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
