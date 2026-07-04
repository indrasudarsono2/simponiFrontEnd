<script setup lang="ts">
import ip from "../../utils/config.json";

interface Supervisor {
  id: number;
  supervisor: string | null;
}

const props = defineProps<{
  supervisorData: Supervisor | null;
}>();

const emit = defineEmits<{
  deleted: [];
  close: [];
}>();

const { token } = useAuth();
const toast = useToast();

const loading = ref(false);

const open = computed({
  get: () => props.supervisorData !== null,
  set: (value: boolean) => {
    if (!value) emit("close");
  },
});

async function handleDelete() {
  if (!props.supervisorData) return;

  loading.value = true;

  try {
    await $fetch(
      `http://${ip.ipBackEnd}/api/cwpSupervisors/${props.supervisorData.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: token.value ? `Bearer ${token.value}` : "",
        },
      },
    );

    toast.add({
      title: "Success",
      description: "CWP supervisor has been deleted.",
      color: "success",
    });

    emit("deleted");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to delete CWP supervisor.",
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
    title="Delete CWP Supervisor"
    description="This will soft-delete the supervisor and related CWP assignment."
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <p class="text-sm text-muted">
        Are you sure you want to delete
        <span class="font-semibold text-highlighted">
          {{ supervisorData?.supervisor || "this supervisor" }}
        </span>
        ?
      </p>
    </template>

    <template #footer>
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
        icon="i-lucide-trash-2"
        :loading="loading"
        @click="handleDelete"
      />
    </template>
  </UModal>
</template>
