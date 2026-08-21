<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

interface EscalationLevel {
  id: number;
  level: string;
}

const props = defineProps<{
  escalationLevel: EscalationLevel | null;
}>();

const emit = defineEmits<{
  escalationLevelDeleted: [];
  close: [];
}>();

const { token } = useAuth();
const toast = useToast();
const open = ref(false);
const loading = ref(false);

watch(
  () => props.escalationLevel,
  (escalationLevel) => {
    if (escalationLevel) open.value = true;
  },
);

watch(open, (isOpen) => {
  if (!isOpen) emit("close");
});

async function onDelete() {
  if (!props.escalationLevel) return;

  loading.value = true;

  try {
    await $fetch(
      `${apiBaseUrl}/api/escalationLevels/${props.escalationLevel.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    toast.add({
      title: "Success",
      description: `Escalation level ${props.escalationLevel.level} has been deleted`,
      color: "success",
    });

    open.value = false;
    emit("escalationLevelDeleted");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to delete escalation level",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Delete Escalation Level">
    <template #description>
      <p>
        Are you sure you want to delete
        <strong>Level {{ escalationLevel?.level }}</strong>?
      </p>
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
          :loading="loading"
          @click="onDelete"
        />
      </div>
    </template>
  </UModal>
</template>
