<script setup lang="ts">
const apiBaseUrl = useApiBaseUrl()

interface Rating {
  id: number;
  rating: string | null;
}

interface Cwp {
  id: number;
  cwp: string | null;
  rating: Rating | null;
}

const props = defineProps<{
  cwp: Cwp | null;
}>();

const emit = defineEmits<{
  cwpDeleted: [];
  close: [];
}>();

const { token } = useAuth();
const toast = useToast();
const open = ref(false);
const loading = ref(false);

watch(
  () => props.cwp,
  (nextCwp) => {
    if (nextCwp) open.value = true;
  },
);

watch(open, (isOpen) => {
  if (!isOpen) emit("close");
});

async function onDelete() {
  if (!props.cwp) return;

  loading.value = true;

  try {
    await $fetch(`${apiBaseUrl}/api/cwps/${props.cwp.id}`, {
      method: "DELETE",
      headers: {
        Authorization: token.value ? `Bearer ${token.value}` : "",
      },
    });

    toast.add({
      title: "Success",
      description: `CWP "${props.cwp.cwp}" has been deleted`,
      color: "success",
    });

    open.value = false;
    emit("cwpDeleted");
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message ||
        error?.data?.statusMessage ||
        error?.message ||
        "Failed to delete CWP",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Delete CWP">
    <template #description>
      <p>
        Are you sure you want to delete
        <strong>"{{ cwp?.cwp }}"</strong>
        from rating <strong>{{ cwp?.rating?.rating || "-" }}</strong>?
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
